# Operator Handoff

**Status:** Live in production  
**Audience:** Hub operators, Marketplace review lead, Senior Systems Architect  
**Workflow:** `app_review_hub_lane`  
**Date:** `2026-03-13`

## 1. Outcome

The repository and live reviewer hubs are now aligned to the current production app-review posture for the two-user reviewer lane.

Current live posture:

- one reviewer-specific Hub surface per reviewer
- `webflow-app-review-mcp` only
- full discovery over the downstream app-review server
- all 18 downstream app-review tools visible
- reviewer-owned write actions enabled
- rate limits and quotas enabled

Compatibility note:

- the currently deployed Hub runtime still reports `webflow-marketplace-app-review-phase-a` as the enabled bundle
- discovery is what currently governs the live production surface
- this handoff therefore treats Phase A as the rollback bundle and full discovery as the active production setting

## 2. Reviewer set

| Reviewer | Email | Account ID | Hub slug |
| --- | --- | --- | --- |
| Pablo Miranda | `pablo.miranda@webflow.com` | `acct_wf_pablo` | `wf-app-review-pablo` |
| Shea Sisco | `shea.sisco@webflow.com` | `acct_wf_shea` | `wf-app-review-shea` |

Shared tenant:

- `tenant_webflow_marketplace`

## 3. Repo artifacts

Identity and provisioning:

- [webflow-app-review-user-seed.csv](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/examples/webflow-app-review-user-seed.csv)
- [WEBFLOW_APP_REVIEW_AUTH0_PROVISIONING_CHECKLIST.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/WEBFLOW_APP_REVIEW_AUTH0_PROVISIONING_CHECKLIST.md)
- [auth0-reviewer-user-manifest.json](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/specs/webflow-marketplace/delivery/app-review-hub/auth0-reviewer-user-manifest.json)

Rollout and operations:

- [reviewer-hub-rollout-spec.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/specs/webflow-marketplace/delivery/app-review-hub/reviewer-hub-rollout-spec.md)
- [reviewer-hub-runtime-posture.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/specs/webflow-marketplace/delivery/app-review-hub/reviewer-hub-runtime-posture.md)
- [reviewer-hub-policy-records.yaml](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/specs/webflow-marketplace/delivery/app-review-hub/reviewer-hub-policy-records.yaml)
- [reviewer-hub-implementation-checklist.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/specs/webflow-marketplace/delivery/app-review-hub/reviewer-hub-implementation-checklist.md)
- [reviewer-hub-phase-a-operator-runbook.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/specs/webflow-marketplace/delivery/app-review-hub/reviewer-hub-phase-a-operator-runbook.md)
- [reviewer-playbook.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/specs/webflow-marketplace/delivery/app-review-hub/reviewer-playbook.md)
- [runbook.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/specs/webflow-marketplace/delivery/app-review-hub/runbook.md)

Field confirmation:

- [confirmed-field-inventory.md](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/specs/webflow-marketplace/delivery/app-review-hub/confirmed-field-inventory.md)

## 4. Code readiness

The app-review MCP now supports reviewer identity resolution via account-scoped mapping:

- [reviewer-directory.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/webflow-app-review-mcp/src/reviewer-directory.ts)
- [worker/index.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/webflow-app-review-mcp/worker/index.ts)
- [index.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/webflow-app-review-mcp/src/index.ts)

The MCP now exposes the full reviewer workflow and broader app-review routes used in production:

- `app_review_my_queue`
- `app_review_get_review_context`
- `app_review_assign_self`
- `app_review_unassign_self`
- `app_review_save_draft_feedback`
- `app_review_set_review_status`
- `app_review_request_changes`
- `app_review_approve_version`
- `app_review_reject_version`
- `app_review_update_version_review`
- `app_review_update_asset_metadata`
- `app_review_set_marketplace_status`

Implementation:

- [tools.ts](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/webflow-app-review-mcp/src/tools.ts)

Verification completed:

- package tests passed
- package typecheck passed

## 5. Reviewer directory payload

Reference template:

- [webflow-app-review-reviewer-directory.example.json](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/docs/examples/webflow-app-review-reviewer-directory.example.json)

Current payload:

```json
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
```

Set it on the deployed upstream worker:

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

If needed, also ensure:

```bash
pnpm exec wrangler secret put AIRTABLE_API_KEY
pnpm exec wrangler secret put MCP_API_KEY
```

## 6. Production rollout commands

Primary deploy script:

- [cs-hub-webflow-app-reviewers-phase-a-deploy.sh](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh)

Export environment:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"

export CS_HUB_WF_APP_REVIEW_PABLO_API_TOKEN="replace-with-pablo-hub-token"
export CS_HUB_WF_APP_REVIEW_SHEA_API_TOKEN="replace-with-shea-hub-token"
export SESSION_RESOLVE_URL="https://id.createsomething.space/v1/mcp/sessions/resolve"
export HUB_ENABLED_BUNDLE="webflow-marketplace-app-review-phase-a"
export DISCOVERY_MODE="full"
export DISCOVERY_MAX_PROXY_TOOLS="18"
export RATE_LIMIT_MAX_CALLS="120"
export RATE_LIMIT_WINDOW_SECONDS="60"
export QUOTA_MAX_PROXY_CALLS_PER_PERIOD="10000"
```

Run rollout:

```bash
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh deploy
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh normalize
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh verify
```

Or:

```bash
./scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh all
```

The compatibility bundle remains `webflow-marketplace-app-review-phase-a` until the Hub runtime is redeployed with explicit bundle awareness for the full app-review production pack. The live reviewer surface is driven by the full discovery setting above.

## 7. Expected current production surface

Visible reviewer tools:

- `app_review_health`
- `app_review_list_queue`
- `app_review_get_asset`
- `app_review_list_versions`
- `app_review_get_version`
- `app_review_get_field_map`
- `app_review_my_queue`
- `app_review_get_review_context`
- `app_review_assign_self`
- `app_review_unassign_self`
- `app_review_save_draft_feedback`
- `app_review_set_review_status`
- `app_review_request_changes`
- `app_review_approve_version`
- `app_review_reject_version`
- `app_review_update_version_review`
- `app_review_update_asset_metadata`
- `app_review_set_marketplace_status`

## 8. Write smoke helper

Reserved smoke script:

- [webflow-app-review-phase-b-smoke.sh](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/scripts/webflow-app-review-phase-b-smoke.sh)

Use it for controlled verification on a noncritical version record with a planned rollback path.

Supported actions:

- `assign_self`
- `unassign_self`
- `save_draft_feedback`
- `set_review_status`
- `request_changes`
- `approve`
- `reject`

## 9. Remaining live work

The only remaining operational cleanup is to redeploy the Hub runtime with explicit awareness of the `webflow-marketplace-app-review-phase-b` bundle name so bundle state and discovery state match. Until then, do not rerun legacy Phase A normalization values.

## 10. Final status

The two-user app-review reviewer lane is live in production write posture. Pablo and Shea both have the full downstream app-review tool surface through their reviewer-specific Hub URLs.
