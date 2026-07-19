#!/usr/bin/env python3
"""Assemble the five approved Sora shot cells into the 20-second master."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path


ASSET_SLUG = "create-something-stop-motion-signal-proof.v20260719"
OUTPUT_NAME = "signal-decision-proof--v10--sora-five-shot--20s--16x9--v20260719.mp4"
SHOT_NAMES = (
    "signal-decision-proof--v10--sora-shot-01-macro-signal--4s--16x9--v20260719.mp4",
    "signal-decision-proof--v10--sora-shot-02-spatial-approach--4s--16x9--v20260719.mp4",
    "signal-decision-proof--v10--sora-shot-03-gate-insert--4s--16x9--v20260719.mp4",
    "signal-decision-proof--v10--sora-shot-04-action-passage-from-scout--4s--16x9--v20260719.mp4",
    "signal-decision-proof--v10--sora-shot-05-proof-hero--4s--16x9--v20260719.mp4",
)


def run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, text=True, capture_output=True)


def verify(output: Path) -> dict[str, object]:
    probe = json.loads(
        run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-show_entries",
                "stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,sample_rate",
                "-of",
                "json",
                str(output),
            ]
        ).stdout
    )
    streams = probe.get("streams", [])
    video = next(stream for stream in streams if stream.get("codec_type") == "video")
    audio = next(stream for stream in streams if stream.get("codec_type") == "audio")
    checks = {
        "duration": abs(float(probe["format"]["duration"]) - 20.0) <= 0.001,
        "dimensions": (video.get("width"), video.get("height")) == (1280, 720),
        "frameRate": video.get("r_frame_rate") == "24/1",
        "frameCount": int(video.get("nb_frames", 0)) == 480,
        "h264": video.get("codec_name") == "h264",
        "aac": audio.get("codec_name") == "aac",
        "noSubtitleStream": not any(
            stream.get("codec_type") == "subtitle" for stream in streams
        ),
    }
    return {"valid": all(checks.values()), "checks": checks, "probe": probe}


def main() -> None:
    repository = Path(__file__).resolve().parents[3]
    default_asset_root = (
        repository / "packages" / "agency" / "content" / "assets" / "brand" / ASSET_SLUG
    )
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset-root", type=Path, default=default_asset_root)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--receipt", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise SystemExit("ffmpeg and ffprobe are required")

    asset_root = args.asset_root.resolve()
    inputs = [asset_root / "exports" / name for name in SHOT_NAMES]
    narration = repository / "packages" / "motion-studio" / "public" / "signal-decision-proof" / "narration.m4a"
    output = (args.output or asset_root / "exports" / OUTPUT_NAME).resolve()
    receipt = (
        args.receipt
        or asset_root / "receipts" / "sora-assembly-verification--v10.json"
    ).resolve()

    missing = [path for path in [*inputs, narration] if not path.is_file()]
    if missing:
        raise SystemExit("Missing assembly inputs:\n" + "\n".join(map(str, missing)))

    filters = [
        f"[{index}:v]trim=duration=4,setpts=PTS-STARTPTS,fps=24,format=yuv420p[v{index}]"
        for index in range(5)
    ]
    filters.extend(
        [
            "".join(f"[v{index}]" for index in range(5))
            + "concat=n=5:v=1:a=0[outv]",
            "[5:a]aresample=48000,atrim=duration=20,apad=whole_dur=20,"
            "asetpts=PTS-STARTPTS[outa]",
        ]
    )
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for path in inputs:
        command.extend(["-i", str(path)])
    command.extend(
        [
            "-i",
            str(narration),
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[outv]",
            "-map",
            "[outa]",
            "-t",
            "20",
            "-r",
            "24",
            "-c:v",
            "libx264",
            "-crf",
            "15",
            "-pix_fmt",
            "yuv420p",
            "-profile:v",
            "high",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            str(output),
        ]
    )

    if args.dry_run:
        print(json.dumps({"command": command, "output": str(output)}, indent=2))
        return

    output.parent.mkdir(parents=True, exist_ok=True)
    receipt.parent.mkdir(parents=True, exist_ok=True)
    run(command)
    result = verify(output)
    payload = {
        "output": str(output),
        "inputs": [str(path) for path in inputs],
        "narration": str(narration),
        "edit": {
            "shotDurationsSeconds": [4, 4, 4, 4, 4],
            "cutPointsSeconds": [4, 8, 12, 16],
            "transition": "hard-cut",
        },
        **result,
    }
    receipt.write_text(json.dumps(payload, indent=2) + "\n")
    if not result["valid"]:
        raise SystemExit(f"Assembly failed verification; see {receipt}")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
