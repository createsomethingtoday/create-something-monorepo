#!/bin/bash
# Quick progress check for re-indexing

cd "$(dirname "$0")/.."

echo "=== Re-indexing Progress ==="
if ls reindex-*.log 1> /dev/null 2>&1; then
  PROGRESS=$(grep "Progress:" reindex-*.log | tail -1)
  FAILURES=$(grep -c "❌" reindex-*.log 2>/dev/null || echo "0")
  echo "$PROGRESS"
  echo "Failures: $FAILURES"
  
  # Check if complete
  if grep -q "SUMMARY" reindex-*.log 2>/dev/null; then
    echo ""
    echo "✅ Re-indexing COMPLETE!"
    echo ""
    grep -A10 "SUMMARY" reindex-*.log
    echo ""
    echo "Run verification: ./scripts/verify-accuracy.sh"
  fi
else
  echo "No re-indexing log found"
fi

echo ""
echo "=== Current Health ==="
curl -s "https://plagiarism-agent.createsomething.workers.dev/health" | jq '{status, templates: .stats.templatesIndexed, lshBands: .stats.lshBands}'
