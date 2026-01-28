# Database Migration Strategy

## Executive Summary

This document defines the database migration strategy for the CREATE SOMETHING monorepo, based on analysis of 70+ existing migrations across all packages. It establishes patterns, best practices, and automation recommendations for safe, idempotent schema changes to Cloudflare D1 databases.

---

## Current State Analysis

### Migration Distribution

| Package | Database | Migration Count | Naming Pattern |
|---------|----------|-----------------|----------------|
| `space` | `create-something-db` | 10+ | `NNNN_description.sql` (4-digit) |
| `io` | `io-db` | 10+ | `NNN_description.sql` (3-digit) |
| `templates-platform` | `templates-platform-db` | 10+ | `NNNN_description.sql` (4-digit) |
| `lms` | `learn-db` | 10+ | `NNNN_description.sql` (4-digit) |
| `agency` | `agency-db` | 5+ | `NNNN_description.sql` (4-digit) |
| Various | Various | 30+ | Mixed patterns |

### Current Execution Approach

**Manual wrangler CLI execution**:
```bash
# Remote (production)
wrangler d1 execute <db-name> --remote --file=migrations/NNNN_description.sql

# Local (development)
wrangler d1 execute <db-name> --local --file=migrations/NNNN_description.sql
```

### Identified Gaps

1. **No automated migration runner** - All migrations are manual
2. **Inconsistent naming** - Mix of 3-digit and 4-digit prefixes
3. **Scattered documentation** - Each package has its own README
4. **No rollback strategy** - Forward-only migrations
5. **Manual verification** - No automated schema validation
6. **No migration tracking** - Can't determine which migrations have run

---

## Migration Patterns

### Pattern 1: Simple Table Creation

**Use Case**: Creating new tables with indexes

**Example**: `packages/io/migrations/009_user_plugins.sql`

```sql
-- Description of what this migration does
-- Context about why it's needed

CREATE TABLE IF NOT EXISTS table_name (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_table_field ON table_name(field);
```

**Key Principles**:
- Always use `IF NOT EXISTS` for idempotency
- Include descriptive comment headers
- Create indexes immediately after table
- Use consistent timestamp fields (`created_at`, `updated_at`)
- Use `INTEGER PRIMARY KEY AUTOINCREMENT` for auto-increment IDs
- Use `TEXT` for UUIDs and timestamps (SQLite best practice)

---

### Pattern 2: Constraint Modification (Table Recreation)

**Use Case**: Modifying CHECK constraints, adding NOT NULL, changing column types

**Problem**: SQLite doesn't support `ALTER TABLE ... MODIFY CONSTRAINT` or many other ALTER operations

**Solution**: Table recreation pattern

**Example**: `packages/templates-platform/migrations/0009_fix_tier_constraint.sql`

```sql
-- Migration: Description of constraint change
-- SQLite doesn't support ALTER CONSTRAINT, so we recreate the table.

-- Step 1: Disable foreign keys temporarily
PRAGMA foreign_keys=OFF;

-- Step 2: Create new table with corrected schema
CREATE TABLE table_new (
  id TEXT PRIMARY KEY,
  field TEXT NOT NULL CHECK (field IN ('value1', 'value2', 'value3')),
  -- ... all other fields exactly as before
);

-- Step 3: Copy data from old table
INSERT INTO table_new SELECT * FROM table_name;

-- Step 4: Drop old table
DROP TABLE table_name;

-- Step 5: Rename new table
ALTER TABLE table_new RENAME TO table_name;

-- Step 6: Recreate all indexes
CREATE INDEX IF NOT EXISTS idx_table_field ON table_name(field);

-- Step 7: Re-enable foreign keys
PRAGMA foreign_keys=ON;
```

**Critical Steps**:
1. **Disable foreign keys** - Prevents constraint violations during recreation
2. **Exact column order** - INSERT/SELECT order must match
3. **Recreate indexes** - Indexes are not preserved
4. **Re-enable foreign keys** - Critical for data integrity

**Common Pitfall**: Forgetting to recreate indexes or re-enable foreign keys

---

### Pattern 3: Foreign Key Relationships

**Use Case**: Tables with relationships and cascade behavior

**Example**: `packages/lms/migrations/0006_module_enrollment.sql`

```sql
CREATE TABLE IF NOT EXISTS child_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id TEXT NOT NULL REFERENCES parent_table(id) ON DELETE CASCADE,
  -- ... other fields
  metadata TEXT DEFAULT '{}'  -- JSON for extensibility
);

-- Composite unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_child_unique
  ON child_table(parent_id, field);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_child_parent ON child_table(parent_id);
CREATE INDEX IF NOT EXISTS idx_child_field ON child_table(field);
```

**Key Principles**:
- Use `ON DELETE CASCADE` for child records that should be deleted with parent
- Use `ON DELETE SET NULL` for optional relationships
- Create composite unique indexes when needed (e.g., user + plugin combinations)
- Add JSON metadata columns for future extensibility
- Index foreign key columns for join performance

---

## Best Practices

### 1. Migration Naming Convention

**Standard**: `NNNN_description.sql` (4-digit zero-padded)

```
✅ Good:
0001_initial_schema.sql
0002_add_user_plugins.sql
0010_fix_tier_constraint.sql

❌ Bad:
1_schema.sql
002_users.sql
migration_v3.sql
add_users.sql
```

**Rationale**:
- 4 digits support up to 9999 migrations
- Zero-padding ensures correct alphabetical sorting
- Descriptive names enable understanding without reading file

### 2. Idempotency Requirements

**Every migration MUST be idempotent** - safe to run multiple times

```sql
-- ✅ Idempotent
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ❌ Not idempotent (will fail on second run)
CREATE TABLE users (...);
CREATE INDEX idx_users_email ON users(email);
```

**Exception**: Table recreation pattern (Pattern 2) is not fully idempotent, but is necessary for SQLite constraint changes

### 3. Migration Documentation Standards

Every migration file must include:

```sql
-- Migration: [Number] - [Short Title]
-- Created: [Date]
-- Purpose: [1-2 sentence description of why this migration exists]
-- Context: [Optional: Links to issues, PRs, or related decisions]
--
-- Changes:
-- - [Specific change 1]
-- - [Specific change 2]
--
-- Verification:
-- SELECT name FROM sqlite_master WHERE type='table' AND name='new_table';
```

### 4. Testing Procedures

**Before applying to production**:

1. **Test locally**:
   ```bash
   wrangler d1 execute <db-name> --local --file=migrations/NNNN_new.sql
   ```

2. **Verify schema**:
   ```bash
   wrangler d1 execute <db-name> --local --command="SELECT name FROM sqlite_master WHERE type='table';"
   ```

3. **Test idempotency** (run twice):
   ```bash
   wrangler d1 execute <db-name> --local --file=migrations/NNNN_new.sql
   wrangler d1 execute <db-name> --local --file=migrations/NNNN_new.sql  # Should succeed
   ```

4. **Test with sample data**:
   ```bash
   # Insert test data, verify constraints work
   wrangler d1 execute <db-name> --local --command="INSERT INTO ..."
   ```

5. **Apply to production**:
   ```bash
   wrangler d1 execute <db-name> --remote --file=migrations/NNNN_new.sql
   ```

### 5. Migration Sequencing

**Single Purpose**: Each migration should do ONE thing

```
✅ Good:
0010_add_user_plugins_table.sql
0011_add_plugin_settings_table.sql
0012_add_user_plugin_indexes.sql

❌ Bad:
0010_add_all_plugin_stuff.sql  # Multiple tables, indexes, constraints
```

**Rationale**: Easier to debug, rollback, and understand impact

### 6. Data Migration Safety

When migrating data (not just schema):

```sql
-- Always verify data before destructive operations
-- Example: Migrating from old format to new

-- Step 1: Add new column
ALTER TABLE users ADD COLUMN new_field TEXT;

-- Step 2: Migrate data with verification
UPDATE users
SET new_field = (
  CASE
    WHEN old_field IS NOT NULL THEN old_field
    ELSE 'default_value'
  END
);

-- Step 3: Verify migration (run manually, check results)
-- SELECT COUNT(*) FROM users WHERE new_field IS NULL;

-- Step 4: Only in NEXT migration: Drop old column
-- (Gives time to verify data migration succeeded)
```

---

## Automation Recommendations

### Phase 1: Migration Tracking Table

**Problem**: No way to know which migrations have run

**Solution**: Create migrations tracking table in each database

```sql
-- Run once in each database (0000_migration_tracking.sql)
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT UNIQUE NOT NULL,
  applied_at TEXT DEFAULT (datetime('now')),
  checksum TEXT,  -- Future: Verify migration hasn't changed
  execution_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_migrations_filename ON _migrations(filename);
```

### Phase 2: Automated Migration Runner

**Recommended approach**: Node.js script that wraps wrangler CLI

```javascript
// scripts/migrate.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runMigrations(dbName, migrationsDir, remote = false) {
  const mode = remote ? '--remote' : '--local';

  // Get list of migrations already applied
  const appliedCmd = `wrangler d1 execute ${dbName} ${mode} --command="SELECT filename FROM _migrations ORDER BY filename"`;
  const applied = JSON.parse(execSync(appliedCmd).toString())
    .results.map(r => r.filename);

  // Get all migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // Run unapplied migrations
  for (const file of files) {
    if (applied.includes(file)) {
      console.log(`⏭️  Skipping ${file} (already applied)`);
      continue;
    }

    console.log(`▶️  Applying ${file}...`);
    const filePath = path.join(migrationsDir, file);

    try {
      const start = Date.now();
      execSync(`wrangler d1 execute ${dbName} ${mode} --file=${filePath}`);
      const duration = Date.now() - start;

      // Record migration
      const recordCmd = `wrangler d1 execute ${dbName} ${mode} --command="INSERT INTO _migrations (filename, execution_time_ms) VALUES ('${file}', ${duration})"`;
      execSync(recordCmd);

      console.log(`✅ Applied ${file} in ${duration}ms`);
    } catch (error) {
      console.error(`❌ Failed to apply ${file}:`, error.message);
      process.exit(1);
    }
  }

  console.log(`✨ All migrations applied`);
}

// Usage: node scripts/migrate.js <db-name> <migrations-dir> [--remote]
const [dbName, migrationsDir] = process.argv.slice(2);
const remote = process.argv.includes('--remote');
runMigrations(dbName, migrationsDir, remote);
```

**Package.json scripts**:
```json
{
  "scripts": {
    "migrate:space": "node scripts/migrate.js create-something-db packages/space/migrations",
    "migrate:space:remote": "node scripts/migrate.js create-something-db packages/space/migrations --remote",
    "migrate:all": "npm run migrate:space && npm run migrate:io && npm run migrate:templates",
    "migrate:all:remote": "npm run migrate:space:remote && npm run migrate:io:remote && npm run migrate:templates:remote"
  }
}
```

### Phase 3: Pre-Deployment Hooks

**Integration with CI/CD**:

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    steps:
      - name: Run migrations
        run: npm run migrate:all:remote

      - name: Verify migrations
        run: npm run verify:migrations

      - name: Deploy application
        run: npm run deploy
```

### Phase 4: Schema Validation

**Automated verification** that migrations match expected schema:

```javascript
// scripts/verify-migrations.js
// Compare expected schema (from TypeScript types) with actual D1 schema
// Fail build if schema drift detected
```

---

## Rollback Procedures

### SQLite Limitations

**Important**: SQLite does not support transaction rollback for DDL (schema changes)

**Implication**: Once a migration runs, it cannot be automatically rolled back

### Rollback Strategy

1. **Forward-Only Migrations**
   - Don't delete old migrations
   - Create new migration to undo changes
   ```sql
   -- 0010_add_user_plugins.sql
   CREATE TABLE IF NOT EXISTS user_plugins (...);

   -- If you need to undo, create:
   -- 0011_remove_user_plugins.sql
   DROP TABLE IF EXISTS user_plugins;
   ```

2. **Dangerous Changes Require Backup**
   - Before table recreation pattern (Pattern 2)
   - Before data migrations
   - Use D1 export (if available) or SELECT queries to save data

3. **Staging Environment**
   - Always test migrations on staging first
   - Keep staging and production in sync

### Emergency Rollback

**If a migration breaks production**:

1. **Identify the issue**:
   ```bash
   wrangler d1 execute <db-name> --remote --command="SELECT * FROM _migrations ORDER BY applied_at DESC LIMIT 10;"
   ```

2. **Create reverting migration**:
   ```sql
   -- NNNN_revert_broken_migration.sql
   -- Manually undo the changes from previous migration
   ```

3. **Apply revert**:
   ```bash
   wrangler d1 execute <db-name> --remote --file=migrations/NNNN_revert_broken_migration.sql
   ```

4. **Verify fix**:
   ```bash
   # Test application, verify database state
   ```

---

## Troubleshooting Guide

### Error: "table already exists"

**Cause**: Migration is not idempotent

**Fix**: Add `IF NOT EXISTS` to CREATE statements

```sql
-- Before
CREATE TABLE users (...);

-- After
CREATE TABLE IF NOT EXISTS users (...);
```

### Error: "FOREIGN KEY constraint failed"

**Cause**:
1. Foreign keys are enabled but referenced table doesn't exist
2. Data violates foreign key constraint

**Fix**:
```sql
-- Check foreign key enforcement
PRAGMA foreign_keys;  -- Should return 1 (enabled)

-- Temporarily disable if needed for table recreation
PRAGMA foreign_keys=OFF;
-- ... perform operations ...
PRAGMA foreign_keys=ON;
```

### Error: "UNIQUE constraint failed"

**Cause**: Migration tries to insert duplicate data

**Fix**: Use `INSERT OR IGNORE` or `INSERT OR REPLACE`

```sql
-- Instead of:
INSERT INTO users (email) VALUES ('test@example.com');

-- Use:
INSERT OR IGNORE INTO users (email) VALUES ('test@example.com');
```

### Migration appears to hang

**Cause**: Lock on database (another process is accessing)

**Fix**:
1. Wait for other operations to complete
2. Kill wrangler processes: `pkill -f wrangler`
3. Retry migration

### Schema doesn't match after migration

**Cause**: Migration file has wrong SQL or wasn't applied

**Verification**:
```bash
# Check which migrations ran
wrangler d1 execute <db-name> --remote --command="SELECT * FROM _migrations ORDER BY filename;"

# Check actual schema
wrangler d1 execute <db-name> --remote --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='table_name';"
```

---

## Migration Checklist

Before creating a migration:

- [ ] Migration follows 4-digit naming convention: `NNNN_description.sql`
- [ ] Migration is idempotent (uses `IF NOT EXISTS`)
- [ ] Migration has descriptive comment header with purpose
- [ ] Migration includes verification query in comments
- [ ] Migration does ONE thing (single purpose)
- [ ] Foreign key columns are indexed
- [ ] Timestamp fields use TEXT with `datetime('now')`
- [ ] Table recreation includes ALL indexes

Before applying to production:

- [ ] Tested locally with `--local`
- [ ] Verified schema changes with `sqlite_master` query
- [ ] Tested idempotency (ran twice locally)
- [ ] Tested with sample data
- [ ] Reviewed for potential breaking changes
- [ ] Documented rollback plan (if needed)
- [ ] Applied to staging environment first (if available)

---

## Future Enhancements

### 1. Automated Schema Diffing

Compare TypeScript types with actual D1 schema to detect drift:

```typescript
// packages/components/src/lib/db/schema-validator.ts
export async function validateSchema(db: D1Database) {
  // Compare expected schema (from types) with actual
  // Return list of differences
}
```

### 2. Migration Dry-Run Mode

Preview what a migration would do without applying:

```bash
npm run migrate:dry-run -- 0010_new_migration.sql
# Output: Would create table 'users' with 5 columns
```

### 3. Seed Data Management

Separate migrations (schema) from seeds (initial data):

```
migrations/
  0001_initial_schema.sql
  0002_add_users.sql
seeds/
  dev/
    0001_test_users.sql
  production/
    0001_default_templates.sql
```

### 4. Migration Revert Command

Generate reverse migration automatically:

```bash
npm run migrate:revert -- 0010_add_users.sql
# Creates: 0011_revert_add_users.sql
```

---

## Summary

**Key Principles**:
1. All migrations are idempotent
2. Use 4-digit naming convention
3. One purpose per migration
4. Test locally before production
5. Forward-only (no automatic rollback)
6. Document purpose and verification

**Current Approach**:
- Manual wrangler CLI execution
- Per-package migration directories
- No automated tracking

**Recommended Evolution**:
1. Add `_migrations` tracking table (Phase 1)
2. Create automated runner script (Phase 2)
3. Integrate with CI/CD (Phase 3)
4. Add schema validation (Phase 4)

**Three Core Patterns**:
1. Simple table creation
2. Constraint modification via table recreation
3. Foreign key relationships with CASCADE

This strategy ensures safe, predictable database evolution across the entire monorepo.
