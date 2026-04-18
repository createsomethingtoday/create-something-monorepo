# Reviewer Hub Runtime Posture

**Status:** Active guidance  
**Audience:** Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-04-18`

## 1. Purpose

This document defines the current production posture for the reviewer-specific Webflow Template Review Hub lanes.

Use it to answer:

- which downstream servers must be enabled for reviewer work
- how compact discovery should be shaped
- which reviewer tools must stay visible
- which write routes remain reviewer-safe versus operator-only

Historical March 2026 Phase A rollout notes are archival only. They are not the current reviewer posture.

## 2. Current production posture

Reviewer lanes are analyzer-backed.

Required reviewer servers:

- `webflow-template-review-mcp`
- `webflow-site-analyzer-mcp`

Optional reviewer server:

- `webflow-local`

Key operational rules:

- Do not treat a "Phase A-only" posture as the default reviewer lane.
- `webflow-local` may be absent without blocking the primary reviewer analysis flow.
- Compact discovery must preserve the configured `activeServers` order so reviewer workflow tools stay ahead of raw analyzer catalogs when a max-tool cap is applied.
- Missing `template_review_assign_self` or missing analyzer wrapper tools in reviewer discovery is a runtime/discovery bug, not a reviewer behavior problem.

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

## 4. Reviewer discovery posture

### Active servers

- `webflow-template-review-mcp`
- `webflow-site-analyzer-mcp`
- `webflow-local` if available

### Discovery mode

- `mode`: `compact`
- `activeServers`: `["webflow-template-review-mcp", "webflow-site-analyzer-mcp", "webflow-local"]`
- `maxProxyTools`: `30`

### Reviewer-visible tool target

The primary reviewer workflow must keep these tools visible:

- `webflow-template-review-mcp__template_review_list_queue`
- `webflow-template-review-mcp__template_review_my_queue`
- `webflow-template-review-mcp__template_review_get_review_context`
- `webflow-template-review-mcp__template_review_enqueue_analyzer_review`
- `webflow-template-review-mcp__template_review_get_analyzer_review`
- `webflow-template-review-mcp__template_review_list_analyzer_reviews`
- `webflow-template-review-mcp__template_review_assign_self`
- `webflow-template-review-mcp__template_review_unassign_self`
- `webflow-template-review-mcp__template_review_request_changes`
- `webflow-template-review-mcp__template_review_set_review_status`
- `webflow-template-review-mcp__template_review_save_draft_feedback`

These tools are also useful for reviewer navigation and should remain available when space allows:

- `webflow-template-review-mcp__template_review_health`
- `webflow-template-review-mcp__template_review_get_metrics`
- `webflow-template-review-mcp__template_review_search_assets`
- `webflow-template-review-mcp__template_review_search_versions`
- `webflow-template-review-mcp__template_review_get_asset`
- `webflow-template-review-mcp__template_review_list_versions`
- `webflow-template-review-mcp__template_review_get_version`
- `webflow-template-review-mcp__template_review_list_releases`
- `webflow-template-review-mcp__template_review_get_field_map`

Direct analyzer diagnostics such as `webflow-site-analyzer-mcp__get_provider_status` or `webflow-site-analyzer-mcp__get_template_review_job` are optional. The reviewer-safe default lane should use the `template_review_*_analyzer_review` wrappers.

## 5. Reviewer write posture

Reviewer-safe writes:

- `webflow-template-review-mcp__template_review_assign_self`
- `webflow-template-review-mcp__template_review_unassign_self`
- `webflow-template-review-mcp__template_review_request_changes`
- `webflow-template-review-mcp__template_review_set_review_status`
- `webflow-template-review-mcp__template_review_save_draft_feedback`

Rules:

- self-assignment is required before reviewer-safe writes
- reviewer-safe writes must fail closed when the version is not assigned to the current reviewer
- direct use of broad mutation tools remains operator-only unless explicitly approved later

Broader decision and publishing actions remain separately gated:

- `webflow-template-review-mcp__template_review_approve_version`
- `webflow-template-review-mcp__template_review_reject_version`
- `webflow-template-review-mcp__template_review_complete_publishing`

Do not expose or normalize reviewer workflows around:

- `webflow-template-review-mcp__template_review_update_asset_metadata`
- `webflow-template-review-mcp__template_review_update_asset_publishing`
- `webflow-template-review-mcp__template_review_update_version_review`

For host integrations and smoke checks, note the read envelope for reviewer context:

- `template_review_get_review_context` returns the normalized payload under `data.context`
- `currentReviewer`, `reviewOwner`, and `isAssignedToCurrentReviewer` are fields on `data.context`, not top-level `data`
- repeatable bearer-token validation is scripted in `scripts/webflow-reviewer-assign-self-smoke.sh`

### Trace requirements for reviewer writes

Every reviewer write route should emit and preserve:

- `correlation_id`
- `workflow_id`
- `tool_name`
- `asset_id`
- `version_id`
- `reviewer_account_id`
- `reviewer_airtable_collaborator_id`
- `review_owner_before`
- `review_owner_after`
- `review_status_before`
- `review_status_after`
- `matched_policy_class`
- `request_id`

Treat missing reviewer attribution or missing before/after state as a rollout blocker for expanded writes.

## 6. Operational checks

Verify every reviewer lane with:

- `hub_status`
- `hub_list_services`
- `hub_search_proxy_tools` for:
  - `webflow-template-review-mcp`
  - `webflow-site-analyzer-mcp`

Treat any of the following as discovery regressions that must be fixed before asking reviewers to proceed:

- `template_review_assign_self` missing from the visible reviewer catalog
- analyzer wrapper tools missing from the visible reviewer catalog
- compact discovery surfacing raw analyzer tools while truncating reviewer workflow tools

## 7. Stop conditions

Pause or repair the reviewer lane immediately if:

- actor context is missing
- `assign_self` or analyzer wrapper tools disappear from discovery
- mutable operator-only tools become reviewer-default actions
- traces do not identify the reviewer cleanly
- fallback is too slow or unclear

## 8. Rate-limit and quota posture

The live Hub currently reports rate limits and quotas as disabled. Before enabling reviewer writes, set:

- rate limits: enabled
- quotas: enabled
- scope: `account`

Recommended starting point:

- modest per-account rate limit for reviewer Hubs
- modest monthly per-account quota for reviewer Hubs
- no exemptions for `webflow-template-review-mcp` write paths

If you need tighter control later, move to `account_server` or `account_server_tool`.

## 9. Reviewer-by-reviewer rollout order

Recommended order:

1. Natalia Ledford
2. Sudiksha Khanduja
3. Eric Unger
4. Vicki Chen
5. Mariana Segura
6. Micah Johnson

Reason:

- start with one reviewer
- validate traces and fallback
- expand gradually instead of enabling all six write-capable at once

## 10. Recommended operator sequence

1. Ensure `webflow-template-review-mcp` and `webflow-site-analyzer-mcp` are connected.
2. Apply the compact reviewer discovery posture with `webflow-template-review-mcp` first in `activeServers`.
3. Verify `assign_self`, `get_review_context`, and the analyzer wrapper tools are visible.
4. Confirm reviewer sessions are actor-resolved.
5. Turn on Hub rate limits and quotas.
6. Validate `request_changes` trace attribution on one lane.
7. Expand reviewer-safe writes action-by-action.
8. Expand reviewer-by-reviewer.

## 11. Historical note

The March 10, 2026 Phase A rollout posture remains relevant only as a dated rollout artifact. It should not be used as the default reviewer guidance for current analyzer-backed reviewer lanes.
