#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("gemma-film-bakeoff.py")
SPEC = importlib.util.spec_from_file_location("gemma_film_bakeoff", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def annotation(
    *,
    expected_identity: str = "13",
    visible_number: str = "13",
    participation: str = "active",
    negative_class: str | None = None,
    association_time_ms: int = 1_000,
) -> dict[str, object]:
    return {
        "id": f"fixture-{association_time_ms}",
        "segmentId": "fixture-segment",
        "timeMs": association_time_ms,
        "associationTimeMs": association_time_ms,
        "expectedIdentity": expected_identity,
        "visibleNumber": visible_number,
        "participation": participation,
        "negativeClass": negative_class,
        "cropBounds": [0, 0, 10, 10],
    }


def review(
    *,
    identity: str = "13",
    visible_number: str = "13",
    participation: str = "active",
    direct_number_evidence: bool = True,
) -> dict[str, object]:
    return {
        "identity": identity,
        "visibleNumber": visible_number,
        "participation": participation,
        "directNumberEvidence": direct_number_evidence,
        "notProven": "Fixture response is intentionally non-authoritative.",
    }


class ReviewContractTests(unittest.TestCase):
    def test_rejects_a_target_claim_without_direct_visible_number_evidence(self):
        with self.assertRaises(ValueError):
            MODULE.normalize_review(review(direct_number_evidence=False))

    def test_rejects_coordinates_so_language_output_cannot_impersonate_a_tracker(self):
        response = review()
        response["court"] = [1, 2]
        with self.assertRaises(ValueError):
            MODULE.normalize_review(response)

    def test_rejects_non_json_runner_output(self):
        with self.assertRaises(ValueError):
            MODULE.parse_review_response("The jersey looks like 13.")

    def test_parser_accepts_the_runner_timing_trailer_after_json(self):
        parsed = MODULE.parse_review_response(
            '{"identity":"13","visibleNumber":"13","participation":"active","directNumberEvidence":true,"notProven":"Single crop only."}'
            "\n[ Prompt: 97.1 t/s | Generation: 39.8 t/s ]\nExiting..."
        )
        self.assertEqual(parsed["identity"], "13")

    def test_cpu_only_command_disables_every_offload_path(self):
        command = MODULE.build_runner_command(
            "llama-cli",
            Path("model.gguf"),
            Path("projector.gguf"),
            Path("crop.jpg"),
            cpu_only=True,
        )
        self.assertEqual(command[:7], ["llama-cli", "--device", "none", "-ngl", "0", "--no-kv-offload", "--no-mmproj-offload"])
        self.assertIn("--no-op-offload", command)

    def test_runner_command_exits_after_the_predefined_review_turn(self):
        command = MODULE.build_runner_command(
            "llama-cli",
            Path("model.gguf"),
            Path("projector.gguf"),
            Path("crop.jpg"),
            cpu_only=True,
        )
        self.assertIn("--single-turn", command)

    def test_runner_command_uses_the_gemma_safe_grammar_not_json_schema(self):
        command = MODULE.build_runner_command(
            "llama-cli",
            Path("model.gguf"),
            Path("projector.gguf"),
            Path("crop.jpg"),
            cpu_only=True,
        )
        self.assertIn("--grammar", command)
        self.assertNotIn("--json-schema", command)
        self.assertIn("root ::=", command[command.index("--grammar") + 1])

    def test_parser_accepts_pnpm_delimiter_before_script_arguments(self):
        parsed = MODULE.parse_args([
            "--", "--source", "source.mp4", "--source-sha256", "a" * 64,
            "--model", "model.gguf", "--projector", "projector.gguf", "--output", "receipt.json", "--evidence-dir", "evidence",
        ])
        self.assertEqual(parsed.source, "source.mp4")


class ScoreTests(unittest.TestCase):
    def test_invalid_runner_output_is_a_failure_even_for_a_hard_negative(self):
        result = MODULE.invalid_case(
            annotation(expected_identity="not-13", visible_number="11", negative_class="11"),
            "Runner response does not contain valid JSON.",
        )
        self.assertFalse(result["passed"])
        self.assertEqual(result["failure"], "runner-output-invalid")

    def test_known_number_11_never_counts_as_a_target(self):
        result = MODULE.score_case(
            annotation(expected_identity="not-13", visible_number="11", negative_class="11"),
            review(identity="13"),
        )
        self.assertFalse(result["passed"])
        self.assertEqual(result["failure"], "hard-negative-assigned-target")

    def test_substitution_requires_retained_identity_and_inactive_state(self):
        result = MODULE.score_case(
            annotation(participation="inactive", negative_class="substitution"),
            review(participation="active"),
        )
        self.assertFalse(result["passed"])
        self.assertEqual(result["failure"], "substitution-state-mismatch")

    def test_perfect_semantic_reviews_remain_assist_only_without_tracks_and_calibration(self):
        cases = [
            MODULE.score_case(annotation(association_time_ms=1_000), review()),
            MODULE.score_case(
                annotation(
                    expected_identity="not-13",
                    visible_number="11",
                    negative_class="11",
                    association_time_ms=2_000,
                ),
                review(identity="not-13", visible_number="other", direct_number_evidence=False),
            ),
            MODULE.score_case(
                annotation(
                    participation="inactive",
                    negative_class="substitution",
                    association_time_ms=3_000,
                ),
                review(participation="inactive"),
            ),
        ]
        decision = MODULE.decide(cases)
        self.assertEqual(decision["recommendation"], "assist-only")
        self.assertFalse(decision["trackingReplacementEligible"])
        self.assertIn("no-calibrated-continuous-player-track", decision["replacementBlockers"])


if __name__ == "__main__":
    unittest.main()
