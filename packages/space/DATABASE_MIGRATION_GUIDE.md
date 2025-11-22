# Database Migration Guide

## Issue
The `/api/analytics/learning` endpoint is returning a 500 error because the `learning_events` table doesn't exist in the production D1 database.

## Solution
Run the migrations on the D1 database to create the required tables.

## Quick Fix (Run Migrations)

### Option 1: Run All Migrations
```bash
# Run all migrations in order
wrangler d1 execute create-something-db --remote --file=migrations/0003_learning_analytics.sql
wrangler d1 execute create-something-db --remote --file=migrations/0004_add_hints_to_kv_lessons.sql
wrangler d1 execute create-something-db --remote --file=migrations/0005_enhanced_hints_direct.sql
wrangler d1 execute create-something-db --remote --file=migrations/0006_add_measurement_examples.sql
wrangler d1 execute create-something-db --remote --file=migrations/0007_add_json_measurement.sql
```

### Option 2: Run Only Learning Analytics Migration
If you only want to fix the immediate error:

```bash
wrangler d1 execute create-something-db --remote --file=migrations/0003_learning_analytics.sql
```

## Verify Migration

After running the migration, verify the table exists:

```bash
wrangler d1 execute create-something-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='learning_events';"
```

Expected output:
```
name
learning_events
```

## Migration Details

The `learning_events` table stores:
- **paper_id**: Which experiment
- **session_id**: User session
- **experiment_type**: 'terminal' or 'code'
- **step_index**: Which step in the experiment
- **action**: 'step_start', 'step_complete', 'step_error', 'hint_shown', 'hint_helpful'
- **time_on_step**: Milliseconds spent on step
- **error_count**: Number of errors
- **retry_count**: Number of retries
- **timestamp**: Unix timestamp

This data powers the game-theoretic mechanism design for optimal hint timing.

## Troubleshooting

### Error: "Database not found"
Make sure the database name matches your wrangler.jsonc:
```bash
grep -A 2 "d1_databases" wrangler.jsonc
```

### Error: "Table already exists"
The migration uses `CREATE TABLE IF NOT EXISTS`, so this is safe to ignore. If you get this error, the table already exists and you're good to go.

### Check Migration Status
List all tables in the database:
```bash
wrangler d1 execute create-something-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

## Production Deployment Checklist

When deploying to production:
1. ✅ Run migrations before deploying code
2. ✅ Verify tables exist
3. ✅ Deploy new code
4. ✅ Test endpoints

## Alternative: Manual Migration via Dashboard

1. Go to [Cloudflare Dashboard → D1](https://dash.cloudflare.com/9645bd52e640b8a4f40a3a55ff1dd75a/workers-and-pages/d1)
2. Select `create-something-db`
3. Click "Console"
4. Paste the SQL from `migrations/0003_learning_analytics.sql`
5. Click "Execute"

## Auto-Migration (Future Enhancement)

To prevent this issue in the future, consider adding a migration script to package.json:

```json
{
  "scripts": {
    "migrate": "wrangler d1 execute create-something-db --remote --file=migrations/0003_learning_analytics.sql",
    "migrate:all": "for file in migrations/*.sql; do wrangler d1 execute create-something-db --remote --file=$file; done"
  }
}
```

Then run before deploying:
```bash
npm run migrate:all
```
