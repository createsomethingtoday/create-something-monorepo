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


if __name__ == "__main__":
    unittest.main()
