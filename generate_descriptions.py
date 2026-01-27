# Generate descriptions for Unicode glyphs using the Gemini API.

import json
import os
from concurrent.futures import ThreadPoolExecutor
from textwrap import dedent

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential
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
        return []

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
        print(f"Loaded {len(descriptions)} existing descriptions.")
    else:
        print("No existing descriptions found. Starting fresh.")
    return descriptions


def filter_characters_to_process(
    characters: list[dict],
    descriptions: dict,
) -> list[dict]:
    """Filter out characters that already have descriptions."""
    characters_to_process = []
    for character_data in characters:
        codepoint = character_data["code"]
        if codepoint not in descriptions:
            characters_to_process.append(character_data)

    print(f"{len(characters_to_process)} characters to process.")
    return characters_to_process


def get_system_prompt(characters_data: list[dict]) -> str:
    """Generate system prompt for the Gemini API."""
    stringified_data = ""
    for item in characters_data:
        stringified_data += f"- {item['char']} (Codepoint: {item['code']}, Name: {item['name']}, Block: {item['block']})\n"

    template = dedent(
        """\
    You are an expert typographer and writer. Provide short, descriptive, and engaging explanations for the following unicode characters.

    The descriptions should:
    
    1. Describe appearance if relevant.
    2. Explain what it symbolizes or represents.
    3. Mention common usage in digital communication, UI, or text if applicable.
    4. Be concise (1-2 sentences).

    Input characters:
    {stringified_data}
    """
    )

    return template.format(stringified_data=stringified_data)


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=60),
)
def generate_descriptions_batch(
    client: genai.Client,
    system_prompt: str,
    model_name: str = "gemini-2.5-flash",
) -> list[GlyphDescription]:
    """Generate descriptions for a batch of characters using Gemini API."""
    response = client.models.generate_content(
        model=model_name,
        contents=[system_prompt],
        config={
            "response_mime_type": "application/json",
            "response_json_schema": GlyphDescriptionBatch.model_json_schema(),
        },
    )

    response = GlyphDescriptionBatch.model_validate_json(response.text)  # type: ignore
    return response.descriptions


def process_batch(batch_data: tuple[int, list[dict]], client: genai.Client) -> dict:
    """Process a single batch of characters."""
    batch_idx, batch = batch_data
    system_prompt = get_system_prompt(batch)
    batch_descriptions = generate_descriptions_batch(client, system_prompt)

    result = {}
    if batch_descriptions:
        for item in batch_descriptions:
            result[item.codepoint] = item.description

    return {"index": batch_idx, "descriptions": result}


def generate_parallel(
    client: genai.Client,
    characters_to_process: list[dict],
    descriptions: dict,
    descriptions_path: str,
    batch_size: int = 25,
    max_workers: int = 5,
) -> dict:
    """Generate descriptions in parallel for each batch.

    This method is faster but be mindful of API rate limits.
    """
    batches = []
    for i in range(0, len(characters_to_process), batch_size):
        batch = characters_to_process[i : i + batch_size]
        batches.append((i, batch))

    total_batches = len(batches)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(
            tqdm(
                executor.map(lambda batch: process_batch(batch, client), batches),
                total=total_batches,
                desc="Generating descriptions",
            )
        )

    for result in results:
        if result["descriptions"]:
            descriptions.update(result["descriptions"])
        else:
            tqdm.write(
                f"Warning: No descriptions returned for batch at index {result['index']}."
            )

    with open(descriptions_path, "w", encoding="utf-8") as f:
        json.dump(descriptions, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(descriptions)} descriptions total.")
    return descriptions


def save_sorted_descriptions(descriptions: dict, descriptions_path: str) -> None:
    """Sort descriptions by codepoint and save to file."""
    sorted_descriptions = dict(sorted(descriptions.items()))

    with open(descriptions_path, "w", encoding="utf-8") as f:
        json.dump(sorted_descriptions, f, ensure_ascii=False, indent=2)

    print(f"Sorted and saved {len(sorted_descriptions)} descriptions.")


def main():
    """Main function to generate Unicode character descriptions."""
    load_dotenv()

    if not os.getenv("GOOGLE_API_KEY"):
        print("Error: GOOGLE_API_KEY not found in environment variables.")
        print("Please create a .env file with your GOOGLE_API_KEY.")
        return

    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    print("GOOGLE_API_KEY found. Gemini client created.")

    unicode_data_path = "src/unicode-data.json"
    characters = load_unicode_data(unicode_data_path)
    if not characters:
        return

    descriptions_path = "descriptions.json"
    descriptions = load_descriptions(descriptions_path)
    characters_to_process = filter_characters_to_process(characters, descriptions)

    if not characters_to_process:
        print("All characters already have descriptions.")
        return

    descriptions = generate_parallel(
        client, characters_to_process, descriptions, descriptions_path
    )
    save_sorted_descriptions(descriptions, descriptions_path)


if __name__ == "__main__":
    main()
