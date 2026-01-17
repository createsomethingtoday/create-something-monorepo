#!/bin/bash

# Re-index templates with page-level signatures
# This script fetches templates from the database and indexes their individual pages

API_BASE="https://plagiarism-agent.createsomething.workers.dev"
BATCH_SIZE=5  # Number of templates to index in parallel
DELAY=10      # Seconds between batches

echo "============================================"
echo "Page-Level Template Re-Indexing"
echo "============================================"
echo ""

# Get list of templates from the database
echo "Fetching template list..."

# Use wrangler to query the database
cd "$(dirname "$0")/../../../" || exit 1

TEMPLATES=$(npx wrangler d1 execute templates-platform-db --remote --command "SELECT id, url, name FROM template_minhash LIMIT 100" 2>/dev/null | jq -r '.[] | .results[] | @json' 2>/dev/null)

if [ -z "$TEMPLATES" ]; then
  echo "❌ Failed to fetch templates from database"
  exit 1
fi

# Count templates
TOTAL=$(echo "$TEMPLATES" | wc -l | tr -d ' ')
echo "Found $TOTAL templates to index"
echo ""

# Index templates in batches
CURRENT=0
SUCCESSFUL=0
FAILED=0

echo "$TEMPLATES" | while read -r template; do
  CURRENT=$((CURRENT + 1))
  
  # Parse template JSON
  ID=$(echo "$template" | jq -r '.id')
  URL=$(echo "$template" | jq -r '.url')
  NAME=$(echo "$template" | jq -r '.name')
  
  # Skip if URL is empty or invalid
  if [ -z "$URL" ] || [ "$URL" = "null" ]; then
    echo "[$CURRENT/$TOTAL] ⚠️  Skipping $ID - no URL"
    FAILED=$((FAILED + 1))
    continue
  fi
  
  echo -n "[$CURRENT/$TOTAL] Indexing $ID ($NAME)... "
  
  # Call the page indexing endpoint
  RESULT=$(curl -s -X POST "$API_BASE/pages/index" \
    -H "Content-Type: application/json" \
    -d "{\"templateId\": \"$ID\", \"url\": \"$URL\", \"name\": \"$NAME\"}" \
    --max-time 120 2>&1)
  
  # Check result
  if echo "$RESULT" | jq -e '.pagesIndexed' > /dev/null 2>&1; then
    PAGES=$(echo "$RESULT" | jq -r '.pagesIndexed')
    echo "✅ $PAGES pages indexed"
    SUCCESSFUL=$((SUCCESSFUL + 1))
  else
    ERROR=$(echo "$RESULT" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "$RESULT")
    echo "❌ Error: $ERROR"
    FAILED=$((FAILED + 1))
  fi
  
  # Rate limiting - delay every BATCH_SIZE templates
  if [ $((CURRENT % BATCH_SIZE)) -eq 0 ] && [ "$CURRENT" -lt "$TOTAL" ]; then
    echo ""
    echo "Waiting ${DELAY}s before next batch..."
    sleep $DELAY
    echo ""
  fi
done

echo ""
echo "============================================"
echo "Re-Indexing Complete"
echo "============================================"
echo "Total: $TOTAL"
echo "Successful: $SUCCESSFUL"
echo "Failed: $FAILED"
