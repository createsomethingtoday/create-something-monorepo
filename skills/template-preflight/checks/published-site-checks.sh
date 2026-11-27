#!/bin/bash
# Stable entrypoint. Requires Python 3.10+; no third-party packages.
# Usage: ./published-site-checks.sh URL [/extra-page ...] [--template-name NAME] [--json receipt.json]
# Exit: 0 = no automated FAILs (MANUAL checks still required); 1-255 = failures; 2 = usage/runtime error.
set -eu
if ! command -v python3 >/dev/null 2>&1; then
  echo 'FAIL   runtime — Python 3.10+ is required for structural HTML checks.' >&2
  exit 2
fi
SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
exec python3 "$SCRIPT_DIR/published-site-checks.py" "$@"
