#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "numpy==2.4.3",
#   "onnxruntime==1.24.4",
#   "opencv-python-headless==4.13.0.92",
#   "scipy==1.17.1",
# ]
# ///
from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

import numpy as np


MODULE_PATH = Path(__file__).with_name("analyze-film.py")
SPEC = importlib.util.spec_from_file_location("guard_analyze_film", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def detection(track_id: str, raw_role: str, hist: list[float], foot=(500.0, 700.0)):
    vector = np.zeros(128, dtype=np.float32)
    vector[: len(hist)] = hist
    vector /= max(float(np.linalg.norm(vector)), 1e-8)
    return MODULE.Detection(
        box=np.array([450.0, 400.0, 550.0, 700.0]),
        score=0.9,
        foot_x=foot[0],
        foot_y=foot[1],
        pano_x=foot[0],
        depth=0.5,
        hist=vector,
        white=0.5 if raw_role == "teammate" else 0.1,
        raw_role=raw_role,
        role=raw_role,
        team_score=0.8 if raw_role == "teammate" else 0.1,
        classification={},
        track_id=track_id,
    )


class TargetAssociationTest(unittest.TestCase):
    def test_revokes_a_track_id_when_it_hands_off_to_an_opponent(self):
        target = detection("p-0013", "teammate", [1.0, 0.0])
        state = MODULE.TargetState(set())
        self.assertIs(MODULE.seed_target(state, [target], 1000, 500, 700), target)

        handoff = detection("p-0013", "opponent", [1.0, 0.0], (510, 700))
        self.assertIsNone(MODULE.select_target(state, [handoff], 1500, 1920, 1080))
        self.assertNotIn("p-0013", state.trusted_track_ids)

    def test_rejects_an_ambiguous_teammate_crossing(self):
        target = detection("p-0013", "teammate", [1.0, 0.0])
        state = MODULE.TargetState(set())
        MODULE.seed_target(state, [target], 1000, 500, 700)

        first = detection("p-0013", "teammate", [0.99, 0.05], (520, 700))
        second = detection("p-0015", "teammate", [0.99, 0.05], (522, 700))
        self.assertIsNone(MODULE.select_target(state, [first, second], 1500, 1920, 1080))

    def test_reacquires_a_clear_teammate_handoff_within_the_continuity_window(self):
        target = detection("p-0013", "teammate", [1.0, 0.0])
        state = MODULE.TargetState(set())
        MODULE.seed_target(state, [target], 1000, 500, 700)

        continued = detection("p-0042", "teammate", [0.999, 0.01], (530, 705))
        other = detection("p-0015", "teammate", [0.1, 0.99], (800, 705))
        self.assertIs(MODULE.select_target(state, [continued, other], 1500, 1920, 1080), continued)
        self.assertIn("p-0042", state.trusted_track_ids)

    def test_does_not_reacquire_after_an_unreviewed_long_gap(self):
        target = detection("p-0013", "teammate", [1.0, 0.0])
        state = MODULE.TargetState(set())
        MODULE.seed_target(state, [target], 1000, 500, 700)

        lookalike = detection("p-0099", "teammate", [1.0, 0.0], (505, 700))
        self.assertIsNone(MODULE.select_target(state, [lookalike], 3000, 1920, 1080))


if __name__ == "__main__":
    unittest.main()
