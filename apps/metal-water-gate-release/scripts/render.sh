#!/usr/bin/env bash
set -euo pipefail

PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-v1}"
FRAMES_DIR="$PACKAGE_ROOT/output/frames-$VERSION"
EXPORT_PATH="$PACKAGE_ROOT/exports/create-something--metal-gate-release--8s--16x9--$VERSION.mp4"
RENDER_RECEIPT="$PACKAGE_ROOT/receipts/render-receipt--$VERSION.json"
PROBE_RECEIPT="$PACKAGE_ROOT/receipts/ffprobe--$VERSION.json"
CONTACT_SHEET="$PACKAGE_ROOT/receipts/contact-sheet--250ms--$VERSION.jpg"

if command -v ffmpeg >/dev/null 2>&1; then
  FFMPEG="$(command -v ffmpeg)"
elif [[ -x /opt/homebrew/bin/ffmpeg ]]; then
  FFMPEG=/opt/homebrew/bin/ffmpeg
else
  echo "error: ffmpeg is required" >&2
  exit 1
fi

if command -v ffprobe >/dev/null 2>&1; then
  FFPROBE="$(command -v ffprobe)"
elif [[ -x /opt/homebrew/bin/ffprobe ]]; then
  FFPROBE=/opt/homebrew/bin/ffprobe
else
  echo "error: ffprobe is required" >&2
  exit 1
fi

mkdir -p "$FRAMES_DIR" "$PACKAGE_ROOT/exports" "$PACKAGE_ROOT/receipts"

swift test --package-path "$PACKAGE_ROOT"
swift build --package-path "$PACKAGE_ROOT" -c release

"$PACKAGE_ROOT/.build/release/MetalGateReleaseRender" \
  --out-dir "$FRAMES_DIR" \
  --receipt "$RENDER_RECEIPT"

"$FFMPEG" -hide_banner -loglevel error -y \
  -framerate 24 -start_number 0 -i "$FRAMES_DIR/frame-%04d.png" \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
  -t 8 -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p \
  -profile:v high -movflags +faststart -c:a aac -b:a 160k -shortest \
  "$EXPORT_PATH"

"$FFPROBE" -v error -show_streams -show_format -of json \
  "$EXPORT_PATH" > "$PROBE_RECEIPT"

"$FFMPEG" -hide_banner -loglevel error -y -i "$EXPORT_PATH" \
  -vf "fps=4,scale=320:180,tile=8x4:padding=4:margin=8" \
  -frames:v 1 "$CONTACT_SHEET"

"$FFMPEG" -hide_banner -loglevel error -i "$EXPORT_PATH" -f null -

echo "Rendered $EXPORT_PATH"
echo "Receipts are in $PACKAGE_ROOT/receipts"
