#!/bin/bash
# one-feature-guard.sh - Enforce single-feature sessions
# From: .claude/rules/harness-patterns.md

# Check for multiple in-progress issues
IN_PROGRESS=$(bd list --status=in_progress -q 2>/dev/null | grep "^csm-" || true)
if [ -z "$IN_PROGRESS" ]; then
  COUNT=0
else
  COUNT=$(echo "$IN_PROGRESS" | wc -l | tr -d ' ')
fi

if [ "$COUNT" -gt 1 ]; then
  echo "⚠ SCOPE VIOLATION: $COUNT issues in progress"
  echo "Issues:"
  echo "$IN_PROGRESS"
  echo ""
  echo "Resolution options:"
  echo "1. Close completed issues: bd close <id>"
  echo "2. Pause others: bd update <id> --status open"
  echo ""
  echo "Session blocked until exactly 1 issue in_progress."
  exit 1
fi

if [ "$COUNT" -eq 0 ]; then
  echo "→ No issue in progress. Select from bd ready:"
  bd ready 2>/dev/null | head -5
  echo ""
  echo "Start with: bd update <id> --status in_progress"
  exit 0
fi

echo "✓ Single issue in progress:"
echo "$IN_PROGRESS"
