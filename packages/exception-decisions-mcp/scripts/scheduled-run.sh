#!/bin/bash
# Scheduled advisory recommendation run — twice a day via launchd
# (~/Library/LaunchAgents/com.webflow.exception-recommender.plist).
#
# Pipeline: lean generation (judgment, read-only) → runner.mjs --leans --write (enforcement +
# writes under the automation identity). Advisory lane ONLY: recommendations, never decisions.
#
# Engine order (parity-checked 8/20, 4/5 agreement, divergence conservative):
#   1. Dify chat engine (leans-dify.mjs) — key from Infisical prod /exception-decisions-mcp
#   2. Claude CLI engine (leans-claude.mjs) — fallback when the key or Dify is unavailable
# See docs/dify-recommendation-runbook.md.
set -uo pipefail

PKG="/Users/micahjohnson/Code/create-something-monorepo/packages/exception-decisions-mcp"
NODE="/Users/micahjohnson/.nvm/versions/node/v22.21.1/bin/node"
INFISICAL="$(command -v infisical || echo /opt/homebrew/bin/infisical)"
export CLAUDE_BIN="${CLAUDE_BIN:-/Users/micahjohnson/.local/bin/claude}"

cd "$PKG" || exit 1
mkdir -p runs
LOG="runs/scheduled-$(date +%Y-%m-%d).log"

{
  echo ""
  echo "===== run $(date '+%Y-%m-%d %H:%M:%S %Z') ====="

  LEAN_OUT=""
  ENGINE=""
  DIFY_PARTNER_LEAD_APP_KEY="$("$INFISICAL" secrets get DIFY_PARTNER_LEAD_APP_KEY --env=prod --path=/exception-decisions-mcp --plain 2>/dev/null || true)"
  export DIFY_PARTNER_LEAD_APP_KEY
  if [ -n "$DIFY_PARTNER_LEAD_APP_KEY" ]; then
    LEAN_OUT="$("$NODE" scripts/leans-dify.mjs 2>&1)" && ENGINE="dify"
    echo "$LEAN_OUT"
  else
    echo "Dify key unavailable from Infisical — falling back to Claude engine"
  fi

  if [ -z "$ENGINE" ]; then
    LEAN_OUT="$("$NODE" scripts/leans-claude.mjs 2>&1)" && ENGINE="claude"
    echo "$LEAN_OUT"
  fi

  if [ -z "$ENGINE" ]; then
    echo "both engines failed — no writes attempted"
    exit 0
  fi
  echo "engine: $ENGINE"

  LEANS_FILE="$(echo "$LEAN_OUT" | sed -n 's/^LEANS_FILE=//p' | tail -1)"
  if [ -z "$LEANS_FILE" ]; then
    echo "no leans file produced — nothing to write"
    exit 0
  fi

  "$NODE" scripts/runner.mjs --leans "$LEANS_FILE" --write 2>&1
  echo "===== end $(date '+%H:%M:%S') ====="
} >> "$LOG" 2>&1
