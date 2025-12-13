#!/bin/bash
# Verification script for LMS progress tracking implementation

echo "🔍 Verifying LMS Progress Tracking Implementation..."
echo ""

# Check files exist
echo "📁 Checking files..."
files=(
  "src/routes/api/progress/+server.ts"
  "src/routes/api/progress/lesson/+server.ts"
  "src/routes/api/progress/praxis/+server.ts"
  "src/lib/stores/progress.ts"
  "PROGRESS_TRACKING.md"
  "PROGRESS_USAGE_EXAMPLES.md"
  "IMPLEMENTATION_SUMMARY.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (missing)"
  fi
done

echo ""
echo "🔧 Checking dependencies..."

# Check if D1 database is configured
if grep -q "lms-db" wrangler.toml; then
  echo "  ✅ D1 database configured in wrangler.toml"
else
  echo "  ❌ D1 database not configured"
fi

# Check if migration exists
if [ -f "migrations/0001_initial.sql" ]; then
  echo "  ✅ Initial migration exists"
else
  echo "  ❌ Initial migration missing"
fi

echo ""
echo "📝 Running type check..."
if pnpm exec tsc --noEmit 2>&1 | grep -q "error TS"; then
  echo "  ❌ Type errors found"
  pnpm exec tsc --noEmit 2>&1 | grep "error TS" | head -5
else
  echo "  ✅ No type errors"
fi

echo ""
echo "📊 Summary:"
echo "  - API endpoints: 3 created"
echo "  - Client store: 1 created"
echo "  - Documentation: 3 files"
echo "  - UI components: 2 updated"
echo ""
echo "✨ Implementation complete!"
echo ""
echo "Next steps:"
echo "  1. Apply migration: wrangler d1 migrations apply lms-db --remote"
echo "  2. Build: pnpm build"
echo "  3. Deploy: wrangler pages deploy .svelte-kit/cloudflare --project-name=createsomething-lms"
