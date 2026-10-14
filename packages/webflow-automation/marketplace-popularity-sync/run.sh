#!/bin/bash
# Template Popularity sync — daily via launchd
# (~/Library/LaunchAgents/com.webflow.marketplace-popularity-sync.plist, 07:15 + 12:15 CT;
#  the second slot is a retry — the sync is idempotent, it only patches changed records).
#
# Inputs: SOURCE=airtable (default) reads the V8 inputs the Fivetran dataset
# "Template popularity inputs (V8)" writes daily ~05:03 UTC — no Snowflake login.
# SOURCE=snowflake uses Okta externalbrowser and needs a cached SSO session
# (USE_SNOWFLAKE_PAT=1 switches to a keychain PAT once an admin allows one).
#
# Runs from a locked worktree detached at origin/main (see README "Scheduling").
# Secrets come from Infisical (prod). `infisical secrets get --raw-value` returns
# EMPTY from any cwd other than the checkout root, so resolve them from there.
set -uo pipefail

PKG="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO="$(git -C "$PKG" rev-parse --show-toplevel)"
NODE="${NODE_BIN:-/Users/micahjohnson/.nvm/versions/node/v22.21.1/bin/node}"
INFISICAL="$(command -v infisical || echo /opt/homebrew/bin/infisical)"
# sync.mjs spawns npx (wrangler for the beacon D1); use the same Node install.
export PATH="$(dirname "$NODE"):/opt/homebrew/bin:/usr/local/bin:$PATH"

# Scoring variant written to 🖌️Popularity Score. v7 = Fivetran parity (status quo);
# v8-beacon = V7 with the viewer term from the owned beacon. See model.mjs.
MODEL="${MODEL:-v8-beacon}"
# Where inputs come from: airtable (Fivetran-written, no Snowflake auth) or snowflake (needs Okta SSO).
SOURCE="${SOURCE:-airtable}"

cd "$PKG" || exit 1
mkdir -p runs
LOG="runs/sync-$(date +%Y-%m-%d).log"

# One run at a time (07:15 and 12:15 must not overlap). The lock records its
# owner's PID and start time; a lock whose owner is gone (power loss, SIGKILL,
# PID reused after reboot) is reclaimed so a dead run cannot block later slots.
LOCK="runs/.lock"
started() { ps -o lstart= -p "$1" 2>/dev/null; }
if ! mkdir "$LOCK" 2>/dev/null; then
  OWNER="$(cat "$LOCK/pid" 2>/dev/null || true)"
  OWNER_START="$(cat "$LOCK/started" 2>/dev/null || true)"
  if [ -n "$OWNER" ] && [ -n "$OWNER_START" ] && [ "$(started "$OWNER")" = "$OWNER_START" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S %Z') run $OWNER holds $LOCK — skipping" >> "$LOG"
    exit 0
  fi
  # No owner recorded yet: another run may have just created the lock. Only a
  # lock that stayed ownerless for 10+ minutes is abandoned.
  if [ -z "$OWNER_START" ] && [ $(( $(date +%s) - $(stat -f %m "$LOCK" 2>/dev/null || echo 0) )) -lt 600 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S %Z') $LOCK is initializing — skipping" >> "$LOG"
    exit 0
  fi
  echo "$(date '+%Y-%m-%d %H:%M:%S %Z') reclaiming stale $LOCK (owner ${OWNER:-unknown} is not the recorded run)" >> "$LOG"
  rm -rf "$LOCK"
  mkdir "$LOCK" || exit 1
fi
echo $$ > "$LOCK/pid"
started $$ > "$LOCK/started"
trap 'rm -rf "$LOCK"' EXIT

{
  echo ""
  echo "===== run $(date '+%Y-%m-%d %H:%M:%S %Z') model=$MODEL source=$SOURCE ====="

  # Skip the retry slot when today already succeeded.
  if [ -f "runs/receipt-$(date +%Y-%m-%d).json" ]; then
    echo "receipt for today exists — nothing to do."
    exit 0
  fi

  cd "$MONOREPO" || exit 1
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

  # Beacon D1 lives in the Webflow Hosting Cloudflare account.
  if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    CLOUDFLARE_API_TOKEN="$("$INFISICAL" secrets get CLOUDFLARE_WEBFLOW_HOSTING_API_TOKEN --env=prod --raw-value 2>/dev/null | tr -d '[:space:]' || true)"
  fi
  export CLOUDFLARE_API_TOKEN
  export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-ac24bc906aca8307bdba8c2a85ff08c9}"
  if { [ "$MODEL" = "v8-beacon" ] || [ "$MODEL" = "v8" ]; } && [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "CLOUDFLARE_API_TOKEN unavailable — beacon source unreachable, aborting (no writes attempted)."
    exit 1
  fi

  if [ "${USE_SNOWFLAKE_PAT:-0}" = "1" ]; then
    SNOWFLAKE_PAT="$(security find-generic-password -s snowflake-pat-popularity-sync -a micah@webflow.com -w 2>/dev/null || true)"
    [ -n "$SNOWFLAKE_PAT" ] && export SNOWFLAKE_PAT
  fi

  cd "$PKG" || exit 1
  # DRY=1 exercises the whole path (secrets, Snowflake, beacon, Airtable read) without writing.
  if [ "${DRY:-0}" = "1" ]; then
    "$NODE" sync.mjs --model "$MODEL" --source "$SOURCE" "$@"
  else
    "$NODE" sync.mjs --model "$MODEL" --source "$SOURCE" --execute "$@"
  fi
} >> "$LOG" 2>&1
