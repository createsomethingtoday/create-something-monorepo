#!/bin/bash

# Local testing script for Webflow Review API
# Tests the logic without deploying to Cloudflare

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Webflow Review - Local API Test ===${NC}\n"

# Test URL
TEST_URL="https://preview.webflow.com/preview/new-clann?preview=a8cf79ecaf5ea08516e9e9e702e1d54c"

echo -e "${YELLOW}Starting orchestrator worker...${NC}"
echo "This will start the API at http://localhost:8787"
echo ""
echo "In another terminal, run:"
echo -e "${GREEN}curl -X POST http://localhost:8787/api/review/page \\${NC}"
echo -e "${GREEN}  -H 'Content-Type: application/json' \\${NC}"
echo -e "${GREEN}  -d '{\"url\": \"$TEST_URL\"}' | jq${NC}"
echo ""
echo "Press Ctrl+C to stop when done testing"
echo ""

cd packages/webflow-review/workers/orchestrator
pnpm install
pnpm dev
