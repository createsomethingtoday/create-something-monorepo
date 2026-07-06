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
   - `hub_list_services`
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
- `HUB_DISCOVERY_SHARED_PACK` (named default from `config/mcp-hub/discovery-packs.json`, standard for managed shared hubs; for example `shared-auth-core`, `c3denver-airtable-gmail-notion`, or `mj-shared-auth-plus-ops-search-meetings-and-review`)
- `HUB_REFRESH_SECONDS`
- `HUB_ACCOUNT_ID` (fallback account id for hub telemetry writes)
- `HUB_IDENTITY_MODE` (`session_required` default, or `compat`)
- `HUB_SESSION_RESOLVE_URL` (identity-worker resolver endpoint, e.g. `https://id.createsomething.space/v1/mcp/sessions/resolve`)
- `HUB_SESSION_RESOLVE_TOKEN` (shared secret used to authorize resolver calls)
- `HUB_SESSION_RESOLVE_TIMEOUT_MS` (default `5000`)
- `OSO_URL` (Oso Cloud endpoint, for example `https://cloud.osohq.com`)
- `OSO_API_KEY` (Oso Cloud API key; store as a Worker secret)
- `OSO_FETCH_TIMEOUT_MS` (default `5000`)
- `OSO_BOOTSTRAP_POLICY` (`false` recommended in production; publish policy out of band)
- `ENGINE_FALLBACK_ENABLED` (`true` recommended so the broker retains deterministic audited fallback)

In `session_required` mode, callers must send `X-MCP-Session-Token`, and the hub resolves:

- `account_id`
- `tenant_id`
- `session_id`
- `allowed_tool_prefixes`

and enforces tool access by prefix before routing.

Compatibility note:

- `session_required` mode:
  - keep `Authorization: Bearer <HUB_API_TOKEN>` for gateway auth
  - pass MCP session token in `X-MCP-Session-Token`
- `compat` mode:
  - shared worker token still works via `Authorization`, `X-API-Key`, or query `token`
  - identity-issued personal bearer tokens are also accepted directly when `HUB_SESSION_RESOLVE_URL` and `HUB_SESSION_RESOLVE_TOKEN` are configured
  - this is the preferred host-compatibility mode for Notion-style MCP clients that reliably send a bearer header but do not send `X-MCP-Session-Token`
- `compat` mode no longer trusts client-supplied account headers; identity must come from the resolver, gateway auth, or explicit worker fallback configuration.

Recommended production posture:

- `HUB_IDENTITY_MODE=session_required`
- `HUB_SESSION_RESOLVE_URL=https://id.createsomething.space/v1/mcp/sessions/resolve`
- `HUB_SESSION_RESOLVE_TOKEN` set as a Worker secret and matched exactly with `identity-worker` `MCP_SESSION_RESOLVE_TOKEN`
- `OSO_BOOTSTRAP_POLICY=false`
- `ENGINE_FALLBACK_ENABLED=true`
- Service-first discovery is the standard scalable default for all shared hubs:
  - `hub_list_services` first
  - `hub_search_proxy_tools` with `serverName` whenever known
  - keep `HUB_DISCOVERY_MODE=compact` for team lanes unless a reviewed exception requires `full`
- Discovery packs are the managed baseline for shared hubs:
  - set `HUB_DISCOVERY_SHARED_PACK` on each deployed worker
  - prefer `hub_list_discovery_packs` and pack selection when changing discovery scope
  - treat raw `hub_set_discovery` server/mode overrides as temporary operator exceptions
  - current fleet-specific examples include `c3denver-airtable-gmail-notion`, `danny-shared-auth-plus-dm-and-operator-notion`, `mj-shared-auth-plus-ops-search-meetings-and-review`, and `outerfields-shared-auth-clickup`

Recommended agent and host playbook:

- Treat `hub_list_services` as the default toolkit-discovery primitive.
- Pass `serverName` to `hub_search_proxy_tools` whenever the user task already implies a target service.
- Treat `hub_list_proxy_tools` as a debugging/operator surface, not the normal model loop.
- Prefer `hub_route_intent` / `hub_run_intent` for repetitive allowlisted workflows before widening discovery.
- For toolkit auth, search for `__connection_status` or `__get_connect_link`, execute the matching proxy tool, present the returned URL, and stop until the user confirms completion.
- Keep the default lane on `compact` discovery and move to `full` only when the workflow truly needs broad per-service browsing.

Reviewed compatibility carveout:

- `cs-hub-danny` currently keeps a narrow direct-proxy allowlist for `halfdozen-operator-notion-mcp__`.
- Treat that lane as a named compatibility exception, not the fleet default.
- If removing it, do so as a separate compatibility-tested change rather than as part of discovery/playbook cleanup.

Curated external endpoint layer (Agent Sentinel fit):

- Use Agent Sentinel for wedge, reviewer, or bounded customer lanes that benefit from one MCP URL, explicit tool enablement, centralized activity logs, or per-user credential handoff.
- Preferred shape: `AI client -> Agent Sentinel endpoint -> curated CREATE SOMETHING lane -> custom MCPs / selected Composio toolkits`.
- Do not point Agent Sentinel at the default broker-only management surface and expect that to be the main operator UX; expose a curated discoverable surface instead.
- Keep the CREATE SOMETHING Hub as the default control plane for large, shared, or tenant-variable brokered surfaces.

Named-lane search provider baseline:

- Approved search providers for partner-managed lanes are:
  - `composio-toolkit-exa`
  - `composio-toolkit-perplexityai`
  - `composio-toolkit-composio_search`
- A lane may expose either provider or both.
- A lane may expose any approved combination.
- A lane is not onboarding-complete for search until each promised provider satisfies its runtime prerequisites:
  - Exa and PerplexityAI: live `COMPOSIO_AUTH_CONFIG_MAP` entry plus successful `get_connect_link`
  - Composio Search: successful brokered tool execution from the lane; no auth config is required because the toolkit is `NO_AUTH`
- The current production auth config IDs validated during rollout are:
  - Exa: `ac_6P0uExNakGbD`
  - PerplexityAI: `ac_F_aj7f1MFici`
- If a lane promises multiple auth-bound providers, each mapping must be present. If a lane promises Composio Search, validate a representative brokered call instead. The runbook and delivery metadata must say which providers are actually enabled.

Worker secrets / vars:

```bash
cd packages/cs-mcp-hub-remote

# Required when protecting the public MCP endpoint
pnpm exec wrangler secret put HUB_API_TOKEN

# Required in session_required mode
pnpm exec wrangler secret put HUB_SESSION_RESOLVE_TOKEN

# Required for Oso Cloud primary evaluation
pnpm exec wrangler secret put OSO_API_KEY
```

Set these as Worker vars (dashboard or `wrangler.toml`):

- `HUB_IDENTITY_MODE=session_required`
- `HUB_SESSION_RESOLVE_URL=https://id.createsomething.space/v1/mcp/sessions/resolve`
- `OSO_URL=https://cloud.osohq.com`
- `OSO_FETCH_TIMEOUT_MS=5000`
- `OSO_BOOTSTRAP_POLICY=false`
- `ENGINE_FALLBACK_ENABLED=true`

Legacy bridge lane:

- Deploy legacy bridge workers separately with `HUB_IDENTITY_MODE=compat`.
- Use:
  - `pnpm mcp:hub:legacy:deploy`
- Deploy scripts set `HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS=false` by default so compat workers do not trust client-supplied account headers.
- Set explicit sunset:
  - `HUB_LEGACY_SUNSET_AT=YYYY-MM-DDTHH:MM:SSZ`
- Default to `session_required` for first-party and operator-controlled hosts.
- Use `compat` for host-compatibility lanes when the external host reliably forwards bearer auth but not MCP session headers.
- When using `compat` for a customer lane, keep `HUB_SESSION_RESOLVE_URL` + `HUB_SESSION_RESOLVE_TOKEN` configured so managed bearers still resolve through `identity-worker` with host binding and governed prefix enforcement.
- C3 Denver runs on the primary team-hub fleet path, not the legacy bridge lane. Its canonical account mapping is `acct_c3_denver`.

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

1. List candidate services with `hub_list_services`.
2. Search candidate tools with `hub_search_proxy_tools`, passing `serverName` whenever the target service is already known.
3. Inspect exact schema via `hub_describe_proxy_tool` (or `hub_get_proxy_tool`).
4. Execute with:
   - `hub_execute_proxy_tool`
   - `proxyToolName`
   - `args` payload
   - compatibility alias: `hub_run_proxy_tool`

Low-context intent pattern (recommended for small allowlisted workflows):

1. Resolve route via `hub_route_intent`
2. Execute directly via `hub_run_intent` (or pass returned `proxyToolName` into `hub_execute_proxy_tool`)

Discovery ergonomics defaults:

1. Put every shared lane on a named discovery pack.
2. Keep packs workflow-shaped rather than department-shaped.
3. Start with a capped visible surface for wedges and reviewer lanes.
4. Split `phase-a` and `phase-b` packs instead of shipping one large default pack.
5. Add intent routes for the most common verbs before adding more visible tools.

## Telemetry

`cs-mcp-hub-remote` writes hub-level records into `cs-telemetry` (`mcp_tool_invocations` and `mcp_run_counts`) via `TELEMETRY_DB`.
It also writes hub-observed downstream route events into `mcp_hub_routes`.
Shared authz decisions are persisted in `authz_policy_rollouts` and `authz_decision_events` in the same D1 binding.

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

If `HUB_API_TOKEN` is configured, include the bearer token header in your MCP client. The hub also accepts `?mcp_access_token=<token>` as a compatibility URL input for hosts that can only pass an endpoint string, but `Authorization: Bearer <token>` remains the standard.

For partner delivery, prefer a managed `.agency` bearer token instead of distributing the shared hub token. The partner path is:

```bash
pnpm partner:access:rotate -- \
  --mode managed \
  --slug <client-slug> \
  --delivery-channel portal
```

That returns a `managed_bearer_bundle` for the client while leaving `HUB_API_TOKEN` as the worker/runtime guardrail.

Use `--mode legacy` only for exception-governed fallback delivery.

## OAuth Host Rule

For Notion, ChatGPT, and other hosts that require OAuth app onboarding, use OAuth as the delivery layer for the existing managed long-lived bearer token.

Required behavior:

1. `identity-worker` is the OAuth authority.
2. OAuth token exchange returns the user's managed bearer token as `access_token`.
3. The Hub continues to authorize the request through its existing bearer-token and resolver logic.
4. Existing bearer-token clients must continue working without OAuth changes.
5. `HUB_API_TOKEN` remains a runtime guardrail only and must never be surfaced as a user-facing OAuth credential.
6. The password used on the OAuth authorize page is a separate `identity-worker` login credential that should be managed from `.agency`, not treated as the bearer token itself.
7. `.agency` should expose the linked email and MCP account context for that OAuth login credential and allow the entitled user to set or rotate it.

Required discovery surfaces:

- Hub custom domain:
  - `GET /.well-known/oauth-authorization-server`
  - `GET /mcp/.well-known/oauth-authorization-server`
- Identity worker:
  - `GET /.well-known/oauth-authorization-server`
  - `GET /.well-known/openid-configuration`
  - `GET|POST /oauth/authorize`
  - `POST /oauth/token`
  - `POST /oauth/register` when dynamic registration is required
  - `GET /oauth/userinfo` when OIDC support is enabled

Do not require Notion or ChatGPT to send `X-MCP-Session-Token`. Session tokens remain valid for first-party flows, but host compatibility should use `Authorization: Bearer <managed bearer>` after OAuth delivery.

## Rollout Validation Checklist

After deploy, validate:

1. `hub_status` reports expected connected servers and proxy tool count.
2. `tools/list` contains only management tools.
3. `hub_search_proxy_tools` returns discovery-scoped results.
4. `hub_describe_proxy_tool` returns input schema for a searchable tool.
5. `hub_execute_proxy_tool` succeeds for at least one known route.
6. Direct call to `<server>__<tool>` returns broker-only guidance error.
7. `hub_trace_lookup` shows both hub and routed downstream telemetry rows for broker calls.
8. Hub OAuth discovery endpoints resolve successfully from the custom domain.
9. OAuth token exchange yields a managed bearer token that the resolver accepts at `/mcp`.
10. Notion, ChatGPT, or another OAuth-capable host can complete MCP connection setup end-to-end.
11. Revoking or regenerating the managed bearer token immediately breaks and then restores host access as expected.

## Fleet E2E Verification

Run strict identity + routing checks across team hubs:

```bash
# Required for protected hub calls (choose one):
# export HUB_API_TOKEN='...'
# or per-worker runtime tokens:
# export CS_HUB_LAINY_API_TOKEN='...'
# export CS_HUB_DANNY_API_TOKEN='...'
# export CS_HUB_AUGUST_API_TOKEN='...'
# export CS_HUB_C3DENVER_API_TOKEN='...'
# export CS_HUB_AARON_OUTERFIELDS_API_TOKEN='...'
# export CS_HUB_ANDRE_OUTERFIELDS_API_TOKEN='...'
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

## Vault-Managed Secret Workflow

Use Infisical as the source of truth for Hub and Notion bridge runtime secrets, including dedicated named-lane worker tokens:

```bash
# Sync current vault values to Cloudflare Worker secrets
pnpm mcp:hub:vault:sync

# Rotate delivery credentials, sync, deploy, and verify
pnpm mcp:hub:rotate:production

# Rotate using Infisical
VAULT_PROVIDER=infisical INFISICAL_ENV=prod pnpm mcp:hub:rotate:production
```

Runbook: `docs/CS_HUB_VAULT_ROTATION_WORKFLOW.md`

Named-lane runtime baseline:

- each dedicated client lane keeps its own worker `HUB_API_TOKEN` mirrored from Infisical
- examples include `CS_HUB_VIV_BLONDISH_API_TOKEN` and `CS_HUB_MORGAN_YOUNG_C3_MANAGEMENT_API_TOKEN`
- these values are operator/runtime secrets for deploy, health, and state normalization only
- they are not the customer-delivered managed bearer tokens issued through `.agency`

## Partner Auth Surfaces

Agency partner APIs (Half Dozen lane):

- `POST /api/partners/half-dozen/clients/:slug/init`
- `POST /api/partners/half-dozen/clients/:slug/toolkits/:toolkit/connect-link`
- `GET /api/partners/half-dozen/clients/:slug/toolkits/status`
- `POST /api/partners/half-dozen/clients/:slug/access/mint`
- `POST /api/partners/half-dozen/clients/:slug/lanes/:laneSlug/init`
- `POST /api/partners/half-dozen/clients/:slug/lanes/:laneSlug/access/mint`
- `POST /api/partners/half-dozen/clients/:slug/lanes/:laneSlug/bearer-token/issue`
- `POST /api/partners/half-dozen/clients/:slug/bearer-token/issue`
- `POST /api/partners/half-dozen/clients/:slug/legacy-key/issue`

Identity admin APIs (policy-gated):

- `POST /v1/mcp/sessions/admin-mint`
- `POST /v1/mcp/long-lived-tokens/admin-issue`
- `POST /v1/mcp/legacy-keys/issue`
- `POST /v1/mcp/legacy-keys/:id/revoke`

Named-lane delivery baseline:

- public URL naming uses `<person-slug>-<client-slug>`
- strict sessions and managed bearer tokens may carry `bound_host`
- telemetry and Langfuse tracing are baseline operator observability for dedicated named lanes

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

## Oso Publish Workflow

Runtime defaults now assume repo-first publication, not request-path bootstrap.

- Compile artifacts: `pnpm authz:compile`
- Manual publish: run GitHub workflow `MCP Authz Policy`
  - set `policy_id`
  - set `dry_run=false`
- Automatic publish on `main` requires GitHub Actions config:
  - secret `OSO_URL`
  - secret `OSO_API_KEY`
  - variable `OSO_POLICY_ID`
  - variable `OSO_PUBLISH_ENABLED=true`

Current publish script handles one policy per run. To publish all active policies, run the workflow once per policy id or extend the publisher to batch them.
