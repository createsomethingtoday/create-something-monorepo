#!/bin/bash
# Scheduled template review run (OpenProse). Fired by launchd
# (com.createsomething.template-review, weekdays 08:30 + 13:30 America/Chicago)
# or by hand. Stops at a staged digest; decisions go through
# apply-reviewer-decisions in an interactive session.
#
# Usage: template-review-run.sh [--dry-run] [--pickup N] [version_id ...]
#   --dry-run   also blocks the internal Agent Review Feedback write
#   --pickup N  claim the N oldest unassigned New versions first (the only
#               run that may call assign_self)
set -uo pipefail

REPO="/Users/micahjohnson/Code/create-something-monorepo"
CLAUDE="${CLAUDE_BIN:-/Users/micahjohnson/.local/bin/claude}"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

DRY_RUN=0
PICKUP=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --pickup) PICKUP="${2:-0}"; shift 2 ;;
    *) break ;;
  esac
done
VERSION_IDS=("$@")
MODE="scheduled"
[ -t 0 ] && MODE="manual"
[ ${#VERSION_IDS[@]} -gt 0 ] && MODE="targeted"

cd "$REPO" || exit 1
mkdir -p .agents/prose/state/template-review
LOG=".agents/prose/state/template-review/run-$(date +%Y-%m-%d).log"
STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

TR="mcp__claude_ai_Template_Review_MCP__template_review"
# Decision, publishing, ticket, and metadata writes. The scheduled run must never call these.
BLOCKED=(
  "${TR}_approve_version" "${TR}_reject_version" "${TR}_request_changes"
  "${TR}_set_review_status" "${TR}_set_checklist_items" "${TR}_update_version_review"
  "${TR}_save_draft_feedback" "${TR}_send_ticket_followup" "${TR}_update_ticket_status"
  "${TR}_create_ticket" "${TR}_link_version_ticket"
  "${TR}_create_admin_template" "${TR}_complete_admin_template" "${TR}_complete_publishing"
  "${TR}_update_asset_metadata" "${TR}_update_asset_publishing"
  "${TR}_assign_reviewer" "${TR}_unassign_self"
  "${TR}_delist_template" "${TR}_relist_template" "${TR}_delist_drift"
  "${TR}_set_featured_flag" "${TR}_set_featured_pick" "${TR}_cast_featured_vote"
  "${TR}_prepare_admin_template_create_execute" "${TR}_prepare_admin_template_update_execute"
  "${TR}_prepare_admin_template_thumbnail_execute"
  "mcp__claude_ai_Airtable__update_records_for_table" "mcp__claude_ai_Airtable__create_records_for_table"
  "mcp__claude_ai_Airtable__delete_records_for_table"
  "mcp__claude_ai_Slack__slack_send_message" "mcp__claude_ai_Gmail__send_message"
)
[ $DRY_RUN -eq 1 ] && BLOCKED+=("${TR}_save_agent_feedback")
# assign_self is allowed only on a pickup run; claim-new-submissions is its only caller.
[ "$PICKUP" -gt 0 ] || BLOCKED+=("${TR}_assign_self")

IDS_JSON="[]"
if [ ${#VERSION_IDS[@]} -gt 0 ]; then
  IDS_JSON="[$(printf '"%s",' "${VERSION_IDS[@]}" | sed 's/,$//')]"
fi

PROMPT="prose run .agents/prose/src/template-review/review-queue-loaded.prose.md

Use the open-prose skill. The gateway template-review-tick supplies this run_request:
{ \"run_started_at\": \"$STARTED\", \"mode\": \"$MODE\", \"version_ids\": $IDS_JSON, \"max_versions\": 12, \"pickup_new\": $PICKUP }
Wire and run review-queue-loaded, then review-evidence-collected, then review-verdict-staged.
Run each ProseScript session that names an agent (loader, collector, judge) as a subagent through the Agent tool with that agent's model, one collector per version, so raw evidence stays out of this context.
Never call apply-reviewer-decisions. dry_run=$DRY_RUN: when 1, skip template_review_save_agent_feedback and say so in the digest.
Finish by printing the digest path and the count per lean."

{
  echo ""
  echo "===== run $STARTED mode=$MODE dry_run=$DRY_RUN pickup=$PICKUP ids=$IDS_JSON ====="
  "$CLAUDE" -p "$PROMPT" \
    --model opus \
    --permission-mode bypassPermissions \
    --disallowedTools "${BLOCKED[@]}" </dev/null
  echo "===== exit $? at $(date -u +%Y-%m-%dT%H:%M:%SZ) ====="
} >>"$LOG" 2>&1
