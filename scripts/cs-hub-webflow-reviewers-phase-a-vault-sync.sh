#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export INCLUDE_ANALYZER="${INCLUDE_ANALYZER:-false}"
export SYNC_HUB_API_TOKEN="${SYNC_HUB_API_TOKEN:-true}"
export SYNC_SESSION_RESOLVE_TOKEN="${SYNC_SESSION_RESOLVE_TOKEN:-true}"
export SYNC_TEMPLATE_REVIEW_MCP_API_KEY="${SYNC_TEMPLATE_REVIEW_MCP_API_KEY:-true}"
export SYNC_BRAINTRUST="${SYNC_BRAINTRUST:-true}"

exec bash "$ROOT_DIR/scripts/cs-hub-webflow-reviewers-vault-sync.sh" "$@"
