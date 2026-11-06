# Generate descriptions for Unicode glyphs using the Gemini API.

import argparse
import json
import os
import stat
import tempfile
from concurrent.futures import CancelledError, ThreadPoolExecutor, as_completed
from textwrap import dedent

import httpx
from dotenv import load_dotenv
from google import genai
from google.genai import errors
from pydantic import BaseModel, Field
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential
from tqdm import tqdm


class GlyphDescription(BaseModel):
    """Model for a single glyph description."""

    codepoint: str = Field(description="The uppercase unicode codepoint, e.g., 1F451")
    description: str = Field(description="A concise description of the character.")


class GlyphDescriptionBatch(BaseModel):
    """Model for a batch of glyph descriptions."""

    descriptions: list[GlyphDescription]


def load_unicode_data(path: str = "src/unicode-data.json") -> list[dict]:
    """Load Unicode character data from JSON file."""
    if not os.path.exists(path):
        print(f"Error: {path} not found.")
        print("Please run 'just build' first.")
        raise FileNotFoundError(path)

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        characters = data.get("characters", [])

    print(f"Loaded {len(characters)} characters from unicode data.")
    return characters


def load_descriptions(path: str = "descriptions.json") -> dict:
    """Load existing descriptions from JSON file."""
    descriptions = {}
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            descriptions = json.load(f)
        if not isinstance(descriptions, dict) or any(
            not isinstance(value, str) for value in descriptions.values()
        ):
            raise ValueError("Descriptions must map codepoints to strings.")
        print(f"Loaded {len(descriptions)} existing descriptions.")
    else:
        print("No existing descriptions found. Starting fresh.")
    return descriptions


def filter_characters_to_process(
    characters: list[dict],
    descriptions: dict,
) -> list[dict]:
    """Filter out characters that already have descriptions."""
    characters_to_process = [
        character_data
        for character_data in characters
        if not descriptions.get(character_data["code"], "").strip()
    ]

    print(f"{len(characters_to_process)} characters to process.")
    return characters_to_process


def get_system_prompt(characters_data: list[dict]) -> str:
    """Generate system prompt for the Gemini API."""
    character_lines = [
        (
            f"- {item['char']} (Codepoint: {item['code']}, "
            f"Name: {item['name']}, Block: {item['block']})"
        )
        for item in characters_data
    ]
    stringified_data = "\n".join(character_lines)
    if stringified_data:
        stringified_data += "\n"

    template = dedent(
        """\
    Provide short, factual descriptions of these Unicode characters in plain British English.

    The descriptions should:
    
    1. Describe appearance if relevant.
    2. Explain the character's meaning.
    3. Mention common usage in digital communication, UI, or text if applicable.
    4. Be concise (1-2 sentences).
    5. Use the supplied official name and block as the source of truth. Do not invent meanings or common uses.
    6. Return each supplied codepoint exactly once, unchanged, with a nonempty description. Return no other codepoints.

    Input characters:
    {stringified_data}
    """
    )

    return template.format(stringified_data=stringified_data)


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=60),
    retry=retry_if_exception(
        lambda error: (
            isinstance(error, errors.APIError)
            and (error.code == 429 or error.code >= 500)
        ) or isinstance(error, (ValueError, httpx.TransportError, TimeoutError, ConnectionError))
    ),
    reraise=True,
)
def generate_descriptions_batch(
    client: genai.Client,
    batch: list[dict],
) -> dict:
    """Generate descriptions for a batch of characters using Gemini API."""
    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=[get_system_prompt(batch)],
        config={
            "response_mime_type": "application/json",
            "response_json_schema": GlyphDescriptionBatch.model_json_schema(),
            "thinking_config": {"thinking_level": "low"},
        },
    )

    if response.usage_metadata:
        usage = response.usage_metadata
        tqdm.write(
            f"Tokens: input={usage.prompt_token_count or 0}, "
            f"output={usage.candidates_token_count or 0}, "
            f"thinking={usage.thoughts_token_count or 0}"
        )
    parsed = GlyphDescriptionBatch.model_validate_json(response.text or "")
    result = {}
    for item in parsed.descriptions:
        if item.codepoint in result:
            raise ValueError("Response contains a duplicate codepoint.")
        if not item.description.strip():
            raise ValueError("Response contains an empty description.")
        result[item.codepoint] = item.description.strip()
    if set(result) != {item["code"] for item in batch}:
        raise ValueError("Response codepoints do not match the requested batch.")
    return result


def process_batch(batch_data: tuple[int, list[dict]], client: genai.Client) -> dict:
    """Process a single batch of characters."""
    batch_idx, batch = batch_data
    return {"index": batch_idx, "descriptions": generate_descriptions_batch(client, batch)}


def generate_parallel(
    client: genai.Client,
    characters_to_process: list[dict],
    descriptions: dict,
    batch_size: int = 25,
    max_workers: int = 5,
    descriptions_path: str = "descriptions.json",
) -> dict:
    """Generate descriptions in parallel for each batch.

    This method is faster but be mindful of API rate limits.
    """
    batches = []
    for i in range(0, len(characters_to_process), batch_size):
        batch = characters_to_process[i : i + batch_size]
        batches.append((i, batch))

    total_batches = len(batches)

    failure = None
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        try:
            for batch in batches:
                futures.append(executor.submit(process_batch, batch, client))
            for future in tqdm(
                as_completed(futures), total=total_batches, desc="Generating descriptions",
            ):
                try:
                    result = future.result()
                except CancelledError:
                    continue
                except Exception as error:
                    failure = failure or error
                    for pending in futures:
                        pending.cancel()
                    continue
                updated = {**descriptions, **result["descriptions"]}
                save_sorted_descriptions(updated, descriptions_path)
                descriptions.update(result["descriptions"])
        finally:
            for pending in futures:
                pending.cancel()

    if failure is not None:
        raise failure

    print(f"Generated {len(descriptions)} descriptions total.")
    return descriptions


def save_sorted_descriptions(descriptions: dict, descriptions_path: str) -> None:
    """Save sorted descriptions, preserving the existing file's permission mode.

    New files use the temporary file's mode, 0600 restricted by the process umask.
    """
    sorted_descriptions = dict(sorted(descriptions.items()))
    try:
        destination_mode = stat.S_IMODE(os.stat(descriptions_path).st_mode)
    except FileNotFoundError:
        destination_mode = None

    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8",
            dir=os.path.dirname(os.path.abspath(descriptions_path)),
            prefix=".descriptions-", suffix=".tmp", delete=False,
        ) as f:
            temporary_path = f.name
            json.dump(sorted_descriptions, f, ensure_ascii=False, indent=2)
            f.flush()
            if destination_mode is not None:
                os.fchmod(f.fileno(), destination_mode)
            os.fsync(f.fileno())
        os.replace(temporary_path, descriptions_path)
    finally:
        if temporary_path and os.path.exists(temporary_path):
            os.unlink(temporary_path)

    tqdm.write(f"Saved {len(sorted_descriptions)} descriptions.")


def main(argv=None):
    """Main function to generate Unicode character descriptions."""
    parser = argparse.ArgumentParser(
        description="Generate glyph descriptions with Gemini 3.8 Flash.",
    )
    parser.add_argument(
        "--rebuild", action="store_true", help="Regenerate all selected glyph descriptions.",
    )
    args = parser.parse_args(argv)
    load_dotenv()

    unicode_data_path = "src/unicode-data.json"
    characters = load_unicode_data(unicode_data_path)
    if not characters:
        raise ValueError("Unicode data contains no characters.")

    descriptions_path = "descriptions.json"
    descriptions = load_descriptions(descriptions_path)
    characters_to_process = (
        characters if args.rebuild else filter_characters_to_process(characters, descriptions)
    )

    if not characters_to_process:
        print("All characters already have descriptions.")
        return 0

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Error: Set GEMINI_API_KEY or GOOGLE_API_KEY in the environment or .env file.")
        return 1

    with genai.Client(api_key=api_key, http_options={"timeout": 120000}) as client:
        generate_parallel(
            client, characters_to_process, descriptions, descriptions_path=descriptions_path,
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        status = f" (HTTP {error.code})" if isinstance(error, errors.APIError) else ""
        print(f"Generation failed: {type(error).__name__}{status}. Completed batches remain saved.")
        raise SystemExit(1) from None
