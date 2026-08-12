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
- `ui://hub/auth-workflow`

## What It Does

- Loads downstream server registry from `config/mcp-hub/registry.json`
- Resolves enabled bundles/servers from env vars (or registry defaults)
- Connects to downstream HTTP MCP servers
- Enforces broker-only execution via `hub_list_services` -> `hub_search_proxy_tools` -> `hub_describe_proxy_tool` -> `hub_execute_proxy_tool`

## Management Tools

- `hub_status`
- `hub_list_registry`
- `hub_list_services` (service-first discovery summary for current account/session)
- `hub_list_proxy_tools` (visible proxy tools for current account/session; prefer for debugging/operator inspection, not the default agent loop)
- `hub_search_proxy_tools` (visible query/server filter + cursor pagination; pass `serverName` whenever known)
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
  1. `hub_list_services`
  2. `hub_search_proxy_tools` with `serverName` whenever known
  3. `hub_describe_proxy_tool`
  4. `hub_execute_proxy_tool`
- For shared hubs, named discovery packs are the standard managed baseline:
  - set `HUB_DISCOVERY_SHARED_PACK` on deploy
  - use `hub_list_discovery_packs` before changing discovery scope
  - reserve raw `hub_set_discovery` server overrides for temporary operator exceptions
- For toolkit auth and reconnects, search for `__connection_status` or `__get_connect_link`, then execute that proxy tool with `hub_execute_proxy_tool`.
- Present returned connect URLs to the user and stop; retry only after the user confirms auth completed.

If a client attempts a direct proxy tool call, the hub returns:

`Direct proxy tools are disabled. Use hub_list_services first, then hub_search_proxy_tools to find the proxyToolName, then call hub_execute_proxy_tool with proxyToolName + args.`

Optional direct proxy mode:

- Set `HUB_ALLOW_DIRECT_PROXY_TOOLS=true` to allow direct `<server>__<tool>` calls.
- Optionally set `HUB_DIRECT_PROXY_ALLOWED_PREFIXES` (CSV or JSON array) to restrict direct execution to specific proxy-tool name prefixes.

## Agent Discovery Playbook

Default playbook for agents and hosts:

1. Start from a named discovery pack, not a global catalog.
2. Call `hub_list_services` first and pick the target service/toolkit.
3. Call `hub_search_proxy_tools` with `serverName` whenever the target service is known.
4. Call `hub_describe_proxy_tool` only on the shortlist you may actually use.
5. Execute with `hub_execute_proxy_tool`.

Prefer these shortcuts:

- Use `hub_route_intent` or `hub_run_intent` for repeated low-context workflows where an allowlisted intent route exists.
- Use `hub_list_proxy_tools` for debugging, UI inspection, or operator diagnostics, not as the default discovery primitive for agents.
- For toolkit auth/reconnect, search for `__connection_status` or `__get_connect_link`, execute that proxy tool, present the link to the user, and stop until the user confirms auth completed.

Default prompt contract for brokered hosts:

- If the task already names an app, toolkit, or service, pass `serverName`.
- Do not search across every visible service unless the user explicitly asked for cross-service discovery.
- Treat `compact` discovery as the default lane shape.
- Treat `full` discovery as an operator/debugging surface or a reviewed high-context lane.

External curated endpoint layer:

- Agent Sentinel is a good fit for wedge, reviewer, or bounded customer lanes that need one MCP URL, explicit tool enablement, centralized logs, or per-user credential handoff.
- When fronting this hub with Agent Sentinel, expose a curated discoverable surface rather than the default broker-only management surface.
- Keep brokered discovery as the default for large shared hub surfaces.

## Configuration

Environment variables:

- `HUB_INSTANCE_ID` (recommended): unique id for this deployed hub worker; used to namespace hub state/discovery KV keys so team hubs do not overwrite each other.
- `HUB_API_TOKEN` (optional): if set, `/mcp` requires `Authorization: Bearer <token>`. For compatibility with clients that can only provide a signed endpoint URL, the gateway also accepts `?mcp_access_token=<token>`, but header bearer remains the standard path.
- `HUB_IDENTITY_MODE` (optional): `session_required` (default) or `compat`
- `HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS` (optional): `false` (default). Set `true` only for a tightly controlled compat exception that is explicitly approved.
- `HUB_SESSION_RESOLVE_URL` (optional): identity-worker resolver endpoint (`/v1/mcp/sessions/resolve`)
- `HUB_SESSION_RESOLVE_TOKEN` (optional): shared secret used by hub to call resolver endpoint
- `HUB_SESSION_RESOLVE_TIMEOUT_MS` (optional): resolver call timeout, default `5000`
- `HUB_CONNECT_TIMEOUT_MS` (optional): per-downstream MCP connect timeout in ms, default `4000`
- `HUB_LIST_TOOLS_TIMEOUT_MS` (optional): per-downstream `tools/list` bootstrap timeout in ms, default `10000`
- `HUB_CONNECT_CONCURRENCY` (optional): max concurrent downstream bootstrap connections, default `4` (max `32`)
- `HUB_ENABLED_BUNDLES` (optional): comma-separated or JSON array (defaults from registry)
- `HUB_ENABLED_SERVERS` (optional): comma-separated or JSON array
- `HUB_DISABLED_SERVERS` (optional): comma-separated or JSON array
- `HUB_REQUIRED_GLOBAL_SERVERS` (optional): comma-separated or JSON array of server names that must be present in every resolved Hub state, default none. Keep this empty unless a reviewed policy requires a global tool dependency.
- `HUB_DISCOVERY_MODE` (optional): `compact` (default) or `full`
- `HUB_DISCOVERY_DEFAULT_SERVERS` (optional): comma-separated or JSON array of server names
- `HUB_DISCOVERY_MAX_PROXY_TOOLS` (optional): positive integer cap; unset/null means no cap
- `HUB_DISCOVERY_SHARED_PACK` (standard for shared hubs): named default from `config/mcp-hub/discovery-packs.json`
- `HUB_REQUIRED_DISCOVERY_SERVERS` (optional): comma-separated or JSON array of connected server names always included in discovery preferences, default none.
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
- `c3denver-airtable-gmail-notion`: Airtable, Gmail, Notion
- `danny-shared-auth-plus-dm-and-operator-notion`: shared auth core plus `halfdozen-dm-mcp` and `halfdozen-operator-notion-mcp`
- `mj-legacy-shared-auth-plus-meetings`: compact legacy shared auth core plus Meetings
- `mj-shared-auth-plus-ops-search-meetings-and-review`: full MJ ops lane with shared auth core, Airtable, Exa, Meetings, and Webflow template review
- `outerfields-shared-auth-clickup`: shared auth core plus ClickUp
- List available packs with `hub_list_discovery_packs`
- Apply one with `hub_set_discovery` by setting `pack`

Pack authoring heuristics:

- Prefer one named workflow or operator role per pack.
- Keep reviewer and wedge packs capped to a small visible set when possible (for example `6-30` proxy tools).
- Prefer `compact` packs for shared lanes; add a separate `full` pack only when a reviewed workflow actually needs it.
- Avoid mixing multiple search/research providers into the same default pack unless the workflow explicitly depends on provider choice.
- Add or expand `hub_route_intent` allowlists for repetitive workflows before broadening the visible tool surface.

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
- A Cloudflare Cron runs `production_watchdog` every 15 minutes. It probes the live Hub, checks unsampled D1 failures from the prior 15 minutes, and records the result as a correlated Langfuse trace with the Boolean `execution_success` score.
- Watchdog findings are emailed through Resend and deduplicated for one hour in `HUB_STATE_KV`. `RESEND_API_KEY` is loaded from Infisical; `WATCHDOG_ALERT_EMAIL`, `WATCHDOG_EMAIL_FROM`, and `WATCHDOG_HEALTH_URL` are non-secret deploy variables.
- Langfuse traces are marked with `environment=production` and the Cloudflare Worker version as their release so production regressions can be isolated by deploy.
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

List services first:

```json
{
  "name": "hub_list_services",
  "arguments": {}
}
```

Search visible tools within one service:

```json
{
  "name": "hub_search_proxy_tools",
  "arguments": {
    "serverName": "composio-toolkit-slack",
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
