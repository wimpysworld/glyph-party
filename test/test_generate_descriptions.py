import json
import os
import stat
import tempfile
import unittest
from concurrent.futures import Future
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import generate_descriptions as generator


def glyph(code):
    return {"code": code, "char": chr(int(code, 16)), "name": "TEST", "block": "Test"}


def response(items):
    return SimpleNamespace(
        text=json.dumps({"descriptions": items}), usage_metadata=None,
    )


class DescriptionTests(unittest.TestCase):
    def test_exact_batch_validation(self):
        client = MagicMock()
        valid = {"codepoint": "20C2", "description": "Rufiyaa sign."}
        for items in [
            [], [valid, valid], [valid, {"codepoint": "20C3", "description": "Extra."}],
            [{"codepoint": "20c2", "description": "Wrong code."}],
            [{"codepoint": "20C2", "description": "  "}],
        ]:
            with self.subTest(items=items):
                client.models.generate_content.return_value = response(items)
                with self.assertRaises(ValueError):
                    generator.generate_descriptions_batch.__wrapped__(client, [glyph("20C2")])
        client.models.generate_content.return_value = response([valid])
        self.assertEqual(
            generator.generate_descriptions_batch.__wrapped__(client, [glyph("20C2")]),
            {"20C2": "Rufiyaa sign."},
        )
        self.assertEqual(client.models.generate_content.call_args.kwargs["model"], "gemini-3.8-flash")

    def test_invalid_response_retried_before_merge(self):
        client = MagicMock()
        client.models.generate_content.side_effect = [
            response([]), response([{"codepoint": "20C2", "description": "Rufiyaa sign."}]),
        ]
        with patch.object(generator.generate_descriptions_batch.retry, "sleep"):
            result = generator.generate_descriptions_batch(client, [glyph("20C2")])
        self.assertEqual(result, {"20C2": "Rufiyaa sign."})
        self.assertEqual(client.models.generate_content.call_count, 2)

    def test_transport_failure_retried(self):
        client = MagicMock()
        client.models.generate_content.side_effect = [
            generator.httpx.ConnectError("Connection failed"),
            response([{"codepoint": "20C2", "description": "Rufiyaa sign."}]),
        ]
        with patch.object(generator.generate_descriptions_batch.retry, "sleep"):
            result = generator.generate_descriptions_batch(client, [glyph("20C2")])
        self.assertEqual(result, {"20C2": "Rufiyaa sign."})
        self.assertEqual(client.models.generate_content.call_count, 2)

    def test_failed_batch_checkpoints_and_resumes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "descriptions.json"
            original = {"2190": "Original description, unchanged."}
            path.write_text(json.dumps(original))
            characters = [glyph(code) for code in ["2190", "20C2", "20C3"]]
            missing = generator.filter_characters_to_process(characters, original)

            def process(batch_data, client):
                index, batch = batch_data
                if batch[0]["code"] == "20C3":
                    raise ValueError("Invalid response")
                return {"index": index, "descriptions": {"20C2": "Rufiyaa sign."}}

            with patch.object(generator, "process_batch", side_effect=process):
                with self.assertRaises(ValueError):
                    generator.generate_parallel(None, missing, original, 1, 1, str(path))
            saved = json.loads(path.read_text())
            self.assertEqual(saved, {"2190": "Original description, unchanged.", "20C2": "Rufiyaa sign."})
            remaining = generator.filter_characters_to_process(characters, saved)
            self.assertEqual([item["code"] for item in remaining], ["20C3"])
            with patch.object(generator, "process_batch", return_value={
                "index": 0, "descriptions": {"20C3": "Dirham sign."},
            }) as process:
                generator.generate_parallel(None, remaining, saved, descriptions_path=str(path))
            self.assertEqual(process.call_count, 1)
            self.assertEqual(json.loads(path.read_text())["2190"], "Original description, unchanged.")
            self.assertEqual(len(json.loads(path.read_text())), 3)

    def test_parallel_aborts_cancel_queued_batches_before_shutdown(self):
        for error in [KeyboardInterrupt(), OSError("Disk error")]:
            with self.subTest(error=type(error).__name__), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "descriptions.json"
                descriptions = {"2190": "Original."}
                path.write_text(json.dumps(descriptions))
                completed = Future()
                completed.set_result({"descriptions": {"20C2": "Rufiyaa sign."}})
                unsaved = Future()
                unsaved.set_result({"descriptions": {"20C3": "Dirham sign."}})
                queued = Future()
                futures = [completed, unsaved, queued]
                save = generator.save_sorted_descriptions

                def results():
                    yield completed
                    if isinstance(error, KeyboardInterrupt):
                        raise error
                    yield unsaved

                def checkpoint(updated, destination):
                    if "20C3" in updated:
                        raise error
                    save(updated, destination)

                with patch.object(generator, "ThreadPoolExecutor") as pool, \
                     patch.object(generator, "as_completed", return_value=results()), \
                     patch.object(generator, "save_sorted_descriptions", side_effect=checkpoint):
                    pool.return_value.__enter__.return_value.submit.side_effect = futures

                    def shutdown(*args):
                        self.assertTrue(queued.cancelled())
                        return False

                    pool.return_value.__exit__.side_effect = shutdown
                    with self.assertRaises(type(error)) as raised:
                        generator.generate_parallel(
                            None, [glyph("20C2"), glyph("20C3"), glyph("20C4")],
                            descriptions, batch_size=1, descriptions_path=str(path),
                        )
                    self.assertIs(raised.exception, error)
                expected = {"2190": "Original.", "20C2": "Rufiyaa sign."}
                self.assertEqual(json.loads(path.read_text()), expected)
                self.assertEqual(descriptions, expected)

    def test_atomic_save_failure_preserves_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "descriptions.json"
            original = b'{"2190": "Original."}\n'
            path.write_bytes(original)
            with patch.object(generator.os, "replace", side_effect=OSError("Disk error")):
                with self.assertRaises(OSError):
                    generator.save_sorted_descriptions({"20C2": "New."}, str(path))
            self.assertEqual(path.read_bytes(), original)
            self.assertEqual(list(Path(directory).iterdir()), [path])

    def test_atomic_save_preserves_permissions(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "descriptions.json"
            for mode in [0o644, 0o640, 0o600]:
                with self.subTest(mode=oct(mode)):
                    path.write_text("{}")
                    path.chmod(mode)
                    generator.save_sorted_descriptions({"20C2": "New."}, str(path))
                    self.assertEqual(stat.S_IMODE(path.stat().st_mode), mode)
                    self.assertEqual(json.loads(path.read_text()), {"20C2": "New."})

    def test_atomic_save_new_file_respects_umask(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "descriptions.json"
            previous_umask = os.umask(0o277)
            try:
                generator.save_sorted_descriptions({"20C2": "New."}, str(path))
            finally:
                os.umask(previous_umask)
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o400)
            self.assertEqual(json.loads(path.read_text()), {"20C2": "New."})

    def test_complete_data_needs_no_key_or_client(self):
        with patch.object(generator, "load_unicode_data", return_value=[glyph("20C2")]), \
             patch.object(generator, "load_descriptions", return_value={"20C2": "Existing."}), \
             patch.object(generator.genai, "Client") as client:
            self.assertEqual(generator.main([]), 0)
        client.assert_not_called()

    def test_rebuild_explicitly_selects_existing_descriptions(self):
        characters = [glyph("20C2")]
        descriptions = {"20C2": "Existing."}
        with patch.object(generator, "load_unicode_data", return_value=characters), \
             patch.object(generator, "load_descriptions", return_value=descriptions), \
             patch.dict(generator.os.environ, {"GEMINI_API_KEY": "test-only"}), \
             patch.object(generator.genai, "Client"), \
             patch.object(generator, "generate_parallel") as generate:
            self.assertEqual(generator.main(["--rebuild"]), 0)
        self.assertEqual(generate.call_args.args[1:], (characters, descriptions))

    def test_blank_descriptions_are_missing(self):
        characters = [glyph("20C2"), glyph("20C3")]
        self.assertEqual(generator.filter_characters_to_process(
            characters, {"20C2": " ", "20C3": "Existing."},
        ), [characters[0]])
