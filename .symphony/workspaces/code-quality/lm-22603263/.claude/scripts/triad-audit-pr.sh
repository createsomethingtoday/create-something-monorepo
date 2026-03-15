#!/bin/bash
#
# triad-audit-pr.sh - Subtractive Triad review for Pull Requests
#
# Runs Claude Code in headless mode to review PRs through the
# philosophical lens of DRY, Rams, and Heidegger.
#
# Usage:
#   ./triad-audit-pr.sh <pr-number>
#   ./triad-audit-pr.sh 123
#
# Environment:
#   ANTHROPIC_API_KEY - Required for Claude Code
#   GITHUB_TOKEN      - Required for gh CLI (usually automatic in Actions)
#
# Output:
#   JSON report with violations, commendations, and recommendations
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Validate arguments
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <pr-number>"
    echo "Example: $0 123"
    exit 1
fi

PR_NUMBER="$1"
OUTPUT_DIR="${REPO_ROOT}/.triad-audit"
OUTPUT_FILE="${OUTPUT_DIR}/pr-${PR_NUMBER}-$(date +%Y%m%d-%H%M%S).json"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

log_info "Starting Subtractive Triad audit for PR #${PR_NUMBER}"

# Get PR diff
log_info "Fetching PR diff..."
PR_DIFF=$(gh pr diff "$PR_NUMBER" 2>/dev/null || echo "")

if [[ -z "$PR_DIFF" ]]; then
    log_error "Could not fetch PR diff. Is PR #${PR_NUMBER} valid?"
    exit 1
fi

# Get PR metadata
PR_TITLE=$(gh pr view "$PR_NUMBER" --json title -q '.title' 2>/dev/null || echo "Unknown")
PR_AUTHOR=$(gh pr view "$PR_NUMBER" --json author -q '.author.login' 2>/dev/null || echo "Unknown")
CHANGED_FILES=$(gh pr view "$PR_NUMBER" --json files -q '.files[].path' 2>/dev/null | wc -l | tr -d ' ')

log_info "PR: $PR_TITLE"
log_info "Author: $PR_AUTHOR"
log_info "Changed files: $CHANGED_FILES"

# System prompt for the audit
SYSTEM_PROMPT="You are a code reviewer applying the Subtractive Triad from CREATE SOMETHING.

## The Subtractive Triad

For every change, ask three questions in order:

1. **DRY (Implementation)**: Have I built this before?
   - Look for: duplicate code, repeated patterns, copy-paste
   - Action: Unify

2. **Rams (Artifact)**: Does this earn its existence?
   - Look for: unused imports, dead code, over-engineering, unnecessary complexity
   - Action: Remove
   - Principle: Weniger, aber besser (Less, but better)

3. **Heidegger (System)**: Does this serve the whole?
   - Look for: orphaned code, inconsistent naming, poor cohesion, missing documentation
   - Action: Reconnect
   - Principle: The hermeneutic circle - parts must serve the whole

## Your Task

Review this PR diff and provide:
1. A score for each level (0-10)
2. Specific violations with file/line references
3. Commendations for good practices
4. A clear recommendation: APPROVE, REQUEST_CHANGES, or COMMENT

Be specific. Reference actual code from the diff. Be constructive but uncompromising on philosophy."

# Run Claude Code in headless mode
log_info "Running Claude Code analysis..."

RESULT=$(echo "$PR_DIFF" | claude -p \
    "Review this Pull Request diff through the Subtractive Triad.

PR #${PR_NUMBER}: ${PR_TITLE}
Author: ${PR_AUTHOR}
Files changed: ${CHANGED_FILES}

Analyze every change. Be specific about violations and commendations. Output structured JSON." \
    --append-system-prompt "$SYSTEM_PROMPT" \
    --output-format json \
    --allowedTools "Read,Grep,Glob" \
    2>/dev/null || echo '{"error": "Claude Code execution failed"}')

# Check for errors
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
    log_error "Audit failed: $(echo "$RESULT" | jq -r '.error')"
    exit 1
fi

# Extract key metrics
COST=$(echo "$RESULT" | jq -r '.total_cost_usd // "unknown"')
DURATION=$(echo "$RESULT" | jq -r '.duration_ms // "unknown"')
SESSION_ID=$(echo "$RESULT" | jq -r '.session_id // "unknown"')

# Save full result
echo "$RESULT" > "$OUTPUT_FILE"

log_success "Audit complete!"
log_info "Cost: \$${COST}"
log_info "Duration: ${DURATION}ms"
log_info "Session: ${SESSION_ID}"
log_info "Report saved: ${OUTPUT_FILE}"

# Extract and display the analysis
ANALYSIS=$(echo "$RESULT" | jq -r '.result // "No analysis available"')

echo ""
echo "=========================================="
echo "SUBTRACTIVE TRIAD AUDIT - PR #${PR_NUMBER}"
echo "=========================================="
echo ""
echo "$ANALYSIS"
echo ""

# Exit with appropriate code based on recommendation
if echo "$ANALYSIS" | grep -qi "REQUEST_CHANGES"; then
    log_warn "Recommendation: REQUEST_CHANGES"
    exit 1
elif echo "$ANALYSIS" | grep -qi "APPROVE"; then
    log_success "Recommendation: APPROVE"
    exit 0
else
    log_info "Recommendation: COMMENT"
    exit 0
fi
