# MCP Hub Remote Deploy

Deploy a single public MCP endpoint that proxies the CREATE SOMETHING MCP fleet.

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
- `HUB_SESSION_RESOLVE_URL` (identity-worker resolver endpoint, e.g. `https://id.createsomething.space/v1/mcp/sessions/resolve`)
- `HUB_SESSION_RESOLVE_TOKEN` (shared secret used to authorize resolver calls)
- `HUB_SESSION_RESOLVE_TIMEOUT_MS` (default `5000`)

When `HUB_SESSION_RESOLVE_URL` + `HUB_SESSION_RESOLVE_TOKEN` are configured and clients pass bearer MCP session tokens, the hub resolves:

- `account_id`
- `tenant_id`
- `session_id`
- `allowed_tool_prefixes`

and enforces tool access by prefix before routing.

Compatibility note:

- If `HUB_API_TOKEN` is enabled, keep using it for gateway auth and pass MCP session tokens in `X-MCP-Session-Token`.
- Alternate pattern: keep `HUB_API_TOKEN` in `?token=` query param and pass MCP session token in `Authorization: Bearer ...`.

State persistence:

- Bind `HUB_STATE_KV` in `wrangler.toml` and set namespace IDs.
- `hub_update_state` writes enabled/disabled bundles/servers into KV and then refreshes live connections.
- `hub_update_state` accepts `writeCodexConfig` for parity with local hub tooling, but remote deploys do not write local Codex config files.

Identity forwarding:

- Remote hub forwards `x-mcp-account-id` and `x-hub-account-id` headers on proxied downstream tool calls.

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
