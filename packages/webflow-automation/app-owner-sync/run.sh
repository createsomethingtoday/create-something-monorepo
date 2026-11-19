#!/bin/bash
# App owner sync — Webflow (Snowflake) → Airtable 👛Assets / 🎨Creators ownership fields.
# Dry run:  ./run.sh            Execute: ./run.sh --execute
# Airtable PAT: AIRTABLE_API_KEY env → Infisical prod /webflow/app-reviewer-airtable-mcp → ~/.config/webflow-automation/airtable-marketplace-assets.key
# Snowflake: SNOWFLAKE_PAT from keychain item snowflake-pat-popularity-sync when valid, else Okta externalbrowser (cached SSO).
set -euo pipefail
PKG="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${REPO_ROOT:-/Users/micahjohnson/Code/create-something-monorepo}"
NODE="${NODE_BIN:-$(command -v node || ls -d /Users/micahjohnson/.nvm/versions/node/v22*/bin/node 2>/dev/null | tail -1)}"
INFISICAL="$(command -v infisical || echo /opt/homebrew/bin/infisical)"
export PATH="/opt/homebrew/bin:/usr/local/bin:/Users/micahjohnson/.nvm/versions/node/v22.23.4/bin:/Users/micahjohnson/.local/bin:$PATH"
mkdir -p "$PKG/runs"
LOG="$PKG/runs/sync-$(date +%Y-%m-%d).log"
{
  echo ""; echo "===== run $(date '+%Y-%m-%d %H:%M:%S %Z') $* ====="
  if [ -z "${AIRTABLE_API_KEY:-}" ]; then
    AIRTABLE_API_KEY="$(cd "$REPO_ROOT" && "$INFISICAL" secrets get AIRTABLE_API_KEY --projectId=e1532079-2f2b-46b5-8972-cf7a025eb803 --env=prod --path=/webflow/app-reviewer-airtable-mcp --plain 2>/dev/null || true)"
  fi
  if [ -n "${AIRTABLE_API_KEY:-}" ] && ! printf '%s' "$AIRTABLE_API_KEY" | grep -qE '^pat[A-Za-z0-9.]{20,}$'; then AIRTABLE_API_KEY=""; fi
  if [ -z "${AIRTABLE_API_KEY:-}" ] && [ -f "$HOME/.config/webflow-automation/airtable-marketplace-assets.key" ]; then
    AIRTABLE_API_KEY="$(tr -d '[:space:]' < "$HOME/.config/webflow-automation/airtable-marketplace-assets.key")"
  fi
  [ -n "${AIRTABLE_API_KEY:-}" ] || { echo "AIRTABLE_API_KEY unavailable — aborting."; exit 1; }
  export AIRTABLE_API_KEY
  if [ -z "${SNOWFLAKE_PAT:-}" ]; then
    SNOWFLAKE_PAT="$(security find-generic-password -s snowflake-pat-popularity-sync -a micah@webflow.com -w 2>/dev/null || true)"
    [ -n "$SNOWFLAKE_PAT" ] && export SNOWFLAKE_PAT
  fi
  cd "$PKG"
  "$NODE" sync.mjs "$@"
} 2>&1 | tee -a "$LOG"
