#!/bin/bash
# Import Verification Hook
# PostToolUse: Verifies that @create-something imports exist before accepting writes
# Uses Ground to check that imported symbols actually exist in the target packages
# Exit code 2 feeds error back to Claude for self-correction

set -e

# Read JSON input from stdin
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Logging for observability
LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/check-imports-$(date +%Y%m%d).log"

log_msg() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Only check Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only check TypeScript and Svelte files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|svelte)$ ]]; then
  exit 0
fi

# Skip node_modules and build directories
if [[ "$FILE_PATH" =~ node_modules|\.svelte-kit|dist|build ]]; then
  exit 0
fi

# Check if file exists
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

log_msg "Checking imports in: $FILE_PATH"

# Check if Ground is available
GROUND="$CLAUDE_PROJECT_DIR/packages/ground/target/release/ground"
if [[ ! -f "$GROUND" ]]; then
  # Try npx fallback
  if ! command -v npx &> /dev/null; then
    log_msg "Ground not available, skipping import verification"
    exit 0
  fi
  GROUND="npx @createsomething/ground-mcp"
fi

# Extract @create-something imports
# Match patterns like: import { X, Y } from '@create-something/package'
IMPORTS=$(grep -oE "from ['\"]@create-something/[^'\"]+['\"]" "$FILE_PATH" 2>/dev/null | sed "s/from ['\"]//g" | sed "s/['\"]//g" | sort -u || true)

if [[ -z "$IMPORTS" ]]; then
  log_msg "No @create-something imports found"
  exit 0
fi

VIOLATIONS=""

for PACKAGE in $IMPORTS; do
  # Extract package name (e.g., @create-something/canon -> canon)
  PKG_NAME=$(echo "$PACKAGE" | sed 's/@create-something\///')
  PKG_DIR="$CLAUDE_PROJECT_DIR/packages/$PKG_NAME"
  
  # Check if the package directory exists
  if [[ ! -d "$PKG_DIR" ]]; then
    VIOLATIONS="$VIOLATIONS\n• Package not found: $PACKAGE (no packages/$PKG_NAME directory)"
    continue
  fi
  
  # Check if package.json exists and has exports
  if [[ ! -f "$PKG_DIR/package.json" ]]; then
    VIOLATIONS="$VIOLATIONS\n• Package $PACKAGE has no package.json"
    continue
  fi
  
  # Check if the package has a src/lib/index.ts (common export pattern)
  if [[ ! -f "$PKG_DIR/src/lib/index.ts" ]]; then
    # Try alternative patterns
    if [[ ! -f "$PKG_DIR/src/index.ts" && ! -f "$PKG_DIR/index.ts" ]]; then
      log_msg "Warning: $PACKAGE has no obvious entry point"
    fi
  fi
done

# Now verify individual symbol imports using a simpler approach
# Extract named imports: import { X, Y, Z } from '@create-something/package'
while IFS= read -r line; do
  if [[ "$line" =~ import[[:space:]]*\{([^}]+)\}[[:space:]]*from[[:space:]]*[\'\"]\@create-something/([^\'\"/]+) ]]; then
    SYMBOLS="${BASH_REMATCH[1]}"
    PKG_NAME="${BASH_REMATCH[2]}"
    PKG_DIR="$CLAUDE_PROJECT_DIR/packages/$PKG_NAME"
    
    # Clean up symbols (remove spaces, split by comma)
    SYMBOLS=$(echo "$SYMBOLS" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$')
    
    for SYMBOL in $SYMBOLS; do
      # Handle renamed imports (X as Y)
      ORIGINAL_SYMBOL=$(echo "$SYMBOL" | sed 's/ as .*//')
      
      # Quick check: see if the symbol is exported from the index file
      if [[ -f "$PKG_DIR/src/lib/index.ts" ]]; then
        if ! grep -qE "(export .* $ORIGINAL_SYMBOL|export \{ .* $ORIGINAL_SYMBOL)" "$PKG_DIR/src/lib/index.ts" 2>/dev/null; then
          # Double-check with a broader search
          if ! grep -rq "export.*$ORIGINAL_SYMBOL" "$PKG_DIR/src/lib/" 2>/dev/null; then
            VIOLATIONS="$VIOLATIONS\n• Symbol '$ORIGINAL_SYMBOL' not found in @create-something/$PKG_NAME exports"
          fi
        fi
      fi
    done
  fi
done < "$FILE_PATH"

if [[ -n "$VIOLATIONS" ]]; then
  log_msg "Result: FAIL - Import violations found"
  echo -e "Import verification failed in $FILE_PATH:\n$VIOLATIONS\n\nVerify the imports exist:\n  1. Check package exports: pnpm exports $PKG_NAME\n  2. Check the package's src/lib/index.ts\n  3. Ensure symbols are properly exported" >&2
  exit 2
fi

log_msg "Result: PASS"
exit 0
