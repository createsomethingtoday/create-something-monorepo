# Loom Remote Cutover Runbook

This runbook moves Loom from local SQLite to remote Hub-mediated HTTP transport.

## Target Endpoints

- MCP: `https://loom.mcp.createsomething.agency/mcp`
- Health: `https://loom.mcp.createsomething.agency/health`
- Migration import: `POST https://loom.mcp.createsomething.agency/admin/migrate`

## Prerequisites

1. Create D1 database and update `packages/loom-mcp-remote/wrangler.toml` with the real `database_id`.
2. Apply migrations:

```bash
cd packages/loom-mcp-remote
pnpm exec wrangler d1 migrations apply loom-mcp-remote-db --remote
```

3. Configure Worker secrets:

```bash
pnpm --filter @create-something/loom-mcp-remote exec wrangler secret put LOOM_MCP_API_TOKEN
pnpm --filter @create-something/loom-mcp-remote exec wrangler secret put MIGRATION_ADMIN_TOKEN
# Optional signed payload verification
pnpm --filter @create-something/loom-mcp-remote exec wrangler secret put MIGRATION_SIGNING_SECRET
```

4. Deploy:

```bash
pnpm deploy:loom-mcp-remote
```

## Hub Registration

`config/mcp-hub/registry.json` now includes:

- server: `loom-mcp` (HTTP)
- bearer token env var: `LOOM_MCP_API_TOKEN`
- bundle: `loom` containing `loom-mcp`

`config/mcp-hub/state.json` now enables `loom-mcp`.

For running remote hub state (`cs-hub-mj`), execute:

```json
{
  "name": "hub_update_state",
  "arguments": {
    "enableServers": ["loom-mcp"]
  }
}
```

## One-Time Freeze Cutover

1. Announce freeze window: no local Loom writes.
2. Export local snapshot:

```bash
pnpm loom:migrate:export -- --loom-dir .loom --out tmp/loom-migration-snapshot.json
```

3. Import into remote Loom:

```bash
MIGRATION_ADMIN_TOKEN=... pnpm loom:migrate:import -- --snapshot tmp/loom-migration-snapshot.json
```

If signed payloads are enabled:

```bash
MIGRATION_ADMIN_TOKEN=... MIGRATION_SIGNING_SECRET=... pnpm loom:migrate:import -- --snapshot tmp/loom-migration-snapshot.json
```

4. Validate counts and sample ID parity:

```bash
LOOM_MCP_API_TOKEN=... pnpm loom:migrate:validate -- --snapshot tmp/loom-migration-snapshot.json
```

5. Switch clients/agents to Hub-mediated Loom only.
6. Keep local `.loom/*.db` read-only for the rollback window.

## Rollback

1. Disable `loom-mcp` via `hub_update_state`.
2. Resume local Loom path.
3. Fix migration/data parity issues.
4. Re-run export/import/validate and cut over again.
