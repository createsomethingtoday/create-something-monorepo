#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "numpy==2.4.3",
#   "opencv-python-headless==4.13.0.92",
# ]
# ///
"""Classify the locked real-source crop fixture without correction overlays."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import cv2

from team_classifier import classify_team


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--source-sha256", required=True)
    parser.add_argument("--fixture", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def sha256(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    args = parse_args()
    source = Path(args.source)
    fixture = json.loads(Path(args.fixture).read_text())
    if sha256(source) != args.source_sha256 or fixture.get("sourceSha256") != args.source_sha256:
        raise SystemExit("Source hash does not match the locked team benchmark receipt.")
    capture = cv2.VideoCapture(str(source))
    frames = {}
    predictions = []
    for annotation in fixture["annotations"]:
        time_ms = annotation["timeMs"]
        if time_ms not in frames:
            capture.set(cv2.CAP_PROP_POS_MSEC, time_ms)
            ok, image = capture.read()
            if not ok:
                raise SystemExit(f"Could not decode benchmark frame {time_ms}ms.")
            frames[time_ms] = image
        classification = classify_team(frames[time_ms], annotation["box"])
        predictions.append({
            "id": annotation["id"],
            "predictedRole": classification.role,
            "courtMembership": classification.court_membership,
            "confidence": round(classification.confidence, 4),
            "corrected": False,
            "classification": classification.audit_dict(),
        })
    capture.release()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps({"sourceSha256": args.source_sha256, "correctionOverlayCount": 0, "predictions": predictions}, indent=2))
    temporary.replace(output)
    print(json.dumps({"ok": True, "output": str(output), "predictions": len(predictions), "correctionOverlayCount": 0}, indent=2))


if __name__ == "__main__":
    main()
