# Reviewer Hub Runtime Posture

**Status:** Live production posture
**Audience:** Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-04-17`

## 1. Purpose

This document defines the exact live posture for the six reviewer-specific template-review Hub surfaces and the rollback posture to use if production needs to contract.

It answers:

- which downstream servers are part of the live reviewer lane
- which discovery settings are authoritative
- how bearer-based reviewer auth works
- what the rollback posture is

## 2. Important current-state note

As of `2026-04-17`, the live template-review reviewer posture is:

- one reviewer-specific custom-domain Hub per reviewer
- bearer-based auth using reviewer-specific Infisical-managed tokens
- `compat` identity mode so the same bearer token can gate Hub access and resolve reviewer identity
- OAuth discovery disabled on reviewer custom domains
- direct `webflow-site-analyzer-mcp` visibility enabled in reviewer discovery
- `webflow-local` excluded from the reviewer surface

That means the production reviewer lane is no longer the old bridge-only Phase A posture. The rollback posture still exists, but it is not the live default.

## 3. Reviewer Hub identities

Use one reviewer-specific Hub surface or account-scoped Hub posture per reviewer:

| Reviewer | Email | Hub slug |
| --- | --- | --- |
| Natalia Ledford | `natalia.ledford@webflow.com` | `wf-template-review-natalia` |
| Sudiksha Khanduja | `sudiksha.khanduja@webflow.com` | `wf-template-review-sudiksha` |
| Eric Unger | `eric.unger@webflow.com` | `wf-template-review-eric` |
| Vicki Chen | `vicki.chen@webflow.com` | `wf-template-review-vicki` |
| Mariana Segura | `mariana.segura@webflow.com` | `wf-template-review-mariana` |
| Micah Johnson | `micah@webflow.com` | `wf-template-review-micah` |

If these are implemented as separate custom-domain Hubs, keep the same posture across all six. If they are implemented as one remote runtime with per-account state, persist discovery preferences separately per reviewer account.

## 4. Current production reviewer posture

### Active servers

- `webflow-template-review-mcp`
- `webflow-site-analyzer-mcp`

### Discovery mode

- `mode`: `compact`
- `activeServers`: `["webflow-template-review-mcp", "webflow-site-analyzer-mcp"]`
- `maxProxyTools`: `30`

### Reviewer-visible surface

The guaranteed reviewer workflow surface remains the template-review MCP:

- `webflow-template-review-mcp__template_review_health`
- `webflow-template-review-mcp__template_review_get_metrics`
- `webflow-template-review-mcp__template_review_list_queue`
- `webflow-template-review-mcp__template_review_my_queue`
- `webflow-template-review-mcp__template_review_search_assets`
- `webflow-template-review-mcp__template_review_search_versions`
- `webflow-template-review-mcp__template_review_get_asset`
- `webflow-template-review-mcp__template_review_list_versions`
- `webflow-template-review-mcp__template_review_get_version`
- `webflow-template-review-mcp__template_review_get_review_context`
- `webflow-template-review-mcp__template_review_enqueue_analyzer_review`
- `webflow-template-review-mcp__template_review_get_analyzer_review`
- `webflow-template-review-mcp__template_review_list_analyzer_reviews`
- `webflow-template-review-mcp__template_review_list_releases`
- `webflow-template-review-mcp__template_review_get_field_map`
- `webflow-template-review-mcp__template_review_assign_reviewer`
- `webflow-template-review-mcp__template_review_assign_self`
- `webflow-template-review-mcp__template_review_unassign_self`
- `webflow-template-review-mcp__template_review_request_changes`
- `webflow-template-review-mcp__template_review_set_review_status`
- `webflow-template-review-mcp__template_review_save_draft_feedback`

In addition, direct `webflow-site-analyzer-mcp` visibility is intentionally enabled for reviewer lanes. The analyzer bridge tools remain part of the preferred guided workflow, but they are no longer the only analyzer entry point.

`webflow-local` is not part of reviewer discovery and should not appear in the production reviewer pack.

### Reviewer action

The live reviewer lane supports:

- reviewer queue/context reads
- self-assignment and reviewer assignment
- bounded draft feedback and review-status writes
- analyzer jobs through both the template-review bridge tools and direct analyzer visibility

Broader template-review mutation routes remain hidden from reviewer discovery.

## 5. Rollback posture

Use this only when production needs to contract back to the original compact reviewer surface.

### Active servers

- `webflow-template-review-mcp`

### Discovery mode

- `mode`: `compact`
- `activeServers`: `["webflow-template-review-mcp"]`
- `maxProxyTools`: `22`

### Rollback reviewer-visible surface

Rollback keeps the template-review reviewer workflow surface, including the analyzer bridge tools, but removes direct `webflow-site-analyzer-mcp` visibility.

## 6. Discovery posture

Current production discovery posture:

```json
{
  "mode": "compact",
  "activeServers": [
    "webflow-template-review-mcp",
    "webflow-site-analyzer-mcp"
  ],
  "maxProxyTools": 30
}
```

Rollback discovery posture:

```json
{
  "mode": "compact",
  "activeServers": ["webflow-template-review-mcp"],
  "maxProxyTools": 22
}
```

## 7. Auth posture

Use this reviewer auth posture:

- reviewer-specific bearer tokens stored in Infisical as `CS_HUB_WF_TEMPLATE_REVIEW_<REVIEWER>_API_TOKEN`
- `compat` identity mode on the Hub runtime
- no reviewer OAuth discovery endpoints on the reviewer domains
- plain bearer challenge on unauthorized MCP requests

If a reviewer domain starts returning OAuth discovery metadata again, treat that as a regression and redeploy the Hub runtime before continuing.

## 8. Policy posture

Enforce all of the following:

- reviewer sessions may discover only the current reviewer lane servers
- broad template-review mutation routes stay hidden from reviewer discovery
- reviewer-safe write routes fail closed on reviewer ownership mismatch
- control-plane and destructive routes remain blocked or review-only
- `webflow-local` remains excluded from reviewer discovery

## 9. Rate-limit and quota posture

Keep these enabled in production:

- rate limits: enabled
- quotas: enabled
- scope: `account`

Recommended operating posture:

- modest per-account rate limits for reviewer lanes
- modest monthly per-account quota for reviewer lanes
- no exemptions for reviewer write paths

## 10. Verification checklist

For each reviewer Hub, confirm:

- `/health` returns successfully
- `/health` reports `oauth_discovery_enabled: false`
- `/.well-known/oauth-authorization-server` returns `404`
- unauthorized `POST /mcp` returns `WWW-Authenticate: Bearer realm="create-something-hub"` without OAuth resource metadata
- `hub_list_services` shows `webflow-template-review-mcp`
- `hub_list_services` shows `webflow-site-analyzer-mcp`
- `hub_search_proxy_tools` succeeds for both active servers
- bearer tokens loaded from Infisical still authenticate successfully

## 11. Stop conditions

Revert a reviewer Hub to rollback posture immediately if:

- actor context is missing or inconsistent
- OAuth discovery reappears on a reviewer domain
- `webflow-local` appears in reviewer discovery
- analyzer visibility disappears unexpectedly from the production pack
- traces do not identify the reviewer cleanly
- write behavior is ambiguous

If more than one reviewer Hub hits the same issue, revert all six to the rollback pack and triage centrally.
