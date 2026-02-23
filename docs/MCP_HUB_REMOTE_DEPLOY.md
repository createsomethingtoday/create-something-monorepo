# MCP Hub Remote Deploy

Deploy a single public MCP endpoint that proxies the CREATE SOMETHING MCP fleet.

As of 2026-02-23, the remote hub supports brokered gateway workflows (`hub_tools_search`, `hub_tools_describe`, `hub_tools_invoke`) in addition to legacy proxy tool compatibility.

## Package

- Worker package: `packages/cs-mcp-hub-remote`
- Endpoint: `/mcp`

## Deploy

```bash
pnpm --filter @create-something/cs-mcp-hub-remote run deploy
```

Cloudflare requirement for Worker-to-Worker proxying on `*.workers.dev`:

- `packages/cs-mcp-hub-remote/wrangler.toml` must include `compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"]`
- Without `global_fetch_strictly_public`, downstream connections can fail with Cloudflare error code `1042`.

## Recommended Secrets / Vars

Set an API token so the public endpoint is not anonymous:

```bash
cd packages/cs-mcp-hub-remote
pnpm exec wrangler secret put HUB_API_TOKEN
```

Optional runtime selection:

- `HUB_ENABLED_BUNDLES` (example: `core,observability,halfdozen-observability`)
- `HUB_ENABLED_SERVERS` (example: `notion-halfdozen-create-something`)
- `HUB_DISABLED_SERVERS`
- `HUB_REFRESH_SECONDS`
- `HUB_ACCOUNT_ID` (fallback account id for hub telemetry writes)
- `HUB_ENABLE_LEGACY_PROXY_TOOLS` (default `true` during migration)
- `HUB_BROKER_DEFAULT_LIMIT` (default `25`)
- `HUB_RETRY_PROFILE_DEFAULT` (default `standard`)
- `HUB_CATALOG_TTL_SECONDS` (default `300`)

JWT auth requirements (recommended production default):

- `HUB_AUTH_REQUIRED=true`
- `HUB_AUTH_JWKS_URL`
- `HUB_AUTH_ISSUER`
- `HUB_AUTH_AUDIENCE`
- `HUB_AUTH_CLOCK_SKEW_SECONDS` (default `60`)
- `HUB_ALLOW_STATIC_OPERATOR_TOKEN=false` (set true only for operator break-glass flows)

State persistence:

- Bind `HUB_STATE_KV` in `wrangler.toml` and set namespace IDs.
- `hub_update_state` writes enabled/disabled bundles/servers into KV and then refreshes live connections.
- `hub_update_state` accepts `writeCodexConfig` for parity with local hub tooling, but remote deploys do not write local Codex config files.

Control-plane catalog persistence:

- Bind `HUB_CONTROL_DB` (D1) in `wrangler.toml`.
- Apply migration: `packages/cs-mcp-hub-remote/migrations/0001_hub_control_plane.sql`.
- `hub_refresh_catalog` snapshots downstream tool metadata into `hub_tool_catalog`.

Identity forwarding:

- Remote hub forwards `x-mcp-account-id` and `x-hub-account-id` headers on proxied downstream tool calls.
- Account/tenant authorization decisions are driven by verified JWT claims (`account_id`, `tenant_id`, `scopes`) in broker mode.

## Telemetry

`cs-mcp-hub-remote` writes hub-level records into `cs-telemetry` (`mcp_tool_invocations` and `mcp_run_counts`) via `TELEMETRY_DB`.
It also writes hub-observed downstream route events into `mcp_hub_routes`.

Correlation behavior:

- Incoming `x-correlation-id` is preserved when present.
- Otherwise, a correlation id is generated from request metadata.
- Proxied calls carry the correlation id using MCP `relatedTask.taskId`.

Inspection:

- Hub tool: `hub_trace_lookup` with `correlationId`
- Telemetry MCP: `query_activity` filtered by `correlationId`

`hub_trace_lookup` returns:
- `hubInvocations` (hub-side handling)
- `routedDownstreamInvocations` (hub-observed downstream calls)
- `downstreamInvocations` (native downstream telemetry rows, when correlation is present there)

## Client Config Example

Use one MCP server URL:

```toml
[mcp_servers."create-something-hub"]
url = "https://cs-mcp-hub-remote.<your-workers-subdomain>.workers.dev/mcp"
enabled = true
```

If `HUB_API_TOKEN` is configured, include the bearer token header in your MCP client.
