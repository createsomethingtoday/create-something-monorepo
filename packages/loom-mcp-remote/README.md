# @create-something/loom-mcp-remote

Remote Loom MCP server for Hub HTTP transport.

## Endpoints

- `/mcp` - Streamable HTTP MCP endpoint
- `/health` - health + record counts
- `/admin/migrate` - one-time snapshot import (token protected)

## Auth

- MCP endpoint uses `LOOM_MCP_API_TOKEN` as Bearer or `X-API-Key`
- Migration endpoint uses `MIGRATION_ADMIN_TOKEN` as Bearer
- Optional signed payload validation via `MIGRATION_SIGNING_SECRET` + `X-Migration-Signature`

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

## Custom Domain

Configured route:

- `loom.mcp.createsomething.agency` (custom domain)

Expose to Hub as:

- `https://loom.mcp.createsomething.agency/mcp`
