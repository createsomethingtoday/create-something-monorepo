#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ENABLED_SERVERS="${ENABLED_SERVERS:-webflow-template-review-mcp,webflow-site-analyzer-mcp}"

DISCOVERY_MODE="${DISCOVERY_MODE:-full}" \
BUNDLE_NAME="${BUNDLE_NAME:-webflow-marketplace-review-phase-b}" \
DISCOVERY_PACK="${DISCOVERY_PACK:-webflow-marketplace-review-phase-b}" \
ENABLED_SERVERS="${ENABLED_SERVERS}" \
DISABLED_SERVERS="${DISABLED_SERVERS:-}" \
DISCOVERY_ACTIVE_SERVERS="${DISCOVERY_ACTIVE_SERVERS:-${ENABLED_SERVERS}}" \
DISCOVERY_MAX_PROXY_TOOLS="${DISCOVERY_MAX_PROXY_TOOLS:-0}" \
exec "$ROOT_DIR/scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh" "$@"
