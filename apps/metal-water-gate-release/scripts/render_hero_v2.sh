#!/usr/bin/env bash
set -euo pipefail

PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-checkpoints}"
FIELD_SHA256="9b47b64842431da837b228df80e72874aff1cba648900fdf36b46a4f9c8fcf5f"
FIELD_PATH="$PACKAGE_ROOT/output/sph-field--v1.json"
BLENDER="${BLENDER:-/Applications/Blender.app/Contents/MacOS/blender}"
FFMPEG="${FFMPEG:-/opt/homebrew/bin/ffmpeg}"
WIDTH="${WIDTH:-1280}"
HEIGHT="${HEIGHT:-720}"
SAMPLES="${SAMPLES:-16}"
ENGINE="${ENGINE:-cycles}"
FRAMES_DIR="$PACKAGE_ROOT/output/blender-hero-${MODE}--v2"
RECEIPT="$PACKAGE_ROOT/receipts/blender-hero-${MODE}--v2.json"

case "$MODE" in
  checkpoints)
    FRAMES="65,72,73,84,96,108,121"
    ;;
  wedge)
    FRAMES="$(seq 65 121 | paste -sd, -)"
    ;;
  full)
    FRAMES="all"
    ;;
  *)
    echo "mode must be checkpoints, wedge, or full" >&2
    exit 2
    ;;
esac

if [[ "$MODE" != "checkpoints" && "$ENGINE" != "cycles" ]]; then
  echo "hero-v2 wedge and full final pixels require ENGINE=cycles" >&2
  exit 2
fi

mkdir -p "$FRAMES_DIR" "$PACKAGE_ROOT/exports" "$PACKAGE_ROOT/receipts"

"$BLENDER" --background --python "$PACKAGE_ROOT/blender/render_gate_release.py" -- \
  --field "$FIELD_PATH" \
  --expected-field-sha256 "$FIELD_SHA256" \
  --output-dir "$FRAMES_DIR" \
  --receipt "$RECEIPT" \
  --save-blend "$PACKAGE_ROOT/output/blender-gate-release--hero-v2.blend" \
  --width "$WIDTH" --height "$HEIGHT" --samples "$SAMPLES" \
  --frames "$FRAMES" --profile hero-v2 --engine "$ENGINE"

if [[ "$MODE" == "wedge" ]]; then
  EXPORT_PATH="$PACKAGE_ROOT/exports/create-something--sph-blender-gate-release--hero-wedge--v2.mp4"
  "$FFMPEG" -hide_banner -loglevel error -y \
    -framerate 24 -start_number 65 -i "$FRAMES_DIR/frame-%04d.png" \
    -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
    -filter:v "tmix=frames=3:weights='1 10 1',noise=all_seed=1129521190:alls=1:allf=t+u" \
    -frames:v 57 -t 2.375 -c:v libx264 -profile:v high -level 4.0 \
    -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart \
    -c:a aac -b:a 128k -shortest "$EXPORT_PATH"
  python3 "$PACKAGE_ROOT/scripts/verify_blender_video.py" \
    "$EXPORT_PATH" "$PACKAGE_ROOT/receipts/blender-hero-wedge-video--v2.json" 57 2.375
elif [[ "$MODE" == "full" ]]; then
  EXPORT_PATH="$PACKAGE_ROOT/exports/create-something--sph-blender-gate-release--8s--16x9--v2.mp4"
  "$FFMPEG" -hide_banner -loglevel error -y \
    -framerate 24 -start_number 0 -i "$FRAMES_DIR/frame-%04d.png" \
    -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
    -filter:v "tmix=frames=3:weights='1 10 1',noise=all_seed=1129521190:alls=1:allf=t+u" \
    -frames:v 192 -t 8 -c:v libx264 -profile:v high -level 4.0 \
    -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart \
    -c:a aac -b:a 128k -shortest "$EXPORT_PATH"
  python3 "$PACKAGE_ROOT/scripts/verify_blender_video.py" \
    "$EXPORT_PATH" "$PACKAGE_ROOT/receipts/blender-video-verification--v2.json"
fi

echo "Rendered hero-v2 $MODE"
