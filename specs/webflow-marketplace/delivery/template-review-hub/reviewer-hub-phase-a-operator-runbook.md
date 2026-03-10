# Reviewer Hub Phase A Operator Runbook

**Status:** Working draft  
**Audience:** Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-03-10`

## 1. Purpose

This runbook is the operational implementation path for the five reviewer-specific Hub surfaces in Phase A.

Phase A outcome:

- one reviewer-specific Hub surface per reviewer
- `webflow-template-review-mcp` only
- compact discovery
- read-only evidence lane
- manual Airtable fallback for official review-state changes

## 2. Reviewer Hub set

| Reviewer | Hub slug | Worker name | Domain |
| --- | --- | --- | --- |
| Natalia Ledford | `wf-template-review-natalia` | `cs-hub-wf-template-review-natalia` | `wf-template-review-natalia.mcp.createsomething.agency` |
| Sudiksha Khanduja | `wf-template-review-sudiksha` | `cs-hub-wf-template-review-sudiksha` | `wf-template-review-sudiksha.mcp.createsomething.agency` |
| Eric Unger | `wf-template-review-eric` | `cs-hub-wf-template-review-eric` | `wf-template-review-eric.mcp.createsomething.agency` |
| Vicki Chen | `wf-template-review-vicki` | `cs-hub-wf-template-review-vicki` | `wf-template-review-vicki.mcp.createsomething.agency` |
| Mariana Segura | `wf-template-review-mariana` | `cs-hub-wf-template-review-mariana` | `wf-template-review-mariana.mcp.createsomething.agency` |

## 3. Repo artifacts created for this rollout

- Discovery pack: `config/mcp-hub/discovery-packs.json`
  - `webflow-marketplace-review-phase-a`
- Bundle: `config/mcp-hub/registry.json`
  - `webflow-marketplace-review-phase-a`
- Deploy script:
  - `scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh`

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

## 5. Deploy all five reviewer Hubs

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh deploy
```

This deploys each reviewer worker with:

- `HUB_IDENTITY_MODE=session_required`
- `HUB_ENABLED_SERVERS=webflow-template-review-mcp`
- `HUB_DISCOVERY_SHARED_PACK=webflow-marketplace-review-phase-a`
- compact discovery
- Phase A rate-limit and quota defaults

## 6. Normalize state

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh normalize
```

This applies:

- `hub_update_state`
  - `setBundles=["webflow-marketplace-review-phase-a"]`
  - `setServers=["webflow-template-review-mcp"]`
- `hub_set_discovery`
  - `pack="webflow-marketplace-review-phase-a"`
  - `mode="compact"`
  - `activeServers=["webflow-template-review-mcp"]`
  - `maxProxyTools=12`

## 7. Verify each reviewer Hub

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh verify
```

Expected verification posture:

- `/health` returns successfully
- `hub_list_services` shows `webflow-template-review-mcp`
- `hub_search_proxy_tools` for `webflow-template-review-mcp` succeeds
- reviewer runtime is compact and reviewer-scoped

## 8. One-command path

If all required environment variables are present:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh all
```

## 9. Expected reviewer-visible surface

Phase A reviewer Hubs should expose only template-review-context tools:

- `template_review_health`
- `template_review_list_queue`
- `template_review_search_assets`
- `template_review_search_versions`
- `template_review_get_asset`
- `template_review_list_versions`
- `template_review_get_version`
- `template_review_list_releases`
- `template_review_get_field_map`

Do not enable reviewer write tools in Phase A.

## 10. Known boundary

This runbook does not create a full analysis lane because the live remote Hub does not currently have:

- `webflow-site-analyzer-mcp`
- `webflow-local`

Those remain Phase B prerequisites.

## 11. Rollback

If a reviewer Hub is misconfigured:

1. redeploy the worker
2. rerun normalization
3. rerun verification

If the issue is broader:

- keep the worker deployed
- retain `webflow-template-review-mcp` only
- keep reviewer access read-only
- move any official state change back to Airtable manual handling
