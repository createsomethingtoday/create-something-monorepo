# Reviewer Hub Phase A Operator Runbook

**Status:** Working draft  
**Audience:** Hub operators  
**Workflow:** `app_review_hub_lane`  
**Date:** `2026-03-11`

## 1. Purpose

This runbook is the operational implementation path for the two reviewer-specific Hub surfaces in Phase A.

Phase A outcome:

- one reviewer-specific Hub surface per reviewer
- `webflow-app-review-mcp` only
- compact discovery
- read-only evidence lane
- manual Airtable fallback for official review-state changes

## 2. Reviewer Hub set

| Reviewer | Hub slug | Worker name | Domain |
| --- | --- | --- | --- |
| Pablo Miranda | `wf-app-review-pablo` | `cs-hub-wf-app-review-pablo` | `wf-app-review-pablo.mcp.createsomething.agency` |
| Shea Sisco | `wf-app-review-shea` | `cs-hub-wf-app-review-shea` | `wf-app-review-shea.mcp.createsomething.agency` |

## 3. Repo artifacts created for this rollout

- Discovery pack: `config/mcp-hub/discovery-packs.json`
  - `webflow-marketplace-app-review-phase-a`
- Bundle: `config/mcp-hub/registry.json`
  - `webflow-marketplace-app-review-phase-a`
- Deploy script:
  - `scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh`

## 4. Preconditions

Required locally:

- `pnpm`
- `jq`
- `curl`
- Cloudflare access via `wrangler`

Required environment:

- `HUB_API_TOKEN`
- `SESSION_TOKEN_FOR_NORMALIZE`
- `SESSION_RESOLVE_URL` if not using the default in the script

Optional environment:

- `SESSION_TOKEN_FOR_VERIFY`
- `DISCOVERY_MAX_PROXY_TOOLS`
- `RATE_LIMIT_MAX_CALLS`
- `RATE_LIMIT_WINDOW_SECONDS`
- `QUOTA_MAX_PROXY_CALLS_PER_PERIOD`

Required reviewer mapping input for `webflow-app-review-mcp`:

- set `REVIEWER_DIRECTORY_JSON` on the deployed `webflow-app-review-mcp` worker
- use [webflow-app-review-reviewer-directory.example.json](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/docs/examples/webflow-app-review-reviewer-directory.example.json) as the template
- current Airtable collaborator ids:
  - Pablo Miranda: `usrngNLDtuR9yYZei`
  - Shea Sisco: `usrEt5sK6Jf0JdLO5`

Suggested command:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-app-review-mcp/worker"
pnpm exec wrangler secret put REVIEWER_DIRECTORY_JSON
```

## 5. Deploy both reviewer Hubs

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh deploy
```

This deploys each reviewer worker with:

- `HUB_IDENTITY_MODE=session_required`
- `HUB_ENABLED_SERVERS=webflow-app-review-mcp`
- `HUB_DISCOVERY_SHARED_PACK=webflow-marketplace-app-review-phase-a`
- compact discovery
- Phase A rate-limit and quota defaults

It assumes the upstream `webflow-app-review-mcp` worker already has `REVIEWER_DIRECTORY_JSON`, `AIRTABLE_API_KEY`, and `MCP_API_KEY` configured.

## 6. Normalize state

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh normalize
```

This applies:

- `hub_update_state`
  - `setBundles=["webflow-marketplace-app-review-phase-a"]`
  - `setServers=["webflow-app-review-mcp"]`
- `hub_set_discovery`
  - `pack="webflow-marketplace-app-review-phase-a"`
  - `mode="compact"`
  - `activeServers=["webflow-app-review-mcp"]`
  - `maxProxyTools=8`

## 7. Verify each reviewer Hub

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh verify
```

Expected verification posture:

- `/health` returns successfully
- `hub_list_services` shows `webflow-app-review-mcp`
- `hub_search_proxy_tools` for `webflow-app-review-mcp` succeeds
- reviewer runtime is compact and reviewer-scoped
- mutable app-review tools are not visible in reviewer discovery

## 8. One-command path

If all required environment variables are present:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh all
```

## 9. Expected reviewer-visible surface

Phase A reviewer Hubs should expose app-review context tools only:

- `app_review_health`
- `app_review_list_queue`
- `app_review_get_asset`
- `app_review_list_versions`
- `app_review_get_version`
- `app_review_get_field_map`

Do not enable reviewer mutation tools in Phase A. Keep version-review updates, Marketplace status changes, and asset metadata changes out of reviewer discovery.

## 10. Known boundary

This runbook is intentionally Phase A only.

The deployed app-review worker can now resolve reviewer identity from Hub account context, but official review-state writes still require:

- live reviewer trace validation
- approval-gated write posture
- fallback drill evidence
- explicit write enablement signoff

## 11. Rollback

If a reviewer Hub is misconfigured:

1. redeploy the worker
2. rerun normalization
3. rerun verification

If the issue is broader:

- keep the worker deployed
- retain `webflow-app-review-mcp` only
- disable reviewer writes and fall back to full manual Airtable handling
- treat any reviewer-state mutation mismatch as a stop condition

## 12. Exact command set

### 12.1 Configure reviewer mapping on `webflow-app-review-mcp`

First replace the placeholder Airtable collaborator ids in:

- [webflow-app-review-reviewer-directory.example.json](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/docs/examples/webflow-app-review-reviewer-directory.example.json)

Then set the secret on the deployed app-review worker:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-app-review-mcp/worker"

pnpm exec wrangler secret put REVIEWER_DIRECTORY_JSON <<'JSON'
{
  "acct_wf_pablo": {
    "airtableCollaboratorId": "usrngNLDtuR9yYZei",
    "email": "pablo.miranda@webflow.com",
    "name": "Pablo Miranda",
    "lane": "wf-app-review-pablo"
  },
  "acct_wf_shea": {
    "airtableCollaboratorId": "usrEt5sK6Jf0JdLO5",
    "email": "shea.sisco@webflow.com",
    "name": "Shea Sisco",
    "lane": "wf-app-review-shea"
  }
}
JSON
```

If needed, rotate or set the other worker secrets as well:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-app-review-mcp/worker"
pnpm exec wrangler secret put AIRTABLE_API_KEY
pnpm exec wrangler secret put MCP_API_KEY
```

### 12.2 Export hub deploy environment

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"

export HUB_API_TOKEN="replace-with-hub-runtime-token"
export SESSION_TOKEN_FOR_NORMALIZE="replace-with-valid-session-token"
export SESSION_TOKEN_FOR_VERIFY="${SESSION_TOKEN_FOR_NORMALIZE}"
export SESSION_RESOLVE_URL="https://id.createsomething.space/v1/mcp/sessions/resolve"

# Optional rollout tuning
export DISCOVERY_MAX_PROXY_TOOLS="8"
export RATE_LIMIT_MAX_CALLS="120"
export RATE_LIMIT_WINDOW_SECONDS="60"
export QUOTA_MAX_PROXY_CALLS_PER_PERIOD="10000"
```

### 12.3 Deploy the two per-user Hub URLs

Deploy only:

```bash
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh deploy
```

Deploy and normalize:

```bash
SKIP_VERIFY=1 ./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh all
```

Full deploy, normalize, and verify:

```bash
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh all
```

Or step through one phase at a time:

```bash
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh deploy
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh normalize
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh verify
```

### 12.4 Manual verification for hidden write tools

After deploy, verify that reviewer discovery stays read-only:

```bash
curl -sS -X POST "https://wf-app-review-pablo.mcp.createsomething.agency/mcp" \
  -H "Authorization: Bearer ${HUB_API_TOKEN}" \
  -H "X-MCP-Session-Token: ${SESSION_TOKEN_FOR_VERIFY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":"app-review-hidden-writes",
    "method":"tools/call",
    "params":{
      "name":"hub_search_proxy_tools",
      "arguments":{
        "serverName":"webflow-app-review-mcp",
        "query":"update status metadata",
        "limit":20
      }
    }
  }' | jq .
```

Expected:

- read tools are visible
- `app_review_update_version_review` is not visible in Phase A
- `app_review_set_marketplace_status` is not visible in Phase A
- `app_review_update_asset_metadata` is not visible in Phase A
