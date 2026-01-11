#!/bin/bash
# Experiment Structure Enforcement Hook
# PostToolUse: Validates experiment files have required structure and Canon tokens
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

# Only check experiment files in space package
if [[ ! "$FILE_PATH" =~ packages/space/src/routes/experiments/.*/\+page\.svelte$ ]]; then
  exit 0
fi

# Check if file exists
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

VIOLATIONS=""
WARNINGS=""

# ============================================================================
# STRUCTURE CHECKS
# ============================================================================

# Check 1: SEO meta tags
if ! grep -q '<svelte:head>' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Missing <svelte:head> block with SEO meta tags"
elif ! grep -q '<title>' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Missing <title> tag in svelte:head"
elif ! grep -q 'meta name="description"' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Missing <meta name=\"description\"> in svelte:head"
fi

# Check 2: Container width - should have max-w-* class
if ! grep -qE 'max-w-(sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|prose)' "$FILE_PATH" 2>/dev/null; then
  # Also check for custom max-width (which is a violation)
  if grep -qE 'max-width:\s*[0-9]+(px|ch|rem|em)' "$FILE_PATH" 2>/dev/null; then
    VIOLATIONS="$VIOLATIONS\n• Custom max-width value detected: Use max-w-4xl class instead"
  else
    WARNINGS="$WARNINGS\n• No max-width container found (consider using max-w-4xl mx-auto)"
  fi
fi

# ============================================================================
# CANON TOKEN CHECKS
# ============================================================================

# Check 3: Tailwind color utilities that should be Canon tokens
# Background colors
if grep -qE 'class="[^"]*\bbg-(white|black|gray|slate|zinc|neutral|stone)-' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Found Tailwind background color utility: Use Canon tokens (--color-bg-*)"
fi

# Background with opacity (bg-white/10, etc.)
if grep -qE 'class="[^"]*\bbg-(white|black)/[0-9]+' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Found bg-white/* or bg-black/* utility: Use Canon tokens (--color-bg-surface, --color-bg-subtle)"
fi

# Text colors
if grep -qE 'class="[^"]*\btext-(white|black|gray|slate|zinc|neutral|stone)-' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Found Tailwind text color utility: Use Canon tokens (--color-fg-*)"
fi

# Text with opacity
if grep -qE 'class="[^"]*\btext-(white|black)/[0-9]+' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Found text-white/* or text-black/* utility: Use Canon tokens (--color-fg-secondary, --color-fg-tertiary, --color-fg-muted)"
fi

# Check 4: Rounded utilities (should use var(--radius-*))
if grep -qE 'class="[^"]*\brounded-(sm|md|lg|xl|2xl|3xl|full)\b' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Found Tailwind rounded-* utility: Use Canon tokens in CSS (var(--radius-*))"
fi

# Check 5: Shadow utilities
if grep -qE 'class="[^"]*\bshadow-(sm|md|lg|xl|2xl)\b' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Found Tailwind shadow-* utility: Use Canon tokens in CSS (var(--shadow-*))"
fi

# Check 6: Hardcoded hex colors in style blocks
if grep -qE 'color:\s*#[0-9a-fA-F]{3,6}' "$FILE_PATH" 2>/dev/null; then
  VIOLATIONS="$VIOLATIONS\n• Found hardcoded hex color: Use Canon tokens (var(--color-*))"
fi

if grep -qE 'background(-color)?:\s*#[0-9a-fA-F]{3,6}' "$FILE_PATH" 2>/dev/null; then
  # Exclude pure black (#000000, #000) which is --color-bg-pure
  if grep -qE 'background(-color)?:\s*#[0-9a-fA-F]{3,6}' "$FILE_PATH" 2>/dev/null | grep -vE '#000(000)?(\s|;|$)' 2>/dev/null; then
    VIOLATIONS="$VIOLATIONS\n• Found hardcoded hex background: Use Canon tokens (var(--color-bg-*))"
  fi
fi

# ============================================================================
# BEST PRACTICE CHECKS (Warnings only)
# ============================================================================

# Check 7: Tracking function (encouraged but not required)
if ! grep -qE '(trackExperiment|trackEvent|analytics)' "$FILE_PATH" 2>/dev/null; then
  WARNINGS="$WARNINGS\n• No experiment tracking found (consider adding for research purposes)"
fi

# Check 8: Reduced motion support for animations
if grep -qE 'animation:|transition:|@keyframes' "$FILE_PATH" 2>/dev/null; then
  if ! grep -q 'prefers-reduced-motion' "$FILE_PATH" 2>/dev/null; then
    WARNINGS="$WARNINGS\n• Animations detected but no prefers-reduced-motion support"
  fi
fi

# ============================================================================
# OUTPUT
# ============================================================================

if [[ -n "$VIOLATIONS" ]]; then
  echo -e "Experiment structure violation in $FILE_PATH:\n$VIOLATIONS" >&2
  if [[ -n "$WARNINGS" ]]; then
    echo -e "\nWarnings (non-blocking):$WARNINGS" >&2
  fi
  echo -e "\nCanon token reference:\n  Colors: var(--color-fg-primary), var(--color-bg-surface), etc.\n  Radius: var(--radius-sm), var(--radius-md), var(--radius-lg)\n  Shadows: var(--shadow-sm), var(--shadow-md), var(--shadow-lg)\n\nReference: .claude/rules/css-canon.md" >&2
  exit 2
fi

# Warnings only - log but don't fail
if [[ -n "$WARNINGS" ]]; then
  echo -e "Experiment warnings in $FILE_PATH (non-blocking):$WARNINGS" >&2
fi

exit 0
