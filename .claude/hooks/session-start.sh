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

# 2. Package awareness - detect which package(s) have recent activity
echo "## Active Packages"
MODIFIED_PACKAGES=$(git diff --name-only HEAD~5 2>/dev/null | grep -E '^packages/' | cut -d'/' -f2 | sort -u | head -5 || true)
if [[ -n "$MODIFIED_PACKAGES" ]]; then
  for pkg in $MODIFIED_PACKAGES; do
    if [[ -f "$CLAUDE_PROJECT_DIR/packages/$pkg/package.json" ]]; then
      PKG_DESC=$(jq -r '.description // "No description"' "$CLAUDE_PROJECT_DIR/packages/$pkg/package.json" 2>/dev/null | head -c 60)
      echo "  • $pkg: $PKG_DESC"
    fi
  done
else
  echo "  (no recent package activity)"
fi
echo ""

# 3. Current claimed work (if any)
echo "## Current Work"
CLAIMED=$(lm mine --status claimed --limit 1 2>/dev/null || echo "")
if [[ -n "$CLAIMED" ]]; then
  lm show "$CLAIMED" 2>/dev/null || echo "No claimed tasks"
  
  # Check for resumable session
  RESUME=$(lm recover 2>/dev/null | head -1 || true)
  if [[ -n "$RESUME" ]]; then
    echo ""
    echo "### Resumable Session Available"
    echo "  Session: $RESUME"
    echo "  Resume with: lm resume $RESUME"
  fi
else
  echo "No claimed tasks"
  
  # Check for any recoverable sessions even without claimed tasks
  RECOVER_COUNT=$(lm recover 2>/dev/null | wc -l | tr -d ' ' || echo "0")
  if [[ "$RECOVER_COUNT" -gt 0 ]]; then
    echo ""
    echo "### Recoverable Sessions"
    lm recover 2>/dev/null | head -3
  fi
fi
echo ""

# 4. Recently completed tasks (context)
echo "## Recently Completed (last 5)"
lm list --status done --limit 5 2>/dev/null || echo "(lm not available)"
echo ""

# 5. Recent git commits
echo "## Recent Commits"
git log --oneline -5 2>/dev/null || echo "(no git history)"
echo ""

# 6. Available work (robot-priority ranked)
echo "## Available Work (Robot Priority)"
lm ready --ranked 2>/dev/null | head -5 || echo "(lm not available)"
echo ""

# 7. Quick health check
echo "## Health Check"
# Check for uncommitted changes
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [[ "$UNCOMMITTED" -gt 0 ]]; then
  echo "  ⚠️  $UNCOMMITTED uncommitted changes"
fi
# Check for unpushed commits
UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ' || echo "0")
if [[ "$UNPUSHED" -gt 0 ]]; then
  echo "  ⚠️  $UNPUSHED commits not pushed to origin"
fi
# Check loom sync status
if [[ -d "$CLAUDE_PROJECT_DIR/.loom" ]]; then
  DB_MTIME=$(stat -f %m "$CLAUDE_PROJECT_DIR/.loom/work.db" 2>/dev/null || echo "0")
  JSONL_MTIME=$(stat -f %m "$CLAUDE_PROJECT_DIR/.loom/tasks.jsonl" 2>/dev/null || echo "0")
  if [[ "$DB_MTIME" -gt "$JSONL_MTIME" ]]; then
    echo "  ⚠️  Loom tasks may need sync (run 'lm sync')"
  fi
fi
if [[ "$UNCOMMITTED" -eq 0 && "$UNPUSHED" -eq 0 ]]; then
  echo "  ✓ Clean state"
fi
echo ""

echo "=== END SESSION CONTEXT ==="

log_msg "Session context loaded successfully"
exit 0
