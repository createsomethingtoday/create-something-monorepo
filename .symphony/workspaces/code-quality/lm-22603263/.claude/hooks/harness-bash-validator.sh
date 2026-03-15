#!/bin/bash
# Harness Bash Validator Hook
# PreToolUse: Validates bash commands in harness context
# - Auto-syncs loom before completing tasks
# - Validates commit messages include task references
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

# Check 1: Auto-sync loom before completing tasks
# Output JSON to prepend lm sync command before lm done
if [[ "$COMMAND" =~ lm[[:space:]]+done ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Detected lm done - should sync first" >> "$LOG_FILE"
  
  # Return JSON to add context for Claude
  cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "Before completing a loom task, ensure you have run 'lm sync' to synchronize with git."
  }
}
EOF
  exit 0
fi

# Check 2: Validate commit messages include task references
if [[ "$COMMAND" =~ git[[:space:]]+commit ]]; then
  # Check if command includes a task reference like [lm-xxx] or [cs-xxx]
  if ! echo "$COMMAND" | grep -qE '\[(lm|cs)-[a-z0-9]+\]'; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] BLOCKED: Missing task reference in commit" >> "$LOG_FILE"
    echo "Commit message should include task reference [lm-xxx]. Check current task with 'lm mine' and include the reference." >&2
    exit 2
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Commit validated with task reference" >> "$LOG_FILE"
fi

exit 0
