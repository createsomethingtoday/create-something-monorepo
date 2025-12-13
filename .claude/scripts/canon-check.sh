#!/bin/bash
#
# canon-check.sh - CSS Canon compliance audit
#
# Audits Svelte components for Canon compliance before deployment.
# Principle: "Tailwind for structure, Canon for aesthetics"
#
# Usage:
#   ./canon-check.sh [package]
#   ./canon-check.sh space
#   ./canon-check.sh           # Audits all packages
#
# Output:
#   JSON report with violations and migration suggestions
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CANON_REF="$REPO_ROOT/.claude/memory/css-canon.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1" >&2; }

# Target package (optional)
PACKAGE="${1:-all}"

# Determine paths to audit
if [[ "$PACKAGE" == "all" ]]; then
    AUDIT_PATHS="$REPO_ROOT/packages/*/src"
    log_info "Auditing all packages"
else
    AUDIT_PATHS="$REPO_ROOT/packages/$PACKAGE/src"
    if [[ ! -d "$AUDIT_PATHS" ]]; then
        log_error "Package not found: $PACKAGE"
        exit 1
    fi
    log_info "Auditing package: $PACKAGE"
fi

# Load Canon reference
if [[ ! -f "$CANON_REF" ]]; then
    log_error "Canon reference not found: $CANON_REF"
    exit 1
fi

CANON_CONTENT=$(cat "$CANON_REF")

# Tailwind design utilities to detect (should use Canon instead)
DESIGN_PATTERNS=(
    'rounded-sm'
    'rounded-md'
    'rounded-lg'
    'rounded-xl'
    'rounded-2xl'
    'rounded-full'
    'bg-white'
    'bg-black'
    'bg-gray-'
    'bg-slate-'
    'text-white'
    'text-black'
    'text-gray-'
    'text-slate-'
    'shadow-sm'
    'shadow-md'
    'shadow-lg'
    'shadow-xl'
    'text-xs'
    'text-sm'
    'text-base'
    'text-lg'
    'text-xl'
    'text-2xl'
    'opacity-'
    'border-gray-'
    'border-white'
    'border-black'
)

OUTPUT_DIR="${REPO_ROOT}/.triad-audit"
OUTPUT_FILE="${OUTPUT_DIR}/canon-$(date +%Y%m%d-%H%M%S).json"
mkdir -p "$OUTPUT_DIR"

log_info "Scanning for Tailwind design utilities..."

# Find violations using grep
VIOLATIONS=""
TOTAL_VIOLATIONS=0

for pattern in "${DESIGN_PATTERNS[@]}"; do
    MATCHES=$(grep -r --include="*.svelte" -l "$pattern" $AUDIT_PATHS 2>/dev/null || true)
    if [[ -n "$MATCHES" ]]; then
        COUNT=$(echo "$MATCHES" | wc -l | tr -d ' ')
        TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + COUNT))
        VIOLATIONS="${VIOLATIONS}${pattern}: ${COUNT} files\n"
    fi
done

if [[ $TOTAL_VIOLATIONS -eq 0 ]]; then
    log_success "No Canon violations detected!"
    echo '{"status": "pass", "violations": 0, "message": "All components follow Canon"}' > "$OUTPUT_FILE"
    exit 0
fi

log_warn "Found $TOTAL_VIOLATIONS potential Canon violations"
echo -e "$VIOLATIONS"

# Run Claude Code for detailed analysis
log_info "Running Claude Code for detailed analysis..."

SYSTEM_PROMPT="You are auditing CSS for Canon compliance in a CREATE SOMETHING project.

## The Canon Principle
'Tailwind for structure, Canon for aesthetics.'

## What This Means
- KEEP Tailwind utilities for: flex, grid, items-*, justify-*, relative, absolute, p-*, m-*, gap-*, w-*, h-*
- REPLACE Tailwind utilities for: rounded-*, bg-white/black/gray, text-white/black/gray, shadow-*, text-xs/sm/lg, opacity-*

## Canon Tokens (use these instead)
$CANON_CONTENT

## Your Task
1. Identify specific files with violations
2. Show the problematic class usage
3. Provide the exact Canon replacement
4. Rate severity: critical (colors), high (radius/shadow), medium (typography), low (other)

Output structured JSON with actionable fixes."

# Get list of violating files
VIOLATING_FILES=$(grep -r --include="*.svelte" -l -E "$(IFS=\|; echo "${DESIGN_PATTERNS[*]}")" $AUDIT_PATHS 2>/dev/null | head -20 || true)

if [[ -z "$VIOLATING_FILES" ]]; then
    log_success "No violations found on detailed scan"
    exit 0
fi

RESULT=$(claude -p \
    "Audit these Svelte files for Canon compliance. List specific violations with fixes.

Files to audit:
$VIOLATING_FILES

Check each file for Tailwind design utilities that should use Canon tokens instead." \
    --append-system-prompt "$SYSTEM_PROMPT" \
    --output-format json \
    --allowedTools "Read,Grep,Glob" \
    2>/dev/null || echo '{"error": "Claude Code execution failed"}')

# Save result
echo "$RESULT" > "$OUTPUT_FILE"

# Extract analysis
ANALYSIS=$(echo "$RESULT" | jq -r '.result // "No analysis available"')
COST=$(echo "$RESULT" | jq -r '.total_cost_usd // "unknown"')

log_info "Analysis complete (cost: \$${COST})"
log_info "Report saved: ${OUTPUT_FILE}"

echo ""
echo "=========================================="
echo "CSS CANON COMPLIANCE AUDIT"
echo "=========================================="
echo ""
echo "$ANALYSIS"
echo ""

# Exit with warning if violations found
if [[ $TOTAL_VIOLATIONS -gt 0 ]]; then
    log_warn "Deploy blocked: $TOTAL_VIOLATIONS Canon violations"
    log_info "Fix violations or run with --force to override"
    exit 1
fi
