#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("bakeoff-film-tracking.py")
SPEC = importlib.util.spec_from_file_location("bakeoff_film_tracking", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def comparison(**candidate_overrides):
    baseline = {
        "detection": {"targetCoverage": {"recall": 0.8}, "foregroundPlayerCoverage": {"recall": 0.8}},
        "identity": {"recall": 1.0},
        "foreground": {"teamAccuracy": 1.0},
        "court": {"medianErrorFeet": 1.5},
    }
    candidate = {
        "detection": {"targetCoverage": {"recall": 0.9}, "foregroundPlayerCoverage": {"recall": 0.8}},
        "identity": {"recall": 1.0, "falseAssignments": 0, "silentSwitchMaxSeconds": 0.0, "inactiveBridges": 0},
        "foreground": {"teamAccuracy": 1.0, "oppositeCourtActive": 0},
        "court": {"medianErrorFeet": 1.5, "p95ErrorFeet": 3.0, "passed": True},
    }
    for key, value in candidate_overrides.items():
        candidate[key] = value
    return {"baseline": baseline, "candidate": candidate}


class AssociationTests(unittest.TestCase):
    def test_association_accepts_a_larger_box_covering_the_reviewed_player(self):
        score = MODULE.association_score([10, 10, 30, 50], [5, 5, 35, 55])
        self.assertGreaterEqual(score, MODULE.ASSOCIATION_THRESHOLD)

    def test_association_rejects_unrelated_players(self):
        self.assertEqual(MODULE.association_score([10, 10, 30, 50], [50, 10, 70, 50]), 0)

    def test_association_accepts_a_tight_player_inside_a_review_context_crop(self):
        score = MODULE.association_score([100, 100, 400, 500], [230, 220, 285, 430])
        self.assertGreaterEqual(score, MODULE.ASSOCIATION_THRESHOLD)

    def test_best_match_uses_the_highest_spatial_score_not_vendor_confidence(self):
        match = MODULE.best_match(
            [10, 10, 30, 50],
            [
                {"box": [9, 9, 31, 51], "confidence": 0.4},
                {"box": [50, 10, 70, 50], "confidence": 0.99},
            ],
        )
        self.assertEqual(match.confidence, 0.4)


class AdoptionTests(unittest.TestCase):
    def test_adopts_only_when_a_material_improvement_clears_every_floor(self):
        decision = MODULE.adoption_decision(comparison())
        self.assertTrue(decision["adopt"])

    def test_rejects_a_hard_negative_identity_assignment(self):
        identity = {"recall": 1.0, "falseAssignments": 1, "silentSwitchMaxSeconds": 0.0, "inactiveBridges": 0}
        decision = MODULE.adoption_decision(comparison(identity=identity))
        self.assertFalse(decision["adopt"])
        self.assertFalse(decision["safetyFloors"]["zeroHardNegativeIdentityAssignments"])

    def test_rejects_a_substitution_bridge(self):
        identity = {"recall": 1.0, "falseAssignments": 0, "silentSwitchMaxSeconds": 0.0, "inactiveBridges": 1}
        self.assertFalse(MODULE.adoption_decision(comparison(identity=identity))["adopt"])

    def test_rejects_opposite_court_leakage(self):
        foreground = {"teamAccuracy": 1.0, "oppositeCourtActive": 1}
        self.assertFalse(MODULE.adoption_decision(comparison(foreground=foreground))["adopt"])

    def test_rejects_missing_source_backed_court_proof(self):
        court = {"medianErrorFeet": None, "p95ErrorFeet": None, "passed": False}
        decision = MODULE.adoption_decision(comparison(court=court))
        self.assertFalse(decision["adopt"])
        self.assertFalse(decision["safetyFloors"]["sourceBackedCourtCalibrationPassed"])

    def test_rejects_a_non_improving_candidate(self):
        detections = {"targetCoverage": {"recall": 0.8}, "foregroundPlayerCoverage": {"recall": 0.8}}
        decision = MODULE.adoption_decision(comparison(detection=detections))
        self.assertFalse(decision["adopt"])
        self.assertFalse(any(decision["materialImprovements"].values()))


class ContractTests(unittest.TestCase):
    def prediction(self):
        model = {
            "provider": "fixture",
            "model": "fixture-person-detector",
            "license": "test-only",
            "identityAuthority": "none",
        }
        return {
            "profile": MODULE.PREDICTION_PROFILE,
            "sourceSha256": "a" * 64,
            "model": {**model, "weightsSha256": "b" * 64},
            "configurationSha256": MODULE.stable_hash(model),
            "frames": [{"timeMs": 1000, "detections": []}],
        }

    def test_rejects_source_mismatch(self):
        with self.assertRaises(SystemExit):
            MODULE.validate_predictions(self.prediction(), "c" * 64, [1000])

    def test_rejects_missing_timestamp_coverage(self):
        with self.assertRaises(SystemExit):
            MODULE.validate_predictions(self.prediction(), "a" * 64, [1000, 2000])

    def test_rejects_model_configuration_mismatch(self):
        value = self.prediction()
        value["model"]["model"] = "silently-replaced"
        with self.assertRaises(SystemExit):
            MODULE.validate_predictions(value, "a" * 64, [1000])

    def test_rejects_a_court_report_from_another_source(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "court.json"
            path.write_text(json.dumps({"sourceSha256": "c" * 64, "medianErrorFeet": 0, "p95ErrorFeet": 0}))
            report = MODULE.source_court_metrics(str(path), "a" * 64)
        self.assertFalse(report["sourceBacked"])
        self.assertFalse(report["passed"])


if __name__ == "__main__":
    unittest.main()
