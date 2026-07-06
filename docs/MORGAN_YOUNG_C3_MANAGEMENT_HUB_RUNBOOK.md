# Morgan Young C3 Management Hub Runbook

Production runbook for the transparent named-lane Hub worker:

- Worker: `cs-hub-morgan-young-c3-management`
- MCP URL: `https://morgan-young-c3-management.mcp.createsomething.agency/mcp`
- Health URL: `https://morgan-young-c3-management.mcp.createsomething.agency/health`
- Fallback account ID: `acct_morgan_young_c3_management`
- Lane slug / host key: `morgan-young-c3-management`
- Allowed client surface: `notion-halfdozen-c3-management`, `composio-toolkit-gmail`, and approved search provider(s) `composio-toolkit-exa`, `composio-toolkit-perplexityai`, and/or `composio-toolkit-composio_search`
- Observability baseline: Cloudflare telemetry + Langfuse tracing
- Host compatibility mode: `compat` for Notion-style bearer-auth MCP hosts

References:

- `/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/docs/MCP_HUB_REMOTE_DEPLOY.md`
- `/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/docs/policies/v1/policy.client-hub-user-experience.v1.md`
- `/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/docs/policies/v1/policy.partner-auth-governance.v1.md`

## 1) Deploy Worker + Domain

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"

pnpm exec wrangler deploy \
  --config wrangler.team-hubs.toml \
  --name cs-hub-morgan-young-c3-management \
  --var HUB_INSTANCE_ID:cs-hub-morgan-young-c3-management \
  --domain morgan-young-c3-management.mcp.createsomething.agency \
  --var HUB_ACCOUNT_ID:acct_morgan_young_c3_management \
  --var 'HUB_ENABLED_BUNDLES:[]' \
  --var HUB_ENABLED_SERVERS:notion-halfdozen-c3-management,composio-toolkit-gmail,composio-toolkit-exa \
  --var HUB_DISABLED_SERVERS:composio-toolkit-notion \
  --var 'HUB_REQUIRED_GLOBAL_SERVERS:' \
  --var 'HUB_REQUIRED_DISCOVERY_SERVERS:' \
  --var HUB_DISCOVERY_MODE:compact \
  --var HUB_DISCOVERY_SHARED_PACK:morgan-young-c3-management-named-lane \
  --var HUB_DISCOVERY_DEFAULT_SERVERS:notion-halfdozen-c3-management,composio-toolkit-gmail,composio-toolkit-exa \
  --var HUB_IDENTITY_MODE:compat \
  --var HUB_SESSION_RESOLVE_URL:https://id.createsomething.space/v1/mcp/sessions/resolve \
  --keep-vars
```

Notes:

- `wrangler.team-hubs.toml` already enables telemetry D1 and `LANGFUSE_ENABLED=true`.
- This lane intentionally overrides the template default `HUB_IDENTITY_MODE=session_required` with `compat` so Notion bearer-auth MCP connections behave like the older Half Dozen lanes.
- Keep `HUB_SESSION_RESOLVE_URL` and `HUB_SESSION_RESOLVE_TOKEN` configured in compat mode so managed bearers still resolve through `identity-worker` with bound-host and allowed-prefix enforcement.
- `HUB_ENABLED_BUNDLES=[]` is required so the registry default `core` and `observability` bundles do not leak extra servers onto the lane.
- `HUB_DISABLED_SERVERS`, `HUB_REQUIRED_GLOBAL_SERVERS`, and `HUB_REQUIRED_DISCOVERY_SERVERS` explicitly remove the default `composio-toolkit-notion` requirement; the lane should expose only the custom C3 Notion bridge plus Gmail and Exa.
- `HUB_DISCOVERY_SHARED_PACK=morgan-young-c3-management-named-lane` is the managed reset baseline; do not inherit `shared-auth-core` for this lane.
- Do not add this worker to the shared team-hub fleet deploy script.
- If PerplexityAI is enabled for this lane, add `composio-toolkit-perplexityai` to both `HUB_ENABLED_SERVERS` and `HUB_DISCOVERY_DEFAULT_SERVERS`.
- If Composio Search is enabled for this lane, add `composio-toolkit-composio_search` to both `HUB_ENABLED_SERVERS` and `HUB_DISCOVERY_DEFAULT_SERVERS`.

## 2) Required Secrets

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"

pnpm exec wrangler secret put HUB_API_TOKEN --name cs-hub-morgan-young-c3-management
pnpm exec wrangler secret put HUB_SESSION_RESOLVE_TOKEN --name cs-hub-morgan-young-c3-management
pnpm exec wrangler secret put LANGFUSE_SECRET_KEY --name cs-hub-morgan-young-c3-management
pnpm exec wrangler secret put LANGFUSE_PUBLIC_KEY --name cs-hub-morgan-young-c3-management
```

## 3) Normalize Runtime State

```bash
curl -sS -X POST https://morgan-young-c3-management.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"hub_update_state",
      "arguments":{
        "setBundles":[],
        "setServers":[
          "notion-halfdozen-c3-management",
          "composio-toolkit-gmail",
          "composio-toolkit-exa"
        ]
      }
    }
  }' | jq
```

## 4) Verify Health and Scope

```bash
curl -sS https://morgan-young-c3-management.mcp.createsomething.agency/health | jq
```

Expected:

- `auth_required: true`
- `enabled_servers` only:
  - `notion-halfdozen-c3-management`
  - `composio-toolkit-gmail`
  - promised search provider(s): `composio-toolkit-exa`, `composio-toolkit-perplexityai`, and/or `composio-toolkit-composio_search`

Verify proxy discovery is limited to the intended surface:

```bash
curl -sS -X POST https://morgan-young-c3-management.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"hub_list_services","arguments":{}}}' | jq

curl -sS -X POST https://morgan-young-c3-management.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"hub_search_proxy_tools","arguments":{"serverName":"notion-halfdozen-c3-management","limit":25}}}' | jq
```

## 5) Provision the Named Lane

```bash
curl -sS -X POST "https://agency.createsomething.agency/api/partners/half-dozen/clients/c3-management/lanes/morgan-young-c3-management/init" \
  -H "X-Partner-Admin-Key: $PARTNER_PORTAL_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name":"Morgan Young — C3 Management",
    "toolkit_profile":["gmail","exa"],
    "metadata":{
      "approved_exception":{
        "approved_by":"mj",
        "graduation_target":"policy_os_trial"
      }
    }
  }' | jq
```

Issue the default managed bearer bundle:

```bash
curl -sS -X POST "https://agency.createsomething.agency/api/partners/half-dozen/clients/c3-management/lanes/morgan-young-c3-management/bearer-token/issue" \
  -H "X-Partner-Admin-Key: $PARTNER_PORTAL_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

Use `access/mint` only for operator testing or temporary strict-session debugging.

## 6) Search + Auth Config Baseline

Before calling the lane onboarding-complete, verify the promised search provider prerequisites:

- Exa auth config ID: `ac_6P0uExNakGbD`
- PerplexityAI auth config ID: `ac_F_aj7f1MFici`
- Composio Search toolkit slug: `COMPOSIO_SEARCH` (`composio-toolkit-composio_search`, `NO_AUTH`)

Rules:

1. If the lane promises Exa, `COMPOSIO_AUTH_CONFIG_MAP` must include an `exa` entry and `composio-toolkit-exa__get_connect_link` must succeed.
2. If the lane promises PerplexityAI, `COMPOSIO_AUTH_CONFIG_MAP` must include a `perplexityai` entry and `composio-toolkit-perplexityai__get_connect_link` must succeed.
3. If the lane promises Composio Search, execute at least one representative brokered search tool successfully. No auth config is required.
4. If the lane promises multiple providers, each provider-specific check must pass.
5. If a promised provider fails its prerequisite check, the lane may still be infrastructure-ready, but it is not onboarding-complete for search.

## 7) Host-Binding Smoke Check

1. Mint a named-lane bearer for `morgan-young-c3-management`.
2. Call `https://morgan-young-c3-management.mcp.createsomething.agency/mcp` with `Authorization: Bearer <lane-token>` and verify a broker call succeeds.
3. Reuse the same bearer against `https://viv-blondish.mcp.createsomething.agency/mcp` and verify the request is rejected.

Minimum success checks:

1. `tools/list` succeeds with the lane bearer.
2. `hub_list_services` shows the client-specific Notion server.
3. `hub_search_proxy_tools` scoped to `notion-halfdozen-c3-management` succeeds.
4. `hub_execute_proxy_tool` succeeds for a low-risk Notion read such as `notion_list_databases`.
5. The Gmail `__connection_status` proxy tool returns a governed result.
6. Each promised auth-bound search provider returns either a governed connect link or an active connection status result.
7. If Composio Search is promised, at least one representative brokered Composio Search call succeeds.

## 8) Trace Verification

Use a correlation ID, execute a brokered tool, then inspect the trace:

```bash
export CID="morgan-young-c3-management-$(date +%s)"

curl -sS -X POST https://morgan-young-c3-management.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "x-correlation-id: $CID" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"hub_trace_lookup","arguments":{"correlationId":"'"$CID"'","limit":20}}}' | jq
```

Expected:

- telemetry rows present for the lane worker
- Langfuse traces emitted when `LANGFUSE_SECRET_KEY` is configured
- routed-call evidence includes `boundHost` or `resourceHost` equal to `morgan-young-c3-management`
