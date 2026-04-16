# Andre Outerfields Hub Runbook

Production runbook for provisioning and operating the client-isolated Hub worker:

- Worker: `cs-hub-andre-outerfields`
- MCP URL: `https://andre-outerfields.mcp.createsomething.agency/mcp`
- Health URL: `https://andre-outerfields.mcp.createsomething.agency/health`
- Account fallback ID: `acct_andre_outerfields`
- Rollout mode: discovery-first (`shared-auth-core + clickup`)

References:

- `/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/docs/CS_HUB_OPERATOR_CHECKLIST.md`
- `/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/docs/MCP_HUB_REMOTE_DEPLOY.md`

## 1) Preconditions

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"
pnpm exec wrangler whoami
```

Expected Cloudflare account ID: `9645bd52e640b8a4f40a3a55ff1dd75a`

## 2) Deploy Worker + Domain

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"

pnpm exec wrangler deploy \
  --config wrangler.team-hubs.toml \
  --name cs-hub-andre-outerfields \
  --var HUB_INSTANCE_ID:cs-hub-andre-outerfields \
  --domain andre-outerfields.mcp.createsomething.agency \
  --var HUB_ACCOUNT_ID:acct_andre_outerfields \
  --var HUB_ENABLED_BUNDLES:[] \
  --var HUB_ENABLED_SERVERS:composio-toolkit-clickup,composio-toolkit-dropbox,composio-toolkit-gmail,composio-toolkit-googledrive,composio-toolkit-googlesheets,composio-toolkit-linkedin,composio-toolkit-notion,composio-toolkit-quickbooks,composio-toolkit-slack,composio-toolkit-youtube,composio-toolkit-zoom \
  --var HUB_DISCOVERY_MODE:compact \
  --var HUB_DISCOVERY_SHARED_PACK:outerfields-shared-auth-clickup \
  --var HUB_CONNECT_TIMEOUT_MS:4000 \
  --var HUB_LIST_TOOLS_TIMEOUT_MS:10000 \
  --var HUB_CONNECT_CONCURRENCY:8 \
  --var BRAINTRUST_ENABLED:true \
  --keep-vars
```

Notes:

- This runbook is client-isolated. Do not add this worker to `cs-hub-fleet-*` team scripts.
- This lane intentionally exposes the shared auth core plus ClickUp. It does not enable the older `core` or `agency` bundle set.
- The explicit timeout/concurrency vars keep cold bootstrap latency aligned with the current fleet baseline.

## 3) Set Required Secrets

Set `HUB_API_TOKEN` on this worker:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"
pnpm exec wrangler secret put HUB_API_TOKEN --name cs-hub-andre-outerfields
```

Optional non-interactive generation:

```bash
export HUB_API_TOKEN_VALUE="$(openssl rand -hex 32)"
printf "%s" "$HUB_API_TOKEN_VALUE" | pnpm exec wrangler secret put HUB_API_TOKEN --name cs-hub-andre-outerfields
```

Set Braintrust secrets (`BRAINTRUST_API_KEY` is required for trace emission when `BRAINTRUST_ENABLED:true`; `BRAINTRUST_PROJECT_ID` is optional to pin a specific project):

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"
pnpm exec wrangler secret put BRAINTRUST_API_KEY --name cs-hub-andre-outerfields
pnpm exec wrangler secret put BRAINTRUST_PROJECT_ID --name cs-hub-andre-outerfields
```

## 4) Normalize Runtime State (Required)

`cs-mcp-hub-remote` persists state in `HUB_STATE_KV`; previously saved state can override deploy-time env vars.
After deploy + token setup, force the intended profile with `hub_update_state`:

```bash
curl -sS -X POST https://andre-outerfields.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":61,
    "method":"tools/call",
    "params":{
      "name":"hub_update_state",
      "arguments":{
        "setBundles":[],
        "setServers":[
          "composio-toolkit-clickup",
          "composio-toolkit-dropbox",
          "composio-toolkit-gmail",
          "composio-toolkit-googledrive",
          "composio-toolkit-googlesheets",
          "composio-toolkit-linkedin",
          "composio-toolkit-quickbooks",
          "composio-toolkit-slack",
          "composio-toolkit-youtube",
          "composio-toolkit-zoom",
          "composio-toolkit-notion"
        ]
      }
    }
  }' | jq
```

## 5) Verify Production Readiness

```bash
dig +short andre-outerfields.mcp.createsomething.agency
curl -sS https://andre-outerfields.mcp.createsomething.agency/health | jq
```

Expected from `/health`:

- `auth_required: true`
- `enabled_servers` includes:
  - `composio-toolkit-notion`
  - shared-auth-core + ClickUp (`clickup`, `dropbox`, `gmail`, `googledrive`, `googlesheets`, `linkedin`, `quickbooks`, `slack`, `youtube`, `zoom`)

Validate MCP control plane and discovery:

```bash
curl -sS -X POST https://andre-outerfields.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq

curl -sS -X POST https://andre-outerfields.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"hub_search_proxy_tools","arguments":{"serverName":"outerfields-pcn","limit":10}}}' | jq
```

Auth enforcement checks:

```bash
curl -i -sS -X POST https://andre-outerfields.mcp.createsomething.agency/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected: `401 Unauthorized`.

## 5) Account Attribution Smoke Check

Use a fixed correlation ID, execute a downstream route, then look it up:

```bash
export CID="andre-outerfields-smoke-$(date +%s)"

# 1) Discover a callable Outerfields tool name
curl -sS -X POST https://andre-outerfields.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "x-correlation-id: $CID" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"hub_search_proxy_tools","arguments":{"query":"outerfields","limit":5}}}' | jq

# 2) Execute one returned proxy tool with hub_execute_proxy_tool (use a real proxyToolName + args from step 1)
# 3) Query trace
curl -sS -X POST https://andre-outerfields.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":13,\"method\":\"tools/call\",\"params\":{\"name\":\"hub_trace_lookup\",\"arguments\":{\"correlationId\":\"$CID\",\"limit\":20}}}" | jq
```

Expected: trace records show account attribution under `acct_andre_outerfields` unless overridden by `x-mcp-account-id`.

## 6) Client Handoff Payload

- MCP URL: `https://andre-outerfields.mcp.createsomething.agency/mcp`
- Auth: `Authorization: Bearer <identity-issued personal token>`
- Profile: discovery-first (`shared-auth-core + clickup`)
- Usage: broker-only flow
  1. `hub_search_proxy_tools`
  2. `hub_describe_proxy_tool`
  3. `hub_execute_proxy_tool`

Issue the client bearer through the partner auth flow instead of distributing the worker secret:

```bash
pnpm partner:access:rotate -- --mode legacy --slug <andre-outerfields-client-slug> --reason "background_agent_personal_token" --exception-approved-by <approver> --sunset-at <iso-timestamp> --delivery-channel portal
```

Notes:

- `HUB_API_TOKEN` remains the operator/runtime secret for deploy, health, and state-normalization tasks.
- Existing shared worker bearers still authenticate in `compat` mode until you rotate them out.

## 7) Rollback

Inspect current deployments:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"
pnpm exec wrangler deployments list --name cs-hub-andre-outerfields
```

Rollback to previous stable version:

```bash
pnpm exec wrangler rollback --name cs-hub-andre-outerfields
```

Then re-run section 4 verification.

## 8) Promotion Path (Team-Scale, Phase 2)

When Andre expands to a multi-user Outerfields team:

1. Move from fallback account to session-resolved identity:
   - Set `HUB_SESSION_RESOLVE_URL`
   - Set secret `HUB_SESSION_RESOLVE_TOKEN`
2. Move discovery from `compact` to `full`.
3. Expand enabled bundles/servers (up to full-catalog policy if desired).

Example promotion deploy:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"

pnpm exec wrangler deploy \
  --config wrangler.team-hubs.toml \
  --name cs-hub-andre-outerfields \
  --var HUB_INSTANCE_ID:cs-hub-andre-outerfields \
  --domain andre-outerfields.mcp.createsomething.agency \
  --var HUB_DISCOVERY_MODE:full \
  --var HUB_ENABLED_BUNDLES:composio-all,agency,core,ops,observability \
  --keep-vars
```

Set session resolver secret/vars (once identity-worker is ready):

```bash
pnpm exec wrangler secret put HUB_SESSION_RESOLVE_TOKEN --name cs-hub-andre-outerfields
pnpm exec wrangler deploy \
  --config wrangler.team-hubs.toml \
  --name cs-hub-andre-outerfields \
  --var HUB_INSTANCE_ID:cs-hub-andre-outerfields \
  --var HUB_SESSION_RESOLVE_URL:https://id.createsomething.space/v1/mcp/sessions/resolve \
  --keep-vars
```

Re-run section 4 and section 5 after promotion.
