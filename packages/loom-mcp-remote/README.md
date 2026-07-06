# @create-something/loom-mcp-remote

Remote Loom MCP server for Hub HTTP transport.

## Endpoints

- `/mcp` - Streamable HTTP MCP endpoint
- `/health` - health + record counts
- `/admin/export` - authenticated remote snapshot backup
- `/admin/migrate` - one-time snapshot import (token protected)

## Auth

- MCP endpoint uses `LOOM_MCP_API_TOKEN` as Bearer or `X-API-Key`
- Migration export/import endpoints use `MIGRATION_ADMIN_TOKEN` as Bearer
- Optional signed payload validation via `MIGRATION_SIGNING_SECRET` + `X-Migration-Signature`
- Notion sync uses `LOOM_NOTION_TOKEN` as a Worker secret only

## Deploy

```bash
pnpm --filter @create-something/loom-mcp-remote dev
pnpm --filter @create-something/loom-mcp-remote deploy
```

## D1 Migrations

```bash
cd packages/loom-mcp-remote
pnpm exec wrangler d1 migrations apply loom-mcp-remote-db --remote
```

## Secret Sync

Use the Infisical-backed sync script instead of manual `wrangler secret put` calls:

```bash
INFISICAL_ENV=prod \
INFISICAL_PATH=/loom \
pnpm loom:mcp:vault:sync
```

This syncs:

- `LOOM_MCP_API_TOKEN`
- `MIGRATION_ADMIN_TOKEN`
- `MIGRATION_SIGNING_SECRET`
- `LOOM_NOTION_TOKEN` when configured
- Langfuse secrets when telemetry sync is enabled

Hub runtimes that broker this server also need `LOOM_MCP_API_TOKEN`:

```bash
INFISICAL_ENV=prod pnpm mcp:hub:vault:sync
```

## Cutover Flow

```bash
pnpm loom:migrate:export -- --loom-dir .loom --out tmp/loom-migration-snapshot.json
MIGRATION_ADMIN_TOKEN=... pnpm loom:migrate:backup -- --out tmp/loom-remote-backup.json
MIGRATION_ADMIN_TOKEN=... MIGRATION_SIGNING_SECRET=... pnpm loom:migrate:import -- --snapshot tmp/loom-migration-snapshot.json
LOOM_MCP_API_TOKEN=... pnpm loom:migrate:validate -- --snapshot tmp/loom-migration-snapshot.json
```

`loom_backfill` stays local-only. Backfill historical work into `.loom`, then export/import that snapshot into the remote worker.

## Custom Domain

Configured route:

- `loom.mcp.createsomething.agency` (custom domain)

Expose to Hub as:

- `https://loom.mcp.createsomething.agency/mcp`
