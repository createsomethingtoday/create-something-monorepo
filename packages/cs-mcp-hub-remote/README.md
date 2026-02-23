# @create-something/cs-mcp-hub-remote

Remote MCP hub that exposes one public endpoint and proxies tools from enabled downstream CREATE SOMETHING/WORKWAY MCP servers.

## Endpoints

- `/mcp` — Streamable HTTP MCP endpoint
- `/health` — JSON health/status

## What It Does

- Loads downstream server registry from `config/mcp-hub/registry.json`
- Resolves enabled bundles/servers from env vars (or registry defaults)
- Connects to downstream HTTP MCP servers
- Builds/refreshes broker catalog metadata in `HUB_CONTROL_DB`
- Re-exports downstream tools as namespaced proxy tools: `<server>__<tool>`

## Management Tools

- `hub_status`
- `hub_list_registry`
- `hub_list_proxy_tools`
- `hub_search_proxy_tools` (query/server filter + cursor pagination)
- `hub_tools_search` (broker catalog search)
- `hub_tools_describe` (broker catalog describe by `server::tool`)
- `hub_tools_invoke` (policy-aware broker invocation)
- `hub_refresh_catalog`
- `hub_policy_status` (active policy/runtime limit settings)
- `hub_refresh_connections`
- `hub_update_state` (`writeCodexConfig` accepted for parity; ignored remotely)
- `hub_trace_lookup`

## Configuration

Environment variables:

- `HUB_API_TOKEN` (optional): if set, `/mcp` requires `Authorization: Bearer <token>`
- `HUB_AUTH_REQUIRED` (default `true`): require JWT auth for `/mcp` requests
- `HUB_AUTH_JWKS_URL` (required when auth required): JWKS endpoint for JWT verification
- `HUB_AUTH_ISSUER` (required when auth required)
- `HUB_AUTH_AUDIENCE` (required when auth required)
- `HUB_AUTH_CLOCK_SKEW_SECONDS` (optional): default `60`
- `HUB_ALLOW_STATIC_OPERATOR_TOKEN` (optional): default `false`, allows `HUB_API_TOKEN` as break-glass operator token
- `HUB_ENABLED_BUNDLES` (optional): comma-separated or JSON array (defaults from registry)
- `HUB_ENABLED_SERVERS` (optional): comma-separated or JSON array
- `HUB_DISABLED_SERVERS` (optional): comma-separated or JSON array
- `HUB_REFRESH_SECONDS` (optional): cache TTL for downstream tool catalog, default `300`
- `HUB_CACHE_BUST` (optional): any value change forces runtime refresh
- `HUB_ACCOUNT_ID` (optional): fallback account ID written to hub telemetry rows
- `HUB_ENABLE_LEGACY_PROXY_TOOLS` (optional): default `true` for backward compatibility
- `HUB_BROKER_DEFAULT_LIMIT` (optional): default `25`
- `HUB_RETRY_PROFILE_DEFAULT` (optional): default `standard`
- `HUB_CATALOG_TTL_SECONDS` (optional): default `300`
- `HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW` (optional): enable per-window proxy call limits when > 0
- `HUB_RATE_LIMIT_WINDOW_SECONDS` (optional): rate-limit window size, default `60`
- `HUB_RATE_LIMIT_SCOPE` (optional): `account` (default), `account_server`, or `account_server_tool`
- `HUB_RATE_LIMIT_EXEMPT_SERVERS` (optional): comma-separated downstream server names excluded from limits
- `HUB_QUOTA_MAX_PROXY_CALLS_PER_PERIOD` (optional): per-account hard cap for proxy calls in current UTC month
- `HUB_QUOTA_EXEMPT_SERVERS` (optional): comma-separated downstream server names excluded from quota checks
- `HUB_STATE_KV` (recommended binding): stores remote hub enable/disable state so `hub_update_state` persists
- `HUB_CONTROL_DB` (recommended binding): stores broker catalog metadata

Downstream auth variables are read dynamically from each registry server's `env_http_headers` and `bearer_token_env_var` config.

Account forwarding:

- Proxied tool calls forward `x-mcp-account-id` and `x-hub-account-id` to downstream MCPs.

## Telemetry + Correlation

- Hub invocations are written to `mcp_tool_invocations`/`mcp_run_counts` in `TELEMETRY_DB`.
- Hub-observed downstream routes are written to `mcp_hub_routes` in `TELEMETRY_DB`.
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
