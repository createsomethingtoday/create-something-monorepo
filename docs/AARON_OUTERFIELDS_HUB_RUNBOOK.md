# Aaron Outerfields Hub Runbook

Production runbook for provisioning and operating the client-isolated Hub worker:

- Worker: `cs-hub-aaron-outerfields`
- MCP URL: `https://aaron-outerfields.mcp.createsomething.agency/mcp`
- Health URL: `https://aaron-outerfields.mcp.createsomething.agency/health`
- Account fallback ID: `acct_aaron_outerfields`
- Rollout mode: discovery-first (`Outerfields + shared-auth-core + clickup + core`)

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
  --name cs-hub-aaron-outerfields \
  --var HUB_INSTANCE_ID:cs-hub-aaron-outerfields \
  --domain aaron-outerfields.mcp.createsomething.agency \
  --var HUB_ACCOUNT_ID:acct_aaron_outerfields \
  --var HUB_ENABLED_BUNDLES:agency,core \
  --var HUB_ENABLED_SERVERS:outerfields-pcn,composio-toolkit-clickup,composio-toolkit-dropbox,composio-toolkit-gmail,composio-toolkit-googledrive,composio-toolkit-googlesheets,composio-toolkit-linkedin,composio-toolkit-quickbooks,composio-toolkit-slack,composio-toolkit-youtube,composio-toolkit-zoom \
  --var HUB_DISCOVERY_MODE:compact \
  --var HUB_DISCOVERY_SHARED_PACK:outerfields-shared-auth-clickup \
  --var HUB_DISCOVERY_DEFAULT_SERVERS:outerfields-pcn,create-something,three-tier-framework,playbook,composio-toolkit-clickup,composio-toolkit-dropbox,composio-toolkit-gmail,composio-toolkit-googledrive,composio-toolkit-googlesheets,composio-toolkit-linkedin,composio-toolkit-quickbooks,composio-toolkit-slack,composio-toolkit-youtube,composio-toolkit-zoom \
  --var LANGFUSE_ENABLED:true \
  --keep-vars
```

Notes:

- This runbook is client-isolated. Do not add this worker to `cs-hub-fleet-*` team scripts.
- `core` enables `create-something`, `three-tier-framework`, and `playbook`.
- `agency` enables `outerfields-pcn`.

## 3) Set Required Secrets

Set `HUB_API_TOKEN` on this worker:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"
pnpm exec wrangler secret put HUB_API_TOKEN --name cs-hub-aaron-outerfields
```

Optional non-interactive generation:

```bash
export HUB_API_TOKEN_VALUE="$(openssl rand -hex 32)"
printf "%s" "$HUB_API_TOKEN_VALUE" | pnpm exec wrangler secret put HUB_API_TOKEN --name cs-hub-aaron-outerfields
```

Set Langfuse secrets (`LANGFUSE_SECRET_KEY` is required for trace emission when `LANGFUSE_ENABLED:true`; `LANGFUSE_PUBLIC_KEY` is optional to pin a specific project):

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"
pnpm exec wrangler secret put LANGFUSE_SECRET_KEY --name cs-hub-aaron-outerfields
pnpm exec wrangler secret put LANGFUSE_PUBLIC_KEY --name cs-hub-aaron-outerfields
```

## 4) Normalize Runtime State (Required)

`cs-mcp-hub-remote` persists state in `HUB_STATE_KV`; previously saved state can override deploy-time env vars.
After deploy + token setup, force the intended profile with `hub_update_state`:

```bash
curl -sS -X POST https://aaron-outerfields.mcp.createsomething.agency/mcp \
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
        "enableBundles":["agency","core"],
        "disableBundles":["ops"],
        "enableServers":[
          "outerfields-pcn",
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
        ],
        "disableServers":[
          "composio-toolkit-airtable",
          "composio-toolkit-webflow",
          "halfdozen-dm-mcp",
          "schedule-mcp",
          "substrate-mcp"
        ]
      }
    }
  }' | jq
```

## 5) Verify Production Readiness

```bash
dig +short aaron-outerfields.mcp.createsomething.agency
curl -sS https://aaron-outerfields.mcp.createsomething.agency/health | jq
```

Expected from `/health`:

- `auth_required: true`
- `enabled_servers` includes:
  - `outerfields-pcn`
  - `create-something`
  - `three-tier-framework`
  - `playbook`
  - `composio-toolkit-notion` (required global server)
  - shared-auth-core + ClickUp (`clickup`, `dropbox`, `gmail`, `googledrive`, `googlesheets`, `linkedin`, `quickbooks`, `slack`, `youtube`, `zoom`)

Validate MCP control plane and discovery:

```bash
curl -sS -X POST https://aaron-outerfields.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq

curl -sS -X POST https://aaron-outerfields.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"hub_list_services","arguments":{}}}' | jq

curl -sS -X POST https://aaron-outerfields.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"hub_search_proxy_tools","arguments":{"serverName":"composio-toolkit-clickup","limit":10}}}' | jq
```

Auth enforcement checks:

```bash
curl -i -sS -X POST https://aaron-outerfields.mcp.createsomething.agency/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected: `401 Unauthorized`.

## 5) Account Attribution Smoke Check

Use a fixed correlation ID, execute a downstream route, then look it up:

```bash
export CID="aaron-outerfields-smoke-$(date +%s)"

# 1) Confirm the intended service is visible
curl -sS -X POST https://aaron-outerfields.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "x-correlation-id: $CID" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"hub_list_services","arguments":{}}}' | jq

# 2) Discover a callable ClickUp tool name inside the scoped service
curl -sS -X POST https://aaron-outerfields.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "x-correlation-id: $CID" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":12,"method":"tools/call","params":{"name":"hub_search_proxy_tools","arguments":{"serverName":"composio-toolkit-clickup","limit":5}}}' | jq

# 3) Execute one returned proxy tool with hub_execute_proxy_tool (use a real proxyToolName + args from step 2)
# 4) Query trace
curl -sS -X POST https://aaron-outerfields.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":13,\"method\":\"tools/call\",\"params\":{\"name\":\"hub_trace_lookup\",\"arguments\":{\"correlationId\":\"$CID\",\"limit\":20}}}" | jq
```

Expected: trace records show account attribution under `acct_aaron_outerfields`. Client-supplied `x-mcp-account-id` overrides are no longer trusted on the hub fallback path.

## 6) Client Handoff Payload

- MCP URL: `https://aaron-outerfields.mcp.createsomething.agency/mcp`
- Auth: `Authorization: Bearer <identity-issued personal token>`
- Profile: discovery-first (`Outerfields + shared-auth-core + clickup + core`)
- Usage: service-first broker flow
  1. `hub_list_services`
  2. `hub_search_proxy_tools` with `serverName` whenever the target service is known
  3. `hub_describe_proxy_tool`
  4. `hub_execute_proxy_tool`

Issue the client bearer through the partner auth flow instead of distributing the worker secret:

```bash
pnpm partner:access:rotate -- --mode managed --slug <aaron-outerfields-client-slug> --delivery-channel portal
```

Notes:

- `HUB_API_TOKEN` remains the operator/runtime secret for deploy, health, and state-normalization tasks.
- Existing shared worker bearers still authenticate in `compat` mode until you rotate them out.
- Use `--mode legacy` only when a reviewed exception requires a sunset-bound fallback token.

## 7) Rollback

Inspect current deployments:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"
pnpm exec wrangler deployments list --name cs-hub-aaron-outerfields
```

Rollback to previous stable version:

```bash
pnpm exec wrangler rollback --name cs-hub-aaron-outerfields
```

Then re-run section 4 verification.

## 8) Promotion Path (Team-Scale, Phase 2)

When Aaron expands to a multi-user Outerfields team:

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
  --name cs-hub-aaron-outerfields \
  --var HUB_INSTANCE_ID:cs-hub-aaron-outerfields \
  --domain aaron-outerfields.mcp.createsomething.agency \
  --var HUB_DISCOVERY_MODE:full \
  --var HUB_ENABLED_BUNDLES:composio-all,agency,core,ops,observability \
  --keep-vars
```

Set session resolver secret/vars (once identity-worker is ready):

```bash
pnpm exec wrangler secret put HUB_SESSION_RESOLVE_TOKEN --name cs-hub-aaron-outerfields
pnpm exec wrangler deploy \
  --config wrangler.team-hubs.toml \
  --name cs-hub-aaron-outerfields \
  --var HUB_INSTANCE_ID:cs-hub-aaron-outerfields \
  --var HUB_SESSION_RESOLVE_URL:https://id.createsomething.space/v1/mcp/sessions/resolve \
  --keep-vars
```

Re-run section 4 and section 5 after promotion.
