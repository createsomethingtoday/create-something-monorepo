# Database Migrations

This directory contains SQL migrations for the create-something-space D1 database.

## Available Migrations

### 0003_learning_analytics.sql
Creates the `learning_events` table for tracking user learning behavior and powering the game-theoretic mechanism design system.

**Status**: ⚠️ Not yet applied (authentication issue - deferred)

### 0004_add_hints_to_kv_lessons.sql
Adds comprehensive hints and alternative approaches to all 6 Cloudflare KV Quick Start lessons. This completes the mechanism design infrastructure by providing the actual hint content.

**Status**: ✅ Ready to apply

## Applying Migrations

### To Remote (Production) Database

```bash
# Apply learning analytics migration
npx wrangler d1 execute create-something-db --remote --file=migrations/0003_learning_analytics.sql

# Apply KV lessons hints migration
npx wrangler d1 execute create-something-db --remote --file=migrations/0004_add_hints_to_kv_lessons.sql
```

### To Local Development Database

```bash
# Apply learning analytics migration
npx wrangler d1 execute create-something-db --local --file=migrations/0003_learning_analytics.sql

# Apply KV lessons hints migration
npx wrangler d1 execute create-something-db --local --file=migrations/0004_add_hints_to_kv_lessons.sql
```

## Verification

After applying migrations, verify the changes:

```bash
# Check remote database
npx wrangler d1 execute create-something-db --remote --command "SELECT code_lessons FROM papers WHERE slug = 'cloudflare-kv-quick-start'"

# Check local database
npx wrangler d1 execute create-something-db --local --command "SELECT code_lessons FROM papers WHERE slug = 'cloudflare-kv-quick-start'"
```

## Rollback

If needed, you can manually revert the hints by re-running the migration without the hints fields, or by directly editing the database record.

## Migration Philosophy

Following DRY development principles:
1. All migrations are idempotent where possible
2. Migrations are version-controlled
3. Each migration has a clear, single purpose
4. Migrations include documentation and verification steps
