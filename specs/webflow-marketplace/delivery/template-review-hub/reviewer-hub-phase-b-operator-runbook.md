# Reviewer Hub Phase B Operator Runbook

**Status:** Working draft  
**Audience:** Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-04-21`

## 1. Purpose

This runbook is the operational implementation path for the six reviewer-specific Hub surfaces now that the template review rollout has passed Phase A.

Phase B outcome:

- one reviewer-specific Hub surface per reviewer
- `webflow-template-review-mcp` and `webflow-site-analyzer-mcp` enabled by default
- remote-only downstream posture; `webflow-local` is not part of the reviewer baseline
- full discovery so reviewers receive the complete toolkit instead of a narrow capped subset
- reviewer playbook and price-update workflows available by default, including the Set Price -> Admin `mrp_id` handoff

## 2. Reviewer Hub set

| Reviewer | Hub slug | Worker name | Domain |
| --- | --- | --- | --- |
| Natalia Ledford | `wf-template-review-natalia` | `cs-hub-wf-template-review-natalia` | `wf-template-review-natalia.mcp.createsomething.agency` |
| Sudiksha Khanduja | `wf-template-review-sudiksha` | `cs-hub-wf-template-review-sudiksha` | `wf-template-review-sudiksha.mcp.createsomething.agency` |
| Eric Unger | `wf-template-review-eric` | `cs-hub-wf-template-review-eric` | `wf-template-review-eric.mcp.createsomething.agency` |
| Vicki Chen | `wf-template-review-vicki` | `cs-hub-wf-template-review-vicki` | `wf-template-review-vicki.mcp.createsomething.agency` |
| Mariana Segura | `wf-template-review-mariana` | `cs-hub-wf-template-review-mariana` | `wf-template-review-mariana.mcp.createsomething.agency` |
| Micah Johnson | `wf-template-review-micah` | `cs-hub-wf-template-review-micah` | `wf-template-review-micah.mcp.createsomething.agency` |

## 3. Repo artifacts for Phase B

- Discovery pack: `config/mcp-hub/discovery-packs.json`
  - `webflow-marketplace-review-phase-b`
- Bundle: `config/mcp-hub/registry.json`
  - `webflow-marketplace-review-phase-b`
- Deploy wrapper:
  - `scripts/cs-hub-webflow-reviewers-phase-b-deploy.sh`
- Live verifier:
  - `scripts/webflow-reviewer-demo-verify.sh`

## 4. Preconditions

Required locally:

- `pnpm`
- `jq`
- `curl`
- `infisical`
- Cloudflare access via `wrangler`

Required environment:

- reviewer lane gateway tokens available in env or via Infisical:
  - `CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN`
  - `CS_HUB_WF_TEMPLATE_REVIEW_SUDIKSHA_API_TOKEN`
  - `CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN`
  - `CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN`
  - `CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN`
  - `CS_HUB_WF_TEMPLATE_REVIEW_MICAH_API_TOKEN`

Optional environment:

- `SESSION_TOKEN_FOR_NORMALIZE`
- `SESSION_TOKEN_FOR_VERIFY`
- only required if you intentionally override `REVIEWER_IDENTITY_MODE=session_required`

Required reviewer mapping input for `webflow-template-review-mcp`:

- deployed worker `REVIEWER_DIRECTORY_JSON` must include every reviewer lane
- the live reviewer Airtable collaborator mapping must already be present in the template-review worker secrets

## 5. Deploy all six reviewer Hubs

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-reviewers-phase-b-deploy.sh deploy
```

This deploys each reviewer worker with:

- `HUB_IDENTITY_MODE=compat`
- `HUB_ENABLED_BUNDLES=webflow-marketplace-review-phase-b`
- `HUB_ENABLED_SERVERS=webflow-template-review-mcp,webflow-site-analyzer-mcp`
- `HUB_DISCOVERY_SHARED_PACK=webflow-marketplace-review-phase-b`
- `HUB_DISCOVERY_MODE=full`
- `HUB_DISCOVERY_MAX_PROXY_TOOLS=0` (normalized to no cap)

## 6. Normalize state

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-reviewers-phase-b-deploy.sh normalize
```

This applies:

- `hub_update_state`
  - `setBundles=["webflow-marketplace-review-phase-b"]`
  - `setServers=["webflow-template-review-mcp","webflow-site-analyzer-mcp"]`
- `hub_set_discovery`
  - `pack="webflow-marketplace-review-phase-b"`
  - `mode="full"`
  - `activeServers=["webflow-template-review-mcp","webflow-site-analyzer-mcp"]`
  - `maxProxyTools=null`

## 7. Verify each reviewer Hub

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
./scripts/cs-hub-webflow-reviewers-phase-b-deploy.sh verify
```

Expected verification posture:

- `/health` returns successfully
- `hub_list_services` shows:
  - `webflow-template-review-mcp`
  - `webflow-site-analyzer-mcp`
- the reviewer lane discovery mode is `full`
- `template_review_workflow`, `template_review_set_price`, and `template_review_bulk_set_price` are visible by default

Reviewer demo verifier:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
REVIEWER=micah ./scripts/webflow-reviewer-demo-verify.sh
```

This helper now fails closed if the Phase B reviewer lane is missing either required remote service or the price-update workflow tools.

## 8. Expected reviewer-visible surface

Phase B reviewer Hubs should expose the complete remote reviewer toolkit:

- full `webflow-template-review-mcp` tool surface
- full `webflow-site-analyzer-mcp` tool surface
- remote analyzer evidence via `webflow-site-analyzer-mcp`; do not rely on `webflow-local` in the reviewer baseline

Operationally important reviewer flows that must remain visible:

- `template_review_workflow`
- `template_review_get_review_context`
- `template_review_set_price`
- `template_review_bulk_set_price`

Price changes must return the Admin handoff context:

- single-template flow: `publishing_context.mrp_id`
- batch flow: `admin_handoff[].mrp_id`

## 9. Rollback

If the Phase B reviewer lane is misconfigured:

1. redeploy the reviewer hubs
2. rerun Phase B normalization
3. rerun reviewer verification

If containment is required:

- switch the lane back to the legacy Phase A reviewer pack
- retain price changes as manual Airtable/Admin handling only if the Hub price flow is impaired
- keep all broader reviewer actions manual until the full toolkit is healthy again
