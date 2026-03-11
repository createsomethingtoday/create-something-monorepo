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
- replace `usr_replace_pablo` and `usr_replace_shea` with the real Airtable collaborator ids before deploy

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
