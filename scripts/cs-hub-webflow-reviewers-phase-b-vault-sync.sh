#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PHASE_A_SCRIPT="$ROOT_DIR/scripts/cs-hub-webflow-reviewers-phase-a-vault-sync.sh"

export PHASE_B_SYNC="${PHASE_B_SYNC:-true}"

exec bash "$PHASE_A_SCRIPT"
