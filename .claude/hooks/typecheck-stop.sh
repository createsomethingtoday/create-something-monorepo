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

# Only check packages where .ts or .svelte files were modified
# Compare against HEAD to find uncommitted changes to TypeScript/Svelte files
MODIFIED_TS_FILES=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|svelte)$' || true)
if [[ -n "$MODIFIED_TS_FILES" ]]; then
  # Extract package names from modified .ts/.svelte file paths only
  MODIFIED_PACKAGES=$(echo "$MODIFIED_TS_FILES" | grep -E '^packages/' | cut -d'/' -f2 | sort -u)

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
    # Skip packages without dependencies installed
    if [[ ! -d "$PKG_DIR/node_modules" ]]; then
      log_msg "Skipping $pkg - node_modules not installed"
      continue
    fi

    # Skip packages without typescript installed
    if ! (cd "$PKG_DIR" && pnpm exec tsc --version >/dev/null 2>&1); then
      log_msg "Skipping $pkg - tsc not available"
      continue
    fi

    # Run tsc --noEmit and capture output
    TSC_OUTPUT=$(cd "$PKG_DIR" && pnpm exec tsc --noEmit 2>&1) || true

    # Filter out a known false-positive class: raw `tsc` can only see the
    # ambient `declare module "*.svelte"` (default export only), so any
    # `export { type X } from './Foo.svelte'` re-export reports TS2305/TS2614
    # ("has no exported member"). These resolve correctly under the package's
    # authoritative checker, `svelte-check` (see each Svelte package's
    # `pnpm check` / `svelte-package`), which is svelte2tsx-aware. Drop only
    # that class so genuine type errors still block.
    REAL_ERRORS=$(echo "$TSC_OUTPUT" \
      | grep -E "error TS[0-9]+:" \
      | grep -vE "error TS(2305|2614):.*\"\*\.svelte\"" || true)

    if [[ -n "$REAL_ERRORS" ]]; then
      ERRORS="$ERRORS\n\n=== $pkg ===\n$REAL_ERRORS"
    fi
  fi
done

if [[ -n "$ERRORS" ]]; then
  log_msg "Result: FAIL - Type errors detected"
  echo -e "Type errors detected. Please fix before completing:\n$ERRORS" >&2
  exit 2
fi

log_msg "Result: PASS"
exit 0
