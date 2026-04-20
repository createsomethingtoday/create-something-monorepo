# Policy OS Gating Deploy Checklist

## Purpose

Deploy the full free-versus-paid `Policy OS` gating path in one controlled sequence:

1. `.agency` service-tier migration
2. `.agency` deploy
3. `identity-worker` deploy
4. `cs-mcp-hub-remote` deploy
5. live verification of `MCP-only` versus `Policy OS` behavior

## Surfaces

- `.agency`: [packages/agency](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency)
- identity: [packages/identity-worker](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/identity-worker)
- hub: [packages/cs-mcp-hub-remote](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/cs-mcp-hub-remote)

## Pre-Flight

Run from monorepo root:

```bash
pnpm --filter @create-something/agency check
pnpm --filter @create-something/policy-os-engine build
pnpm --filter @create-something/mcp-authz test
pnpm --filter @create-something/cs-mcp-hub-remote test
pnpm --filter @create-something/cs-mcp-hub-remote typecheck
pnpm exec tsc --noEmit -p packages/identity-worker/tsconfig.json
```

Confirm the migration exists:

```bash
ls packages/agency/migrations/0018_normalize_policy_os_service_tiers.sql
```

## Step 1: Apply `.agency` D1 Migration

Follow the dedicated runbook:

[AGENCY_SERVICE_TIER_MIGRATION_RUNBOOK_2026-03-09.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/guides/AGENCY_SERVICE_TIER_MIGRATION_RUNBOOK_2026-03-09.md)

Core commands:

```bash
pnpm --filter @create-something/agency db:migrate:local
pnpm --filter @create-something/agency db:migrate
```

`db:migrate` applies against the remote `.agency` D1 database. Keep `db:migrate:local` for local-only verification.

Verify canonical tiers in both tables:

```bash
pnpm exec wrangler d1 execute create-something-db --remote --command "SELECT service_tier, COUNT(*) FROM agency_mcp_entitlements GROUP BY service_tier ORDER BY service_tier;"
pnpm exec wrangler d1 execute create-something-db --remote --command "SELECT service_tier, COUNT(*) FROM agency_identity_seeds GROUP BY service_tier ORDER BY service_tier;"
```

Expected:

- only `mcp_only`
- only `policy_os_trial`
- only `policy_os_core`

## Step 2: Deploy `.agency`

```bash
pnpm --filter @create-something/agency deploy
```

Post-deploy checks:

- dashboard renders canonical service tiers
- admin seeded users page renders canonical service tiers
- bearer governance page loads without errors
- commercial state page loads without errors

## Step 3: Deploy `identity-worker`

Run from package directory or with filter:

```bash
pnpm --filter @create-something/identity-worker deploy
```

Verify:

- `/v1/mcp/sessions/resolve` still returns valid session/account context
- managed bearer resolution still succeeds for an entitled user
- managed bearer resolution returns `service_tier` and `entitlement_snapshot`

## Step 4: Deploy `cs-mcp-hub-remote`

```bash
pnpm --filter @create-something/cs-mcp-hub-remote deploy
```

Verify runtime config remains intact:

- `HUB_IDENTITY_MODE=session_required`
- `HUB_SESSION_RESOLVE_URL` points to `identity-worker`
- `HUB_SESSION_RESOLVE_TOKEN` is present
- `ENGINE_FALLBACK_ENABLED=true`

## Step 5: Live Gating Verification

Use one known `MCP-only` account and one known paid `Policy OS` account.

Run the executable verification flow:

[POLICY_OS_LIVE_VERIFICATION_RUNBOOK_2026-03-09.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/guides/POLICY_OS_LIVE_VERIFICATION_RUNBOOK_2026-03-09.md)

### Check A: `MCP-only` discovery restriction

Expected:

- `MCP-only` account cannot discover `policy_os_only` house routes

### Check B: `MCP-only` paid-write restriction

Expected:

- `MCP-only` account cannot execute paid governed write/control-plane paths

### Check C: paid `Policy OS` account

Expected:

- paid entitled account can discover and execute contracted governed paths

### Check D: commercial deny

Expected:

- if billing or contract is inactive, paid routes are denied even if the token still exists

## Suggested Manual Verification Flow

1. Authenticate as an `MCP-only` user in `.agency`.
2. Confirm dashboard shows `mcp_only`.
3. Use a session or managed bearer token for that user against the hub.
4. Attempt discovery for a CREATE SOMETHING house surface.
5. Confirm the route is not visible.
6. Attempt a paid governed write route.
7. Confirm the route is denied.
8. Repeat with a known paid `Policy OS` account.

## Safety Notes

- Apply the D1 migration before deploying `.agency`.
- Deploy `identity-worker` before the hub so session resolution carries the new entitlement snapshot.
- Deploy the hub last so it evaluates the new service-tier rules against the updated resolver payload.

## Rollback Posture

- `.agency` migration: prefer forward-fix over rollback
- `.agency` deploy: revert app code if needed
- `identity-worker` deploy: revert worker if resolver payload causes issues
- hub deploy: revert worker if discovery or execution gating is too restrictive

If a rollback is required, preserve the migrated data and roll code back first. Do not try to “undo” the service-tier normalization by hand in production tables.

## Source Anchors

- [packages/agency/migrations/0018_normalize_policy_os_service_tiers.sql](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/migrations/0018_normalize_policy_os_service_tiers.sql)
- [packages/agency/package.json](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/package.json)
- [packages/agency/wrangler.jsonc](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/wrangler.jsonc)
- [packages/identity-worker/wrangler.toml](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/identity-worker/wrangler.toml)
- [packages/cs-mcp-hub-remote/wrangler.toml](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/cs-mcp-hub-remote/wrangler.toml)
- [docs/guides/AGENCY_SERVICE_TIER_MIGRATION_RUNBOOK_2026-03-09.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/guides/AGENCY_SERVICE_TIER_MIGRATION_RUNBOOK_2026-03-09.md)
- [docs/guides/POLICY_OS_LIVE_VERIFICATION_RUNBOOK_2026-03-09.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/guides/POLICY_OS_LIVE_VERIFICATION_RUNBOOK_2026-03-09.md)
- [docs/MCP_HUB_REMOTE_DEPLOY.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/MCP_HUB_REMOTE_DEPLOY.md)
