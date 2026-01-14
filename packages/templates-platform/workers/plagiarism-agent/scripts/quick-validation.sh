#!/bin/bash
# Quick Validation: Test vector similarity accuracy against existing cases
#
# This script uses the cases already processed and stored in D1
# to validate the vector similarity approach without needing to
# re-run the full agent pipeline.

WORKER_URL="https://plagiarism-agent.createsomething.workers.dev"
cd "$(dirname "$0")/.."

echo "═══════════════════════════════════════════════════════════════"
echo "  QUICK VALIDATION: Vector Similarity Accuracy"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Get all cases with vector similarity evidence
echo "Fetching cases with vector similarity data from D1..."
echo ""

CASES=$(wrangler d1 execute templates-platform-db --remote --json --command "
SELECT 
  pc.id,
  pc.airtable_record_id,
  pc.final_decision as agent_decision,
  pe.data_json as vector_data
FROM plagiarism_cases pc
LEFT JOIN plagiarism_evidence pe ON pc.id = pe.case_id AND pe.kind = 'tier3_vector_similarity'
WHERE pc.final_decision IS NOT NULL
ORDER BY pc.created_at DESC
LIMIT 20
")

echo "Cases retrieved. Analyzing..."
echo ""

# Parse and analyze
echo "$CASES" | jq -r '
  .[0].results[] |
  "Case: \(.id)",
  "  Airtable: \(.airtable_record_id)",
  "  Agent Decision: \(.agent_decision)",
  "  Vector Similarity: \(.vector_data | fromjson? // "N/A" | if . == "N/A" then "N/A" else "overall=\(.overall | . * 100 | floor)%, verdict=\(.verdict)" end)",
  ""
'

echo "═══════════════════════════════════════════════════════════════"
echo "  THRESHOLD ANALYSIS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Extract vector similarities and analyze thresholds
echo "$CASES" | jq -r '
  [.[0].results[] | select(.vector_data != null) | {
    case_id: .id,
    agent: .agent_decision,
    overall: (.vector_data | fromjson?.overall // 0)
  }] |
  "Cases with vector data: \(length)",
  "",
  "Distribution:",
  (group_by(.agent) | .[] | "  \(.[0].agent): \(length) cases, avg similarity: \([.[].overall] | add / length * 100 | floor)%"),
  "",
  "Threshold simulation (vector overall → major):",
  "  >= 99%: would flag \([.[] | select(.overall >= 0.99)] | length) as major",
  "  >= 95%: would flag \([.[] | select(.overall >= 0.95)] | length) as major",
  "  >= 90%: would flag \([.[] | select(.overall >= 0.90)] | length) as major",
  "  >= 85%: would flag \([.[] | select(.overall >= 0.85)] | length) as major"
'

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  NEXT STEPS"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. Compare agent_decision against human labels in Airtable"
echo "2. Run full validation study: npm run validate"
echo "3. Add more test cases with known human decisions"
echo ""
echo "To test a specific case pair via /api/compare:"
echo "  curl -X POST $WORKER_URL/api/compare \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"originalUrl\": \"https://original.webflow.io\", \"allegedCopyUrl\": \"https://copy.webflow.io\"}'"
echo ""
