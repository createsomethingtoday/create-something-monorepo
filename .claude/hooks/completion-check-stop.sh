#!/bin/bash
# Completion Check Stop Hook
# Stop: Provides intelligent prompts about work completion status
# Exit code 2 blocks stopping with feedback, exit 0 adds context
# This complements typecheck-stop.sh (technical) with workflow checks

set -e

# Read JSON input
INPUT=$(cat)
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')

# Logging for observability
LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/completion-check-$(date +%Y%m%d).log"

log_msg() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_msg "Completion check triggered"

# Prevent infinite loops
if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

WARNINGS=""
BLOCKERS=""

# Check 1: Uncommitted changes
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [[ "$UNCOMMITTED" -gt 0 ]]; then
  STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
  UNSTAGED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
  UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
  WARNINGS="$WARNINGS\n• Uncommitted changes: $STAGED staged, $UNSTAGED modified, $UNTRACKED untracked"
fi

# Check 2: Linear evidence availability
if [[ -z "${LINEAR_API_KEY:-}" ]]; then
  WARNINGS="$WARNINGS\n• LINEAR_API_KEY not set; Linear issue evidence cannot be updated from this shell"
fi

# Check 3: Recent work without commit
# If there are modified files in packages/, remind about committing
MODIFIED_PACKAGES=$(git diff --name-only 2>/dev/null | grep -E '^packages/' | cut -d'/' -f2 | sort -u | head -3 | tr '\n' ', ' | sed 's/,$//')
if [[ -n "$MODIFIED_PACKAGES" ]]; then
  WARNINGS="$WARNINGS\n• Modified packages not committed: $MODIFIED_PACKAGES"
fi

# Build output
if [[ -n "$BLOCKERS" ]]; then
  log_msg "Result: BLOCKED"
  echo -e "Cannot complete - blocking issues found:$BLOCKERS" >&2
  exit 2
fi

if [[ -n "$WARNINGS" ]]; then
  log_msg "Result: WARNINGS"
  # Output context as JSON for Claude to consider (non-blocking)
  cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "Completion check found items to address:$WARNINGS\n\nConsider: commit changes and record completion evidence in the relevant Linear issue before ending session."
  }
}
EOF
  exit 0
fi

log_msg "Result: PASS - Clean completion"
exit 0
