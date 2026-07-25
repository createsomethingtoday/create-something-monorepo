import importlib.util
import unittest
from pathlib import Path

import torch


SCRIPT = Path(__file__).with_name("track-player-mask-sam2.py")
SPEC = importlib.util.spec_from_file_location("track_player_mask_sam2", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class MaskDiagnosticTest(unittest.TestCase):
    def test_reports_mask_logit_range_and_positive_pixel_count(self):
        diagnostic = MODULE.mask_diagnostic(7, torch.tensor([[[-1.0, 0.0], [0.5, 2.0]]]))

        self.assertEqual(
            diagnostic,
            {
                "frameIndex": 7,
                "minLogit": -1.0,
                "maxLogit": 2.0,
                "positivePixels": 2,
            },
        )

    def test_parses_periodic_reseed_boxes_without_reusing_the_entry_seed(self):
        reseeds = MODULE.parse_reseeds(["30:10,20,40,80", "75:100,200,50,90"], frame_count=100)

        self.assertEqual(
            reseeds,
            [
                {"frameIndex": 30, "box": [10, 20, 40, 80]},
                {"frameIndex": 75, "box": [100, 200, 50, 90]},
            ],
        )

    def test_rejects_out_of_range_reseed_frames(self):
        with self.assertRaisesRegex(ValueError, "outside the extracted frame sequence"):
            MODULE.parse_reseeds(["100:10,20,40,80"], frame_count=100)


if __name__ == "__main__":
    unittest.main()
