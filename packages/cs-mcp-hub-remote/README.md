# @create-something/cs-mcp-hub-remote

Remote runtime for the CREATE SOMETHING MCP gateway, exposed as one public endpoint with broker-first downstream execution.

## Endpoints

- `/mcp` — Streamable HTTP MCP endpoint
- `/health` — JSON health/status

## MCP Resources

This runtime now exposes MCP resources (in addition to tools):

- `hub://status`
- `hub://registry`
- `hub://policy`
- `hub://connections`
- `hub://proxy-tools`
- `hub://discovery`

It also exposes one MCP App UI resource:

- `ui://hub/overview`

## What It Does

- Loads downstream server registry from `config/mcp-hub/registry.json`
- Resolves enabled bundles/servers from env vars (or registry defaults)
- Connects to downstream HTTP MCP servers
- Enforces broker-only execution via `hub_search_proxy_tools` -> `hub_describe_proxy_tool` -> `hub_execute_proxy_tool`

## Management Tools

- `hub_status`
- `hub_list_registry`
- `hub_list_proxy_tools` (visible proxy tools for current account/session)
- `hub_search_proxy_tools` (visible query/server filter + cursor pagination)
- `hub_route_intent` (map business intent to a proxy tool via allowlist + fallback discovery)
- `hub_describe_proxy_tool` (schema + downstream route metadata for one visible proxy tool)
- `hub_get_proxy_tool` (compatibility alias for `hub_describe_proxy_tool`)
- `hub_run_intent` (route + execute in one call)
- `hub_execute_proxy_tool` (execute one visible proxy tool by name with args)
- `hub_run_proxy_tool` (compatibility alias for `hub_execute_proxy_tool`)
- `hub_policy_status` (active policy/runtime limit settings)
- `hub_list_discovery_packs` (list named discovery presets)
- `hub_refresh_connections`
- `hub_update_state` (`writeCodexConfig` accepted for parity; ignored remotely)
- `hub_trace_lookup`

## Broker-Only Mode (Default)

By default this hub runs in broker-only mode:

- Direct proxy tool calls like `<server>__<tool>` are not callable.
- `tools/list` returns management tools only.
- Use this sequence for downstream actions:
  1. `hub_search_proxy_tools`
  2. `hub_describe_proxy_tool`
  3. `hub_execute_proxy_tool`

If a client attempts a direct proxy tool call, the hub returns:

`Direct proxy tools are disabled. Use hub_execute_proxy_tool with proxyToolName + args.`

Optional direct proxy mode:

- Set `HUB_ALLOW_DIRECT_PROXY_TOOLS=true` to allow direct `<server>__<tool>` calls.
- Optionally set `HUB_DIRECT_PROXY_ALLOWED_PREFIXES` (CSV or JSON array) to restrict direct execution to specific proxy-tool name prefixes.

## Configuration

Environment variables:

- `HUB_INSTANCE_ID` (recommended): unique id for this deployed hub worker; used to namespace hub state/discovery KV keys so team hubs do not overwrite each other.
- `HUB_API_TOKEN` (optional): if set, `/mcp` requires `Authorization: Bearer <token>`
- `HUB_IDENTITY_MODE` (optional): `session_required` (default) or `compat`
- `HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS` (optional): `true` (default). Set `false` to ignore client-provided account headers in `compat` mode and use resolver/auth/env-derived identity only.
- `HUB_SESSION_RESOLVE_URL` (optional): identity-worker resolver endpoint (`/v1/mcp/sessions/resolve`)
- `HUB_SESSION_RESOLVE_TOKEN` (optional): shared secret used by hub to call resolver endpoint
- `HUB_SESSION_RESOLVE_TIMEOUT_MS` (optional): resolver call timeout, default `5000`
- `HUB_CONNECT_TIMEOUT_MS` (optional): per-downstream MCP connect timeout in ms, default `4000`
- `HUB_LIST_TOOLS_TIMEOUT_MS` (optional): per-downstream `tools/list` bootstrap timeout in ms, default `10000`
- `HUB_CONNECT_CONCURRENCY` (optional): max concurrent downstream bootstrap connections, default `4` (max `32`)
- `HUB_ENABLED_BUNDLES` (optional): comma-separated or JSON array (defaults from registry)
- `HUB_ENABLED_SERVERS` (optional): comma-separated or JSON array
- `HUB_DISABLED_SERVERS` (optional): comma-separated or JSON array
- `HUB_DISCOVERY_MODE` (optional): `compact` (default) or `full`
- `HUB_DISCOVERY_DEFAULT_SERVERS` (optional): comma-separated or JSON array of server names
- `HUB_DISCOVERY_MAX_PROXY_TOOLS` (optional): positive integer cap; unset/null means no cap
- `HUB_DISCOVERY_SHARED_PACK` (optional): named default from `config/mcp-hub/discovery-packs.json`
- `HUB_REFRESH_SECONDS` (optional): cache TTL for downstream tool catalog, default `300`
- `HUB_CACHE_BUST` (optional): any value change forces runtime refresh
- `HUB_ACCOUNT_ID` (optional): fallback account ID written to hub telemetry rows
- `HUB_ALLOW_DIRECT_PROXY_TOOLS` (optional): `false` (default). Set `true` to allow direct proxy tool calls.
- `HUB_DIRECT_PROXY_ALLOWED_PREFIXES` (optional): CSV/JSON list of proxy-tool prefixes allowed for direct execution.
- `HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW` (optional): enable per-window proxy call limits when > 0
- `HUB_RATE_LIMIT_WINDOW_SECONDS` (optional): rate-limit window size, default `60`
- `HUB_RATE_LIMIT_SCOPE` (optional): `account` (default), `account_server`, or `account_server_tool`
- `HUB_RATE_LIMIT_EXEMPT_SERVERS` (optional): comma-separated downstream server names excluded from limits
- `HUB_QUOTA_MAX_PROXY_CALLS_PER_PERIOD` (optional): per-account hard cap for proxy calls in current UTC month
- `HUB_QUOTA_EXEMPT_SERVERS` (optional): comma-separated downstream server names excluded from quota checks
- `HUB_STATE_KV` (recommended binding): stores remote hub enable/disable state so `hub_update_state` persists

Downstream auth variables are read dynamically from each registry server's `env_http_headers` and `bearer_token_env_var` config.

Shared discovery packs:

- `shared-auth-core`: Dropbox, Gmail, Google Drive, Google Sheets, Notion, QuickBooks, Slack, YouTube, Zoom
- List available packs with `hub_list_discovery_packs`
- Apply one with `hub_set_discovery` by setting `pack`

Intent routing:

- Allowlisted intent routes are loaded from `config/mcp-hub/intent-routes.json`
- Resolve intent only: `hub_route_intent`
- Resolve + execute: `hub_run_intent`
- Typical pattern for low-context workflows:
  1. `hub_route_intent`
  2. `hub_run_intent` (or `hub_execute_proxy_tool` with returned `proxyToolName`)

Account forwarding:

- Proxied tool calls forward `x-mcp-account-id` and `x-hub-account-id` to downstream MCPs.

Session-scoped identity (optional):

- In `session_required` mode (default), callers must provide `X-MCP-Session-Token`.
  The hub resolves `account_id`, `tenant_id`, and `allowed_tool_prefixes` from identity-worker.
- In `session_required`, resolver configuration (`HUB_SESSION_RESOLVE_URL` + `HUB_SESSION_RESOLVE_TOKEN`) is required.
- In `compat` mode, the hub keeps legacy fallback identity behavior and accepts session token in
  `X-MCP-Session-Token` or bearer (when bearer is not the configured `HUB_API_TOKEN`).
- Proxy tools are filtered/enforced by `allowed_tool_prefixes` when identity is session-resolved.

## Telemetry + Correlation

- Hub invocations are written to `mcp_tool_invocations`/`mcp_run_counts` in `TELEMETRY_DB`.
- Hub-observed downstream routes are written to `mcp_hub_routes` in `TELEMETRY_DB`.
- Each brokered downstream call carries correlation via MCP `relatedTask.taskId`.
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

Fleet deploy (team hubs + core hub):

```bash
pnpm mcp:hub:fleet:deploy
pnpm mcp:hub:fleet:verify
```

Fleet deploy defaults:

- `HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS=false` (defensive default; override only for controlled exceptions).

Legacy compat lane deploy:

```bash
pnpm mcp:hub:legacy:deploy
```

Legacy deploy defaults:

- `HUB_IDENTITY_MODE=compat`
- `HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS=false`
- Per-worker override env vars are supported (`CS_HUB_*_LEGACY_TRUST_CLIENT_ACCOUNT_HEADERS=true|false`) for explicit exception cases.

Team workers included in fleet deploy:

- `cs-hub-lainy`
- `cs-hub-danny`
- `cs-hub-august`
- `cs-hub-aaron-outerfields`
- `cs-hub-andre-outerfields`
- `cs-hub-fillip`
- `cs-hub-leah`
- `cs-hub-mj`
- `cs-mcp-hub-remote`

Then point clients to:

```text
https://cs-mcp-hub-remote.<your-workers-subdomain>.workers.dev/mcp
```

## Example Broker Calls

Search visible tools:

```json
{
  "name": "hub_search_proxy_tools",
  "arguments": {
    "query": "send_message",
    "limit": 5
  }
}
```

Describe one tool:

```json
{
  "name": "hub_describe_proxy_tool",
  "arguments": {
    "proxyToolName": "composio-toolkit-slack__slack_send_message"
  }
}
```

Execute one tool:

```json
{
  "name": "hub_execute_proxy_tool",
  "arguments": {
    "proxyToolName": "composio-toolkit-slack__slack_send_message",
    "args": {
      "channel": "C123456",
      "text": "hello from broker mode"
    }
  }
}
```

Run one allowlisted intent in a single call:

```json
{
  "name": "hub_run_intent",
  "arguments": {
    "intent": "create_zoom_meeting",
    "args": {
      "topic": "Weekly Business Review",
      "type": 2,
      "start_time": "2026-03-01T16:00:00Z",
      "duration": 30,
      "timezone": "UTC"
    }
  }
}
```
