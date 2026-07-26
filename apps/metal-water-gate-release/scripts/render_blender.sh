#!/usr/bin/env bash
set -euo pipefail

PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-v1}"
FIELD_SHA256="${FIELD_SHA256:-9b47b64842431da837b228df80e72874aff1cba648900fdf36b46a4f9c8fcf5f}"
FIELD_PATH="$PACKAGE_ROOT/output/sph-field--v1.json"
FRAMES_DIR="$PACKAGE_ROOT/output/blender-frames--$VERSION"
EXPORT_PATH="$PACKAGE_ROOT/exports/create-something--sph-blender-gate-release--8s--16x9--$VERSION.mp4"
RECEIPTS_DIR="$PACKAGE_ROOT/receipts"
BLENDER="${BLENDER:-/Applications/Blender.app/Contents/MacOS/blender}"
FFMPEG="${FFMPEG:-/opt/homebrew/bin/ffmpeg}"

mkdir -p "$FRAMES_DIR" "$PACKAGE_ROOT/exports" "$RECEIPTS_DIR"

swift test --package-path "$PACKAGE_ROOT"
swift build --package-path "$PACKAGE_ROOT" -c release
python3 "$PACKAGE_ROOT/scripts/verify_field_document.py" \
  "$FIELD_PATH" "$FIELD_SHA256" "$RECEIPTS_DIR/sph-field-capture--v1.json"

if [[ "${REUSE_BLENDER_FRAMES:-0}" != "1" ]]; then
  "$BLENDER" --background --python "$PACKAGE_ROOT/blender/render_gate_release.py" -- \
    --field "$FIELD_PATH" \
    --expected-field-sha256 "$FIELD_SHA256" \
    --output-dir "$FRAMES_DIR" \
    --receipt "$RECEIPTS_DIR/blender-render--$VERSION.json" \
    --save-blend "$PACKAGE_ROOT/output/blender-gate-release--$VERSION.blend" \
    --width 1280 --height 720 --samples 64 --frames all
fi

for ((frame = 0; frame < 192; frame++)); do
  printf -v padded_frame "%04d" "$frame"
  test -s "$FRAMES_DIR/frame-${padded_frame}.png"
done

"$FFMPEG" -hide_banner -loglevel error -y \
  -framerate 24 -start_number 0 -i "$FRAMES_DIR/frame-%04d.png" \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -filter:v "tmix=frames=3:weights='1 8 1',noise=all_seed=1129521190:alls=2:allf=t+u" \
  -frames:v 192 -t 8 -c:v libx264 -profile:v high -level 4.0 \
  -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 128k -shortest "$EXPORT_PATH"

python3 "$PACKAGE_ROOT/scripts/verify_blender_video.py" \
  "$EXPORT_PATH" "$RECEIPTS_DIR/blender-video-verification--$VERSION.json"

"$FFMPEG" -hide_banner -loglevel error -y -i "$EXPORT_PATH" \
  -vf "fps=4,scale=320:180,tile=8x4:padding=4:margin=8" -frames:v 1 \
  "$RECEIPTS_DIR/blender-contact-sheet--250ms--$VERSION.jpg"

echo "Rendered and verified $EXPORT_PATH"
