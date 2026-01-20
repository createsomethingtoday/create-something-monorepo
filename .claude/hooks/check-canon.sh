#!/bin/bash
# Canon Enforcement Hook
# PostToolUse: Detects Tailwind design utilities that should use Canon tokens
# Exit code 2 feeds error back to Claude for self-correction

set -e

# Read JSON input from stdin
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Logging for observability
LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/check-canon-$(date +%Y%m%d).log"

log_msg() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Only check Write and Edit tools on Svelte/CSS/HTML files
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only check relevant file types
if [[ ! "$FILE_PATH" =~ \.(svelte|css|html|tsx|jsx)$ ]]; then
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

log_msg "Validating: $FILE_PATH"

# Tailwind design utilities that should use Canon tokens
# These patterns detect Tailwind classes that violate "Tailwind for structure, Canon for aesthetics"
VIOLATIONS=""

# Border radius violations
if grep -qE 'class="[^"]*rounded-(sm|md|lg|xl|2xl|3xl|full)[^"]*"' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• rounded-* detected: Use var(--radius-sm/md/lg/xl) instead"
fi

# Background color violations (design, not layout)
if grep -qE 'class="[^"]*(bg-white|bg-black|bg-gray-|bg-slate-|bg-zinc-|bg-neutral-)[^"]*"' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• bg-[color] detected: Use var(--color-bg-*) instead"
fi

# Text color violations
if grep -qE 'class="[^"]*(text-white|text-black|text-gray-|text-slate-|text-zinc-)[^"]*"' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• text-[color] detected: Use var(--color-fg-*) instead"
fi

# Shadow violations
if grep -qE 'class="[^"]*shadow-(sm|md|lg|xl|2xl)[^"]*"' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• shadow-* detected: Use var(--shadow-*) instead"
fi

# Typography size violations (exclude -canon suffixed classes which ARE Canon)
if grep -E 'class="[^"]*text-(xs|sm|base|lg|xl|2xl|3xl|4xl)[^"]*"' "$FILE_PATH" 2>/dev/null | grep -vq '\-canon'; then
  VIOLATIONS="$VIOLATIONS\n• text-[size] detected: Use var(--text-*) instead"
fi

# Border color violations
if grep -qE 'class="[^"]*border-(white|black|gray-|slate-|zinc-)[^"]*"' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• border-[color] detected: Use var(--color-border-*) instead"
fi

if [[ -n "$VIOLATIONS" ]]; then
  log_msg "Result: FAIL - Canon violations found"
  echo -e "Canon violation in $FILE_PATH:\n$VIOLATIONS\n\nUse Tailwind for LAYOUT (flex, grid, p-*, m-*, w-*, h-*, gap-*) but Canon tokens for DESIGN (colors, radius, shadows, typography).\n\nFix: Move design utilities to <style> block using CSS variables from app.css." >&2
  exit 2
fi

log_msg "Result: PASS"
exit 0
