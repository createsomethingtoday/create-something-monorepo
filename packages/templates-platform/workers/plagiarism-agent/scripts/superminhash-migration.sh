#!/bin/bash

# SuperMinHash Migration Script
# Re-indexes all templates with SuperMinHash algorithm

API_BASE="https://plagiarism-agent.createsomething.workers.dev"
BATCH_SIZE=10
DELAY_BETWEEN_BATCHES=5  # seconds
MAX_RETRIES=3

echo "============================================"
echo "SuperMinHash Migration"
echo "============================================"
echo ""

# Get total count
echo "Checking migration status..."
STATUS=$(curl -s "$API_BASE/migrate/status")
TOTAL=$(echo "$STATUS" | jq -r '.totalTemplates')
echo "Total templates to migrate: $TOTAL"
echo ""

# Calculate expected batches
BATCHES=$((($TOTAL + $BATCH_SIZE - 1) / $BATCH_SIZE))
echo "Expected batches: $BATCHES (batch size: $BATCH_SIZE)"
echo ""

# Track progress
OFFSET=0
SUCCESSFUL_TOTAL=0
FAILED_TOTAL=0
SKIPPED_TOTAL=0
BATCH_NUM=0

# Run migration in batches
while true; do
  BATCH_NUM=$((BATCH_NUM + 1))
  
  echo "[$BATCH_NUM/$BATCHES] Processing batch at offset $OFFSET..."
  
  # Run batch with retries
  RETRY=0
  while [ $RETRY -lt $MAX_RETRIES ]; do
    RESULT=$(curl -s -X POST "$API_BASE/migrate/superminhash" \
      -H "Content-Type: application/json" \
      -d "{\"batchSize\": $BATCH_SIZE, \"offset\": $OFFSET}" \
      --max-time 300 2>&1)
    
    # Check if we got a valid response
    if echo "$RESULT" | jq -e '.status' > /dev/null 2>&1; then
      break
    fi
    
    RETRY=$((RETRY + 1))
    echo "  Retry $RETRY/$MAX_RETRIES..."
    sleep 5
  done
  
  # Parse result
  STATUS=$(echo "$RESULT" | jq -r '.status // "error"')
  PROCESSED=$(echo "$RESULT" | jq -r '.processed // 0')
  SUCCESSFUL=$(echo "$RESULT" | jq -r '.successful // 0')
  FAILED=$(echo "$RESULT" | jq -r '.failed // 0')
  SKIPPED=$(echo "$RESULT" | jq -r '.skipped // 0')
  NEXT_OFFSET=$(echo "$RESULT" | jq -r '.nextOffset // 0')
  
  if [ "$STATUS" = "complete" ]; then
    echo "  Migration complete!"
    break
  fi
  
  if [ "$STATUS" = "error" ] || [ "$PROCESSED" = "0" ]; then
    ERROR=$(echo "$RESULT" | jq -r '.error // "Unknown error"')
    echo "  Error: $ERROR"
    # Continue to next batch anyway
  fi
  
  # Update totals
  SUCCESSFUL_TOTAL=$((SUCCESSFUL_TOTAL + SUCCESSFUL))
  FAILED_TOTAL=$((FAILED_TOTAL + FAILED))
  SKIPPED_TOTAL=$((SKIPPED_TOTAL + SKIPPED))
  
  # Show progress
  PROGRESS=$((OFFSET * 100 / TOTAL))
  echo "  Processed: $PROCESSED | Success: $SUCCESSFUL | Failed: $FAILED | Skipped: $SKIPPED"
  echo "  Progress: $PROGRESS% ($OFFSET/$TOTAL)"
  
  # Check if we're done
  if [ "$NEXT_OFFSET" = "0" ] || [ "$PROCESSED" = "0" ]; then
    break
  fi
  
  # Move to next batch
  OFFSET=$NEXT_OFFSET
  
  # Rate limit
  sleep $DELAY_BETWEEN_BATCHES
done

echo ""
echo "============================================"
echo "Migration Summary"
echo "============================================"
echo "Total Processed: $((OFFSET))"
echo "Successful: $SUCCESSFUL_TOTAL"
echo "Failed: $FAILED_TOTAL"
echo "Skipped: $SKIPPED_TOTAL"
echo ""
echo "Run verify-accuracy.sh to test the new signatures."
