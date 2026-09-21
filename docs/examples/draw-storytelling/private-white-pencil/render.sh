#!/bin/sh
set -eu
study_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_dir=$(CDPATH= cd -- "$study_dir/../../../.." && pwd)
python3 "$study_dir/build.py"
node "$repo_dir/packages/mapping-canvas/scripts/render-animation.mjs" "$study_dir/private-white-pencil.draw.json" "$study_dir/private-white-pencil.mp4"
ffmpeg -v error -i "$study_dir/private-white-pencil.mp4" -f null -
python3 "$study_dir/export-stills.py"
