#!/usr/bin/env bash

set -euo pipefail

package_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$package_root"

simulator_id="${VISIONOS_SIMULATOR_UDID:-$(
  xcrun simctl list devices available |
    sed -nE 's/.*\(([0-9A-F-]{36})\) \(Booted\).*/\1/p' |
    head -n 1
)}"

if [[ -z "$simulator_id" ]]; then
  printf '%s\n' 'Boot an Apple Vision Pro Simulator or set VISIONOS_SIMULATOR_UDID.' >&2
  exit 1
fi

xcodebuild \
  -project WorkWayVisionOSApp/WorkWayVisionOSApp.xcodeproj \
  -scheme WorkWayVisionOSApp \
  -configuration Debug \
  -sdk xrsimulator \
  -destination "platform=visionOS Simulator,id=$simulator_id" \
  -derivedDataPath .build/visionos-app \
  build
