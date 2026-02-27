# MCP Hub Remote Deploy

Deploy a single public MCP endpoint that proxies the CREATE SOMETHING MCP fleet.

## Package

- Worker package: `packages/cs-mcp-hub-remote`
- Endpoint: `/mcp`

## Breaking Change: Broker-Only Proxy Execution

`cs-mcp-hub-remote` now enforces broker-only downstream execution:

1. `tools/list` returns management tools only.
2. Direct proxy tool calls (`<server>__<tool>`) are rejected.
3. Downstream calls must go through:
   - `hub_search_proxy_tools`
   - `hub_describe_proxy_tool`
   - `hub_execute_proxy_tool`

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
- `HUB_DISCOVERY_MODE` (`compact` or `full`)
- `HUB_DISCOVERY_DEFAULT_SERVERS` (comma list / JSON array override)
- `HUB_DISCOVERY_MAX_PROXY_TOOLS` (positive int cap; unset for uncapped)
- `HUB_DISCOVERY_SHARED_PACK` (named default from `config/mcp-hub/discovery-packs.json`, for example `shared-auth-core`)
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

## Client Migration Guidance

Before cutover, update clients to stop calling direct proxy names.

Old pattern:

- Call `composio-toolkit-googledrive__googledrive_list_files` directly

New pattern:

1. Search candidate tools with `hub_search_proxy_tools`
2. Inspect exact schema via `hub_describe_proxy_tool` (or `hub_get_proxy_tool`)
3. Execute with:
   - `hub_execute_proxy_tool`
   - `proxyToolName`
   - `args` payload
   - compatibility alias: `hub_run_proxy_tool`

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

## Rollout Validation Checklist

After deploy, validate:

1. `hub_status` reports expected connected servers and proxy tool count.
2. `tools/list` contains only management tools.
3. `hub_search_proxy_tools` returns discovery-scoped results.
4. `hub_describe_proxy_tool` returns input schema for a searchable tool.
5. `hub_execute_proxy_tool` succeeds for at least one known route.
6. Direct call to `<server>__<tool>` returns broker-only guidance error.
7. `hub_trace_lookup` shows both hub and routed downstream telemetry rows for broker calls.
