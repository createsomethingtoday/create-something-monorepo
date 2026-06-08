# Policy OS Live Verification Runbook

## Purpose

Verify the live free-versus-paid `Policy OS` gating path after deploy with exact operator commands.

This runbook checks four things:

1. `.agency` resolves canonical service-tier state
2. `identity-worker` returns the new entitlement snapshot
3. `mcp_only` cannot discover `policy_os_only` house surfaces
4. `mcp_only` cannot execute paid governed write paths while paid `Policy OS` accounts can

Use this after:

- [AGENCY_SERVICE_TIER_MIGRATION_RUNBOOK_2026-03-09.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/guides/AGENCY_SERVICE_TIER_MIGRATION_RUNBOOK_2026-03-09.md)
- [POLICY_OS_GATING_DEPLOY_CHECKLIST_2026-03-09.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/guides/POLICY_OS_GATING_DEPLOY_CHECKLIST_2026-03-09.md)

## Preconditions

- `.agency`, `identity-worker`, and `cs-mcp-hub-remote` are already deployed
- the hub is running with `HUB_IDENTITY_MODE=session_required`
- you have one known `mcp_only` actor and one known paid `Policy OS` actor
- you have an operator credential for:
  - `.agency` internal entitlement check
  - `identity-worker` admin session or managed-bearer issuance
  - the hub runtime guardrail token

## Preferred Execution Path

Use the repo script first:

```bash
pnpm policy:os:verify:live
```

The script follows the same checks as this runbook and uses the environment variables below. The manual `curl` flow remains the fallback when you need to debug one step in isolation.

If you also set the optional `POLICY_OS_DENY_*` variables, the script verifies the staged commercial-deny lane automatically.

The deploy workflow can also run this automatically after hub deploys when these GitHub settings are populated:

- repo variable: `POLICY_OS_LIVE_VERIFY_ENABLED=true`
- repo variables: `AGENCY_BASE_URL`, `IDENTITY_BASE_URL`, `POLICY_OS_HUB_BASE_URL`
- repo secrets: `AGENCY_INTERNAL_API_KEY`
- repo secrets: `IDENTITY_API_KEY` or `IDENTITY_WORKER_ADMIN_API_KEY`
- repo secrets: `HUB_API_TOKEN` or `CS_MCP_HUB_REMOTE_API_TOKEN`
- repo secrets: `HUB_SESSION_RESOLVE_TOKEN`
- repo secrets: `MCP_ONLY_AUTH_SUBJECT`, `MCP_ONLY_ACCOUNT_ID`, `MCP_ONLY_TENANT_ID`
- repo secrets: `POLICY_OS_AUTH_SUBJECT`, `POLICY_OS_ACCOUNT_ID`, `POLICY_OS_TENANT_ID`
- optional repo secrets: `POLICY_OS_DENY_AUTH_SUBJECT`, `POLICY_OS_DENY_ACCOUNT_ID`, `POLICY_OS_DENY_TENANT_ID`
- optional repo variable: `POLICY_OS_DENY_EXPECTED_REASON`

## Environment

Set these before running the checks:

```bash
export AGENCY_BASE_URL="https://agency.createsomething.agency"
export IDENTITY_BASE_URL="https://id.createsomething.space"
export HUB_BASE_URL="https://cs-mcp-hub-remote.createsomething.workers.dev"

export AGENCY_INTERNAL_API_KEY="replace-me"
export IDENTITY_API_KEY="replace-me"
export IDENTITY_WORKER_ADMIN_API_KEY="replace-me"
export HUB_API_TOKEN="replace-me"
export CS_MCP_HUB_REMOTE_API_TOKEN="$HUB_API_TOKEN"
export MCP_SESSION_RESOLVE_TOKEN="replace-me"

export MCP_ONLY_AUTH_SUBJECT="portal|mcp-only-user"
export MCP_ONLY_ACCOUNT_ID="acct_mcp_only_example"
export MCP_ONLY_TENANT_ID="tenant_mcp_only_example"
export MCP_ONLY_TOOLKIT_PROFILE_JSON='["googlesheets"]'

export POLICY_OS_AUTH_SUBJECT="portal|policy-os-user"
export POLICY_OS_ACCOUNT_ID="acct_policy_os_example"
export POLICY_OS_TENANT_ID="tenant_policy_os_example"
export POLICY_OS_TOOLKIT_PROFILE_JSON='["slack"]'
export POLICY_OS_BOUND_HOST="cs-mcp-hub-remote"
export POLICY_OS_RESOURCE_HOST="cs-mcp-hub-remote"

# Optional staged commercial-deny actor
export POLICY_OS_DENY_AUTH_SUBJECT="portal|policy-os-denied-user"
export POLICY_OS_DENY_ACCOUNT_ID="acct_policy_os_denied_example"
export POLICY_OS_DENY_TENANT_ID="tenant_policy_os_denied_example"
export POLICY_OS_DENY_EXPECTED_REASON="billing_inactive"
export REQUIRE_AGENCY_ENTITLEMENT_CHECK="true"
```

If you are testing a named client hub instead of the shared default endpoint, point `HUB_BASE_URL` at that client host.

If `AGENCY_INTERNAL_API_KEY` is not available locally, set `REQUIRE_AGENCY_ENTITLEMENT_CHECK=false` and rely on the identity-worker entitlement snapshot plus live hub checks. This is the supported local fallback used by the March 13, 2026 validation run.

## Step 1: Confirm `.agency` entitlement state

Check the free wedge:

```bash
curl -sS -X POST "$AGENCY_BASE_URL/api/internal/mcp-entitlements/check" \
  -H "Authorization: Bearer $AGENCY_INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"auth_subject\": \"$MCP_ONLY_AUTH_SUBJECT\",
    \"account_id\": \"$MCP_ONLY_ACCOUNT_ID\",
    \"tenant_id\": \"$MCP_ONLY_TENANT_ID\"
  }" | jq
```

Expected:

- `allowed: true`
- `service_tier: "mcp_only"`
- `entitlement_snapshot.service_tier: "mcp_only"`

Check the paid actor:

```bash
curl -sS -X POST "$AGENCY_BASE_URL/api/internal/mcp-entitlements/check" \
  -H "Authorization: Bearer $AGENCY_INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"auth_subject\": \"$POLICY_OS_AUTH_SUBJECT\",
    \"account_id\": \"$POLICY_OS_ACCOUNT_ID\",
    \"tenant_id\": \"$POLICY_OS_TENANT_ID\"
  }" | jq
```

Expected:

- `allowed: true`
- `service_tier: "policy_os_trial"` or `service_tier: "policy_os_core"`
- `entitlement_snapshot.billing_active: true`
- `entitlement_snapshot.contract_active: true`
- `entitlement_snapshot.policy_accepted: true`

If either response is wrong, stop here. The hub checks are downstream of `.agency`.

## Step 2: Obtain live tokens for both actors

Use either session tokens or managed bearer tokens. Managed bearer is the preferred portable path.

### Option A: issue managed bearer tokens

Free wedge actor:

```bash
curl -sS -X POST "$IDENTITY_BASE_URL/v1/mcp/long-lived-tokens/admin-issue" \
  -H "X-API-Key: ${IDENTITY_WORKER_ADMIN_API_KEY:-$IDENTITY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"auth_subject\": \"$MCP_ONLY_AUTH_SUBJECT\",
    \"account_id\": \"$MCP_ONLY_ACCOUNT_ID\",
    \"tenant_id\": \"$MCP_ONLY_TENANT_ID\",
    \"tool_mode\": \"read_write\",
    \"toolkit_profile\": [\"googlesheets\"],
    \"allowed_tool_prefixes\": [\"composio-toolkit-googlesheets__\"],
    \"actor\": \"operator:policy-os-live-verify\",
    \"metadata\": {
      \"reason\": \"policy_os_live_verification\"
    }
  }" | tee /tmp/mcp-only-managed-bearer.json | jq
```

Paid actor:

```bash
curl -sS -X POST "$IDENTITY_BASE_URL/v1/mcp/long-lived-tokens/admin-issue" \
  -H "X-API-Key: ${IDENTITY_WORKER_ADMIN_API_KEY:-$IDENTITY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"auth_subject\": \"$POLICY_OS_AUTH_SUBJECT\",
    \"account_id\": \"$POLICY_OS_ACCOUNT_ID\",
    \"tenant_id\": \"$POLICY_OS_TENANT_ID\",
    \"tool_mode\": \"read_write\",
    \"toolkit_profile\": [\"slack\"],
    \"allowed_tool_prefixes\": [\"composio-toolkit-slack__\"],
    \"bound_host\": \"${POLICY_OS_BOUND_HOST:-cs-mcp-hub-remote}\",
    \"actor\": \"operator:policy-os-live-verify\",
    \"metadata\": {
      \"reason\": \"policy_os_live_verification\"
    }
  }" | tee /tmp/policy-os-managed-bearer.json | jq
```

Export the tokens:

```bash
export MCP_ONLY_MANAGED_BEARER="$(jq -r '.token' /tmp/mcp-only-managed-bearer.json)"
export POLICY_OS_MANAGED_BEARER="$(jq -r '.token' /tmp/policy-os-managed-bearer.json)"
```

### Option B: mint first-party MCP session tokens

Free wedge actor:

```bash
curl -sS -X POST "$IDENTITY_BASE_URL/v1/mcp/sessions/admin-mint" \
  -H "Authorization: Bearer $IDENTITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"account_id\": \"$MCP_ONLY_ACCOUNT_ID\",
    \"host\": \"codex\",
    \"tool_mode\": \"read_write\",
    \"toolkit_profile\": [],
    \"actor\": \"operator:policy-os-live-verify\",
    \"consent_record_id\": \"consent_policy_os_live_verify_mcp_only\",
    \"consent_granted_at\": \"2026-03-09T00:00:00Z\",
    \"metadata\": {
      \"client_slug\": \"policy-os-live-verification\",
      \"workspace_account_id\": \"$MCP_ONLY_ACCOUNT_ID\"
    }
  }" | tee /tmp/mcp-only-session.json | jq
```

Paid actor:

```bash
curl -sS -X POST "$IDENTITY_BASE_URL/v1/mcp/sessions/admin-mint" \
  -H "Authorization: Bearer $IDENTITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"account_id\": \"$POLICY_OS_ACCOUNT_ID\",
    \"host\": \"codex\",
    \"tool_mode\": \"read_write\",
    \"toolkit_profile\": [\"slack\"],
    \"actor\": \"operator:policy-os-live-verify\",
    \"consent_record_id\": \"consent_policy_os_live_verify_policy_os\",
    \"consent_granted_at\": \"2026-03-09T00:00:00Z\",
    \"metadata\": {
      \"client_slug\": \"policy-os-live-verification\",
      \"workspace_account_id\": \"$POLICY_OS_ACCOUNT_ID\"
    }
  }" | tee /tmp/policy-os-session.json | jq
```

Export the tokens:

```bash
export MCP_ONLY_SESSION_TOKEN="$(jq -r '.token' /tmp/mcp-only-session.json)"
export POLICY_OS_SESSION_TOKEN="$(jq -r '.token' /tmp/policy-os-session.json)"
```

## Step 3: Confirm `identity-worker` returns the entitlement snapshot

Managed bearer example:

```bash
curl -sS -X POST "$IDENTITY_BASE_URL/v1/mcp/sessions/resolve" \
  -H "X-Session-Resolve-Token: $MCP_SESSION_RESOLVE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$MCP_ONLY_MANAGED_BEARER\",
    \"resource_host\": \"${POLICY_OS_RESOURCE_HOST:-cs-mcp-hub-remote}\"
  }" | jq
```

Session example:

```bash
curl -sS -X POST "$IDENTITY_BASE_URL/v1/mcp/sessions/resolve" \
  -H "X-Session-Resolve-Token: $MCP_SESSION_RESOLVE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$MCP_ONLY_SESSION_TOKEN\",
    \"resource_host\": \"${POLICY_OS_RESOURCE_HOST:-cs-mcp-hub-remote}\"
  }" | jq
```

Expected:

- `valid: true`
- `account_id` matches the actor under test
- `service_tier` matches `.agency`
- `entitlement_snapshot` is present

Repeat for the paid actor.

## Step 4: Confirm hub auth preconditions

Missing session token should fail in `session_required` mode:

```bash
curl -i -sS -X POST "$HUB_BASE_URL/mcp" \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected:

- `401` or `400`
- error mentions missing `X-MCP-Session-Token`

`tools/call hub_status` with a real session token should succeed:

```bash
curl -sS -X POST "$HUB_BASE_URL/mcp" \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "X-MCP-Session-Token: $MCP_ONLY_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"hub_status","arguments":{}}}' | jq
```

Expected:

- result returns successfully with no JSON-RPC error
- this confirms the hub accepts the live session token after strict-session enforcement

If you are validating a managed bearer flow against a compat hub, replace the session header with:

```bash
-H "Authorization: Bearer $MCP_ONLY_MANAGED_BEARER"
```

Do not use that pattern against `session_required` hubs.

## Step 5: Verify `mcp_only` cannot discover `policy_os_only`

Use an exact house tool probe with the free actor:

```bash
curl -sS -X POST "$HUB_BASE_URL/mcp" \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "X-MCP-Session-Token: $MCP_ONLY_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"hub_describe_proxy_tool",
      "arguments":{
        "proxyToolName":"create-something__search"
      }
    }
  }' | jq
```

Expected:

- the exact house tool returns `isError: true`
- the message references `unknown or not visible` or session scope blocking

## Step 6: Verify `mcp_only` cannot execute paid governed writes

Use a clearly mutating downstream route with the free actor:

```bash
curl -sS -X POST "$HUB_BASE_URL/mcp" \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "X-MCP-Session-Token: $MCP_ONLY_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":5,
    "method":"tools/call",
    "params":{
      "name":"hub_execute_proxy_tool",
      "arguments":{
        "proxyToolName":"composio-toolkit-googlesheets__googlesheets_values_update",
        "args":{
          "spreadsheet_id":"demo",
          "range":"Sheet1!A1",
          "value_input_option":"RAW",
          "values":[["test"]]
        }
      }
    }
  }' | jq
```

Expected:

- request is denied before downstream execution
- deny reason references paid governed write access

## Step 7: Verify paid `Policy OS` execution path

Use a paid actor with an allowed exact discovery probe in scope:

```bash
curl -sS -X POST "$HUB_BASE_URL/mcp" \
  -H "Authorization: Bearer $HUB_API_TOKEN" \
  -H "X-MCP-Session-Token: $POLICY_OS_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":6,
    "method":"tools/call",
    "params":{
      "name":"hub_describe_proxy_tool",
      "arguments":{
        "proxyToolName":"composio-toolkit-slack__slack_send_message"
      }
    }
  }' | jq
```

Expected:

- the exact Slack tool is describable for the paid actor
- `result.structuredContent.proxyToolName` is `composio-toolkit-slack__slack_send_message`

If you have a non-production-safe test route, execute it with the paid actor and confirm the deny is not service-tier related.

## Step 8: Verify commercial deny for a paid actor

This check proves that a paid tier still fails when commercial prerequisites are off.

Use a known paid actor with one failed prerequisite, or temporarily stage one in `.agency`, then re-run:

```bash
curl -sS -X POST "$AGENCY_BASE_URL/api/internal/mcp-entitlements/check" \
  -H "Authorization: Bearer $AGENCY_INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"auth_subject\": \"$POLICY_OS_AUTH_SUBJECT\",
    \"account_id\": \"$POLICY_OS_ACCOUNT_ID\",
    \"tenant_id\": \"$POLICY_OS_TENANT_ID\"
  }" | jq
```

Expected staged failure examples:

- `allowed: false`
- `reason: "billing_inactive"`
- `reason: "contract_inactive"`
- `reason: "policy_acceptance_required"`

Then resolve the same actor through `identity-worker` and call the hub again. The paid route should be denied on commercial grounds.

The scripted path uses:

- `POLICY_OS_DENY_AUTH_SUBJECT`
- `POLICY_OS_DENY_ACCOUNT_ID`
- `POLICY_OS_DENY_TENANT_ID`
- `POLICY_OS_DENY_EXPECTED_REASON`

## Step 9: Capture evidence

For each actor, capture:

- `.agency` entitlement check output
- `identity-worker` resolve output
- hub discovery result
- hub execution result

If needed, query decision logs from telemetry after a failed request:

```bash
pnpm exec wrangler d1 execute cs-telemetry --remote --command "SELECT policy_id, decision, reason, account_id, created_at FROM authz_decision_events ORDER BY created_at DESC LIMIT 20;"
```

Expected policy IDs:

- `policy.service-tier-entitlement.v1`
- `policy.hub-route-authorization.v1`

## Pass Criteria

Deployment is correct when all of the following are true:

- `.agency` reports canonical service tiers
- `identity-worker` resolve returns `service_tier` and `entitlement_snapshot`
- `mcp_only` cannot discover `policy_os_only` surfaces
- `mcp_only` cannot execute paid governed writes
- paid `Policy OS` actor is not blocked by service-tier policy when commercial gates pass
- paid actor is blocked when billing, contract, or policy acceptance is intentionally inactive

## Notes

- Prefer forward-fix if `.agency` entitlement state is wrong.
- Do not distribute `HUB_API_TOKEN` to end users. It is an operator/runtime guardrail.
- Prefer managed bearer verification for host portability and session verification for first-party hub flows.

## Source Anchors

- [packages/agency/src/routes/api/internal/mcp-entitlements/check/+server.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/agency/src/routes/api/internal/mcp-entitlements/check/%2Bserver.ts)
- [packages/identity-worker/src/index.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/identity-worker/src/index.ts)
- [packages/cs-mcp-hub-remote/index.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/cs-mcp-hub-remote/index.ts)
- [packages/mcp-authz/test/authz.test.mjs](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/mcp-authz/test/authz.test.mjs)
- [docs/MCP_HUB_REMOTE_DEPLOY.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/MCP_HUB_REMOTE_DEPLOY.md)
