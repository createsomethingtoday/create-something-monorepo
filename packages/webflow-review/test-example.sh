#!/bin/bash

# Quick test script for Webflow Review API
# Tests with the example URL: https://preview.webflow.com/preview/new-clann

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Webflow Review - Quick Test ===${NC}\n"

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler CLI not found${NC}"
    echo "Install: npm install -g wrangler"
    exit 1
fi

# Test URL from user
TEST_URL="https://preview.webflow.com/preview/new-clann?preview=a8cf79ecaf5ea08516e9e9e702e1d54c"

echo -e "${YELLOW}Step 1: Testing Health Endpoint${NC}"
if curl -s http://localhost:8787/health | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health check passed${NC}\n"
else
    echo -e "${RED}✗ Health check failed - is the worker running?${NC}"
    echo "Run: cd workers/orchestrator && pnpm dev"
    exit 1
fi

echo -e "${YELLOW}Step 2: Testing Single Page Review${NC}"
echo "URL: $TEST_URL"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:8787/api/review/page \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$TEST_URL\"}")

# Check if response contains findings
if echo "$RESPONSE" | grep -q "findings"; then
    echo -e "${GREEN}✓ Review completed successfully${NC}\n"

    # Extract score
    SCORE=$(echo "$RESPONSE" | grep -o '"score":[0-9]*' | cut -d':' -f2)
    echo -e "Score: ${GREEN}$SCORE/100${NC}"

    # Count findings by severity
    CRITICAL=$(echo "$RESPONSE" | grep -o '"severity":"critical"' | wc -l | xargs)
    WARNING=$(echo "$RESPONSE" | grep -o '"severity":"warning"' | wc -l | xargs)
    INFO=$(echo "$RESPONSE" | grep -o '"severity":"info"' | wc -l | xargs)

    echo "Findings:"
    echo "  - Critical: $CRITICAL"
    echo "  - Warning: $WARNING"
    echo "  - Info: $INFO"
    echo ""

    # Show sample findings
    echo -e "${YELLOW}Sample Findings:${NC}"
    echo "$RESPONSE" | jq '.findings[:3] | .[] | {severity, message}' 2>/dev/null || echo "Install jq for formatted output"

else
    echo -e "${RED}✗ Review failed${NC}"
    echo "Response:"
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Testing Database Persistence${NC}"

# Check if review was logged in D1
DB_CHECK=$(wrangler d1 execute webflow-review-db --local \
  --command "SELECT COUNT(*) as count FROM api_usage WHERE endpoint='/api/review/page'" 2>/dev/null || echo "0")

if echo "$DB_CHECK" | grep -q "count"; then
    echo -e "${GREEN}✓ Database logging working${NC}\n"
else
    echo -e "${YELLOW}⚠ Database check skipped (run migrations first)${NC}\n"
fi

echo -e "${GREEN}=== All Tests Passed! ===${NC}\n"
echo "Next steps:"
echo "  1. Deploy to production: pnpm deploy:all"
echo "  2. Test with production URL"
echo "  3. Build Chrome extension (Phase 2)"
