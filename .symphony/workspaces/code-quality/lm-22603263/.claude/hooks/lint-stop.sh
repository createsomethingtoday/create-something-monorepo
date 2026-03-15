#!/bin/bash
# Lint Check Stop Hook
# Stop: Runs ESLint on modified packages before Claude finishes
# Exit code 2 blocks stopping and feeds error back to Claude

set -e

# Read JSON input
INPUT=$(cat)
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')

# Logging for observability
LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/lint-stop-$(date +%Y%m%d).log"

log_msg() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Prevent infinite loops - if we're already in a stop hook, don't check again
if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
  exit 0
fi

log_msg "Lint check triggered"

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

# Find packages with modified TypeScript/Svelte files
PACKAGES_TO_CHECK=""

# Check modified files against HEAD (uncommitted changes)
if git diff --name-only HEAD 2>/dev/null | grep -qE '\.(ts|tsx|svelte)$'; then
  MODIFIED_PACKAGES=$(git diff --name-only HEAD 2>/dev/null | grep -E '^packages/' | cut -d'/' -f2 | sort -u)
  
  for pkg in $MODIFIED_PACKAGES; do
    # Check if package has an eslint config or uses root config
    if [[ -f "$CLAUDE_PROJECT_DIR/packages/$pkg/package.json" ]]; then
      PACKAGES_TO_CHECK="$PACKAGES_TO_CHECK $pkg"
    fi
  done
fi

# If no packages detected, skip linting
if [[ -z "$PACKAGES_TO_CHECK" ]]; then
  log_msg "No packages to lint - skipping"
  exit 0
fi

log_msg "Checking packages:$PACKAGES_TO_CHECK"

# Run lint check on modified packages
ERRORS=""
WARNINGS=""

for pkg in $PACKAGES_TO_CHECK; do
  PKG_DIR="$CLAUDE_PROJECT_DIR/packages/$pkg"
  
  if [[ -d "$PKG_DIR" ]]; then
    # Check if package has lint script
    HAS_LINT=$(jq -r '.scripts.lint // empty' "$PKG_DIR/package.json" 2>/dev/null)
    
    if [[ -n "$HAS_LINT" ]]; then
      # Run pnpm lint and capture output
      LINT_OUTPUT=$(cd "$PKG_DIR" && pnpm lint 2>&1) || {
        EXIT_CODE=$?
        if [[ $EXIT_CODE -eq 1 ]]; then
          # ESLint found errors
          ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -c "error" || echo "0")
          ERRORS="$ERRORS\n\n=== $pkg ($ERROR_COUNT errors) ===\n$(echo "$LINT_OUTPUT" | grep -E "error|Error" | head -10)"
        elif [[ $EXIT_CODE -eq 2 ]]; then
          # ESLint configuration or execution error
          WARNINGS="$WARNINGS\n• $pkg: ESLint configuration issue"
        fi
      }
    else
      # No lint script, try running eslint directly if config exists
      if [[ -f "$PKG_DIR/.eslintrc.js" || -f "$PKG_DIR/.eslintrc.json" || -f "$PKG_DIR/eslint.config.js" ]]; then
        LINT_OUTPUT=$(cd "$PKG_DIR" && pnpm exec eslint . --ext .ts,.tsx,.svelte --max-warnings 0 2>&1) || {
          ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -c "error" || echo "0")
          if [[ "$ERROR_COUNT" -gt 0 ]]; then
            ERRORS="$ERRORS\n\n=== $pkg ($ERROR_COUNT errors) ===\n$(echo "$LINT_OUTPUT" | grep -E "error|Error" | head -10)"
          fi
        }
      fi
    fi
  fi
done

# Report results
if [[ -n "$ERRORS" ]]; then
  log_msg "Result: FAIL - Lint errors detected"
  echo -e "ESLint errors detected. Please fix before completing:\n$ERRORS\n\nRun 'pnpm lint' in the affected package to see full details." >&2
  exit 2
fi

if [[ -n "$WARNINGS" ]]; then
  log_msg "Result: PASS (with warnings)"
  echo -e "Lint warnings (non-blocking):$WARNINGS" >&2
fi

log_msg "Result: PASS"
exit 0
