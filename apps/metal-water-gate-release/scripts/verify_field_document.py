#!/usr/bin/env python3
"""Fail closed on the immutable SPH field contract and write its receipt."""

import hashlib
import json
import pathlib
import sys


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    if len(sys.argv) != 4:
        raise SystemExit(
            "usage: verify_field_document.py <field.json> <expected-sha256> <receipt.json>"
        )
    field_path = pathlib.Path(sys.argv[1])
    expected_sha256 = sys.argv[2]
    receipt_path = pathlib.Path(sys.argv[3])
    document = json.loads(field_path.read_text())
    frames = document["frames"]
    specification = document["specification"]
    actual_sha256 = digest(field_path)
    gate_frame = specification["gateOpensAfterFrame"]
    first_downstream = next(
        (frame["frameIndex"] for frame in frames
         if frame["downstreamParticleCount"] > 0),
        None,
    )
    checks = {
        "immutableHash": actual_sha256 == expected_sha256,
        "schemaVersion": specification["schemaVersion"] == 1,
        "dimensions": specification["width"] == 96 and specification["height"] == 96,
        "frameCount": len(frames) == 192 and [f["frameIndex"] for f in frames] == list(range(192)),
        "particleCount": document["particleCount"] == 8192,
        "simulationStepsPerFrame": specification["simulationStepsPerFrame"] == 2,
        "fieldValueCount": all(len(frame["values"]) == 96 * 96 for frame in frames),
        "zeroOverflow": max(frame["overflowCount"] for frame in frames) == 0,
        "noDownstreamAtGateFrame": frames[gate_frame]["downstreamParticleCount"] == 0,
        "firstDownstreamFrame": first_downstream == 73,
        "explicitGateAperture": document["gateOpeningHalfWidth"] > 0,
    }
    receipt = {
        "schemaVersion": 1,
        "fieldPath": str(field_path.resolve()),
        "fieldSHA256": actual_sha256,
        "frameCount": len(frames),
        "particleCount": document["particleCount"],
        "simulationStepsPerFrame": specification["simulationStepsPerFrame"],
        "maximumOverflowCount": max(frame["overflowCount"] for frame in frames),
        "frame72DownstreamParticleCount": frames[gate_frame]["downstreamParticleCount"],
        "firstDownstreamFrame": first_downstream,
        "checks": checks,
        "passed": all(checks.values()),
    }
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
    print(json.dumps(receipt, indent=2, sort_keys=True))
    if not receipt["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
