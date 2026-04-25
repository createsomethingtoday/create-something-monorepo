# Reviewer Hub Runtime Posture

**Status:** Working draft  
**Audience:** Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-03-10`

## 1. Purpose

This document gives the exact Hub posture to use for the current five reviewer-specific Hub surfaces.

It is intended to answer:

- which downstream servers must be enabled
- which discovery settings to apply
- what the initial reviewer-visible surface should be
- when write posture can be expanded

## 2. Important current-state note

As of `2026-04-25`, the official live reviewer Hub posture is:

- `webflow-template-review-mcp` connected
- `webflow-site-analyzer-mcp` connected
- `webflow-marketplace-review-phase-b` applied as the reviewer bundle baseline
- `scoped` discovery with active reviewer discovery on:
  - `webflow-template-review-mcp`
  - `webflow-site-analyzer-mcp`

`webflow-local` is not part of the official remote reviewer discovery surface today. Treat it as deferred or separate from the current reviewer lane unless a remote-compatible route is added and verified.

## 3. Reviewer Hub identities

Use one reviewer-specific Hub surface or account-scoped Hub posture per reviewer:

| Reviewer | Email | Hub slug |
| --- | --- | --- |
| Natalia Ledford | `natalia.ledford@webflow.com` | `wf-template-review-natalia` |
| Eric Unger | `eric.unger@webflow.com` | `wf-template-review-eric` |
| Vicki Chen | `vicki.chen@webflow.com` | `wf-template-review-vicki` |
| Mariana Segura | `mariana.segura@webflow.com` | `wf-template-review-mariana` |
| Micah Johnson | `micah@webflow.com` | `wf-template-review-micah` |

If these are implemented as separate custom-domain Hubs, keep the same posture across all five. If they are implemented as one remote runtime with per-account state, persist discovery preferences separately per reviewer account.

## 4. Phase A fallback posture

Use this as the rollback posture if the analyzer service is unavailable or the reviewer lane must be narrowed temporarily.

### Active servers

- `webflow-template-review-mcp`

### Discovery mode

- `mode`: `scoped`
- `activeServers`: `["webflow-template-review-mcp"]`

### Reviewer-visible tool target

Visible tools should be limited to:

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
- `webflow-template-review-mcp__template_review_list_releases`
- `webflow-template-review-mcp__template_review_get_field_map`
- `webflow-template-review-mcp__template_review_assign_reviewer`
- `webflow-template-review-mcp__template_review_assign_self`
- `webflow-template-review-mcp__template_review_unassign_self`
- `webflow-template-review-mcp__template_review_request_changes`
- `webflow-template-review-mcp__template_review_set_review_status`
- `webflow-template-review-mcp__template_review_save_draft_feedback`

Do not expose broad write tools in Phase A. The permitted mutations are narrow reviewer workflow verbs only: reviewer assignment, bounded feedback writes, and controlled 📝Review Status updates on the assigned Asset Version.

### Reviewer action

Reads plus narrow self-assignment, self-unassignment, bounded feedback writes, and controlled 📝Review Status updates. Broader review-state changes remain manual in Airtable.

## 5. Phase B: official reviewer lane posture

This is the current official reviewer baseline.

### Required servers

- `webflow-template-review-mcp`
- `webflow-site-analyzer-mcp`

### Discovery mode

- `mode`: `scoped`
- `activeServers`: `["webflow-template-review-mcp", "webflow-site-analyzer-mcp"]`

### Reviewer-visible tool target

The live runtime uses server-scoped discovery, not a count-capped or curated tool list. In practice that means the full visible proxy catalog from `webflow-template-review-mcp` and `webflow-site-analyzer-mcp` may appear on the reviewer lane.

Reviewer guidance and host prompts should still steer the workflow toward:

- `template_review_get_review_context`
- `template_review_get_reviewer_packet`
- `template_review_enqueue_analyzer_review`
- `template_review_get_analyzer_review`
- `template_review_list_analyzer_reviews`
- the current reviewer-safe write actions

Treat that preferred surface as workflow guidance, not as a statement that the live scoped lane hides every other visible tool.

### Reviewer write posture

The official Phase B lane already includes reviewer-safe write actions and may also expose broader mutation tools through scoped discovery. Treat the narrower reviewer workflow as the policy target and hardening direction, not as a claim about today's full visible catalog.

## 6. Server enablement sequence

If the live remote Hub falls out of the official Phase B shape, use this operator sequence first.

### Enable required servers

Use `hub_update_state` with:

```json
{
  "enableServers": [
    "webflow-template-review-mcp",
    "webflow-site-analyzer-mcp"
  ]
}
```

### Verify connections

Then verify:

- `hub_status`
- `hub_list_services`
- `hub_search_proxy_tools` with `serverName` set to each of:
  - `webflow-template-review-mcp`
  - `webflow-site-analyzer-mcp`

Do not treat the reviewer lane as healthy Phase B until both required servers resolve and return usable proxy tools.

## 7. Reviewer discovery posture

For rollback or containment, apply this Phase A discovery posture:

```json
{
  "mode": "scoped",
  "activeServers": ["webflow-template-review-mcp"]
}
```

Apply it through `hub_set_discovery`.

For the current official reviewer lane, Phase B discovery should be:

```json
{
  "mode": "scoped",
  "activeServers": [
    "webflow-template-review-mcp",
    "webflow-site-analyzer-mcp"
  ],
}
```

## 8. Reviewer write enablement posture

Do not widen discovery to expose general mutation tools.

The narrow reviewer-safe write actions that may be enabled in both fallback and official posture are:

- `webflow-template-review-mcp__template_review_request_changes`
- `webflow-template-review-mcp__template_review_set_review_status`
- `webflow-template-review-mcp__template_review_save_draft_feedback`

The broader official decision actions that may be enabled later are:

- `webflow-template-review-mcp__template_review_approve_version`
- `webflow-template-review-mcp__template_review_reject_version`
- `webflow-template-review-mcp__template_review_complete_publishing`

Reviewer self-assignment is already allowed as a narrow write:

- `webflow-template-review-mcp__template_review_assign_self`
- `webflow-template-review-mcp__template_review_unassign_self`

For host integrations and smoke checks, note the read envelope for reviewer context:

- `template_review_get_review_context` returns the normalized payload under `data.context`
- `currentReviewer`, `reviewOwner`, and `isAssignedToCurrentReviewer` are fields on `data.context`, not top-level `data`
- repeatable bearer-token validation is scripted in `scripts/webflow-reviewer-assign-self-smoke.sh`

Keep narrow reviewer workflow writes gated until:

- reviewer identity is visible in traces
- `correlation_id` links recommendation and write
- Airtable writes are validated
- fallback is rehearsed

### Future write guardrails

If reviewer write actions are enabled, each route must satisfy all of the following:

- the version is assigned to the current reviewer
- the current reviewer matches the authenticated hub account identity
- the write is a narrow verb, not `template_review_update_version_review`
- the write returns the updated version payload and reviewer attribution
- the write fails closed on assignment mismatch or missing reviewer identity

Recommended preconditions by action:

- `template_review_request_changes`
  - current reviewer owns the assignment
  - non-empty `review_feedback`
  - optional `improvement_areas`
- `template_review_set_review_status`
  - current reviewer owns the assignment
  - `review_status` is drawn from an allowlisted reviewer workflow state set
  - transition rules fail closed when the requested status is out of order or unsupported
- `template_review_save_draft_feedback`
  - current reviewer owns the assignment
  - only draft feedback fields are mutable
  - official decision state remains unchanged
- `template_review_approve_version`
  - current reviewer owns the assignment
  - approval-only fields are limited to release/publishing metadata
- `template_review_reject_version`
  - current reviewer owns the assignment
  - non-empty `reject_reason`
  - non-empty `rejection_feedback`
- `template_review_complete_publishing`
  - current reviewer owns the assignment
  - release selector resolves cleanly
  - publishing checklist mutations are explicit and bounded

Do not expose any future write tool that can silently overwrite:

- `📝Reviewer`
- arbitrary review status outside the allowlisted transition set
- arbitrary feedback fields outside the explicit reviewer-safe inputs
- arbitrary publishing metadata

unless the tool is wrapped in reviewer ownership checks server-side.

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

### Rollout gates for expanded writes

Enable reviewer write actions in this order:

1. `template_review_request_changes`
2. `template_review_set_review_status`
3. `template_review_save_draft_feedback`
4. hidden in discovery, operator-only smoke for broader decision routes
5. reviewer-visible for one lane only for broader decision routes
6. reviewer-visible for all lanes after traces, smoke, and rollback checks pass

Minimum validation before widening beyond assignment tools:

- reviewer smoke covers success and assignment-conflict failure
- one real write and one revert are validated on a noncritical record
- Hub trace lookup shows reviewer attribution and correlation continuity
- fallback runbook documents manual Airtable recovery for each write tool

## 9. Tools that should stay hidden from reviewers

Hide these from reviewer-facing discovery in both Phase A and Phase B:

- `webflow-template-review-mcp__template_review_update_asset_metadata`
- `webflow-template-review-mcp__template_review_update_asset_publishing`
- `webflow-template-review-mcp__template_review_update_version_review`

These are too broad for the current reviewer playbook and should remain operator-only unless the policy pack is explicitly expanded.

## 10. Policy posture

Use this reviewer policy posture:

- reviewer sessions may discover only the explicit reviewer-safe write routes plus read routes
- reviewer sessions cannot discover broad mutation routes
- reviewer-safe write routes remain approval-gated
- control-plane and destructive routes remain blocked or review-only
- policy-denied routes must fail closed

This should be enforced by the Hub authz layer, not by UI convention alone.

## 11. Rate-limit and quota posture

The live Hub currently reports rate limits and quotas as disabled. Before enabling reviewer writes, set:

- rate limits: enabled
- quotas: enabled
- scope: `account`

Recommended starting point:

- modest per-account rate limit for reviewer Hubs
- modest monthly per-account quota for reviewer Hubs
- no exemptions for `webflow-template-review-mcp` write paths

If you need tighter control later, move to `account_server` or `account_server_tool`.

## 12. Reviewer-by-reviewer rollout order

The official five-reviewer rollout is complete. If you need to reprovision from scratch, use this order:

1. Natalia Ledford
2. Eric Unger
3. Vicki Chen
4. Mariana Segura
5. Micah Johnson

Reason:

- start with one reviewer
- validate traces and fallback
- expand gradually instead of changing every reviewer lane at once

## 13. Recommended operator sequence

1. Verify `webflow-template-review-mcp` and `webflow-site-analyzer-mcp` are connected and searchable on each reviewer lane.
2. Confirm scoped discovery is active for both servers.
3. Confirm `template_review_get_reviewer_packet` and analyzer job tools are visible.
4. Confirm reviewer sessions are actor-resolved and traces include reviewer attribution.
5. Turn on or confirm Hub rate limits and quotas.
6. Harden reviewer-safe write behavior action-by-action with smoke tests and fallback drills.
7. Use the Phase A rollback posture only if analyzer evidence or reviewer attribution becomes unreliable.

## 14. Stop conditions

Revert a reviewer Hub to Phase A immediately if:

- actor context is missing
- mutable tools appear unexpectedly
- traces do not identify the reviewer cleanly
- write behavior is ambiguous
- fallback is too slow or unclear

If more than one reviewer Hub hits the same issue, revert all five to Phase A and pause write rollout.
