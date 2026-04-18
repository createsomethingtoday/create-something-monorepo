# Reviewer Hub Phase A Operator Runbook

**Status:** Rollback reference
**Audience:** Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-04-17`

## 1. Purpose

This runbook is the rollback path for restoring the original compact template-review reviewer posture.

Current-live note:

- the live reviewer hubs are no longer in this posture
- production uses direct `webflow-site-analyzer-mcp` visibility
- reviewer lanes remain bearer-based and continue using Infisical-managed bearer tokens
- use this document only when you intentionally need to contract the reviewer surface

## 2. Rollback outcome

Rollback restores:

- one reviewer-specific bearer-based Hub surface per reviewer
- `webflow-template-review-mcp` only
- compact discovery
- analyzer access only through the template-review bridge tools
- narrow reviewer workflow writes without direct analyzer server discovery

## 3. Reviewer Hub set

| Reviewer | Hub slug | Worker name | Domain |
| --- | --- | --- | --- |
| Natalia Ledford | `wf-template-review-natalia` | `cs-hub-wf-template-review-natalia` | `wf-template-review-natalia.mcp.createsomething.agency` |
| Sudiksha Khanduja | `wf-template-review-sudiksha` | `cs-hub-wf-template-review-sudiksha` | `wf-template-review-sudiksha.mcp.createsomething.agency` |
| Eric Unger | `wf-template-review-eric` | `cs-hub-wf-template-review-eric` | `wf-template-review-eric.mcp.createsomething.agency` |
| Vicki Chen | `wf-template-review-vicki` | `cs-hub-wf-template-review-vicki` | `wf-template-review-vicki.mcp.createsomething.agency` |
| Mariana Segura | `wf-template-review-mariana` | `cs-hub-wf-template-review-mariana` | `wf-template-review-mariana.mcp.createsomething.agency` |
| Micah Johnson | `wf-template-review-micah` | `cs-hub-wf-template-review-micah` | `wf-template-review-micah.mcp.createsomething.agency` |

## 4. Preconditions

Required locally:

- `pnpm`
- `jq`
- `curl`
- Cloudflare access via `wrangler`

Required auth and config:

- reviewer-scoped `CS_HUB_WF_TEMPLATE_REVIEW_<REVIEWER>_API_TOKEN` secrets in Infisical
- `SESSION_RESOLVE_URL` if not using the default in the script
- `REVIEWER_DIRECTORY_JSON` already configured on the upstream `webflow-template-review-mcp` worker

Optional environment:

- `SKIP_MISSING_REVIEWER_SECRETS=true`
- `SESSION_TOKEN_FOR_NORMALIZE`
- `SESSION_TOKEN_FOR_VERIFY`

## 5. Deploy rollback posture

```bash
cd "/Users/micahjohnson/Code/worktrees/agent-sdk-16q"
BUNDLE_NAME=webflow-marketplace-review-phase-a \
DISCOVERY_PACK=webflow-marketplace-review-phase-a \
ENABLED_SERVERS=webflow-template-review-mcp \
DISABLED_SERVERS=webflow-site-analyzer-mcp \
DISCOVERY_ACTIVE_SERVERS=webflow-template-review-mcp \
DISCOVERY_MAX_PROXY_TOOLS=22 \
SKIP_MISSING_REVIEWER_SECRETS=true \
./scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh deploy
```

This keeps:

- `HUB_IDENTITY_MODE=compat`
- bearer-only reviewer auth
- OAuth discovery disabled on reviewer domains
- the original compact rollback discovery pack

## 6. Normalize rollback state

```bash
cd "/Users/micahjohnson/Code/worktrees/agent-sdk-16q"
BUNDLE_NAME=webflow-marketplace-review-phase-a \
DISCOVERY_PACK=webflow-marketplace-review-phase-a \
ENABLED_SERVERS=webflow-template-review-mcp \
DISABLED_SERVERS=webflow-site-analyzer-mcp \
DISCOVERY_ACTIVE_SERVERS=webflow-template-review-mcp \
DISCOVERY_MAX_PROXY_TOOLS=22 \
SKIP_MISSING_REVIEWER_SECRETS=true \
./scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh normalize
```

## 7. Verify rollback posture

```bash
cd "/Users/micahjohnson/Code/worktrees/agent-sdk-16q"
BUNDLE_NAME=webflow-marketplace-review-phase-a \
DISCOVERY_PACK=webflow-marketplace-review-phase-a \
ENABLED_SERVERS=webflow-template-review-mcp \
DISABLED_SERVERS=webflow-site-analyzer-mcp \
DISCOVERY_ACTIVE_SERVERS=webflow-template-review-mcp \
DISCOVERY_MAX_PROXY_TOOLS=22 \
SKIP_MISSING_REVIEWER_SECRETS=true \
./scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh verify
```

Expected rollback verification posture:

- `/health` returns successfully
- `oauth_discovery_enabled` remains `false`
- `hub_list_services` shows `webflow-template-review-mcp`
- `hub_search_proxy_tools` succeeds for `webflow-template-review-mcp`
- direct `webflow-site-analyzer-mcp` visibility is absent

Micah reviewer smoke helper:

```bash
cd "/Users/micahjohnson/Code/worktrees/agent-sdk-16q"
REVIEWER=micah \
EXPECT_DIRECT_ANALYZER_SERVER=false \
./scripts/webflow-reviewer-demo-verify.sh
```

## 8. One-command rollback path

```bash
cd "/Users/micahjohnson/Code/worktrees/agent-sdk-16q"
BUNDLE_NAME=webflow-marketplace-review-phase-a \
DISCOVERY_PACK=webflow-marketplace-review-phase-a \
ENABLED_SERVERS=webflow-template-review-mcp \
DISABLED_SERVERS=webflow-site-analyzer-mcp \
DISCOVERY_ACTIVE_SERVERS=webflow-template-review-mcp \
DISCOVERY_MAX_PROXY_TOOLS=22 \
SKIP_MISSING_REVIEWER_SECRETS=true \
./scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh all
```

## 9. Rollback-visible surface

Rollback should expose:

- the template-review reviewer workflow surface
- the analyzer bridge tools on `webflow-template-review-mcp`
- no direct `webflow-site-analyzer-mcp` discovery
- no `webflow-local` discovery

Keep broad reviewer mutation tools hidden:

- `template_review_update_asset_metadata`
- `template_review_update_asset_publishing`
- `template_review_update_version_review`

## 10. Roll forward

When the incident is resolved, return to the production posture by running the same script with its defaults. Do not leave a reviewer lane half-switched between rollback discovery and production bundle state.
