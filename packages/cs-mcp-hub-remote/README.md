# @create-something/cs-mcp-hub-remote

Remote MCP hub that exposes one public endpoint and proxies tools from enabled downstream CREATE SOMETHING/WORKWAY MCP servers.

It now includes a brokered discovery layer (`search/describe/invoke`) backed by a D1 index. Broker mode is the production default; direct proxy tool compatibility remains available for migration and legacy clients.

## Endpoints

- `/mcp` — Streamable HTTP MCP endpoint
- `/health` — JSON health/status

## What It Does

- Loads downstream server registry from `config/mcp-hub/registry.json`
- Resolves enabled bundles/servers from env vars (or registry defaults)
- Connects to downstream HTTP MCP servers
- Re-exports downstream tools as namespaced proxy tools: `<server>__<tool>`
- Builds a D1-backed tool index (`hub_tool_index`) with dotted aliases and tool refs
- Supports list pagination for large catalogs
- Enforces tenant policy/quota checks before downstream invocation when `HUB_DB` is configured

## Management Tools

- `hub_status`
- `hub_list_registry`
- `hub_list_proxy_tools`
- `hub_refresh_connections`
- `hub_trace_lookup`
- `hub_tools_search`
- `hub_tools_describe`
- `hub_tools_invoke`
- `hub_tools_refresh_index`

## Configuration

Environment variables:

- `HUB_API_TOKEN` (optional): if set, `/mcp` requires `Authorization: Bearer <token>`
- `HUB_ENABLED_BUNDLES` (optional): comma-separated or JSON array (defaults from registry)
- `HUB_ENABLED_SERVERS` (optional): comma-separated or JSON array
- `HUB_DISABLED_SERVERS` (optional): comma-separated or JSON array
- `HUB_REFRESH_SECONDS` (optional): cache TTL for downstream tool catalog, default `300`
- `HUB_CACHE_BUST` (optional): any value change forces runtime refresh
- `HUB_ACCOUNT_ID` (optional): fallback account ID written to hub telemetry rows
- `HUB_DISCOVERY_MODE` (optional): `broker` (default) or `compat` (migration-only)
- `HUB_LIST_PAGE_SIZE` (optional): page size for `tools/list`, default `50`

Downstream auth variables are read dynamically from each registry server's `env_http_headers` and `bearer_token_env_var` config.

Bindings:

- `TELEMETRY_DB`: telemetry and route tracing tables
- `HUB_DB`: tool index, aliases, index builds, tenant policy, tenant quotas, quota counters

Alias override source:

- `config/mcp-hub/tool-aliases.json`

## Telemetry + Correlation

- Hub invocations are written to `mcp_tool_invocations`/`mcp_run_counts` in `TELEMETRY_DB`.
- Hub-observed downstream routes are written to `mcp_hub_routes` in `TELEMETRY_DB`.
- Broker operations (`hub_tools_search`, `hub_tools_describe`, `hub_tools_invoke`) are logged into the same telemetry stream.
- Each proxied call carries correlation via MCP `relatedTask.taskId`.
- Use `hub_trace_lookup` (or `cs-telemetry` `query_activity` with `correlationId`) to inspect:
  - `hubInvocations` (hub tool handling)
  - `routedDownstreamInvocations` (hub-observed downstream calls)
  - `downstreamInvocations` (native downstream telemetry rows when available)

## Local Dev

```bash
pnpm --filter @create-something/cs-mcp-hub-remote dev
```

## Deploy

```bash
pnpm --filter @create-something/cs-mcp-hub-remote deploy
```

Then point clients to:

```text
https://cs-mcp-hub-remote.<your-workers-subdomain>.workers.dev/mcp
```

## Migrations

Apply package migrations before enabling index/policy controls:

```bash
# from packages/cs-mcp-hub-remote
wrangler d1 migrations apply <hub-db-name> --remote
```

Migrations:

- `migrations/0001_hub_tool_index.sql`
- `migrations/0002_hub_policy_quota.sql`
