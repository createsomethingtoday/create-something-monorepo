"""Stable render profiles shared by Blender source and verification tooling."""

from copy import deepcopy


FIELD_SHA256 = "9b47b64842431da837b228df80e72874aff1cba648900fdf36b46a4f9c8fcf5f"


_PROFILES = {
    "hero-v2": {
        "schemaVersion": 1,
        "name": "hero-v2",
        "fieldSHA256": FIELD_SHA256,
        "heroFrames": [65, 121],
        "fullFilmFrames": [0, 191],
        "resolution": [1280, 720],
        "framesPerSecond": 24,
        "enginePolicy": "cycles-metal-final",
        "captions": False,
        "camera": {
            "lensMillimeters": 100.0,
            "cutCount": 0,
            "continuousMove": True,
        },
        "water": {
            "source": "accepted Metal SPH field values",
            "reconstruction": "field-derived adaptive surface",
        },
    },
}


def get_profile(name):
    """Return a caller-owned copy of a named render contract."""
    if name not in _PROFILES:
        raise ValueError(f"unknown render profile: {name}")
    profile = deepcopy(_PROFILES[name])
    validate_profile(profile)
    return profile


def validate_profile(profile):
    """Fail closed when a profile weakens the accepted causal film contract."""
    if profile.get("fieldSHA256") != FIELD_SHA256:
        raise ValueError("render profile changed the accepted field hash")
    if profile.get("heroFrames") != [65, 121]:
        raise ValueError("hero frame range must remain 65 through 121")
    if profile.get("fullFilmFrames") != [0, 191]:
        raise ValueError("full film must remain 192 frames")
    if profile.get("resolution") != [1280, 720]:
        raise ValueError("render profile must remain 1280 x 720")
    if profile.get("framesPerSecond") != 24:
        raise ValueError("render profile must remain 24 fps")
    if profile.get("enginePolicy") != "cycles-metal-final":
        raise ValueError("hero-v2 final pixels must use Cycles on Metal")
    if profile.get("captions") is not False:
        raise ValueError("render profile may not add captions")

    camera = profile.get("camera", {})
    if camera.get("cutCount") != 0:
        raise ValueError("render profile may not introduce a camera cut")
    if camera.get("continuousMove") is not True:
        raise ValueError("render profile must preserve the continuous camera move")
    if camera.get("lensMillimeters") != 100.0:
        raise ValueError("render profile must preserve the 100 mm macro lens")

    water = profile.get("water", {})
    if water.get("source") != "accepted Metal SPH field values":
        raise ValueError("render profile may not replace the SPH water source")
    if water.get("reconstruction") != "field-derived adaptive surface":
        raise ValueError("render profile must declare field-derived reconstruction")

    return profile
