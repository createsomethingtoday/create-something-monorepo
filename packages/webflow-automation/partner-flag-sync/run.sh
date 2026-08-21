#!/bin/bash
# Partner App Flag Sync — local launchd runner.
# Replaces cloud routine trig_01Cxr9MbmzDcybJRcKsmsPtL (recurring partial-connector-toolset outages).
# Headless claude -p attaches the claude.ai connectors (Zapier/Airtable/Slack) — verified 2026-08-21.
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
RUNS="$DIR/runs"
mkdir -p "$RUNS"
LOG="$RUNS/sync-$(date +%F).log"
CLAUDE="$HOME/.local/bin/claude"

# Catch-up idempotence: the agent fires at 8:05, on wake (launchd coalesces
# missed calendar events across sleep), and at load/login (RunAtLoad, which
# covers reboots). A successful run leaves a RECEIPT line in today's log;
# skip if one exists so extra firings are no-ops.
if grep -q "^RECEIPT:" "$LOG" 2>/dev/null; then
  echo "$(date '+%F %T %Z') already ran today (RECEIPT found), skipping" >> "$LOG"
  exit 0
fi

# Single-flight: two near-simultaneous firings (e.g. wake + calendar) must not
# both run. mkdir is atomic; a lock older than 30 min is stale (crashed run).
LOCK="$RUNS/.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +30 2>/dev/null)" ]; then
    rmdir "$LOCK" 2>/dev/null
    mkdir "$LOCK" 2>/dev/null || exit 0
  else
    echo "$(date '+%F %T %Z') another run in flight (lock held), skipping" >> "$LOG"
    exit 0
  fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

{
  echo "===== run $(date '+%F %T %Z') ====="
  if [ ! -x "$CLAUDE" ]; then
    echo "FATAL: claude binary not found at $CLAUDE"
    exit 1
  fi
  "$CLAUDE" -p --model sonnet \
    --allowedTools \
      "ToolSearch" \
      "Bash" \
      "Read" \
      "mcp__claude_ai_Zapier__inspect_zapier_actions" \
      "mcp__claude_ai_Zapier__execute_zapier_read_action" \
      "mcp__claude_ai_Google_Drive__read_file_content" \
      "mcp__claude_ai_Airtable__list_records_for_table" \
      "mcp__claude_ai_Airtable__update_records_for_table" \
      "mcp__claude_ai_Slack__slack_send_message" \
    < "$DIR/prompt.md"
  echo ""
  echo "exit=$?"
  echo "===== end $(date '+%F %T %Z') ====="
} >> "$LOG" 2>&1
