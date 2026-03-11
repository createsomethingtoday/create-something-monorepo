# Morgan Young C3 Management Hub Runbook

Production runbook for the transparent named-lane Hub worker:

- Worker: `cs-hub-morgan-young-c3-management`
- MCP URL: `https://morgan-young-c3-management.mcp.createsomething.agency/mcp`
- Health URL: `https://morgan-young-c3-management.mcp.createsomething.agency/health`
- Fallback account ID: `acct_morgan_young_c3_management`
- Lane slug / host key: `morgan-young-c3-management`
- Allowed client surface: `notion-halfdozen-c3-management`, `composio-toolkit-gmail`, `composio-toolkit-exa`
- Observability baseline: Cloudflare telemetry + Braintrust tracing

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
  --var HUB_ENABLED_SERVERS:notion-halfdozen-c3-management,composio-toolkit-gmail,composio-toolkit-exa \
  --var HUB_DISCOVERY_MODE:compact \
  --var HUB_DISCOVERY_DEFAULT_SERVERS:notion-halfdozen-c3-management,composio-toolkit-gmail,composio-toolkit-exa \
  --keep-vars
```

Notes:

- `wrangler.team-hubs.toml` already enables telemetry D1 and `BRAINTRUST_ENABLED=true`.
- Do not add this worker to the shared team-hub fleet deploy script.

## 2) Required Secrets

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"

pnpm exec wrangler secret put HUB_API_TOKEN --name cs-hub-morgan-young-c3-management
pnpm exec wrangler secret put HUB_SESSION_RESOLVE_TOKEN --name cs-hub-morgan-young-c3-management
pnpm exec wrangler secret put BRAINTRUST_API_KEY --name cs-hub-morgan-young-c3-management
pnpm exec wrangler secret put BRAINTRUST_PROJECT_ID --name cs-hub-morgan-young-c3-management
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
  - `composio-toolkit-exa`

Verify proxy discovery is limited to the intended surface:

```bash
curl -sS -X POST https://morgan-young-c3-management.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"hub_search_proxy_tools","arguments":{"limit":50}}}' | jq
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

## 6) Host-Binding Smoke Check

1. Mint a named-lane bearer for `morgan-young-c3-management`.
2. Call `https://morgan-young-c3-management.mcp.createsomething.agency/mcp` with `Authorization: Bearer <lane-token>` and verify a broker call succeeds.
3. Reuse the same bearer against `https://viv-blondish.mcp.createsomething.agency/mcp` and verify the request is rejected.

## 7) Trace Verification

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
- Braintrust traces emitted when `BRAINTRUST_API_KEY` is configured
- routed-call evidence includes `boundHost` or `resourceHost` equal to `morgan-young-c3-management`
