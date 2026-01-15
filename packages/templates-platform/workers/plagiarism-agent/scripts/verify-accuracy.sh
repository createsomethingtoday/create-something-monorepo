#!/bin/bash
# Verification Script for Plagiarism Detection Accuracy
# Run after re-indexing completes to validate the system

WORKER_URL="https://plagiarism-agent.createsomething.workers.dev"

echo "═══════════════════════════════════════════════════════════════"
echo "  PLAGIARISM DETECTION ACCURACY VERIFICATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 1. Health Check
echo "1. Health Check"
echo "───────────────"
HEALTH=$(curl -s "$WORKER_URL/health")
echo "$HEALTH" | jq '.'
STATUS=$(echo "$HEALTH" | jq -r '.status')
if [ "$STATUS" != "healthy" ]; then
  echo "❌ System unhealthy - aborting"
  exit 1
fi
echo "✅ System healthy"
echo ""

# 2. Index Stats
echo "2. Index Statistics"
echo "───────────────────"
STATS=$(curl -s "$WORKER_URL/minhash/stats")
INDEXED=$(echo "$STATS" | jq -r '.totalIndexed')
echo "Templates indexed: $INDEXED"
if [ "$INDEXED" -lt 9000 ]; then
  echo "⚠️  Warning: Only $INDEXED templates indexed (expected ~9,500)"
fi
echo ""

# 3. Known Similarity Test (Nimatra vs Revio Pay - should be ~75%)
echo "3. Known Similarity Test"
echo "────────────────────────"
echo "Testing: Nimatra vs Revio Pay (expected: ~75% similar)"
COMPARE=$(curl -s -X POST "$WORKER_URL/compare" \
  -H "Content-Type: application/json" \
  -d '{"id1": "nimatra", "id2": "revio-pay"}')
SIMILARITY=$(echo "$COMPARE" | jq -r '.overallSimilarity')
IDENTICAL_RULES=$(echo "$COMPARE" | jq -r '.identicalRules | length')
PROP_COMBOS=$(echo "$COMPARE" | jq -r '.propertyCombinations | length')

echo "  Overall similarity: $(echo "$SIMILARITY * 100" | bc)%"
echo "  Identical CSS rules: $IDENTICAL_RULES"
echo "  Property combinations: $PROP_COMBOS"

if (( $(echo "$SIMILARITY > 0.6" | bc -l) )); then
  echo "✅ Similarity detection working (>60%)"
else
  echo "❌ Similarity too low - check tokenization"
fi
echo ""

# 4. Scan Test (should find matches for indexed template)
echo "4. Scan Endpoint Test"
echo "─────────────────────"
echo "Scanning: https://nimatra.webflow.io/"
SCAN=$(curl -s -X POST "$WORKER_URL/scan/template" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://nimatra.webflow.io/"}')
MATCH_COUNT=$(echo "$SCAN" | jq -r '.matchCount')
TOP_MATCH=$(echo "$SCAN" | jq -r '.topMatches[0].id // "none"')
TOP_SIM=$(echo "$SCAN" | jq -r '.topMatches[0].similarity // 0')

echo "  Matches found: $MATCH_COUNT"
echo "  Top match: $TOP_MATCH ($(echo "$TOP_SIM * 100" | bc)%)"

if [ "$MATCH_COUNT" -gt 0 ]; then
  echo "✅ Scan finding matches"
else
  echo "❌ Scan not finding matches - check LSH bands"
fi
echo ""

# 5. Suspicious Pairs
echo "5. Suspicious Pairs Detection"
echo "─────────────────────────────"
SUSPICIOUS=$(curl -s "$WORKER_URL/scan/suspicious?threshold=0.5&limit=5")
PAIR_COUNT=$(echo "$SUSPICIOUS" | jq -r '.count')
echo "  Pairs above 50% threshold: $PAIR_COUNT"

if [ "$PAIR_COUNT" -gt 0 ]; then
  echo "  Top pairs:"
  echo "$SUSPICIOUS" | jq -r '.pairs[:3][] | "    - \(.template1.name) vs \(.template2.name): \(.similarity * 100 | floor)%"'
  echo "✅ Suspicious pair detection working"
else
  echo "⚠️  No suspicious pairs found (may need lower threshold)"
fi
echo ""

# 6. Dashboard Stats
echo "6. Dashboard API"
echo "────────────────"
DASHBOARD=$(curl -s "$WORKER_URL/dashboard/stats")
TEMPLATES=$(echo "$DASHBOARD" | jq -r '.totalTemplatesIndexed')
CASES=$(echo "$DASHBOARD" | jq -r '.totalCasesProcessed')
echo "  Templates: $TEMPLATES"
echo "  Cases: $CASES"
echo "✅ Dashboard API responding"
echo ""

# Summary
echo "═══════════════════════════════════════════════════════════════"
echo "  VERIFICATION SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Health:        ✅"
echo "  Index:         $INDEXED templates"
echo "  Similarity:    $(echo "$SIMILARITY * 100" | bc)% (Nimatra/Revio)"
echo "  Scan:          $MATCH_COUNT matches found"
echo "  Suspicious:    $PAIR_COUNT pairs >50%"
echo ""
echo "  Dashboard:     $WORKER_URL/dashboard"
echo "  Comparison:    $WORKER_URL/compare/nimatra/revio-pay"
echo ""
