"""Local invariants; no credentials or live model calls."""

import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import tomllib
import unittest

from install import checked_binary, registration
from pilot import MCP, MODEL, validate_choice


class InstallTests(unittest.TestCase):
    def test_preserves_existing_config_and_is_idempotent(self):
        original = '# operator comment\nmodel = "gpt-6-astra"\n[mcp_servers.other]\ncommand = "other"\n'
        new = registration(original, "/python", Path("/path with spaces/launch.py"))
        self.assertTrue(new.startswith(original))
        self.assertEqual(tomllib.loads(new)["model"], "gpt-6-astra")
        self.assertEqual(registration(new, "/python", Path("/path with spaces/launch.py")), new)

    def test_conflicting_config_is_not_overwritten(self):
        for original in ('[mcp_servers.jev]\ncommand="custom"\n',
                         '[mcp_servers.evaluate]\ncommand="evaluate"\n'):
            with self.assertRaises(ValueError):
                registration(original, "/python", Path("/launch.py"))

    def test_rejects_corrupt_archive_and_non_regular_binary(self):
        with self.assertRaises(ValueError):
            checked_binary(b"corrupt", "0" * 64)
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode="w:gz") as archive:
            entry = tarfile.TarInfo("evaluate")
            entry.type = tarfile.SYMTYPE
            entry.linkname = "/elsewhere"
            archive.addfile(entry)
        data = stream.getvalue()
        with self.assertRaises(ValueError):
            checked_binary(data, hashlib.sha256(data).hexdigest())

    def test_failed_secret_lookup_stops_without_leaking_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "launch.py").write_bytes(Path(__file__).with_name("launch.py").read_bytes())
            fake = root / "infisical"
            fake.write_text('#!/bin/sh\necho simulated-sensitive-value >&2\nexit 1\n')
            fake.chmod(0o700)
            (root / "runtime.json").write_text(json.dumps({"infisical": str(fake), "binary": "/not-executed"}))
            env = {k: v for k, v in os.environ.items() if k != "TYPESAFE_API_KEY"}
            result = subprocess.run([sys.executable, str(root / "launch.py")], env=env, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(result.stdout, "")
            self.assertNotIn("simulated-sensitive-value", result.stderr)
            self.assertIn("continue without Jev", result.stderr)


class AnswerTests(unittest.TestCase):
    def response(self):
        return {"model": MODEL, "answers": {"first": {"type": "choice", "choice": "no_match",
                "probabilities": {"a": 0.1, "no_match": 0.9}, "confidence": 0.8}}}

    def test_no_match_is_valid_and_candidates_are_closed(self):
        self.assertEqual(validate_choice(self.response(), ["a", "no_match"])["choice"], "no_match")
        for choice in ("invented_file", None):
            response = self.response()
            response["answers"]["first"]["choice"] = choice
            with self.assertRaises(ValueError):
                validate_choice(response, ["a", "no_match"])

    def test_rejects_malformed_envelope_and_changed_model(self):
        for response in ([], {}, {"model": MODEL, "answers": []},
                         {**self.response(), "model": "different-model"}):
            with self.assertRaises(ValueError):
                validate_choice(response, ["a", "no_match"])

    def test_unresponsive_server_has_bounded_wait(self):
        client = MCP([sys.executable, "-u", "-c", "import sys; [None for line in sys.stdin]"])
        try:
            with self.assertRaises(TimeoutError):
                client.call("tools/list", {}, timeout=0.05)
        finally:
            client.close()

    def test_rejects_incomplete_or_nonfinite_probabilities(self):
        for probabilities in ({"a": 1.0}, {"a": float("nan"), "no_match": 0.9}, {"a": 0.1, "no_match": 0.1}):
            response = self.response()
            response["answers"]["first"]["probabilities"] = probabilities
            with self.assertRaises(ValueError):
                validate_choice(response, ["a", "no_match"])


if __name__ == "__main__":
    unittest.main()
