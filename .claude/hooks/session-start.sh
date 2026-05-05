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

# 3. Current tracked work (if Linear is configured)
echo "## Current Work"
if [[ -n "${LINEAR_API_KEY:-}" ]]; then
  pnpm -s linear:list -- --status open --limit 5 2>/dev/null || echo "(Linear unavailable)"
else
  echo "(LINEAR_API_KEY not set)"
fi
echo ""

# 4. Recently completed issues (context)
echo "## Recently Completed (last 5)"
if [[ -n "${LINEAR_API_KEY:-}" ]]; then
  pnpm -s linear:list -- --status done --limit 5 2>/dev/null || echo "(Linear unavailable)"
else
  echo "(LINEAR_API_KEY not set)"
fi
echo ""

# 5. Recent git commits
echo "## Recent Commits"
git log --oneline -5 2>/dev/null || echo "(no git history)"
echo ""

# 6. Available work
echo "## Available Work"
if [[ -n "${LINEAR_API_KEY:-}" ]]; then
  pnpm -s linear:ready -- --limit 5 2>/dev/null || echo "(Linear unavailable)"
else
  echo "(LINEAR_API_KEY not set)"
fi
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
if [[ "$UNCOMMITTED" -eq 0 && "$UNPUSHED" -eq 0 ]]; then
  echo "  ✓ Clean state"
fi
echo ""

echo "=== END SESSION CONTEXT ==="

log_msg "Session context loaded successfully"
exit 0
