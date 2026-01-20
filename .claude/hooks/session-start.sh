#!/bin/bash
# Session Start Hook
# Runs at the beginning of each Claude session to load context
# Outputs context that helps Claude understand current project state

set -e

# Logging for observability
LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/session-start-$(date +%Y%m%d).log"

log_msg() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_msg "Session start hook triggered"

# Change to project directory
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "$(pwd)"

echo "=== SESSION CONTEXT ==="
echo ""

# 1. Current directory and git status
echo "## Working Directory"
echo "$(pwd)"
echo ""

echo "## Git Status"
git status --short 2>/dev/null || echo "(not a git repo)"
echo ""

# 2. Current in-progress issue (if any)
echo "## Current Work"
IN_PROGRESS=$(bd list --status=in_progress --limit=1 -q 2>/dev/null || echo "")
if [[ -n "$IN_PROGRESS" ]]; then
  bd show "$IN_PROGRESS" 2>/dev/null || echo "No in-progress issues"
else
  echo "No in-progress issues"
fi
echo ""

# 3. Recently closed issues (context)
echo "## Recently Completed (last 5)"
bd list --status=closed --limit=5 2>/dev/null || echo "(bd not available)"
echo ""

# 4. Recent git commits
echo "## Recent Commits"
git log --oneline -5 2>/dev/null || echo "(no git history)"
echo ""

# 5. Available work
echo "## Available Work"
bd ready 2>/dev/null | head -5 || echo "(bd not available)"
echo ""

echo "=== END SESSION CONTEXT ==="

log_msg "Session context loaded successfully"
exit 0
