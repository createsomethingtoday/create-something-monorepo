# Abundance / thenpgroup.com Hub Runbook

Production runbook for the transparent named-lane Hub worker:

- Worker: `cs-hub-abundance-thenpgroup`
- MCP URL: `https://abundance-thenpgroup.mcp.createsomething.agency/mcp`
- Health URL: `https://abundance-thenpgroup.mcp.createsomething.agency/health`
- Fallback account ID: `acct_thenpgroup`
- Client slug: `thenpgroup`
- Lane slug / host key: `abundance-thenpgroup`
- Allowed client surface: `composio-toolkit-jotform`, `composio-toolkit-mailchimp`, and `composio-toolkit-whatsapp`
- Observability baseline: Cloudflare telemetry + Braintrust tracing
- Host compatibility mode: `compat` for bearer-auth MCP hosts

Target contacts:

- Latasha Baxter `<latasha@thenpgroup.com>`
- Stacey `<stacey@thenpgroup.com>`

References:

- `/Volumes/LaCie/Create Something/create-something-monorepo/docs/MCP_HUB_REMOTE_DEPLOY.md`
- `/Volumes/LaCie/Create Something/create-something-monorepo/docs/policies/v1/policy.client-hub-user-experience.v1.md`
- `/Volumes/LaCie/Create Something/create-something-monorepo/docs/policies/v1/policy.mcp-credential-delivery.v1.md`
- `/Volumes/LaCie/Create Something/create-something-monorepo/docs/policies/v1/policy.partner-auth-governance.v1.md`

## 1) Deploy Worker + Domain

```bash
cd "/Volumes/LaCie/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"

pnpm exec wrangler deploy \
  --config wrangler.team-hubs.toml \
  --name cs-hub-abundance-thenpgroup \
  --var HUB_INSTANCE_ID:cs-hub-abundance-thenpgroup \
  --domain abundance-thenpgroup.mcp.createsomething.agency \
  --var HUB_ACCOUNT_ID:acct_thenpgroup \
  --var 'HUB_ENABLED_BUNDLES:[]' \
  --var HUB_ENABLED_SERVERS:composio-toolkit-jotform,composio-toolkit-mailchimp,composio-toolkit-whatsapp \
  --var HUB_DISABLED_SERVERS:composio-toolkit-notion \
  --var 'HUB_REQUIRED_GLOBAL_SERVERS:' \
  --var 'HUB_REQUIRED_DISCOVERY_SERVERS:' \
  --var HUB_DISCOVERY_MODE:compact \
  --var HUB_DISCOVERY_DEFAULT_SERVERS:composio-toolkit-jotform,composio-toolkit-mailchimp,composio-toolkit-whatsapp \
  --var HUB_IDENTITY_MODE:compat \
  --var HUB_SESSION_RESOLVE_URL:https://id.createsomething.space/v1/mcp/sessions/resolve \
  --keep-vars
```

Notes:

- `wrangler.team-hubs.toml` already enables telemetry D1 and `BRAINTRUST_ENABLED=true`.
- This lane intentionally overrides the template default `HUB_IDENTITY_MODE=session_required` with `compat` because the customer delivery contract is bearer-token auth on a dedicated URL.
- Keep `HUB_SESSION_RESOLVE_URL` and `HUB_SESSION_RESOLVE_TOKEN` configured in compat mode so managed bearers still resolve through `identity-worker` with bound-host and allowed-prefix enforcement.
- `HUB_ENABLED_BUNDLES=[]` is required so the registry defaults do not leak extra servers onto the lane.
- `HUB_DISABLED_SERVERS`, `HUB_REQUIRED_GLOBAL_SERVERS`, and `HUB_REQUIRED_DISCOVERY_SERVERS` explicitly remove the default Notion requirement. This lane is for Jotform, Mailchimp, and WhatsApp only.
- Do not add this worker to the shared team-hub fleet deploy script.

## 2) Required Secrets

Store a dedicated runtime token in Infisical as `CS_HUB_ABUNDANCE_THENPGROUP_API_TOKEN`, then sync or set the worker secrets:

```bash
cd "/Volumes/LaCie/Create Something/create-something-monorepo/packages/cs-mcp-hub-remote"

pnpm exec wrangler secret put HUB_API_TOKEN --name cs-hub-abundance-thenpgroup
pnpm exec wrangler secret put HUB_SESSION_RESOLVE_TOKEN --name cs-hub-abundance-thenpgroup
pnpm exec wrangler secret put BRAINTRUST_API_KEY --name cs-hub-abundance-thenpgroup
pnpm exec wrangler secret put BRAINTRUST_PROJECT_ID --name cs-hub-abundance-thenpgroup
```

Repo maintenance support:

- `scripts/cs-hub-vault-sync.sh` now includes `ABUNDANCE_THENPGROUP` and expects `CS_HUB_ABUNDANCE_THENPGROUP_API_TOKEN`.

## 3) Normalize Runtime State

```bash
curl -sS -X POST https://abundance-thenpgroup.mcp.createsomething.agency/mcp \
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
          "composio-toolkit-jotform",
          "composio-toolkit-mailchimp",
          "composio-toolkit-whatsapp"
        ]
      }
    }
  }' | jq
```

## 4) Verify Health and Scope

```bash
curl -sS https://abundance-thenpgroup.mcp.createsomething.agency/health | jq
```

Expected:

- `auth_required: true`
- `identity_mode: "compat"`
- `enabled_servers` only:
  - `composio-toolkit-jotform`
  - `composio-toolkit-mailchimp`
  - `composio-toolkit-whatsapp`

Verify proxy discovery is limited to the intended surface:

```bash
curl -sS -X POST https://abundance-thenpgroup.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"hub_search_proxy_tools","arguments":{"limit":50}}}' | jq
```

## 5) Initialize the Partner Client

This creates the customer record and establishes the canonical account / tenant identifiers used by the lane:

```bash
curl -sS -X POST "https://createsomething.agency/api/partners/half-dozen/clients/thenpgroup/init" \
  -H "X-Partner-Admin-Key: $PARTNER_PORTAL_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name":"The NP Group",
    "workspace_account_id":"acct_thenpgroup",
    "identity_account_id":"acct_thenpgroup",
    "identity_tenant_id":"thenpgroup",
    "owner_email":"latasha@thenpgroup.com",
    "status":"active",
    "required_toolkits":["jotform","mailchimp","whatsapp"],
    "metadata":{
      "customer_domain":"thenpgroup.com",
      "pilot_name":"Abundance",
      "delivery_contract":"compat_bearer_named_lane"
    }
  }' | jq
```

Notes:

- Keep `identity_user_id` unset until the canonical Auth0 subject is known.
- Keep consent separate; do not create a consent record unless you have customer-approved evidence to attach.

## 6) Initialize the Named Lane

```bash
curl -sS -X POST "https://createsomething.agency/api/partners/half-dozen/clients/thenpgroup/lanes/abundance-thenpgroup/init" \
  -H "X-Partner-Admin-Key: $PARTNER_PORTAL_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name":"Abundance — The NP Group",
    "owner_email":"latasha@thenpgroup.com",
    "status":"active",
    "toolkit_profile":["jotform","mailchimp","whatsapp"],
    "metadata":{
      "approved_exception":{
        "approved_by":"mj",
        "reason":"Transparent named-lane MCP-only pilot for Abundance / thenpgroup.com",
        "graduation_target":"policy_os_trial"
      },
      "identity_binding_required":true,
      "customer_domain":"thenpgroup.com"
    }
  }' | jq
```

Notes:

- The lane URL is canonicalized to `https://abundance-thenpgroup.mcp.createsomething.agency/mcp`.
- The lane host key is canonicalized to `abundance-thenpgroup`.
- Customer-facing managed bearer delivery stays blocked until the lane is updated with the canonical `identity_user_id` and the client has an active consent record.

## 7) Toolkit Auth Baseline

Known production auth config IDs:

- Jotform: `ac_tmBbHlLd51ad` (`jotform-prod`)
- Mailchimp: `ac_eTxcnOkspU3h` (`mailchimp-prod`)
- WhatsApp: `ac_2zA_mdxxs-Hu` (`whatsapp-prod`)

Check current toolkit status:

```bash
curl -sS "https://createsomething.agency/api/partners/half-dozen/clients/thenpgroup/toolkits/status" \
  -H "X-Partner-Admin-Key: $PARTNER_PORTAL_ADMIN_KEY" | jq
```

Note:

- `toolkits/status` is currently gated on an active partner consent record. Expect `policy_blocked` until consent is recorded.

Generate governed connect links as needed:

```bash
curl -sS -X POST "https://createsomething.agency/api/partners/half-dozen/clients/thenpgroup/toolkits/jotform/connect-link" \
  -H "X-Partner-Admin-Key: $PARTNER_PORTAL_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"auth_config_id":"ac_tmBbHlLd51ad"}' | jq

curl -sS -X POST "https://createsomething.agency/api/partners/half-dozen/clients/thenpgroup/toolkits/mailchimp/connect-link" \
  -H "X-Partner-Admin-Key: $PARTNER_PORTAL_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"auth_config_id":"ac_eTxcnOkspU3h"}' | jq

curl -sS -X POST "https://createsomething.agency/api/partners/half-dozen/clients/thenpgroup/toolkits/whatsapp/connect-link" \
  -H "X-Partner-Admin-Key: $PARTNER_PORTAL_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"auth_config_id":"ac_2zA_mdxxs-Hu"}' | jq
```

Expected:

- each required toolkit appears in `toolkits/status` once consent is active
- each toolkit resolves the expected auth config ID above
- connect-link responses return a `connect_link`

## 8) Managed Bearer Delivery Gate

Do not issue the customer bearer until both of these are true:

1. the target contact has a canonical Auth0 subject and the lane record has `identity_user_id`
2. the client has an active consent record

When both are present:

```bash
curl -sS -X POST "https://createsomething.agency/api/partners/half-dozen/clients/thenpgroup/init" \
  -H "X-Partner-Admin-Key: $PARTNER_PORTAL_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "identity_user_id":"<canonical-auth0-subject>"
  }' | jq

curl -sS -X POST "https://createsomething.agency/api/partners/half-dozen/clients/thenpgroup/lanes/abundance-thenpgroup/init" \
  -H "X-Partner-Admin-Key: $PARTNER_PORTAL_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "identity_user_id":"<canonical-auth0-subject>"
  }' | jq

curl -sS -X POST "https://createsomething.agency/api/partners/half-dozen/clients/thenpgroup/lanes/abundance-thenpgroup/bearer-token/issue" \
  -H "X-Partner-Admin-Key: $PARTNER_PORTAL_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

## 9) Trace Verification

Use a correlation ID, execute a brokered tool, then inspect the trace:

```bash
export CID="abundance-thenpgroup-$(date +%s)"

curl -sS -X POST https://abundance-thenpgroup.mcp.createsomething.agency/mcp \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "x-correlation-id: $CID" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"hub_trace_lookup","arguments":{"correlationId":"'"$CID"'","limit":20}}}' | jq
```

Expected:

- telemetry rows present for the lane worker
- Braintrust traces emitted when `BRAINTRUST_API_KEY` is configured
- routed-call evidence includes `boundHost` or `resourceHost` equal to `abundance-thenpgroup`
