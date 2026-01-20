#!/bin/bash
# Harness Bash Validator Hook
# PreToolUse: Validates bash commands in harness context
# - Auto-syncs beads before closing issues
# - Validates commit messages include issue references
# Exit code 2 blocks with feedback to Claude

set -e

# Read JSON input from stdin
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // {}')
COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty')

# Only check Bash tool
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Logging for observability
LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/harness-bash-$(date +%Y%m%d).log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Command: $COMMAND" >> "$LOG_FILE"

# Check 1: Auto-sync beads before closing issues
# Output JSON to prepend bd sync command before bd close
if [[ "$COMMAND" =~ bd[[:space:]]+close ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Detected bd close - should sync first" >> "$LOG_FILE"
  
  # Return JSON to add context for Claude
  cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "Before closing a beads issue, ensure you have run 'bd sync' to synchronize with git."
  }
}
EOF
  exit 0
fi

# Check 2: Validate commit messages include issue references
if [[ "$COMMAND" =~ git[[:space:]]+commit ]]; then
  # Check if command includes an issue reference like [cs-xxx]
  if ! echo "$COMMAND" | grep -qE '\[cs-[a-z0-9]+\]'; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] BLOCKED: Missing issue reference in commit" >> "$LOG_FILE"
    echo "Commit message should include issue reference [cs-xxx]. Check current issue with 'bd show' and include the reference." >&2
    exit 2
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Commit validated with issue reference" >> "$LOG_FILE"
fi

exit 0
