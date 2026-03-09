# Agency Service-Tier Migration Runbook

## Purpose

Roll out [packages/agency/migrations/0018_normalize_policy_os_service_tiers.sql](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/migrations/0018_normalize_policy_os_service_tiers.sql) safely so `.agency` storage defaults and existing rows use canonical `Policy OS` service-tier values.

## Scope

This runbook applies to the `.agency` D1 database configured in [packages/agency/wrangler.jsonc](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/wrangler.jsonc) as:

- binding: `DB`
- database name: `create-something-db`

## What This Migration Changes

`0018_normalize_policy_os_service_tiers.sql` does four things:

1. rewrites legacy `service_tier` values in existing rows
2. rebuilds `agency_mcp_entitlements` with default `mcp_only`
3. rebuilds `agency_identity_seeds` with default `mcp_only`
4. recreates the indexes on both tables

Canonical mapping:

- `agency`, `free`, `vertical-templates` -> `mcp_only`
- `solo`, `pro`, `trial`, `pilot` -> `policy_os_trial`
- `team`, `org`, `core` -> `policy_os_core`

## Pre-Flight

Run from the monorepo root:

```bash
pnpm --filter @create-something/agency check
```

Confirm the new migration exists:

```bash
ls packages/agency/migrations/0018_normalize_policy_os_service_tiers.sql
```

Inspect pending migration status:

```bash
pnpm --filter @create-something/agency db:migrate --dry-run
```

If `--dry-run` is not available in your local Wrangler version, inspect the SQL file directly and continue with the controlled apply window.

## Apply Order

### 1. Apply locally first

```bash
pnpm --filter @create-something/agency db:migrate:local
```

### 2. Verify local results

Use Wrangler D1 execute against local if needed:

```bash
pnpm exec wrangler d1 execute create-something-db --local --command "SELECT service_tier, COUNT(*) FROM agency_mcp_entitlements GROUP BY service_tier ORDER BY service_tier;"
pnpm exec wrangler d1 execute create-something-db --local --command "SELECT service_tier, COUNT(*) FROM agency_identity_seeds GROUP BY service_tier ORDER BY service_tier;"
```

Expected result:

- only `mcp_only`
- only `policy_os_trial`
- only `policy_os_core`
- no `agency`, `solo`, `team`, or `org`

### 3. Apply remote in a controlled window

```bash
pnpm --filter @create-something/agency db:migrate
```

### 4. Verify remote results

```bash
pnpm exec wrangler d1 execute create-something-db --remote --command "SELECT service_tier, COUNT(*) FROM agency_mcp_entitlements GROUP BY service_tier ORDER BY service_tier;"
pnpm exec wrangler d1 execute create-something-db --remote --command "SELECT service_tier, COUNT(*) FROM agency_identity_seeds GROUP BY service_tier ORDER BY service_tier;"
```

## Post-Deploy Verification

Check that operator pages show canonical values:

- bearer governance
- commercial state
- seeded users
- dashboard overview

Recommended smoke path:

1. load `.agency` dashboard for a known `MCP-only` account
2. load a paid `Policy OS` account if available
3. confirm service tier renders as canonical values
4. confirm bearer entitlement decisions still resolve

## Safety Notes

- This migration rebuilds two tables to change SQLite defaults.
- Data is copied forward during the migration.
- Indexes are recreated in the same migration.
- Do not edit the historical `0014` or `0017` migrations in place.

## Rollback Posture

There is no clean automatic schema rollback for this migration.

If a rollback is required:

1. stop applying new writes to the affected surfaces
2. inspect the migrated rows
3. restore from D1 backup/export if the failure is structural
4. otherwise ship a forward corrective migration

Preferred response is forward-fix, not ad hoc manual row rewriting in production.

## Source Anchors

- [packages/agency/migrations/0018_normalize_policy_os_service_tiers.sql](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/migrations/0018_normalize_policy_os_service_tiers.sql)
- [packages/agency/wrangler.jsonc](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/wrangler.jsonc)
- [packages/agency/package.json](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/package.json)
- [packages/agency/src/lib/server/mcp-entitlements.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/src/lib/server/mcp-entitlements.ts)
