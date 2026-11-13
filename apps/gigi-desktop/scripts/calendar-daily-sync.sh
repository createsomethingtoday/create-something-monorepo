#!/bin/bash
# launchd entry for the daily Google Calendar → GiGi sync
# (~/Library/LaunchAgents/agency.createsomething.gigi-calendar-sync.plist). Logs one JSON receipt per run.
set -uo pipefail
STATE_DIR="$HOME/Library/Application Support/agency.createsomething.gigi-calendar-sync"
NODE="/Users/micahjohnson/.nvm/versions/node/v22.23.4/bin/node"
mkdir -p "$STATE_DIR/runs"
# Optional long-lived Claude token for unattended runs (made with `claude setup-token`),
# kept in the macOS Keychain. Without it the run uses the interactive sign-in, which expires.
if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
  KEYCHAIN_TOKEN="$(security find-generic-password -s claude-code-oauth-token -a "${USER:-$(id -un)}" -w 2>/dev/null || true)"
  [ -n "$KEYCHAIN_TOKEN" ] && export CLAUDE_CODE_OAUTH_TOKEN="$KEYCHAIN_TOKEN"
  unset KEYCHAIN_TOKEN
fi
"$NODE" "$(dirname "$0")/calendar-daily-sync.mjs" "$@" >> "$STATE_DIR/runs/$(date +%Y-%m-%d).log" 2>&1
