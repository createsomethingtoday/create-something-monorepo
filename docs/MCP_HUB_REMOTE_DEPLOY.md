# MCP Hub Remote Deploy

Deploy the remote runtime for the CREATE SOMETHING MCP gateway (broker-only model) as a single public MCP endpoint.

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
- `HUB_IDENTITY_MODE` (`session_required` default, or `compat`)
- `HUB_SESSION_RESOLVE_URL` (identity-worker resolver endpoint, e.g. `https://id.createsomething.space/v1/mcp/sessions/resolve`)
- `HUB_SESSION_RESOLVE_TOKEN` (shared secret used to authorize resolver calls)
- `HUB_SESSION_RESOLVE_TIMEOUT_MS` (default `5000`)

In `session_required` mode, callers must send `X-MCP-Session-Token`, and the hub resolves:

- `account_id`
- `tenant_id`
- `session_id`
- `allowed_tool_prefixes`

and enforces tool access by prefix before routing.

Compatibility note:

- Keep `Authorization: Bearer <HUB_API_TOKEN>` for gateway auth.
- Pass MCP session token in `X-MCP-Session-Token`.
- `compat` mode keeps legacy fallback identity behavior and should be temporary.

Legacy bridge lane:

- Deploy legacy bridge workers separately with `HUB_IDENTITY_MODE=compat`.
- Use:
  - `pnpm mcp:hub:legacy:deploy`
- Set explicit sunset:
  - `HUB_LEGACY_SUNSET_AT=YYYY-MM-DDTHH:MM:SSZ`
- Do not switch strict hubs into compat mode.

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

Low-context intent pattern (recommended for small allowlisted workflows):

1. Resolve route via `hub_route_intent`
2. Execute directly via `hub_run_intent` (or pass returned `proxyToolName` into `hub_execute_proxy_tool`)

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

## Fleet E2E Verification

Run strict identity + routing checks across team hubs:

```bash
# Required for protected hub calls (choose one):
# export HUB_API_TOKEN='...'
# or per-worker tokens:
# export CS_HUB_LAINY_API_TOKEN='...'
# export CS_HUB_DANNY_API_TOKEN='...'
# export CS_HUB_AUGUST_API_TOKEN='...'
# export CS_HUB_FILLIP_API_TOKEN='...'
# export CS_HUB_LEAH_API_TOKEN='...'
# export CS_HUB_MJ_API_TOKEN='...'
# export CS_MCP_HUB_REMOTE_API_TOKEN='...'

# Option A: use an existing MCP session token
export MCP_SESSION_TOKEN='ms_tok_...'
export MCP_SESSION_ACCOUNT_ID='acct_...'

# Option B: mint a session token via identity-worker
export IDENTITY_ACCESS_TOKEN='eyJ...'
export IDENTITY_BASE_URL='https://id.createsomething.space'
export MCP_SESSION_TENANT_ID='fleet_verify'

pnpm mcp:hub:fleet:verify
```

The verifier checks:
1. Required secrets, including `HUB_SESSION_RESOLVE_TOKEN`
2. `/health` policy and `identity_mode=session_required`
3. Stable identity (`account_id`) across two sessions for same user+tenant
4. Missing `X-MCP-Session-Token` is rejected
5. MCP protocol (`initialize`, `resources/list`) stays healthy
6. Session-based routed call returns the expected `entityId/account_id`

## Partner Auth Surfaces

Agency partner APIs (Half Dozen lane):

- `POST /api/partners/half-dozen/clients/:slug/init`
- `POST /api/partners/half-dozen/clients/:slug/toolkits/:toolkit/connect-link`
- `GET /api/partners/half-dozen/clients/:slug/toolkits/status`
- `POST /api/partners/half-dozen/clients/:slug/access/mint`
- `POST /api/partners/half-dozen/clients/:slug/legacy-key/issue`

Identity admin APIs (policy-gated):

- `POST /v1/mcp/sessions/admin-mint`
- `POST /v1/mcp/legacy-keys/issue`
- `POST /v1/mcp/legacy-keys/:id/revoke`

Policy telemetry fields for admin actions:

- `decision`
- `evaluation_path`
- `policy_hash`
- `fallback_used`
- `actor`

## Controlled Delivery Rule

Never store raw bearer/session secrets in docs or checked-in artifacts.

- Delivery channels:
  - Partner portal response
  - Secure note / managed vault
  - Temporary operator handoff channels with audit logs
- Persist only references/previews in databases:
  - `session_id`, `legacy_key_id`, `key_prefix`, `expires_at`, `sunset_at`
