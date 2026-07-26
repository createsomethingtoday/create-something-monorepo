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


MODULE_PATH = Path(__file__).with_name("benchmark-roboflow-court.py")
SPEC = importlib.util.spec_from_file_location("benchmark_roboflow_court", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class CourtBenchmarkTests(unittest.TestCase):
    def test_percentile_uses_nearest_rank(self):
        self.assertEqual(MODULE.percentile([1, 2, 3, 4], 0.95), 4)

    def test_rejects_near_tied_court_hypotheses(self):
        selected, margin, ambiguous = MODULE.choose_prediction([{"confidence": 0.56}, {"confidence": 0.55}])
        self.assertEqual(selected["confidence"], 0.56)
        self.assertEqual(margin, 0.01)
        self.assertTrue(ambiguous)

    def test_accepts_a_single_unambiguous_hypothesis(self):
        selected, margin, ambiguous = MODULE.choose_prediction([{"confidence": 0.8}])
        self.assertEqual(selected["confidence"], 0.8)
        self.assertEqual(margin, 1.0)
        self.assertFalse(ambiguous)

    def test_mansfield_profile_uses_an_84_foot_court_and_12_foot_lane(self):
        self.assertEqual(MODULE.COURT_POINTS_FT["19"], (42, 0))
        self.assertEqual(MODULE.COURT_POINTS_FT["23"], (42, 50))
        self.assertEqual(MODULE.COURT_POINTS_FT["12"], (19, 19))
        self.assertEqual(MODULE.COURT_POINTS_FT["14"], (19, 31))
        self.assertEqual(MODULE.COURT_POINTS_FT["41"], (84, 50))


if __name__ == "__main__":
    unittest.main()
