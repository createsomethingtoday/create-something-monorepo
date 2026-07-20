#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "inference-sdk==1.3.5",
#   "numpy==2.3.5",
#   "opencv-python-headless==4.13.0.92",
# ]
# ///
"""Benchmark Roboflow's basketball court keypoints on approved source frames.

This command sends only the requested decoded frames to Roboflow Serverless.
The source video, API key, and full raw responses are never committed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROFILE = "guard-roboflow-court-benchmark-v1"
MODEL_ID = "basketball-court-detection-2/22"
DEFAULT_TIMES_MS = (240000, 1060000, 1700000, 1925000, 2342000, 3030000, 3100000)
MIN_KEYPOINT_CONFIDENCE = 0.5
MIN_HYPOTHESIS_MARGIN = 0.05
CM_PER_FOOT = 30.48

# Canonical 94x50-foot court landmarks from Roboflow Sports' basketball
# configuration. Labels intentionally follow the source dataset skeleton.
COURT_POINTS_CM = {
    "01": (0, 0), "02": (0, 91), "04": (0, 518), "05": (0, 1006),
    "07": (0, 1433), "08": (0, 1524), "09": (160, 762), "10": (424, 91),
    "11": (424, 1433), "12": (579, 518), "13": (579, 762), "14": (579, 1006),
    "15": (835, 0), "16": (884, 762), "17": (835, 1524), "19": (1432, 0),
    "21": (1432, 762), "23": (1432, 1524), "25": (2030, 0), "26": (1981, 762),
    "27": (2030, 1524), "28": (2286, 518), "29": (2286, 762), "30": (2286, 1006),
    "31": (2441, 91), "32": (2441, 1433), "33": (2705, 762), "34": (2865, 0),
    "35": (2865, 91), "37": (2865, 518), "38": (2865, 1006), "40": (2865, 1433),
    "41": (2865, 1524),
}
LABEL_ORDER = tuple(COURT_POINTS_CM)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_json(path: Path, value: Any) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n")
    temporary.replace(path)
    return sha256_file(path)


def percentile(values: list[float], proportion: float) -> float:
    if not values:
        raise ValueError("A percentile requires at least one value.")
    ordered = sorted(values)
    return ordered[max(0, math.ceil(len(ordered) * proportion) - 1)]


def choose_prediction(predictions: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, float | None, bool]:
    if not predictions:
        return None, None, True
    ranked = sorted(predictions, key=lambda item: float(item.get("confidence", 0)), reverse=True)
    margin = float(ranked[0].get("confidence", 0)) - float(ranked[1].get("confidence", 0)) if len(ranked) > 1 else 1.0
    return ranked[0], round(margin, 6), margin < MIN_HYPOTHESIS_MARGIN


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--source-sha256", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--raw-output", required=True)
    parser.add_argument("--times-ms", default=",".join(map(str, DEFAULT_TIMES_MS)))
    parser.add_argument("--generated-at")
    return parser.parse_args()


def decode_frames(source: Path, times_ms: list[int]) -> dict[int, Any]:
    import cv2

    capture = cv2.VideoCapture(str(source))
    if not capture.isOpened():
        raise SystemExit("Could not open the supplied source video.")
    frames = {}
    try:
        for time_ms in times_ms:
            capture.set(cv2.CAP_PROP_POS_MSEC, time_ms)
            ok, image = capture.read()
            if not ok:
                raise SystemExit(f"Could not decode court benchmark frame {time_ms}ms.")
            frames[time_ms] = image
    finally:
        capture.release()
    return frames


def frame_geometry(time_ms: int, response: dict[str, Any]) -> tuple[dict[str, Any], list[float]]:
    import cv2
    import numpy as np

    chosen, margin, ambiguous = choose_prediction(response.get("predictions", []))
    if not chosen:
        return {
            "timeMs": time_ms,
            "predictionCount": 0,
            "hypothesisConfidenceMargin": None,
            "ambiguous": True,
            "fitPointCount": 0,
            "heldOutCount": 0,
            "medianErrorFeet": None,
            "p95ErrorFeet": None,
        }, []
    points = {
        str(item["class"]): item
        for item in chosen.get("keypoints", [])
        if str(item.get("class")) in COURT_POINTS_CM and float(item.get("confidence", 0)) >= MIN_KEYPOINT_CONFIDENCE
    }
    visible_labels = [label for label in LABEL_ORDER if label in points]
    heldout_labels = [label for index, label in enumerate(visible_labels) if index % 4 == 0]
    fit_labels = [label for label in visible_labels if label not in heldout_labels]
    if len(fit_labels) < 4 or len(heldout_labels) < 2:
        return {
            "timeMs": time_ms,
            "predictionCount": len(response.get("predictions", [])),
            "hypothesisConfidenceMargin": margin,
            "ambiguous": True,
            "fitPointCount": len(fit_labels),
            "heldOutCount": len(heldout_labels),
            "medianErrorFeet": None,
            "p95ErrorFeet": None,
        }, []
    image_fit = np.array([[points[label]["x"], points[label]["y"]] for label in fit_labels], dtype=np.float32)
    court_fit = np.array(
        [[COURT_POINTS_CM[label][0] / CM_PER_FOOT, COURT_POINTS_CM[label][1] / CM_PER_FOOT] for label in fit_labels],
        dtype=np.float32,
    )
    matrix, _ = cv2.findHomography(image_fit, court_fit, method=0)
    if matrix is None:
        return {
            "timeMs": time_ms,
            "predictionCount": len(response.get("predictions", [])),
            "hypothesisConfidenceMargin": margin,
            "ambiguous": True,
            "fitPointCount": len(fit_labels),
            "heldOutCount": len(heldout_labels),
            "medianErrorFeet": None,
            "p95ErrorFeet": None,
        }, []
    image_heldout = np.array([[[points[label]["x"], points[label]["y"]] for label in heldout_labels]], dtype=np.float32)
    projected = cv2.perspectiveTransform(image_heldout, matrix)[0]
    expected = np.array(
        [[COURT_POINTS_CM[label][0] / CM_PER_FOOT, COURT_POINTS_CM[label][1] / CM_PER_FOOT] for label in heldout_labels],
        dtype=np.float32,
    )
    errors = [float(value) for value in np.linalg.norm(projected - expected, axis=1)]
    return {
        "timeMs": time_ms,
        "predictionCount": len(response.get("predictions", [])),
        "selectedConfidence": round(float(chosen["confidence"]), 6),
        "hypothesisConfidenceMargin": margin,
        "ambiguous": ambiguous,
        "fitPointCount": len(fit_labels),
        "heldOutCount": len(heldout_labels),
        "medianErrorFeet": round(percentile(errors, 0.5), 3),
        "p95ErrorFeet": round(percentile(errors, 0.95), 3),
    }, errors


def main() -> None:
    from inference_sdk import InferenceHTTPClient

    args = parse_args()
    source = Path(args.source)
    if not source.is_file() or sha256_file(source) != args.source_sha256:
        raise SystemExit("Source bytes do not match --source-sha256.")
    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        raise SystemExit("ROBOFLOW_API_KEY must be injected from a secret manager.")
    times_ms = sorted({int(value) for value in args.times_ms.split(",") if value})
    frames = decode_frames(source, times_ms)
    client = InferenceHTTPClient(api_url="https://serverless.roboflow.com", api_key=api_key)
    raw = {"sourceSha256": args.source_sha256, "modelId": MODEL_ID, "frames": []}
    started = time.perf_counter()
    for time_ms, image in frames.items():
        raw["frames"].append({"timeMs": time_ms, "response": client.infer(image, model_id=MODEL_ID)})
    wall_seconds = time.perf_counter() - started
    raw_path = Path(args.raw_output)
    raw_hash = atomic_json(raw_path, raw)
    metrics = []
    errors: list[float] = []
    for frame in raw["frames"]:
        metric, frame_errors = frame_geometry(frame["timeMs"], frame["response"])
        metrics.append(metric)
        errors.extend(frame_errors)
    median = round(percentile(errors, 0.5), 3) if errors else None
    p95 = round(percentile(errors, 0.95), 3) if errors else None
    ambiguous_count = sum(bool(metric["ambiguous"]) for metric in metrics)
    passed = bool(errors and median <= 2 and p95 <= 4 and ambiguous_count == 0)
    receipt = {
        "version": 1,
        "profile": PROFILE,
        "generatedAt": args.generated_at or datetime.now(timezone.utc).isoformat(),
        "sourceSha256": args.source_sha256,
        "model": {
            "provider": "Roboflow Serverless",
            "modelId": MODEL_ID,
            "task": "basketball-court-keypoint-detection",
            "datasetLicense": "CC BY 4.0",
            "datasetLandmarkCount": len(COURT_POINTS_CM),
        },
        "configuration": {
            "keypointConfidenceThreshold": MIN_KEYPOINT_CONFIDENCE,
            "minimumHypothesisMargin": MIN_HYPOTHESIS_MARGIN,
            "heldOutRule": "every-fourth-visible-canonical-landmark",
            "selectionRule": "highest-court-object-confidence",
        },
        "coverage": {"requestedFrames": len(times_ms), "scoredFrames": sum(metric["heldOutCount"] >= 2 for metric in metrics)},
        "processing": {"wallSeconds": round(wall_seconds, 3), "framesPerSecond": round(len(times_ms) / wall_seconds, 3)},
        "validation": {
            "heldOutCount": len(errors),
            "medianErrorFeet": median,
            "p95ErrorFeet": p95,
            "ambiguousFrameCount": ambiguous_count,
            "sourceBacked": True,
            "passed": passed,
            "reason": None
            if passed
            else "Court hypotheses are ambiguous or held-out error exceeds the 2ft median / 4ft p95 gate.",
        },
        "frames": metrics,
        "rawPredictionsSha256": raw_hash,
    }
    receipt_hash = atomic_json(Path(args.output), receipt)
    print(json.dumps({"ok": True, "output": args.output, "receiptSha256": receipt_hash, "validation": receipt["validation"]}, indent=2))


if __name__ == "__main__":
    main()
