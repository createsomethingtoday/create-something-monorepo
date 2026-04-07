#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "scripts/cs-hub-webflow-reviewers-phase-a-vault-sync.sh is deprecated; forwarding to Phase B." >&2
exec bash "$SCRIPT_DIR/cs-hub-webflow-reviewers-phase-b-vault-sync.sh" "$@"
