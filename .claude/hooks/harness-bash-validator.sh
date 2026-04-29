#!/bin/bash
# Harness Bash Validator Hook
# PreToolUse: Validates bash commands in harness context
# - Blocks legacy Loom coordination commands
# - Validates commit messages include Linear issue references
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

# Check 1: Block legacy Loom coordination commands
if [[ "$COMMAND" =~ (^|[[:space:]])lm[[:space:]] || "$COMMAND" =~ pnpm[[:space:]]+loom: ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] BLOCKED: Legacy Loom command" >> "$LOG_FILE"
  cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "Loom coordination has been retired for this repository. Use pnpm linear:ready, pnpm linear:list, pnpm linear:claim, pnpm linear:comment, or pnpm linear:done."
  }
}
EOF
  exit 2
fi

# Check 2: Validate commit messages include task references
if [[ "$COMMAND" =~ git[[:space:]]+commit ]]; then
  # Check if command includes a Linear issue reference like [CRE-123].
  if ! echo "$COMMAND" | grep -qE '\[[A-Z]{2,10}-[0-9]+\]'; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] BLOCKED: Missing task reference in commit" >> "$LOG_FILE"
    echo "Commit message should include a Linear issue reference such as [CRE-123]. Check current work with 'pnpm linear:ready' or 'pnpm linear:list'." >&2
    exit 2
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Commit validated with task reference" >> "$LOG_FILE"
fi

exit 0
