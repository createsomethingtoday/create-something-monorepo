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


MODULE_PATH = Path(__file__).with_name("vjepa-play-state-bakeoff.py")
SPEC = importlib.util.spec_from_file_location("vjepa_play_state_bakeoff", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class WindowPlanTests(unittest.TestCase):
    def test_uses_whole_intervals_for_a_temporal_holdout(self):
        states = (
            "live-defense", "dead-ball", "transition-defense", "substitution",
            "live-defense", "dead-ball", "live-defense", "dead-ball",
            "transition-offense", "free-throw",
        )
        ledger = {
            "intervals": [
                {
                    "id": f"interval-{index}",
                    "startMs": index * 4000,
                    "endMs": index * 4000 + 2999,
                    "state": state,
                    "evidence": {"method": "source-review"},
                }
                for index, state in enumerate(states)
            ]
        }

        windows = MODULE.build_window_plan(ledger)
        training = {item["intervalId"] for item in windows if item["split"] == "train"}
        heldout = {item["intervalId"] for item in windows if item["split"] == "heldout"}

        self.assertFalse(training & heldout)
        self.assertEqual(len(heldout), 4)
        self.assertEqual(
            {item["expectedLabel"] for item in windows if item["split"] == "heldout"},
            {"live-basketball", "stopped-basketball"},
        )
        self.assertTrue(all(item["endMs"] - item["startMs"] == 1999 for item in windows))


if __name__ == "__main__":
    unittest.main()
