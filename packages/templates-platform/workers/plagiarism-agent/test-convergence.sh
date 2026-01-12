#!/bin/bash
# Test Vector Convergence with Two Templates
# 
# This script indexes two templates and queries for similarity
# to demonstrate convergence in vector space

set -e

BASE_URL="https://plagiarism-agent.createsomething.workers.dev"

echo "🧪 Testing Vector Convergence"
echo "=============================="
echo ""

# Test 1: Index Padelthon
echo "📥 1. Indexing Padelthon..."
RESULT1=$(curl -s -X POST "$BASE_URL/index" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "padelthon",
    "url": "https://padelthon.webflow.io/",
    "name": "Padelthon",
    "creator": "Create Something"
  }')

echo "$RESULT1" | jq .
echo ""

# Wait a bit
sleep 2

# Test 2: Index a second template (using example from your URL)
echo "📥 2. Indexing a second template..."
echo "Which template would you like to test against?"
echo "Enter the URL (or press Enter for a test template):"
read -r TEMPLATE_URL

if [ -z "$TEMPLATE_URL" ]; then
  TEMPLATE_URL="https://studio-brave.webflow.io/"
  TEMPLATE_NAME="Brave Studio"
  TEMPLATE_ID="brave-studio"
else
  echo "Enter template name:"
  read -r TEMPLATE_NAME
  TEMPLATE_ID=$(echo "$TEMPLATE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
fi

RESULT2=$(curl -s -X POST "$BASE_URL/index" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$TEMPLATE_ID\",
    \"url\": \"$TEMPLATE_URL\",
    \"name\": \"$TEMPLATE_NAME\",
    \"creator\": \"Test Creator\"
  }")

echo "$RESULT2" | jq .
echo ""

# Wait for indexing
sleep 2

# Test 3: Query for Padelthon - should find itself + the other template if similar
echo "🔍 3. Querying for templates similar to Padelthon..."
QUERY_RESULT=$(curl -s -X POST "$BASE_URL/query" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://padelthon.webflow.io/",
    "topK": 5
  }')

echo "$QUERY_RESULT" | jq .
echo ""

# Test 4: Query for the second template
echo "🔍 4. Querying for templates similar to $TEMPLATE_NAME..."
QUERY_RESULT2=$(curl -s -X POST "$BASE_URL/query" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$TEMPLATE_URL\",
    \"topK\": 5
  }")

echo "$QUERY_RESULT2" | jq .
echo ""

# Analysis
echo "📊 Analysis:"
echo "============"
echo ""
echo "If the templates are similar (e.g., both use similar layouts, CSS patterns),"
echo "they should appear in each other's results with similarity > 0.70"
echo ""
echo "Similarity interpretation:"
echo "  0.95-1.00: Extremely similar (likely copied)"
echo "  0.85-0.95: High similarity (significant overlap)"
echo "  0.70-0.85: Moderate similarity (some common patterns)"
echo "  <0.70:    Low similarity (different designs)"
echo ""

# Extract similarity if second template appears in Padelthon's results
SIMILARITY=$(echo "$QUERY_RESULT" | jq -r ".results[] | select(.id == \"$TEMPLATE_ID\") | .similarity")

if [ -n "$SIMILARITY" ] && [ "$SIMILARITY" != "null" ]; then
  echo "✅ Convergence detected!"
  echo "   Padelthon ↔ $TEMPLATE_NAME similarity: $SIMILARITY"
  
  # Classify
  SIMILARITY_FLOAT=$(echo "$SIMILARITY" | awk '{print $1}')
  if (( $(echo "$SIMILARITY_FLOAT >= 0.95" | bc -l) )); then
    echo "   Verdict: Extremely similar (potential copy)"
  elif (( $(echo "$SIMILARITY_FLOAT >= 0.85" | bc -l) )); then
    echo "   Verdict: High similarity"
  elif (( $(echo "$SIMILARITY_FLOAT >= 0.70" | bc -l) )); then
    echo "   Verdict: Moderate similarity"
  else
    echo "   Verdict: Low similarity"
  fi
else
  echo "⚠️  Templates did not converge (similarity < 0.70 or not in top 5)"
  echo "   This is expected if they're very different designs"
fi

echo ""
echo "🎯 Test complete!"
