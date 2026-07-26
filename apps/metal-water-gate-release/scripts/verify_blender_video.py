#!/usr/bin/env python3
"""Verify the final delivery surface rather than trusting Blender frames."""

import hashlib
import json
import pathlib
import subprocess
import sys


def main():
    if len(sys.argv) not in (3, 5):
        raise SystemExit(
            "usage: verify_blender_video.py <video.mp4> <receipt.json> "
            "[expected-frames expected-duration-seconds]"
        )
    video_path = pathlib.Path(sys.argv[1])
    receipt_path = pathlib.Path(sys.argv[2])
    expected_frames = int(sys.argv[3]) if len(sys.argv) == 5 else 192
    expected_duration = float(sys.argv[4]) if len(sys.argv) == 5 else 8.0
    probe = json.loads(subprocess.check_output([
        "/opt/homebrew/bin/ffprobe", "-v", "error", "-show_streams",
        "-show_format", "-count_frames", "-of", "json", str(video_path),
    ]))
    subprocess.run([
        "/opt/homebrew/bin/ffmpeg", "-v", "error", "-i", str(video_path),
        "-map", "0:v:0", "-f", "null", "-",
    ], check=True)
    video = next(stream for stream in probe["streams"] if stream["codec_type"] == "video")
    audio = next(stream for stream in probe["streams"] if stream["codec_type"] == "audio")
    checks = {
        "dimensions": video["width"] == 1280 and video["height"] == 720,
        "codec": video["codec_name"] == "h264" and video.get("profile") == "High",
        "pixelFormat": video["pix_fmt"] == "yuv420p",
        "frameRate": video["avg_frame_rate"] == "24/1",
        "frameCount": int(video["nb_read_frames"]) == expected_frames,
        "duration": abs(float(probe["format"]["duration"]) - expected_duration) < 0.001,
        "aacAudio": audio["codec_name"] == "aac",
        "noCaptions": not any(s["codec_type"] == "subtitle" for s in probe["streams"]),
        "fullDecode": True,
    }
    receipt = {
        "schemaVersion": 1,
        "path": str(video_path.resolve()),
        "sha256": hashlib.sha256(video_path.read_bytes()).hexdigest(),
        "sizeBytes": video_path.stat().st_size,
        "width": video["width"],
        "height": video["height"],
        "videoCodec": video["codec_name"],
        "profile": video.get("profile"),
        "pixelFormat": video["pix_fmt"],
        "frameRate": video["avg_frame_rate"],
        "videoFrameCount": int(video["nb_read_frames"]),
        "durationSeconds": float(probe["format"]["duration"]),
        "audioCodec": audio["codec_name"],
        "subtitleStreamCount": sum(s["codec_type"] == "subtitle" for s in probe["streams"]),
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
