#!/usr/bin/env python3
"""Verify causal and camera invariants in the rendered Blender scene itself."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--receipt", type=Path, required=True)
    separator = sys.argv.index("--") if "--" in sys.argv else len(sys.argv) - 1
    return parser.parse_args(sys.argv[separator + 1 :])


def distance(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return sum((left - right) ** 2 for left, right in zip(a, b, strict=True)) ** 0.5


def main() -> None:
    args = parse_args()
    scene = bpy.context.scene
    cube = bpy.data.objects["Single cobalt work packet"]
    receipt = bpy.data.objects["Physical proof receipt"]
    proof_camera = bpy.data.objects["Shot 4 - 100mm monumental proof hero"]
    proof_target = bpy.data.objects["Shot 4 - 100mm monumental proof hero target"]
    slats = [bpy.data.objects[f"Physical gate slat {index:02d}"] for index in range(1, 10)]
    belt_travel = bpy.data.materials["Moving optic conveyor belt"].node_tree.nodes[
        "Conveyor belt travel"
    ].inputs["Location"]

    previous_x = float("-inf")
    first_passage_frame: int | None = None
    receipt_hidden_before_proof = True
    cube_monotonic = True

    for frame in range(scene.frame_start, scene.frame_end + 1):
        scene.frame_set(frame)
        cube_x = cube.location.x
        if cube_x < previous_x - 1e-5:
            cube_monotonic = False
        previous_x = cube_x
        if first_passage_frame is None and cube_x >= 0:
            first_passage_frame = frame
        if frame < 360 and receipt.location.z > -0.61:
            receipt_hidden_before_proof = False
    if first_passage_frame is None:
        raise AssertionError("Cube never passes the gate")

    scene.frame_set(first_passage_frame)
    gate_clear_before_passage = all(slat.scale.z <= 0.1 for slat in slats)

    markers = sorted(
        (marker.frame, marker.camera.name, round(marker.camera.data.lens))
        for marker in scene.timeline_markers
        if marker.camera
    )
    expected_markers = [
        (1, "Shot 1 - 100mm ground macro packet", 100),
        (121, "Shot 2 - 50mm spatial decision context", 50),
        (253, "Shot 3 - 85mm gate action", 85),
        (361, "Shot 4 - 100mm monumental proof hero", 100),
    ]

    maximum_in_shot_camera_step = 0.0
    for start, end, camera_name in (
        (1, 120, expected_markers[0][1]),
        (121, 252, expected_markers[1][1]),
        (253, 360, expected_markers[2][1]),
        (361, 480, expected_markers[3][1]),
    ):
        camera = bpy.data.objects[camera_name]
        previous_camera: tuple[float, float, float] | None = None
        for frame in range(start, end + 1):
            scene.frame_set(frame)
            location = tuple(camera.location)
            if previous_camera is not None:
                maximum_in_shot_camera_step = max(
                    maximum_in_shot_camera_step,
                    distance(previous_camera, location),
                )
            previous_camera = location

    belt_positions: dict[int, float] = {}
    for frame in (48, 144, 252, 360, 432, 480):
        scene.frame_set(frame)
        belt_positions[frame] = belt_travel.default_value[0]

    scene.frame_set(432)
    terminal_432 = {
        "camera": tuple(proof_camera.location),
        "target": tuple(proof_target.location),
        "cube": tuple(cube.location),
        "receipt": tuple(receipt.location),
        "belt": (belt_travel.default_value[0], 0, 0),
    }
    scene.frame_set(480)
    terminal_480 = {
        "camera": tuple(proof_camera.location),
        "target": tuple(proof_target.location),
        "cube": tuple(cube.location),
        "receipt": tuple(receipt.location),
        "belt": (belt_travel.default_value[0], 0, 0),
    }
    terminal_hold = all(
        distance(terminal_432[key], terminal_480[key]) < 1e-6
        for key in terminal_432
    )

    checks = {
        "duration": scene.render.fps == 24 and scene.frame_start == 1 and scene.frame_end == 480,
        "dimensions": scene.render.resolution_x == 1280 and scene.render.resolution_y == 720,
        "fourMotivatedShots": markers == expected_markers,
        "cubeMonotonic": cube_monotonic,
        "gateClearBeforePassage": gate_clear_before_passage,
        "receiptHiddenBeforeProof": receipt_hidden_before_proof,
        "cameraContinuousWithinShots": maximum_in_shot_camera_step < 0.05,
        "beltMovesWithPacket": belt_positions[144] < belt_positions[48] - 4
        and belt_positions[360] < belt_positions[252] - 4,
        "beltStopsForTerminalHold": abs(belt_positions[480] - belt_positions[432]) < 1e-6,
        "terminalHold": terminal_hold,
    }
    valid = all(checks.values())
    result = {
        "scene": bpy.data.filepath,
        "valid": valid,
        "checks": checks,
        "firstPassageFrame": first_passage_frame,
        "shotMarkers": markers,
        "beltPositions": belt_positions,
        "maximumInShotCameraStep": maximum_in_shot_camera_step,
    }
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    if not valid:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
