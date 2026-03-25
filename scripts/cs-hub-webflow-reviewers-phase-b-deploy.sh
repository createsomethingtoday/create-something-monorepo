#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PHASE_A_SCRIPT="$ROOT_DIR/scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh"
ACTION="${1:-all}"

if [[ "$ACTION" == "deploy" || "$ACTION" == "all" ]]; then
  if [[ -z "${WEBFLOW_SITE_ANALYZER_MCP_URL:-}" ]]; then
    echo "missing WEBFLOW_SITE_ANALYZER_MCP_URL" >&2
    exit 1
  fi

  if [[ -z "${WEBFLOW_ORIGINALITY_MCP_URL:-}" ]]; then
    echo "missing WEBFLOW_ORIGINALITY_MCP_URL" >&2
    exit 1
  fi
fi

export WEBFLOW_ORIGINALITY_MCP_URL="${WEBFLOW_ORIGINALITY_MCP_URL:-}"

export BUNDLE_NAME="${BUNDLE_NAME:-webflow-marketplace-review-phase-b}"
export DISCOVERY_PACK="${DISCOVERY_PACK:-webflow-marketplace-review-phase-b}"
export ENABLED_SERVERS="${ENABLED_SERVERS:-webflow-template-review-mcp,webflow-site-analyzer-mcp,webflow-originality-mcp}"
export DISABLED_SERVERS="${DISABLED_SERVERS:-webflow-local}"
export DISCOVERY_ACTIVE_SERVERS="${DISCOVERY_ACTIVE_SERVERS:-$ENABLED_SERVERS}"
export DISCOVERY_MAX_PROXY_TOOLS="${DISCOVERY_MAX_PROXY_TOOLS:-30}"
export REQUIRED_GLOBAL_SERVERS_SENTINEL="${REQUIRED_GLOBAL_SERVERS_SENTINEL:-webflow-template-review-mcp,webflow-site-analyzer-mcp,webflow-originality-mcp}"
export REQUIRED_DISCOVERY_SERVERS_SENTINEL="${REQUIRED_DISCOVERY_SERVERS_SENTINEL:-webflow-template-review-mcp,webflow-site-analyzer-mcp,webflow-originality-mcp}"
export REVIEWER_IDENTITY_MODE="${REVIEWER_IDENTITY_MODE:-session_required}"
export HUB_ALLOW_DIRECT_PROXY_TOOLS="${HUB_ALLOW_DIRECT_PROXY_TOOLS:-true}"
export HUB_DIRECT_PROXY_ALLOWED_PREFIXES="${HUB_DIRECT_PROXY_ALLOWED_PREFIXES:-webflow-site-analyzer-mcp__,webflow-originality-mcp__}"

exec bash "$PHASE_A_SCRIPT" "$ACTION"
