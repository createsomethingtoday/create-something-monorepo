#!/bin/bash
# Type Check Stop Hook
# Stop: Verifies TypeScript compiles before Claude finishes
# Exit code 2 blocks stopping and feeds error back to Claude

set -e

# Read JSON input
INPUT=$(cat)
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')

# Logging for observability
LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/typecheck-stop-$(date +%Y%m%d).log"

log_msg() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Prevent infinite loops - if we're already in a stop hook, don't check again
if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
  exit 0
fi

# Find modified TypeScript/Svelte files in the session
# Check if we're in a package directory or monorepo root
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

if [[ -z "$CWD" ]]; then
  CWD="$CLAUDE_PROJECT_DIR"
fi

# Determine which package(s) to check based on recent activity
# For now, check all packages with modified files
PACKAGES_TO_CHECK=""

# Check if any .ts or .svelte files were modified recently
if git diff --name-only HEAD 2>/dev/null | grep -qE '\.(ts|svelte)$'; then
  # Get the packages with modifications
  MODIFIED_PACKAGES=$(git diff --name-only HEAD 2>/dev/null | grep -E '^packages/' | cut -d'/' -f2 | sort -u)

  for pkg in $MODIFIED_PACKAGES; do
    if [[ -f "$CLAUDE_PROJECT_DIR/packages/$pkg/tsconfig.json" ]]; then
      PACKAGES_TO_CHECK="$PACKAGES_TO_CHECK $pkg"
    fi
  done
fi

# If no packages detected, skip type checking
if [[ -z "$PACKAGES_TO_CHECK" ]]; then
  log_msg "No packages to check - skipping"
  exit 0
fi

log_msg "Checking packages:$PACKAGES_TO_CHECK"

# Run type check on modified packages
ERRORS=""
for pkg in $PACKAGES_TO_CHECK; do
  PKG_DIR="$CLAUDE_PROJECT_DIR/packages/$pkg"

  if [[ -d "$PKG_DIR" ]]; then
    # Run tsc --noEmit and capture errors
    TSC_OUTPUT=$(cd "$PKG_DIR" && pnpm exec tsc --noEmit 2>&1) || {
      ERRORS="$ERRORS\n\n=== $pkg ===\n$TSC_OUTPUT"
    }
  fi
done

if [[ -n "$ERRORS" ]]; then
  log_msg "Result: FAIL - Type errors detected"
  echo -e "Type errors detected. Please fix before completing:\n$ERRORS" >&2
  exit 2
fi

log_msg "Result: PASS"
exit 0
