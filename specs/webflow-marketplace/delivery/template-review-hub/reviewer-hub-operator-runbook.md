# Reviewer Hub Operator Runbook

**Status:** Working draft  
**Audience:** Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-04-14`

## 1. Purpose

This runbook is the production deploy, normalize, and verify path for the six reviewer-specific Webflow template review Hub surfaces.

Production outcome:

- one reviewer-specific Hub surface per reviewer
- `webflow-template-review-mcp` plus `webflow-site-analyzer-mcp`
- compact discovery
- narrow reviewer workflow write lane from `webflow-template-review-mcp`
- read-only analysis evidence from `webflow-site-analyzer-mcp`
- no remote `webflow-local` dependency

## 2. Reviewer Hub set

| Reviewer | Hub slug | Worker name | Domain |
| --- | --- | --- | --- |
| Natalia Ledford | `wf-template-review-natalia` | `cs-hub-wf-template-review-natalia` | `wf-template-review-natalia.mcp.createsomething.agency` |
| Sudiksha Khanduja | `wf-template-review-sudiksha` | `cs-hub-wf-template-review-sudiksha` | `wf-template-review-sudiksha.mcp.createsomething.agency` |
| Eric Unger | `wf-template-review-eric` | `cs-hub-wf-template-review-eric` | `wf-template-review-eric.mcp.createsomething.agency` |
| Vicki Chen | `wf-template-review-vicki` | `cs-hub-wf-template-review-vicki` | `wf-template-review-vicki.mcp.createsomething.agency` |
| Mariana Segura | `wf-template-review-mariana` | `cs-hub-wf-template-review-mariana` | `wf-template-review-mariana.mcp.createsomething.agency` |
| Micah Johnson | `wf-template-review-micah` | `cs-hub-wf-template-review-micah` | `wf-template-review-micah.mcp.createsomething.agency` |

## 3. Repo artifacts

- Discovery pack: `config/mcp-hub/discovery-packs.json`
  - `webflow-marketplace-review`
- Bundle: `config/mcp-hub/registry.json`
  - `webflow-marketplace-review`
- Deploy script:
  - `scripts/cs-hub-webflow-reviewers-deploy.sh`

## 4. Preconditions

Required locally:

- `pnpm`
- `jq`
- `curl`
- Cloudflare access via `wrangler`

Required environment:

- `HUB_API_TOKEN`
- `SESSION_RESOLVE_URL` if not using the script default

Optional environment:

- `SESSION_TOKEN_FOR_NORMALIZE`
- `SESSION_TOKEN_FOR_VERIFY`
- `DISCOVERY_MAX_PROXY_TOOLS`
- `RATE_LIMIT_MAX_CALLS`
- `RATE_LIMIT_WINDOW_SECONDS`
- `QUOTA_MAX_PROXY_CALLS_PER_PERIOD`

Default operator auth model:

- bearer-only using the reviewer-managed `HUB_API_TOKEN`
- optional `X-MCP-Session-Token` override when you intentionally want a separate strict session token

The reviewer lane policy keeps the active bearer unchanged by default. Rotation is explicit, not part of routine MCP updates.

## 5. Deploy all six reviewer Hubs

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-reviewers-deploy.sh deploy
```

This deploys each reviewer worker with:

- `HUB_IDENTITY_MODE=session_required`
- `HUB_ENABLED_SERVERS=webflow-template-review-mcp,webflow-site-analyzer-mcp`
- `HUB_DISABLED_SERVERS=webflow-local`
- `HUB_DISCOVERY_SHARED_PACK=webflow-marketplace-review`
- compact discovery
- production rate-limit and quota defaults

## 6. Normalize state

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-reviewers-deploy.sh normalize
```

This applies:

- `hub_update_state`
  - `setBundles=["webflow-marketplace-review"]`
  - `setServers=["webflow-template-review-mcp","webflow-site-analyzer-mcp"]`
- `hub_set_discovery`
  - `pack="webflow-marketplace-review"`
  - `mode="compact"`
  - `activeServers=["webflow-template-review-mcp","webflow-site-analyzer-mcp"]`
  - `maxProxyTools=30`

## 7. Verify each reviewer Hub

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-reviewers-deploy.sh verify
```

Expected verification posture:

- `/health` returns successfully
- `hub_list_services` shows `webflow-template-review-mcp` and `webflow-site-analyzer-mcp`
- `hub_search_proxy_tools` succeeds for both connected reviewer servers
- `webflow-template-review-mcp__template_review_workflow` is visible to reviewer bearers
- reviewer runtime is compact and reviewer-scoped
- `webflow-local` is no longer enabled in the reviewer runtime

Per-reviewer smoke helpers:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
REVIEWER=mariana ./scripts/webflow-reviewer-demo-verify.sh
REVIEWER=mariana ./scripts/webflow-reviewer-assign-self-smoke.sh
```

## 8. One-command path

If all required environment variables are present:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-reviewers-deploy.sh all
```

## 9. Expected reviewer-visible surface

Reviewer Hubs should expose:

- queue, asset, version, release, and review-context reads from `webflow-template-review-mcp`
- reviewer-safe write verbs from `webflow-template-review-mcp`
- selected read-only analysis tools from `webflow-site-analyzer-mcp`

Do not expose:

- broad template metadata mutation
- approval or publishing completion routes outside the approved reviewer-safe workflow
- raw non-reviewer tool catalogs

## 10. Boundary

`webflow-local` is intentionally excluded from the production reviewer Hub posture because the remote Hub only supports HTTP downstream servers. Do not add it back to reviewer discovery until it has a hosted HTTP surface or is replaced with a supported remote originality service.

## 11. Recovery

If a reviewer Hub is misconfigured:

1. redeploy the worker
2. rerun normalization
3. rerun verification

If the issue is broader:

- keep reviewer-safe writes narrow
- continue using `webflow-template-review-mcp` for official reviewer actions
- use manual handling for broader Marketplace state changes until the failing dependency is repaired
