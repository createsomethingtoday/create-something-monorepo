#!/usr/bin/env bash

set -euo pipefail

package_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$package_root"

sdk_path="$(xcrun --sdk xrsimulator --show-sdk-path)"

if ! xcrun simctl list runtimes | grep -q 'visionOS'; then
  printf '%s\n' 'visionOS Simulator runtime is not installed.' >&2
  exit 1
fi

swift build \
  --scratch-path .build/visionos-simulator \
  --target WorkWayRealityKitAdapter \
  --triple arm64-apple-xros-simulator \
  --sdk "$sdk_path"
