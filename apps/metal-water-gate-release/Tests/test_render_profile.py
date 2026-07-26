import pathlib
import sys
import unittest


PACKAGE_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PACKAGE_ROOT / "blender"))

from render_profile import FIELD_SHA256, get_profile, validate_profile


class HeroRenderProfileTests(unittest.TestCase):
    def test_hero_v2_exposes_the_repeatable_public_contract(self):
        profile = get_profile("hero-v2")

        self.assertEqual(profile["fieldSHA256"], FIELD_SHA256)
        self.assertEqual(profile["heroFrames"], [65, 121])
        self.assertEqual(profile["fullFilmFrames"], [0, 191])
        self.assertEqual(profile["resolution"], [1280, 720])
        self.assertEqual(profile["framesPerSecond"], 24)
        self.assertEqual(profile["camera"]["lensMillimeters"], 100.0)
        self.assertEqual(profile["camera"]["cutCount"], 0)
        self.assertTrue(profile["camera"]["continuousMove"])
        self.assertEqual(profile["water"]["source"], "accepted Metal SPH field values")
        self.assertEqual(profile["water"]["reconstruction"], "field-derived adaptive surface")
        self.assertEqual(profile["enginePolicy"], "cycles-metal-final")
        self.assertFalse(profile["captions"])

        validate_profile(profile)

    def test_validator_rejects_a_profile_that_can_hide_a_camera_cut(self):
        profile = get_profile("hero-v2")
        profile["camera"]["cutCount"] = 1

        with self.assertRaisesRegex(ValueError, "camera cut"):
            validate_profile(profile)


if __name__ == "__main__":
    unittest.main()
