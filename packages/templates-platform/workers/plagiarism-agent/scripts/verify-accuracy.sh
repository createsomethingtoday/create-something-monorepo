#!/bin/bash

# Verify Plagiarism Detection Accuracy
# Tests known plagiarism cases against our comparison system

API_BASE="https://plagiarism-agent.createsomething.workers.dev"

echo "============================================"
echo "Plagiarism Detection Accuracy Verification"
echo "============================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Track results
TOTAL=0
CORRECT=0
INCORRECT=0

# Function to test a case
test_case() {
  local case_name="$1"
  local original_url="$2"
  local copy_url="$3"
  local expected_verdict="$4"  # major, minor, no_violation
  
  TOTAL=$((TOTAL + 1))
  
  echo "Testing: $case_name"
  echo "  Original: $original_url"
  echo "  Copy: $copy_url"
  echo "  Expected: $expected_verdict"
  
  # Scan the alleged copy against the database
  RESULT=$(curl -s -X POST "$API_BASE/scan/url" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$copy_url\"}" \
    --max-time 60 2>&1)
  
  # Check if we got a valid response
  if echo "$RESULT" | jq -e '.similarity' > /dev/null 2>&1; then
    SIMILARITY=$(echo "$RESULT" | jq -r '.similarity')
    VERDICT=$(echo "$RESULT" | jq -r '.verdict // "unknown"')
    
    # Determine if our verdict matches expected
    # major = high similarity (>0.5)
    # minor = medium similarity (0.3-0.5)
    # no_violation = low similarity (<0.3)
    
    local our_verdict="no_violation"
    if (( $(echo "$SIMILARITY > 0.5" | bc -l) )); then
      our_verdict="major"
    elif (( $(echo "$SIMILARITY > 0.3" | bc -l) )); then
      our_verdict="minor"
    fi
    
    if [ "$our_verdict" = "$expected_verdict" ]; then
      echo -e "  ${GREEN}✓ MATCH${NC}: Similarity=$SIMILARITY, Verdict=$our_verdict"
      CORRECT=$((CORRECT + 1))
    else
      echo -e "  ${YELLOW}✗ MISMATCH${NC}: Similarity=$SIMILARITY, Our=$our_verdict, Expected=$expected_verdict"
      INCORRECT=$((INCORRECT + 1))
    fi
  else
    echo -e "  ${RED}✗ ERROR${NC}: $RESULT"
    INCORRECT=$((INCORRECT + 1))
  fi
  
  echo ""
}

# Also test using the comparison endpoint for more detailed analysis
test_comparison() {
  local case_name="$1"
  local id1="$2"
  local id2="$3"
  local expected_verdict="$4"
  
  TOTAL=$((TOTAL + 1))
  
  echo "Testing Comparison: $case_name"
  echo "  Template 1: $id1"
  echo "  Template 2: $id2"
  echo "  Expected: $expected_verdict"
  
  # Use the comparison endpoint
  RESULT=$(curl -s -X POST "$API_BASE/compare" \
    -H "Content-Type: application/json" \
    -d "{\"id1\": \"$id1\", \"id2\": \"$id2\"}" \
    --max-time 60 2>&1)
  
  if echo "$RESULT" | jq -e '.overallSimilarity' > /dev/null 2>&1; then
    SIMILARITY=$(echo "$RESULT" | jq -r '.overallSimilarity')
    IDENTICAL_RULES=$(echo "$RESULT" | jq -r '.identicalRules | length // 0')
    
    local our_verdict="no_violation"
    if (( $(echo "$SIMILARITY > 0.5" | bc -l) )); then
      our_verdict="major"
    elif (( $(echo "$SIMILARITY > 0.3" | bc -l) )); then
      our_verdict="minor"
    fi
    
    if [ "$our_verdict" = "$expected_verdict" ]; then
      echo -e "  ${GREEN}✓ MATCH${NC}: Similarity=$SIMILARITY, Identical Rules=$IDENTICAL_RULES"
      CORRECT=$((CORRECT + 1))
    else
      echo -e "  ${YELLOW}✗ MISMATCH${NC}: Similarity=$SIMILARITY, Our=$our_verdict, Expected=$expected_verdict"
      INCORRECT=$((INCORRECT + 1))
    fi
  else
    echo -e "  ${RED}✗ ERROR${NC}: Could not parse response"
    INCORRECT=$((INCORRECT + 1))
  fi
  
  echo ""
}

echo "=== Testing Known Plagiarism Cases ==="
echo ""

# Test cases with known verdicts
# These are actual URLs that have been judged

# Case 1: Acelia vs Mindware-X (Major violation)
test_case "Acelia vs Mindware-X" \
  "https://acelia.webflow.io/" \
  "https://mindware-x.webflow.io/" \
  "major"

# Case 2: Studio-Brave vs Kralv (Minor violation)
test_case "Studio-Brave vs Kralv" \
  "https://studio-brave.webflow.io/" \
  "https://kralv.webflow.io/" \
  "minor"

# Case 3: Scalerfy vs Fluora (Minor violation)  
test_case "Scalerfy vs Fluora" \
  "https://scalerfy.webflow.io/" \
  "https://fluora.webflow.io/" \
  "minor"

# Case 4: Studio-Brave vs Tofael (Major violation)
test_case "Studio-Brave vs Tofael" \
  "https://studio-brave.webflow.io/" \
  "https://tofael.webflow.io/" \
  "major"

# Case 5: Control test - completely different templates (No violation)
test_case "Control: Different Templates" \
  "https://nimatra.webflow.io/" \
  "https://startub-template.webflow.io/" \
  "no_violation"

# Case 6: Same template test (should be major/identical)
test_case "Control: Same Template" \
  "https://nimatra.webflow.io/" \
  "https://nimatra.webflow.io/" \
  "major"

echo "============================================"
echo "Accuracy Summary"
echo "============================================"
echo "Total Tests: $TOTAL"
echo -e "Correct: ${GREEN}$CORRECT${NC}"
echo -e "Incorrect: ${YELLOW}$INCORRECT${NC}"

if [ $TOTAL -gt 0 ]; then
  ACCURACY=$(echo "scale=1; $CORRECT * 100 / $TOTAL" | bc)
  echo "Accuracy: $ACCURACY%"
fi

echo ""
echo "Note: This tests against the /scan/url endpoint which"
echo "scans a URL against all indexed templates."
echo ""
echo "For page-level analysis, use the /pages/compare endpoint."
