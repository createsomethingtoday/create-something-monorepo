#!/bin/bash
#
# research-pipeline.sh - Multi-turn research session for .io papers
#
# Conducts multi-turn research sessions using Claude Code's session
# persistence for deep analysis and paper generation.
#
# Usage:
#   ./research-pipeline.sh <topic> [--resume <session-id>]
#   ./research-pipeline.sh "motion ontology in design systems"
#   ./research-pipeline.sh "hermeneutic UX" --resume abc123
#
# Output:
#   Research notes, analysis, and paper outline
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_step() { echo -e "${MAGENTA}[STEP]${NC} $1"; }

# Parse arguments
TOPIC=""
SESSION_ID=""
RESUME_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --resume)
            RESUME_MODE=true
            SESSION_ID="$2"
            shift 2
            ;;
        *)
            TOPIC="$1"
            shift
            ;;
    esac
done

if [[ -z "$TOPIC" && "$RESUME_MODE" == "false" ]]; then
    echo "Usage: $0 <topic> [--resume <session-id>]"
    echo "Example: $0 'motion ontology in design systems'"
    exit 1
fi

OUTPUT_DIR="${REPO_ROOT}/.triad-audit/research"
mkdir -p "$OUTPUT_DIR"

# System prompt for research
SYSTEM_PROMPT="You are a research assistant for CREATE SOMETHING, helping develop papers for createsomething.io.

## Research Philosophy
CREATE SOMETHING publishes research at the intersection of:
- Phenomenology (Heidegger, Merleau-Ponty)
- Design philosophy (Dieter Rams, Christopher Alexander)
- Software craft (DRY, SOLID, functional programming)

## The Hermeneutic Method
Research follows the hermeneutic circle:
1. Encounter the phenomenon
2. Form initial understanding
3. Examine parts in detail
4. Revise understanding of whole
5. Repeat until coherence

## Output Standards
- Rigorous but accessible
- Grounded in philosophy but practical
- Examples from real software/design
- Clear actionable insights

## Your Role
Guide multi-turn research sessions:
1. Explore the topic thoroughly
2. Identify key concepts and tensions
3. Find connections to existing CREATE SOMETHING work
4. Develop original insights
5. Structure findings for publication"

# Function to run a research step
run_step() {
    local step_name="$1"
    local prompt="$2"
    local session_flag=""

    if [[ -n "$SESSION_ID" ]]; then
        session_flag="--resume $SESSION_ID"
    fi

    log_step "$step_name"

    RESULT=$(claude -p "$prompt" \
        --append-system-prompt "$SYSTEM_PROMPT" \
        --output-format json \
        --allowedTools "Read,Grep,Glob,WebSearch,WebFetch" \
        $session_flag \
        2>/dev/null || echo '{"error": "Step failed"}')

    # Extract session ID for continuation
    SESSION_ID=$(echo "$RESULT" | jq -r '.session_id // empty')

    # Extract result
    STEP_RESULT=$(echo "$RESULT" | jq -r '.result // "No result"')
    COST=$(echo "$RESULT" | jq -r '.total_cost_usd // 0')

    echo "$STEP_RESULT"
    log_info "Step cost: \$${COST}"
    echo ""

    # Save step result
    echo "$RESULT" >> "${OUTPUT_DIR}/session-${SESSION_ID}.jsonl"
}

# Initialize or resume session
if [[ "$RESUME_MODE" == "true" ]]; then
    log_info "Resuming session: $SESSION_ID"

    # Continue with a follow-up prompt
    run_step "Continuation" "Continue the research. What aspects need deeper exploration? What new connections have emerged?"
else
    log_info "Starting new research session"
    log_info "Topic: $TOPIC"
    echo ""

    # Step 1: Initial exploration
    run_step "1. Initial Exploration" \
        "Begin research on: '$TOPIC'

First, explore:
1. What is the core phenomenon?
2. What existing literature/work exists?
3. What's the CREATE SOMETHING angle?
4. What tensions or questions emerge?

Search the web and codebase for relevant material."

    # Step 2: Concept mapping
    run_step "2. Concept Mapping" \
        "Based on the initial exploration, map the key concepts:

1. Define 3-5 core concepts
2. Identify relationships between them
3. Note any philosophical foundations (Heidegger, Rams, etc.)
4. Flag areas needing deeper investigation"

    # Step 3: CREATE SOMETHING integration
    run_step "3. CREATE SOMETHING Integration" \
        "Connect this research to existing CREATE SOMETHING work:

1. Check packages/io/src/routes/papers/ for related papers
2. Check packages/ltd/src/routes/patterns/ for related patterns
3. Identify how this extends or challenges existing work
4. Note potential cross-references"

    # Step 4: Original insight development
    run_step "4. Original Insights" \
        "Develop original insights:

1. What new understanding emerges from this research?
2. What practical implications exist?
3. What's the 'less, but better' takeaway?
4. How does this serve the whole CREATE SOMETHING system?"

    # Step 5: Paper outline
    run_step "5. Paper Outline" \
        "Create a paper outline for createsomething.io:

Structure:
1. Title (compelling, precise)
2. Abstract (2-3 sentences)
3. Introduction (the phenomenon, the question)
4. Background (philosophical grounding)
5. Analysis (original contribution)
6. Practical Applications
7. Conclusion (the insight)

Include specific section content notes."
fi

# Save session info
SESSION_FILE="${OUTPUT_DIR}/session-${SESSION_ID}-info.json"
jq -n \
    --arg topic "$TOPIC" \
    --arg session_id "$SESSION_ID" \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
        topic: $topic,
        session_id: $session_id,
        started: $timestamp,
        status: "in_progress"
    }' > "$SESSION_FILE"

log_success "Research session complete!"
log_info "Session ID: $SESSION_ID"
log_info "To continue: $0 '$TOPIC' --resume $SESSION_ID"
log_info "Session file: $SESSION_FILE"

echo ""
echo "=========================================="
echo "RESEARCH SESSION SUMMARY"
echo "=========================================="
echo "Topic: $TOPIC"
echo "Session: $SESSION_ID"
echo ""
echo "Next steps:"
echo "  1. Review output above"
echo "  2. Continue with: $0 '$TOPIC' --resume $SESSION_ID"
echo "  3. Or start paper draft in packages/io/src/routes/papers/"
