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

VISIONOS_SIMULATOR_UDID="$simulator_id" ./scripts/check-visionos-app.sh

bundle_id="com.createsomething.workway.spatial"
app_path=".build/visionos-app/Build/Products/Debug-xrsimulator/WorkWayVisionOSApp.app"

if xcrun simctl terminate "$simulator_id" "$bundle_id" >/dev/null 2>&1; then
  :
fi

xcrun simctl install "$simulator_id" "$app_path"
xcrun simctl launch "$simulator_id" "$bundle_id"
