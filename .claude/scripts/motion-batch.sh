#!/bin/bash
#
# motion-batch.sh - Cross-property motion ontology analysis
#
# Analyzes CSS animations across all CREATE SOMETHING properties
# through Heidegger's phenomenological framework.
#
# Usage:
#   ./motion-batch.sh [--full]
#   ./motion-batch.sh              # Quick analysis (load trigger only)
#   ./motion-batch.sh --full       # Full analysis (load + hover + scroll)
#
# Output:
#   JSON report with motion inventory and phenomenological classification
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_domain() { echo -e "${CYAN}[DOMAIN]${NC} $1"; }

# Configuration
FULL_MODE="${1:-quick}"
OUTPUT_DIR="${REPO_ROOT}/.triad-audit/motion"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_FILE="${OUTPUT_DIR}/batch-${TIMESTAMP}.json"

mkdir -p "$OUTPUT_DIR"

# CREATE SOMETHING properties
DOMAINS=(
    "createsomething.space"
    "createsomething.io"
    "createsomething.agency"
    "createsomething.ltd"
)

# Triggers based on mode
if [[ "$FULL_MODE" == "--full" ]]; then
    TRIGGERS=("load" "scroll")
    log_info "Running FULL motion analysis (load + scroll)"
else
    TRIGGERS=("load")
    log_info "Running QUICK motion analysis (load only)"
fi

# System prompt
SYSTEM_PROMPT="You are analyzing UI motion through Heidegger's phenomenological framework.

## Core Concepts

**Zuhandenheit (ready-to-hand)**: Motion recedes into use. User focuses on goal, not interface.
**Vorhandenheit (present-at-hand)**: Motion obstructs. User notices the animation itself.
**Aletheia (unconcealment)**: Motion reveals relationships, state changes, causation.

## Duration Thresholds
- instant (≤100ms): Maximum zuhandenheit
- fast (≤200ms): Still recedes
- moderate (≤300ms): Borderline
- slow (≤500ms): Approaching vorhandenheit
- theatrical (>500ms): Demands attention

## CREATE SOMETHING Standard
Every animation must justify its existence. If it cannot justify, it must be removed.

## Your Task
For each property, identify:
1. Motion inventory (what animations exist)
2. Ontological classification (zuhandenheit vs vorhandenheit)
3. Disclosure type (what does the motion reveal?)
4. Recommendation (keep, modify, remove)

Output structured JSON."

log_info "Analyzing ${#DOMAINS[@]} properties with ${#TRIGGERS[@]} trigger(s)"

# Initialize results array
RESULTS="["
FIRST=true

for domain in "${DOMAINS[@]}"; do
    for trigger in "${TRIGGERS[@]}"; do
        log_domain "Analyzing https://${domain} (trigger: ${trigger})"

        # Build trigger JSON
        if [[ "$trigger" == "scroll" ]]; then
            TRIGGER_JSON='{"type":"scroll","scrollPosition":500}'
        else
            TRIGGER_JSON='{"type":"load"}'
        fi

        # Analyze via Claude Code
        RESULT=$(claude -p \
            "Analyze motion on https://${domain}

Trigger: ${trigger}
Domain: ${domain}

1. Describe what animations/transitions you observe
2. Classify each as zuhandenheit or vorhandenheit
3. Identify what each motion discloses (or fails to disclose)
4. Provide specific recommendations

Be concise but thorough. This is for a cross-property audit." \
            --append-system-prompt "$SYSTEM_PROMPT" \
            --output-format json \
            --allowedTools "WebFetch" \
            2>/dev/null || echo '{"error": "Analysis failed", "domain": "'"$domain"'"}')

        # Extract analysis
        ANALYSIS=$(echo "$RESULT" | jq -r '.result // "Analysis unavailable"')
        COST=$(echo "$RESULT" | jq -r '.total_cost_usd // 0')

        # Build result object
        ENTRY=$(jq -n \
            --arg domain "$domain" \
            --arg trigger "$trigger" \
            --arg analysis "$ANALYSIS" \
            --arg cost "$COST" \
            --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '{
                domain: $domain,
                trigger: $trigger,
                analysis: $analysis,
                cost: ($cost | tonumber),
                timestamp: $timestamp
            }')

        if [[ "$FIRST" == "true" ]]; then
            RESULTS="${RESULTS}${ENTRY}"
            FIRST=false
        else
            RESULTS="${RESULTS},${ENTRY}"
        fi

        log_success "Completed ${domain} (${trigger}) - \$${COST}"

        # Rate limiting
        sleep 2
    done
done

RESULTS="${RESULTS}]"

# Calculate totals
TOTAL_COST=$(echo "$RESULTS" | jq '[.[].cost] | add')
TOTAL_ANALYSES=$(echo "$RESULTS" | jq 'length')

# Build final report
REPORT=$(jq -n \
    --argjson results "$RESULTS" \
    --arg total_cost "$TOTAL_COST" \
    --arg total_analyses "$TOTAL_ANALYSES" \
    --arg timestamp "$TIMESTAMP" \
    --arg mode "$FULL_MODE" \
    '{
        metadata: {
            timestamp: $timestamp,
            mode: $mode,
            total_analyses: ($total_analyses | tonumber),
            total_cost_usd: ($total_cost | tonumber)
        },
        results: $results
    }')

echo "$REPORT" > "$OUTPUT_FILE"

log_success "Batch analysis complete!"
log_info "Total cost: \$${TOTAL_COST}"
log_info "Analyses: ${TOTAL_ANALYSES}"
log_info "Report: ${OUTPUT_FILE}"

echo ""
echo "=========================================="
echo "MOTION ONTOLOGY BATCH ANALYSIS"
echo "=========================================="
echo ""

# Summary per domain
for domain in "${DOMAINS[@]}"; do
    echo -e "${CYAN}${domain}${NC}"
    echo "$RESULTS" | jq -r --arg d "$domain" '.[] | select(.domain == $d) | "  [\(.trigger)] \(.analysis | split("\n")[0])"' 2>/dev/null || echo "  No data"
    echo ""
done

echo "Full report: ${OUTPUT_FILE}"
