#!/usr/bin/env bash
# Optional RTK installer. It deliberately does not install RTK's global hook.

set -euo pipefail

if command -v rtk >/dev/null 2>&1; then
  echo "RTK already installed: $(rtk --version)"
elif command -v brew >/dev/null 2>&1; then
  echo "Installing optional RTK local CLI with Homebrew..."
  brew install rtk
else
  echo "RTK is optional and Homebrew is unavailable; continuing with native commands."
  echo "Install it later with: brew install rtk"
  exit 0
fi

echo "Verifying RTK is installed without a global hook..."
rtk verify
echo "RTK is ready for explicit local summaries only. Do not run: rtk init -g"
