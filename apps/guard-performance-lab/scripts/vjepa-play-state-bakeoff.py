#!/usr/bin/env python3
"""Produce a private, source-bound V-JEPA play-state candidate.

The frozen encoder may distinguish live basketball from stopped basketball.
It never receives identity, position, or automatic ledger-write authority.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROFILE = "guard-vjepa-play-state-candidate-v1"
LIVE_STATES = {"live-offense", "live-defense", "transition-offense", "transition-defense"}
STOPPED_STATES = {"dead-ball", "free-throw", "timeout", "substitution", "halftime"}
LABELS = ("live-basketball", "stopped-basketball")
WINDOW_DURATION_MS = 2000
FRAMES_PER_WINDOW = 16
CROP_SIZE = 384


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def label_for_state(state: str) -> str:
    if state in LIVE_STATES:
        return LABELS[0]
    if state in STOPPED_STATES:
        return LABELS[1]
    raise ValueError(f"Unsupported reviewed play state: {state}")


def build_window_plan(ledger: dict[str, Any]) -> list[dict[str, Any]]:
    eligible = []
    for interval in ledger.get("intervals", []):
        if interval.get("state") == "unknown" or interval.get("evidence", {}).get("method") != "source-review":
            continue
        duration_ms = int(interval["endMs"]) - int(interval["startMs"]) + 1
        if duration_ms < WINDOW_DURATION_MS:
            continue
        label = label_for_state(str(interval["state"]))
        offset = (duration_ms - WINDOW_DURATION_MS) // 2
        start_ms = int(interval["startMs"]) + offset
        eligible.append(
            {
                "id": f"{interval['id']}-center-{WINDOW_DURATION_MS}ms",
                "intervalId": str(interval["id"]),
                "startMs": start_ms,
                "endMs": start_ms + WINDOW_DURATION_MS - 1,
                "expectedLabel": label,
            }
        )

    by_label = {label: sorted((item for item in eligible if item["expectedLabel"] == label), key=lambda item: item["startMs"]) for label in LABELS}
    for label, windows in by_label.items():
        if len(windows) < 3:
            raise SystemExit(f"V-JEPA benchmark requires at least three independent reviewed intervals for {label}; found {len(windows)}.")

    heldout_ids = {item["intervalId"] for label in LABELS for item in by_label[label][-2:]}
    return [
        {**item, "split": "heldout" if item["intervalId"] in heldout_ids else "train"}
        for item in sorted(eligible, key=lambda item: item["startMs"])
    ]


def parse_args() -> argparse.Namespace:
    package = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Private source video. Never copied into the repository.")
    parser.add_argument("--source-sha256", required=True, help="Canonical SHA-256 used by the reviewed ledger.")
    parser.add_argument("--youtube-video-id", help="Required only when the input is a remux of the canonical YouTube upload.")
    parser.add_argument("--ledger", default=str(package / "fixtures/film/player-13-play-state-ledger.json"))
    parser.add_argument("--runtime", default=str(package / ".data/vjepa2-runtime"))
    parser.add_argument("--output", default=str(package / ".data/vjepa2-bakeoff/candidate.json"))
    parser.add_argument("--device", choices=("auto", "mps", "cpu", "cuda"), default="auto")
    return parser.parse_args()


def resolve_device(torch: Any, requested: str) -> str:
    if requested != "auto":
        return requested
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def probe_video(source: Path) -> dict[str, Any]:
    value = json.loads(
        subprocess.check_output(
            [
                "ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=width,height,r_frame_rate:format=duration",
                "-of", "json", str(source),
            ]
        )
    )
    stream = value["streams"][0]
    numerator, denominator = (int(part) for part in stream["r_frame_rate"].split("/"))
    return {
        "durationMs": round(float(value["format"]["duration"]) * 1000),
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "fps": numerator / denominator,
    }


def decode_window(source: Path, start_ms: int, end_ms: int) -> list[Any]:
    import cv2
    import numpy as np

    capture = cv2.VideoCapture(str(source))
    if not capture.isOpened():
        raise SystemExit(f"Could not open source video: {source}")
    frames = []
    try:
        for time_ms in np.linspace(start_ms, end_ms, FRAMES_PER_WINDOW):
            capture.set(cv2.CAP_PROP_POS_MSEC, float(time_ms))
            ok, frame = capture.read()
            if not ok:
                raise SystemExit(f"Could not decode source frame at {round(float(time_ms))}ms.")
            frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    finally:
        capture.release()
    return frames


def load_runtime(runtime: Path, device: str) -> tuple[Any, Any, dict[str, Any]]:
    import torch

    repository = runtime / "repo"
    checkpoint = runtime / "vjepa2_1_vitb_dist_vitG_384.pt"
    receipt_path = runtime / "runtime-receipt.json"
    if not repository.is_dir() or not checkpoint.is_file() or not receipt_path.is_file():
        raise SystemExit("V-JEPA runtime is incomplete. Run pnpm film:prepare:vjepa first.")
    receipt = json.loads(receipt_path.read_text())
    if sha256_file(checkpoint) != receipt.get("checkpointSha256"):
        raise SystemExit("V-JEPA checkpoint hash does not match the prepared runtime receipt.")
    sys.path.insert(0, str(repository))
    from src.hub.backbones import _clean_backbone_key, vjepa2_1_vit_base_384
    from evals.video_classification_frozen.utils import make_transforms

    encoder, _ = vjepa2_1_vit_base_384(pretrained=False, num_frames=FRAMES_PER_WINDOW)
    checkpoint_value = torch.load(checkpoint, map_location="cpu", weights_only=True, mmap=True)
    encoder.load_state_dict(_clean_backbone_key(checkpoint_value["ema_encoder"]), strict=True)
    encoder.eval().to(device)
    return encoder, make_transforms(crop_size=CROP_SIZE, training=False), receipt


def embedding_for_window(encoder: Any, transform: Any, frames: list[Any], device: str) -> Any:
    import torch

    video = transform(frames)[0].unsqueeze(0).to(device)
    with torch.inference_mode():
        tokens = encoder(video)
        embedding = tokens.mean(dim=1).float().cpu()[0]
    return embedding / embedding.norm().clamp_min(1e-12)


def cosine_predictions(windows: list[dict[str, Any]], embeddings: dict[str, Any]) -> dict[str, tuple[str, float]]:
    import torch

    centroids = {}
    for label in LABELS:
        training = [embeddings[item["id"]] for item in windows if item["split"] == "train" and item["expectedLabel"] == label]
        centroid = torch.stack(training).mean(dim=0)
        centroids[label] = centroid / centroid.norm().clamp_min(1e-12)

    predictions = {}
    for item in windows:
        scores = {label: float(torch.dot(embeddings[item["id"]], centroid)) for label, centroid in centroids.items()}
        predicted = max(LABELS, key=lambda label: scores[label])
        maximum = max(scores.values())
        probabilities = {label: math.exp(score - maximum) for label, score in scores.items()}
        confidence = probabilities[predicted] / sum(probabilities.values())
        predictions[item["id"]] = (predicted, confidence)
    return predictions


def main() -> None:
    args = parse_args()
    source = Path(args.source).resolve()
    ledger_path = Path(args.ledger).resolve()
    runtime = Path(args.runtime).resolve()
    output = Path(args.output).resolve()
    if not source.is_file():
        raise SystemExit(f"Source video does not exist: {source}")
    actual_source_hash = sha256_file(source)
    if actual_source_hash != args.source_sha256 and not args.youtube_video_id:
        raise SystemExit("Non-canonical source bytes require --youtube-video-id remux provenance.")
    ledger = json.loads(ledger_path.read_text())
    if ledger.get("sourceSha256") != args.source_sha256:
        raise SystemExit("Reviewed play-state ledger is bound to a different canonical source hash.")

    import torch

    device = resolve_device(torch, args.device)
    if device == "mps" and not torch.backends.mps.is_available():
        raise SystemExit("MPS was requested but is unavailable.")
    windows = build_window_plan(ledger)
    encoder, transform, runtime_receipt = load_runtime(runtime, device)
    started = time.perf_counter()
    embeddings = {}
    for index, item in enumerate(windows, start=1):
        print(f"[{index}/{len(windows)}] embedding {item['id']} on {device}", flush=True)
        embeddings[item["id"]] = embedding_for_window(
            encoder, transform, decode_window(source, item["startMs"], item["endMs"]), device
        )
    predictions = cosine_predictions(windows, embeddings)
    elapsed = time.perf_counter() - started

    candidate = {
        "version": 1,
        "profile": PROFILE,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceSha256": args.source_sha256,
        "input": (
            {"binding": "exact-source-bytes", "sha256": actual_source_hash}
            if actual_source_hash == args.source_sha256
            else {
                "binding": "youtube-remux",
                "sha256": actual_source_hash,
                "youtubeVideoId": args.youtube_video_id,
                **probe_video(source),
            }
        ),
        "model": {
            "family": "V-JEPA 2.1",
            "architecture": "vit_base_384",
            "codeSha256": runtime_receipt["codeSha256"],
            "checkpointSha256": runtime_receipt["checkpointSha256"],
            "device": device,
        },
        "authority": {"identity": "none", "positions": "none", "autoApply": False},
        "labels": list(LABELS),
        "sampling": {
            "framesPerWindow": FRAMES_PER_WINDOW,
            "windowDurationMs": WINDOW_DURATION_MS,
            "cropSize": CROP_SIZE,
            "spatialView": "center",
            "classifier": "nearest-centroid-cosine",
            "split": "temporal-last-two-intervals-per-label",
        },
        "processing": {"windowCount": len(windows), "wallSeconds": round(elapsed, 3)},
        "windows": [
            {
                "id": item["id"],
                "intervalId": item["intervalId"],
                "startMs": item["startMs"],
                "endMs": item["endMs"],
                "split": item["split"],
                "predictedLabel": predictions[item["id"]][0],
                "confidence": round(predictions[item["id"]][1], 6),
                "embeddingSha256": sha256_bytes(embeddings[item["id"]].numpy().tobytes()),
            }
            for item in windows
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(candidate, indent=2) + "\n")
    temporary.replace(output)
    print(json.dumps({"candidate": str(output), "candidateSha256": sha256_file(output), "device": device, "windows": len(windows)}))


if __name__ == "__main__":
    main()
