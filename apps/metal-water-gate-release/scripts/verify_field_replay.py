#!/usr/bin/env python3
"""Compare two real Metal SPH captures without pretending GPU floats are exact."""

import hashlib
import json
import math
import pathlib
import sys


def first_downstream(document):
    return next(
        (frame["frameIndex"] for frame in document["frames"]
         if frame["downstreamParticleCount"] > 0),
        None,
    )


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    if len(sys.argv) != 4:
        raise SystemExit(
            "usage: verify_field_replay.py <accepted.json> <replay.json> <receipt.json>"
        )

    accepted_path, replay_path, receipt_path = map(pathlib.Path, sys.argv[1:])
    accepted = json.loads(accepted_path.read_text())
    replay = json.loads(replay_path.read_text())

    if accepted["specification"] != replay["specification"]:
        raise SystemExit("capture specifications differ")
    if accepted["source"] != replay["source"]:
        raise SystemExit("capture provenance differs")
    if len(accepted["frames"]) != len(replay["frames"]):
        raise SystemExit("capture frame counts differ")

    cell_delta_sum = 0
    cell_squared_delta_sum = 0
    cell_count = 0
    maximum_cell_delta = 0
    maximum_field_value = 0
    maximum_downstream_relative_drift = 0.0
    maximum_downstream_absolute_drift = 0

    for accepted_frame, replay_frame in zip(
        accepted["frames"], replay["frames"], strict=True
    ):
        if accepted_frame["frameIndex"] != replay_frame["frameIndex"]:
            raise SystemExit("capture frame order differs")
        accepted_values = accepted_frame["values"]
        replay_values = replay_frame["values"]
        if len(accepted_values) != len(replay_values):
            raise SystemExit("capture field dimensions differ")

        for accepted_value, replay_value in zip(
            accepted_values, replay_values, strict=True
        ):
            delta = abs(accepted_value - replay_value)
            cell_delta_sum += delta
            cell_squared_delta_sum += delta * delta
            cell_count += 1
            maximum_cell_delta = max(maximum_cell_delta, delta)
            maximum_field_value = max(
                maximum_field_value, accepted_value, replay_value
            )

        accepted_downstream = accepted_frame["downstreamParticleCount"]
        replay_downstream = replay_frame["downstreamParticleCount"]
        absolute_drift = abs(accepted_downstream - replay_downstream)
        maximum_downstream_absolute_drift = max(
            maximum_downstream_absolute_drift, absolute_drift
        )
        denominator = max(accepted_downstream, replay_downstream)
        if denominator:
            maximum_downstream_relative_drift = max(
                maximum_downstream_relative_drift,
                absolute_drift / denominator,
            )

    field_mae = cell_delta_sum / max(cell_count, 1)
    normalized_field_mae = field_mae / max(maximum_field_value, 1)
    field_rmse = math.sqrt(cell_squared_delta_sum / max(cell_count, 1))
    gate_frame = accepted["specification"]["gateOpensAfterFrame"]
    accepted_gate_frame = accepted["frames"][gate_frame]
    replay_gate_frame = replay["frames"][gate_frame]
    maximum_overflow = max(
        frame["overflowCount"]
        for document in (accepted, replay)
        for frame in document["frames"]
    )

    checks = {
        "normalizedFieldMAEAtMostOnePercent": normalized_field_mae <= 0.01,
        "maximumDownstreamAbsoluteDriftAtMostThirtyTwoParticles": (
            maximum_downstream_absolute_drift <= 32
        ),
        "sameFirstDownstreamFrame": (
            first_downstream(accepted) == first_downstream(replay)
        ),
        "noDownstreamAtGateFrame": (
            accepted_gate_frame["downstreamParticleCount"] == 0
            and replay_gate_frame["downstreamParticleCount"] == 0
        ),
        "zeroOverflow": maximum_overflow == 0,
    }
    receipt = {
        "schemaVersion": 1,
        "acceptedCapture": {
            "path": str(accepted_path),
            "sha256": sha256(accepted_path),
        },
        "replayCapture": {
            "path": str(replay_path),
            "sha256": sha256(replay_path),
        },
        "fieldCellCount": cell_count,
        "fieldMAE": field_mae,
        "normalizedFieldMAE": normalized_field_mae,
        "fieldRMSE": field_rmse,
        "maximumCellDelta": maximum_cell_delta,
        "maximumFieldValue": maximum_field_value,
        "maximumDownstreamAbsoluteDrift": maximum_downstream_absolute_drift,
        "maximumDownstreamRelativeDrift": maximum_downstream_relative_drift,
        "acceptedFirstDownstreamFrame": first_downstream(accepted),
        "replayFirstDownstreamFrame": first_downstream(replay),
        "maximumOverflowCount": maximum_overflow,
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
