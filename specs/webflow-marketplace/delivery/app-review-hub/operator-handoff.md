# Operator Handoff

**Status:** Ready for operator execution  
**Audience:** Hub operators, Marketplace review lead, Senior Systems Architect  
**Workflow:** `app_review_hub_lane`  
**Date:** `2026-03-11`

## 1. Outcome

The repository is now prepared for the two-user Phase A rollout of the Webflow Marketplace app-review Hub lane.

Phase A target posture:

- one reviewer-specific Hub surface per reviewer
- `webflow-app-review-mcp` only
- compact discovery
- read-only evidence lane
- manual Airtable fallback for official review-state changes

This is a rollout-ready repo state, not a claim that the live reviewer hubs have already been enabled.

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

The MCP now exposes narrow reviewer-safe decision verbs for later gated rollout:

- `app_review_request_changes`
- `app_review_approve_version`
- `app_review_reject_version`

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

## 6. Phase A rollout commands

Primary deploy script:

- [cs-hub-webflow-app-reviewers-phase-a-deploy.sh](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/scripts/cs-hub-webflow-app-reviewers-phase-a-deploy.sh)

Export environment:

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"

export HUB_API_TOKEN="replace-with-hub-runtime-token"
export SESSION_TOKEN_FOR_NORMALIZE="replace-with-valid-session-token"
export SESSION_TOKEN_FOR_VERIFY="${SESSION_TOKEN_FOR_NORMALIZE}"
export SESSION_RESOLVE_URL="https://id.createsomething.space/v1/mcp/sessions/resolve"
export DISCOVERY_MAX_PROXY_TOOLS="8"
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

## 7. Expected Phase A surface

Visible reviewer tools:

- `app_review_health`
- `app_review_list_queue`
- `app_review_get_asset`
- `app_review_list_versions`
- `app_review_get_version`
- `app_review_get_field_map`

Hidden reviewer tools:

- `app_review_update_version_review`
- `app_review_set_marketplace_status`
- `app_review_update_asset_metadata`
- `app_review_request_changes`
- `app_review_approve_version`
- `app_review_reject_version`

## 8. Future Phase B smoke

Reserved smoke script:

- [webflow-app-review-phase-b-smoke.sh](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/scripts/webflow-app-review-phase-b-smoke.sh)

Use only after explicit Phase B approval, on a noncritical version record with a planned rollback path.

Supported actions:

- `request_changes`
- `approve`
- `reject`

## 9. Remaining live work

The remaining work is operational, not repo scaffolding:

1. seed `.agency`
2. create Auth0 users
3. set `REVIEWER_DIRECTORY_JSON` on the deployed worker
4. deploy and normalize the two reviewer Hub surfaces
5. verify Phase A read-only discovery
6. keep all state changes manual in Airtable during Phase A
7. only after signoff, run a Phase B smoke for one narrow reviewer decision verb

## 10. Final status

The repo is ready for operator execution of the two-user Phase A app-review rollout.

The live environment should still be treated as not yet production-write-enabled until:

- reviewer attribution is proven in live traces
- approval-gated authz is confirmed
- fallback drills are rehearsed
- Marketplace review lead and Senior Systems Architect sign off
