#!/bin/bash
# Marketplace Insights sync — weekly via launchd
# (~/Library/LaunchAgents/com.webflow.marketplace-insights-sync.plist).
#
# Snowflake auth is Okta externalbrowser: a browser window may open on runs
# where no cached SSO token exists. Airtable PAT resolution order:
#   1. AIRTABLE_API_KEY already in the environment
#   2. Infisical: prod /webflow/app-reviewer-airtable-mcp AIRTABLE_API_KEY
#      (existing key with 👛Marketplace Assets base access)
#   3. ~/.config/webflow-automation/airtable-marketplace-assets.key
set -uo pipefail

PKG="/Users/micahjohnson/Code/create-something-monorepo/packages/webflow-automation/marketplace-insights-sync"
NODE="${NODE_BIN:-/Users/micahjohnson/.nvm/versions/node/v22.21.1/bin/node}"
INFISICAL="$(command -v infisical || echo /opt/homebrew/bin/infisical)"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd "$PKG" || exit 1
mkdir -p runs
LOG="runs/sync-$(date +%Y-%m-%d).log"

{
  echo ""
  echo "===== run $(date '+%Y-%m-%d %H:%M:%S %Z') ====="

  if [ -z "${AIRTABLE_API_KEY:-}" ]; then
    AIRTABLE_API_KEY="$("$INFISICAL" secrets get AIRTABLE_API_KEY --env=prod --path=/webflow/app-reviewer-airtable-mcp --plain 2>/dev/null || true)"
  fi
  if [ -z "${AIRTABLE_API_KEY:-}" ] && [ -f "$HOME/.config/webflow-automation/airtable-marketplace-assets.key" ]; then
    AIRTABLE_API_KEY="$(cat "$HOME/.config/webflow-automation/airtable-marketplace-assets.key")"
  fi
  if [ -z "${AIRTABLE_API_KEY:-}" ]; then
    echo "AIRTABLE_API_KEY unavailable — aborting (no writes attempted)."
    exit 1
  fi
  export AIRTABLE_API_KEY

  "$NODE" sync.mjs --execute "$@"
} >> "$LOG" 2>&1
