#!/bin/bash

# Fetch the actual Airtable record
RECORD_ID="recgROoGWyyoQiSUq"
BASE_ID="appr9Ws3qU2ivrGbC"
TABLE_ID="tblKcOdBV5c7L2sro"

# Get Airtable API key from wrangler secrets
AIRTABLE_API_KEY=$(wrangler secret list --name plagiarism-agent 2>/dev/null | grep AIRTABLE_API_KEY | awk '{print $1}')

if [ -z "$AIRTABLE_API_KEY" ]; then
  echo "Error: AIRTABLE_API_KEY not found in wrangler secrets"
  exit 1
fi

echo "Fetching record from Airtable..."
curl -s "https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${RECORD_ID}" \
  -H "Authorization: Bearer ${AIRTABLE_API_KEY}" \
  | jq '.'

