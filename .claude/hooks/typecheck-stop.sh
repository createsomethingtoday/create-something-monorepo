#!/bin/bash
# Type Check Stop Hook
# Stop: Checks Svelte packages with svelte-check and plain TypeScript with tsc.
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

    # Use the package's Svelte-aware checker when its check script declares one.
    # Plain tsc cannot validate component bodies or named Svelte type exports.
    CHECK_SCRIPT=$(jq -r '.scripts.check // ""' "$PKG_DIR/package.json" 2>/dev/null || true)
    if [[ "$CHECK_SCRIPT" == *svelte-check* ]]; then
      # Library packages may delegate sync through `pnpm package`.
      HAS_SVELTEKIT=$(jq -r '(.dependencies["@sveltejs/kit"] // .devDependencies["@sveltejs/kit"] // .peerDependencies["@sveltejs/kit"] // "")' "$PKG_DIR/package.json" 2>/dev/null || true)
      if [[ "$CHECK_SCRIPT" == *"svelte-kit sync"* || -n "$HAS_SVELTEKIT" ]]; then
        log_msg "Preparing $pkg with svelte-kit sync"
        CHECK_OUTPUT=$(cd "$PKG_DIR" && pnpm exec svelte-kit sync 2>&1) || {
          ERRORS="$ERRORS\n\n=== $pkg (svelte-kit sync) ===\n$CHECK_OUTPUT"
          continue
        }
      fi
      log_msg "Checking $pkg with svelte-check"
      CHECK_OUTPUT=$(cd "$PKG_DIR" && pnpm exec svelte-check --tsconfig ./tsconfig.json --threshold error 2>&1) || {
        ERRORS="$ERRORS\n\n=== $pkg (svelte-check) ===\n$CHECK_OUTPUT"
      }
    else
      # Preserve the existing skip for plain TS packages without a compiler.
      if ! (cd "$PKG_DIR" && pnpm exec tsc --version >/dev/null 2>&1); then
        log_msg "Skipping $pkg - tsc not available"
        continue
      fi
      log_msg "Checking $pkg with tsc --noEmit"
      CHECK_OUTPUT=$(cd "$PKG_DIR" && pnpm exec tsc --noEmit 2>&1) || {
        ERRORS="$ERRORS\n\n=== $pkg ===\n$CHECK_OUTPUT"
      }
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
