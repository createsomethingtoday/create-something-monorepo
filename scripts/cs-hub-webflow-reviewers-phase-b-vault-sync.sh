#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export INCLUDE_ANALYZER="${INCLUDE_ANALYZER:-true}"
export SYNC_HUB_API_TOKEN="${SYNC_HUB_API_TOKEN:-false}"
export SYNC_SESSION_RESOLVE_TOKEN="${SYNC_SESSION_RESOLVE_TOKEN:-false}"
export SYNC_TEMPLATE_REVIEW_MCP_API_KEY="${SYNC_TEMPLATE_REVIEW_MCP_API_KEY:-false}"
export SYNC_BRAINTRUST="${SYNC_BRAINTRUST:-false}"

exec bash "$ROOT_DIR/scripts/cs-hub-webflow-reviewers-vault-sync.sh" "$@"
