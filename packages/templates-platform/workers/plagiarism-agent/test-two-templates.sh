#!/bin/bash
# Simple Two-Template Convergence Test
# Tests vector similarity between Padelthon and Brave Studio

set -e

BASE_URL="https://plagiarism-agent.createsomething.workers.dev"

echo "🧪 Two-Template Convergence Test"
echo "================================="
echo ""
echo "This test will:"
echo "1. Index Padelthon template"
echo "2. Index Brave Studio template"
echo "3. Query each to see if they converge in vector space"
echo ""

# Template 1: Padelthon
echo "📥 Step 1: Indexing Padelthon..."
curl -s -X POST "$BASE_URL/index" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "padelthon",
    "url": "https://padelthon.webflow.io/",
    "name": "Padelthon",
    "creator": "Create Something"
  }' | jq .

echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

# Template 2: Brave Studio
echo ""
echo "📥 Step 2: Indexing Brave Studio..."
curl -s -X POST "$BASE_URL/index" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "brave-studio",
    "url": "https://studio-brave.webflow.io/",
    "name": "Brave Studio",
    "creator": "Test Creator"
  }' | jq .

echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

# Query 1: What's similar to Padelthon?
echo ""
echo "🔍 Step 3: Finding templates similar to Padelthon..."
RESULT1=$(curl -s -X POST "$BASE_URL/query" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://padelthon.webflow.io/",
    "topK": 5
  }')

echo "$RESULT1" | jq .

# Query 2: What's similar to Brave Studio?
echo ""
echo "🔍 Step 4: Finding templates similar to Brave Studio..."
RESULT2=$(curl -s -X POST "$BASE_URL/query" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://studio-brave.webflow.io/",
    "topK": 5
  }')

echo "$RESULT2" | jq .

# Analysis
echo ""
echo "📊 Convergence Analysis"
echo "======================="
echo ""

# Check if Brave appears in Padelthon's results
BRAVE_IN_PADELTHON=$(echo "$RESULT1" | jq -r '.results[] | select(.id == "brave-studio") | .similarity')

# Check if Padelthon appears in Brave's results
PADELTHON_IN_BRAVE=$(echo "$RESULT2" | jq -r '.results[] | select(.id == "padelthon") | .similarity')

if [ -n "$BRAVE_IN_PADELTHON" ] && [ "$BRAVE_IN_PADELTHON" != "null" ]; then
  echo "✅ Brave Studio found in Padelthon's similar templates"
  echo "   Similarity: $(echo "$BRAVE_IN_PADELTHON * 100" | bc)%"
  echo ""
fi

if [ -n "$PADELTHON_IN_BRAVE" ] && [ "$PADELTHON_IN_BRAVE" != "null" ]; then
  echo "✅ Padelthon found in Brave Studio's similar templates"
  echo "   Similarity: $(echo "$PADELTHON_IN_BRAVE * 100" | bc)%"
  echo ""
fi

if [ -z "$BRAVE_IN_PADELTHON" ] || [ "$BRAVE_IN_PADELTHON" = "null" ]; then
  if [ -z "$PADELTHON_IN_BRAVE" ] || [ "$PADELTHON_IN_BRAVE" = "null" ]; then
    echo "⚠️  Templates did NOT converge in top 5 results"
    echo "   This means their HTML/CSS patterns are quite different"
    echo "   (Which is good - means we can distinguish unique designs!)"
    echo ""
  fi
fi

echo ""
echo "💡 What This Tells Us:"
echo "====================="
echo ""
echo "Vector embeddings capture:"
echo "  • HTML structure (element hierarchy, semantic tags)"
echo "  • CSS patterns (layout methods, selectors, properties)"
echo "  • Webflow-specific patterns (interactions, classes)"
echo "  • DOM hierarchy (structural relationships)"
echo ""
echo "If templates converge (high similarity):"
echo "  → Similar layouts, CSS approaches, structural patterns"
echo "  → Potential copying or shared design system"
echo ""
echo "If templates diverge (low similarity):"
echo "  → Different design approaches"
echo "  → Unique implementations"
echo "  → System can distinguish them effectively"
echo ""
echo "🎯 Test complete!"
