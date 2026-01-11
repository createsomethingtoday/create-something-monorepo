#!/bin/bash
# Paper Structure Enforcement Hook
# PostToolUse: Validates paper files follow standard template pattern
# Exit code 2 feeds error back to Claude for self-correction

set -e

# Read JSON input from stdin
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only check paper files in io package
if [[ ! "$FILE_PATH" =~ packages/io/src/routes/papers/.*/\+page\.svelte$ ]]; then
  exit 0
fi

# Check if file exists
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

VIOLATIONS=""

# Check 1: SEO meta tags
if ! grep -q '<svelte:head>' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Missing <svelte:head> block with SEO meta tags"
elif ! grep -q '<title>' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Missing <title> tag in svelte:head"
elif ! grep -q 'meta name="description"' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Missing <meta name=\"description\"> in svelte:head"
fi

# Check 2: Container structure
if ! grep -q 'paper-container' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Missing paper-container class (required for standard styling)"
fi

if ! grep -q 'max-w-4xl' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Missing max-w-4xl container width (standard is 896px)"
fi

# Check 3: Background color - flag grey backgrounds
if grep -qE '(--color-bg-surface|--color-bg-subtle|#1a1a1a|#111111|#0a0a0a)' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Grey background detected: Papers should use --color-bg-pure (pure black)"
fi

# Check 4: Custom max-width values
if grep -qE 'max-width:\s*[0-9]+(px|ch|rem|em)' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Custom max-width value detected: Use max-w-4xl class instead"
fi

# Check 5: Standard class names for core elements
if ! grep -q 'paper-header' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Missing paper-header class on header section"
fi

if ! grep -q 'paper-title' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Missing paper-title class on title element"
fi

if [[ -n "$VIOLATIONS" ]]; then
  echo -e "Paper structure violation in $FILE_PATH:\n$VIOLATIONS\n\nStandard paper structure:\n  <div class=\"min-h-screen p-6 paper-container\">\n    <div class=\"max-w-4xl mx-auto space-y-12\">...</div>\n  </div>\n\nWith .paper-container { background: var(--color-bg-pure); }\n\nReference: packages/io/src/routes/papers/haiku-optimization/+page.svelte" >&2
  exit 2
fi

exit 0
