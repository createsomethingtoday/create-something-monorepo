#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export BUNDLE_NAME="${BUNDLE_NAME:-webflow-marketplace-review-phase-a}"
export DISCOVERY_PACK="${DISCOVERY_PACK:-webflow-marketplace-review-phase-a}"
export ENABLED_SERVERS="${ENABLED_SERVERS:-webflow-template-review-mcp}"
export DISABLED_SERVERS="${DISABLED_SERVERS:-webflow-local,webflow-site-analyzer-mcp}"
export DISCOVERY_ACTIVE_SERVERS="${DISCOVERY_ACTIVE_SERVERS:-$ENABLED_SERVERS}"
export DISCOVERY_MAX_PROXY_TOOLS="${DISCOVERY_MAX_PROXY_TOOLS:-18}"

exec bash "$ROOT_DIR/scripts/cs-hub-webflow-reviewers-deploy.sh" "$@"
