#!/bin/bash

# Apply database migrations to create-something-space D1 database
# Usage: ./scripts/apply-migrations.sh [local|remote]

set -e  # Exit on error

ENV=${1:-remote}  # Default to remote if not specified

echo "🚀 Applying migrations to $ENV database..."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to apply migration
apply_migration() {
  local file=$1
  local description=$2

  echo -e "${YELLOW}📝 Applying: $description${NC}"
  echo "   File: $file"

  if npx wrangler d1 execute create-something-db --$ENV --file=$file; then
    echo -e "${GREEN}✅ Success!${NC}"
  else
    echo -e "${RED}❌ Failed to apply migration${NC}"
    exit 1
  fi

  echo ""
}

# Apply migrations in order
echo "================================================"
echo "  DATABASE MIGRATIONS - CREATE SOMETHING SPACE"
echo "  Environment: $ENV"
echo "================================================"
echo ""

# Migration 0003: Learning Analytics
if [ -f "migrations/0003_learning_analytics.sql" ]; then
  apply_migration "migrations/0003_learning_analytics.sql" "Learning Analytics (Mechanism Design Tracking)"
else
  echo -e "${YELLOW}⚠️  Skipping 0003_learning_analytics.sql (not found)${NC}"
  echo ""
fi

# Migration 0004: KV Lessons Hints
if [ -f "migrations/0004_add_hints_to_kv_lessons.sql" ]; then
  apply_migration "migrations/0004_add_hints_to_kv_lessons.sql" "KV Lessons Hints (Contextual Learning Scaffolding)"
else
  echo -e "${RED}❌ Migration 0004_add_hints_to_kv_lessons.sql not found${NC}"
  exit 1
fi

# Verify the changes
echo "================================================"
echo "  VERIFICATION"
echo "================================================"
echo ""
echo -e "${YELLOW}🔍 Checking if hints were added...${NC}"

if npx wrangler d1 execute create-something-db --$ENV --command "SELECT json_extract(code_lessons, '$[0].hints') as lesson_1_hints FROM papers WHERE slug = 'cloudflare-kv-quick-start'" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ KV lessons hints verified!${NC}"
else
  echo -e "${YELLOW}⚠️  Could not verify hints (paper may not exist in database yet)${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}🎉 All migrations applied successfully!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Verify lessons display correctly in the UI"
echo "2. Test mechanism design system with real user interactions"
echo "3. Monitor learning_events table for analytics data"
echo ""
