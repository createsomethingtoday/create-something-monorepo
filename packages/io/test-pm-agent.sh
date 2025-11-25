#!/bin/bash
# PM Agent Test Script
# Creates test contact submissions and tests agent processing

set -e

echo "═══════════════════════════════════════════════════════════"
echo "PM Agent Test Script - Experiment #3"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Configuration
API_URL="${API_URL:-https://createsomething.io}"
DB_NAME="DB"

echo "Using API URL: $API_URL"
echo ""

# Test 1: Create test contact submission (simple inquiry)
echo "Test 1: Creating test contact submission (simple inquiry)..."
cd packages/io
npx wrangler d1 execute $DB_NAME --remote --command="
INSERT INTO contact_submissions (name, email, message, submitted_at, status)
VALUES (
  'Test User - Simple',
  'test-simple@example.com',
  'I saw your AI design analysis experiment (the one with 88% time savings). Can you help with a similar project analyzing our client mockups?',
  datetime('now'),
  'new'
);
"
CONTACT_ID_1=$(npx wrangler d1 execute $DB_NAME --remote --command="SELECT last_insert_rowid() as id;" | grep -oE '[0-9]+' | tail -1)
echo "✓ Created contact #$CONTACT_ID_1 (should draft response)"
echo ""

# Test 2: Create test contact submission (pricing - should escalate)
echo "Test 2: Creating test contact submission (pricing inquiry)..."
npx wrangler d1 execute $DB_NAME --remote --command="
INSERT INTO contact_submissions (name, email, message, submitted_at, status)
VALUES (
  'Test User - Pricing',
  'test-pricing@example.com',
  'What are your rates for a 3-month engagement? We need AI-native development for our enterprise product.',
  datetime('now'),
  'new'
);
"
CONTACT_ID_2=$(npx wrangler d1 execute $DB_NAME --remote --command="SELECT last_insert_rowid() as id;" | grep -oE '[0-9]+' | tail -1)
echo "✓ Created contact #$CONTACT_ID_2 (should escalate)"
echo ""

# Test 3: Create test contact submission (ambiguous - should escalate)
echo "Test 3: Creating test contact submission (ambiguous)..."
npx wrangler d1 execute $DB_NAME --remote --command="
INSERT INTO contact_submissions (name, email, message, submitted_at, status)
VALUES (
  'Test User - Ambiguous',
  'test-ambiguous@example.com',
  'We need help with something but I am not sure what. Can we schedule a call?',
  datetime('now'),
  'new'
);
"
CONTACT_ID_3=$(npx wrangler d1 execute $DB_NAME --remote --command="SELECT last_insert_rowid() as id;" | grep -oE '[0-9]+' | tail -1)
echo "✓ Created contact #$CONTACT_ID_3 (should escalate)"
echo ""

cd ../..

# Test 4: Trigger agent triage
echo "Test 4: Triggering agent triage..."
echo "POST $API_URL/api/agent"
curl -X POST "$API_URL/api/agent" \
  -H "Content-Type: application/json" \
  -d '{"action": "triage"}' \
  -s | jq '.'
echo ""

# Test 5: Check results for contact #1
echo "Test 5: Checking results for contact #$CONTACT_ID_1..."
echo "GET $API_URL/api/agent?contact_id=$CONTACT_ID_1"
curl -s "$API_URL/api/agent?contact_id=$CONTACT_ID_1" | jq '.'
echo ""

# Test 6: Get metrics
echo "Test 6: Getting agent metrics..."
echo "GET $API_URL/api/admin/agent-metrics"
curl -s "$API_URL/api/admin/agent-metrics" | jq '.'
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "Test Complete!"
echo ""
echo "Next steps:"
echo "1. Visit $API_URL/admin/agent-drafts to review drafts"
echo "2. Approve or reject each draft"
echo "3. Check metrics to see approval/escalation rates"
echo ""
echo "Expected results:"
echo "- Contact #$CONTACT_ID_1: Should have draft (simple inquiry)"
echo "- Contact #$CONTACT_ID_2: Should be escalated (pricing)"
echo "- Contact #$CONTACT_ID_3: Should be escalated (ambiguous)"
echo "═══════════════════════════════════════════════════════════"
