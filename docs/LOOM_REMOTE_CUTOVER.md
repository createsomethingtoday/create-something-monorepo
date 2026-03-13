# Loom Remote Cutover Runbook

This runbook moves Loom from local SQLite to remote Hub-mediated HTTP transport.

## Target Endpoints

- MCP: `https://loom.mcp.createsomething.agency/mcp`
- Health: `https://loom.mcp.createsomething.agency/health`
- Migration export: `GET https://loom.mcp.createsomething.agency/admin/export`
- Migration import: `POST https://loom.mcp.createsomething.agency/admin/migrate`

## Prerequisites

1. Create D1 database and update `packages/loom-mcp-remote/wrangler.toml` with the real `database_id`.
2. Apply migrations:

```bash
cd packages/loom-mcp-remote
pnpm exec wrangler d1 migrations apply loom-mcp-remote-db --remote
```

3. Sync Worker secrets from Infisical:

```bash
INFISICAL_ENV=prod \
INFISICAL_PATH=/loom \
pnpm loom:mcp:vault:sync
```

Defaults:

- `INFISICAL_ENV=prod`
- `INFISICAL_PATH=/loom`
- `INFISICAL_PROJECT_ID` is optional
- Universal Auth is supported with `INFISICAL_CLIENT_ID` + `INFISICAL_CLIENT_SECRET`

Secrets synced into the remote Loom worker:

- `LOOM_MCP_API_TOKEN`
- `MIGRATION_ADMIN_TOKEN`
- `MIGRATION_SIGNING_SECRET`
- `LOOM_NOTION_TOKEN` when Notion sync is enabled
- `BRAINTRUST_API_KEY` and `BRAINTRUST_PROJECT_ID` when telemetry sync is enabled

4. Sync Hub-side broker secrets so Hub runtimes can call `loom-mcp`:

```bash
INFISICAL_ENV=prod \
pnpm mcp:hub:vault:sync
```

5. Deploy:

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

3. Back up the current remote state before replacing it:

```bash
MIGRATION_ADMIN_TOKEN=... pnpm loom:migrate:backup -- --out tmp/loom-remote-backup.json
```

4. Import into remote Loom:

```bash
MIGRATION_ADMIN_TOKEN=... pnpm loom:migrate:import -- --snapshot tmp/loom-migration-snapshot.json
```

If signed payloads are enabled:

```bash
MIGRATION_ADMIN_TOKEN=... MIGRATION_SIGNING_SECRET=... pnpm loom:migrate:import -- --snapshot tmp/loom-migration-snapshot.json
```

5. Validate counts, agent parity, built-in formulas, and sample ID parity:

```bash
LOOM_MCP_API_TOKEN=... pnpm loom:migrate:validate -- --snapshot tmp/loom-migration-snapshot.json
```

6. Switch clients/agents to Hub-mediated Loom only.
7. Keep local `.loom/*.db` read-only for the rollback window.

## Remote Parity Notes

- Routing on remote Loom is derived from imported `.loom/dispatch.toml`, `.loom/models.toml`, and `agents.db` profiles/history state.
- `loom_formulas` and `loom_formula` expose built-in Loom formulas only. Repo-local custom formula files are not executed remotely in this cutover.
- `loom_notion_init`, `loom_notion_sync`, and `loom_notion_status` are supported remotely. The Notion token must be delivered as `LOOM_NOTION_TOKEN` in Worker secrets; raw token injection over MCP is rejected.
- `loom_backfill` remains intentionally unavailable on the Worker. Supported path:

```text
1. run local backfill into local Loom
2. export snapshot
3. import snapshot into remote Loom
```

## Rollback

1. Disable `loom-mcp` via `hub_update_state`.
2. Restore from `tmp/loom-remote-backup.json` if the remote replacement itself is the issue.
3. Resume local Loom path.
4. Fix migration/data parity issues.
5. Re-run backup/export/import/validate and cut over again.
