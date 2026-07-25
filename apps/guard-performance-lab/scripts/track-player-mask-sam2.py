#!/usr/bin/env python3
"""Track one reviewed player mask through a local frame sequence with SAM 2.1.

The script writes only a compact, source-hashed mask-track receipt. It never
copies the source video into the application data model. Run it with the local
SAM 2 environment documented by the caller; no hosted inference is required.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from sam2.build_sam import build_sam2_video_predictor


def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", required=True, help="Directory of sequential JPEG frames named 00000.jpg, 00001.jpg, ...")
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--config", default="configs/sam2.1/sam2.1_hiera_s.yaml")
    parser.add_argument("--source-sha256", required=True)
    parser.add_argument("--segment-id", required=True)
    parser.add_argument("--start-ms", type=int, required=True)
    parser.add_argument("--sample-fps", type=float, required=True)
    parser.add_argument("--source-width", type=int, required=True)
    parser.add_argument("--source-height", type=int, required=True)
    parser.add_argument("--seed-frame", type=int, required=True)
    parser.add_argument("--seed-box", required=True, help="x,y,width,height in extracted-frame pixels")
    parser.add_argument(
        "--reseed",
        action="append",
        default=[],
        help="Optional reviewed correction as frameIndex:x,y,width,height; repeat for periodic reseeds",
    )
    parser.add_argument("--reviewer", choices=["user", "codex"], default="user")
    parser.add_argument("--output", required=True)
    parser.add_argument("--diagnostics-output", help="Optional private JSON file containing per-frame mask-logit diagnostics")
    parser.add_argument("--device", choices=["mps", "cpu"], default="mps")
    return parser.parse_args()


def parse_reseeds(values: list[str], frame_count: int):
    reseeds = []
    seen = set()
    for value in values:
        try:
            frame_text, box_text = value.split(":", 1)
            frame_index = int(frame_text)
            box = [int(part) for part in box_text.split(",")]
        except (ValueError, TypeError) as error:
            raise ValueError("--reseed must be frameIndex:x,y,width,height") from error
        if len(box) != 4 or min(box[2:]) <= 0:
            raise ValueError("--reseed must contain a positive x,y,width,height box")
        if not 0 <= frame_index < frame_count:
            raise ValueError("--reseed frame is outside the extracted frame sequence")
        if frame_index in seen:
            raise ValueError(f"--reseed repeats frame {frame_index}")
        seen.add(frame_index)
        reseeds.append({"frameIndex": frame_index, "box": box})
    return sorted(reseeds, key=lambda reseed: reseed["frameIndex"])


def sha256(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def mask_sample(frame_index: int, logits: torch.Tensor, start_ms: int, sample_fps: float, seed_frame: int, reseed_frames: set[int], scale_x: float, scale_y: float):
    scores = logits.detach().float().cpu().numpy().squeeze()
    mask = scores > 0
    ys, xs = np.where(mask)
    if not len(xs):
        return None
    x1, x2, y1, y2 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    bottom = ys >= y2 - max(2, round((y2 - y1 + 1) * 0.04))
    foot_x = float(np.median(xs[bottom])) if np.any(bottom) else float((x1 + x2) / 2)
    confidence = float(torch.sigmoid(torch.from_numpy(scores[mask])).mean().item())
    return {
        "timeMs": round(start_ms + frame_index / sample_fps * 1000),
        "box": [round(x1 * scale_x), round(y1 * scale_y), max(1, round((x2 - x1 + 1) * scale_x)), max(1, round((y2 - y1 + 1) * scale_y))],
        "foot": [round(foot_x * scale_x, 2), round(y2 * scale_y, 2)],
        "confidence": round(confidence, 4),
        "provenance": "seed" if frame_index == seed_frame else "reviewed" if frame_index in reseed_frames else "propagated",
        "quality": {"maskAreaPixels": int(mask.sum()), "meanPositiveLogit": round(float(scores[mask].mean()), 4)},
    }


def mask_diagnostic(frame_index: int, logits: torch.Tensor):
    scores = logits.detach().float().cpu().numpy().squeeze()
    return {
        "frameIndex": frame_index,
        "minLogit": round(float(scores.min()), 4),
        "maxLogit": round(float(scores.max()), 4),
        "positivePixels": int((scores > 0).sum()),
    }


def main():
    args = arguments()
    frames_path = Path(args.frames).resolve()
    checkpoint_path = Path(args.checkpoint).resolve()
    frame_paths = sorted(frames_path.glob("*.jpg"))
    if not frame_paths:
        raise SystemExit("No JPEG frames were found.")
    if len(args.source_sha256) != 64:
        raise SystemExit("--source-sha256 must be a 64-character receipt hash.")
    seed_box = [int(value) for value in args.seed_box.split(",")]
    if len(seed_box) != 4 or min(seed_box[2:]) <= 0:
        raise SystemExit("--seed-box must be x,y,width,height with a positive size.")
    if not 0 <= args.seed_frame < len(frame_paths):
        raise SystemExit("--seed-frame is outside the extracted frame sequence.")
    try:
        reseeds = parse_reseeds(args.reseed, len(frame_paths))
    except ValueError as error:
        raise SystemExit(str(error)) from error
    if any(reseed["frameIndex"] == args.seed_frame for reseed in reseeds):
        raise SystemExit("--reseed must not reuse the entry seed frame.")
    with Image.open(frame_paths[0]) as first_frame:
        extracted_width, extracted_height = first_frame.size
    scale_x, scale_y = args.source_width / extracted_width, args.source_height / extracted_height

    os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
    device = torch.device(args.device if args.device == "cpu" or torch.backends.mps.is_available() else "cpu")
    predictor = build_sam2_video_predictor(args.config, str(checkpoint_path), device=device)
    state = predictor.init_state(str(frames_path), offload_video_to_cpu=True, offload_state_to_cpu=True)
    x, y, width, height = seed_box
    box = np.array([x, y, x + width, y + height], dtype=np.float32)
    predictor.add_new_points_or_box(state, frame_idx=args.seed_frame, obj_id=13, box=box)
    for reseed in reseeds:
        reseed_x, reseed_y, reseed_width, reseed_height = reseed["box"]
        reseed_box = np.array(
            [reseed_x, reseed_y, reseed_x + reseed_width, reseed_y + reseed_height],
            dtype=np.float32,
        )
        predictor.add_new_points_or_box(state, frame_idx=reseed["frameIndex"], obj_id=13, box=reseed_box)

    samples = []
    diagnostics = []
    reseed_frames = {reseed["frameIndex"] for reseed in reseeds}
    directions = [(False, len(frame_paths)), (True, args.seed_frame)] if args.seed_frame else [(False, len(frame_paths))]
    for reverse, count in directions:
        for frame_index, object_ids, mask_logits in predictor.propagate_in_video(
            state,
            start_frame_idx=args.seed_frame,
            max_frame_num_to_track=count,
            reverse=reverse,
        ):
            target_index = object_ids.index(13)
            target_logits = mask_logits[target_index]
            diagnostics.append({**mask_diagnostic(frame_index, target_logits), "reverse": reverse})
            sample = mask_sample(frame_index, target_logits, args.start_ms, args.sample_fps, args.seed_frame, reseed_frames, scale_x, scale_y)
            if sample is not None:
                samples.append(sample)

    samples = sorted({sample["timeMs"]: sample for sample in samples}.values(), key=lambda sample: sample["timeMs"])
    end_ms = round(args.start_ms + (len(frame_paths) - 1) / args.sample_fps * 1000)
    receipt = {
        "version": 1,
        "profile": "guard-player-mask-track-v1",
        "sourceSha256": args.source_sha256,
        "coordinateSpace": {"width": args.source_width, "height": args.source_height},
        "engine": {
            "name": "sam2.1-video-local",
            "model": "sam2.1_hiera_small",
            "modelSha256": sha256(checkpoint_path),
            "device": str(device),
        },
        "participation": [{"startMs": args.start_ms, "endMs": end_ms, "state": "active", "evidence": f"Reviewed {args.segment_id} seed; mask propagation remains subject to fusion gates."}],
        "segments": [{
            "id": args.segment_id,
            "startMs": args.start_ms,
            "endMs": end_ms,
            "seed": {"timeMs": round(args.start_ms + args.seed_frame / args.sample_fps * 1000), "box": [round(seed_box[0] * scale_x), round(seed_box[1] * scale_y), max(1, round(seed_box[2] * scale_x)), max(1, round(seed_box[3] * scale_y))], "reviewer": args.reviewer},
            "samples": samples,
        }],
    }
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    temporary.write_text(json.dumps(receipt, indent=2) + "\n")
    temporary.replace(destination)
    if args.diagnostics_output:
        diagnostic_destination = Path(args.diagnostics_output)
        diagnostic_destination.parent.mkdir(parents=True, exist_ok=True)
        diagnostic_temporary = diagnostic_destination.with_suffix(diagnostic_destination.suffix + ".tmp")
        diagnostic_temporary.write_text(json.dumps(diagnostics, indent=2) + "\n")
        diagnostic_temporary.replace(diagnostic_destination)
    print(json.dumps({"ok": True, "output": str(destination), "device": str(device), "frames": len(frame_paths), "samples": len(samples), "reseeds": len(reseeds)}, indent=2))


if __name__ == "__main__":
    main()
