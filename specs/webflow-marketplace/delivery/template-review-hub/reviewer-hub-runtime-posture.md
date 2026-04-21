# Reviewer Hub Runtime Posture

**Status:** Working draft  
**Audience:** Hub operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-04-21`

## 1. Purpose

This document gives the exact Hub posture to use for the six reviewer-specific Hub surfaces now that the rollout has passed Phase A.

It is intended to answer:

- which downstream servers must be enabled
- which discovery settings to apply
- what the current reviewer-visible surface should be
- when write posture can be expanded

## 2. Important current-state note

As of `2026-04-21`, the reviewer rollout target is Phase B:

- `webflow-template-review-mcp` enabled
- `webflow-site-analyzer-mcp` enabled
- reviewer hubs use remote-only downstream services
- reviewer hubs should default to the complete toolkit rather than the legacy narrow Phase A lane

Phase A is now a rollback/reference posture only. Phase B is the baseline reviewer lane.
`webflow-local` is not part of the active reviewer baseline because the shared remote Hub only brokers remote downstream services.

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

## 4. Phase A: historical posture

Retain this only for rollback/reference. It is no longer the default reviewer posture.

### Active servers

- `webflow-template-review-mcp`

### Discovery mode

- `mode`: `compact`
- `activeServers`: `["webflow-template-review-mcp"]`
- `maxProxyTools`: `21`

### Reviewer-visible tool target

Visible tools should be limited to:

- `webflow-template-review-mcp__template_review_workflow`
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
- `webflow-template-review-mcp__template_review_set_price`
- `webflow-template-review-mcp__template_review_bulk_set_price`

Do not expose broad write tools in Phase A. The permitted mutations are reviewer assignment, bounded feedback writes, controlled 📝Review Status updates on the assigned Asset Version, and the narrow Set Price handoff tools that return `mrp_id` for the manual Admin follow-up.

### Reviewer action

Reads plus narrow self-assignment, self-unassignment, bounded feedback writes, controlled 📝Review Status updates, and Set Price admin handoff writes. Broader review-state and publishing changes remain manual in Airtable/Admin.

## 5. Phase B: current baseline posture

### Required servers

- `webflow-template-review-mcp`
- `webflow-site-analyzer-mcp`

### Discovery mode

- `mode`: `full`
- `activeServers`: `["webflow-template-review-mcp", "webflow-site-analyzer-mcp"]`
- `maxProxyTools`: `null`

### Reviewer-visible tool target

Phase B should expose the complete reviewer toolkit across the remote reviewer services. At minimum, the reviewer lane must include:

- `webflow-template-review-mcp__template_review_workflow`
- full template review context and reviewer write flows from `webflow-template-review-mcp`
- analysis tools from `webflow-site-analyzer-mcp`
- `webflow-template-review-mcp__template_review_set_price`
- `webflow-template-review-mcp__template_review_bulk_set_price`

The reviewer workflow/playbook should explicitly cover price changes: write the Airtable `Set Price` field, then return `publishing_context.mrp_id` or batch `admin_handoff` rows so the Admin Marketplace update can be completed without a second lookup.
If a future remote originality service is added, treat that as an explicit expansion rather than assuming `webflow-local`.

### Reviewer write posture

Phase B keeps reviewer attribution, approval posture, and operator-only guardrails in place, but the reviewer lane should include the update workflows needed for template review and price-change handoff.

## 6. Server enablement sequence

If a reviewer hub is missing one of the Phase B services, use this operator sequence to restore the full toolkit.

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

Do not treat the reviewer lane as Phase B healthy until both remote services resolve and return usable proxy tools.

## 7. Reviewer discovery posture

Use this Phase B discovery posture as the default for each reviewer-specific Hub/account:

```json
{
  "mode": "full",
  "activeServers": [
    "webflow-template-review-mcp",
    "webflow-site-analyzer-mcp"
  ],
  "maxProxyTools": null
}
```

Keep the older Phase A discovery posture only as a rollback option:

```json
{
  "mode": "compact",
  "activeServers": ["webflow-template-review-mcp"],
  "maxProxyTools": 21
}
```

Apply it through `hub_set_discovery`.

## 8. Reviewer write enablement posture

Do not widen discovery to expose general mutation tools.

The narrow reviewer-safe write actions in the reviewer lane are:

- `webflow-template-review-mcp__template_review_request_changes`
- `webflow-template-review-mcp__template_review_set_review_status`
- `webflow-template-review-mcp__template_review_save_draft_feedback`
- `webflow-template-review-mcp__template_review_set_price`
- `webflow-template-review-mcp__template_review_bulk_set_price`

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

Keep the version-scoped reviewer workflow writes gated until:

- reviewer identity is visible in traces
- `correlation_id` links recommendation and write
- Airtable writes are validated
- fallback is rehearsed

### Future write guardrails

The price-handoff tools should resolve asset or template names unambiguously and return `mrp_id` for Admin follow-up.

For version-scoped review-state writes, each route must satisfy all of the following:

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

## 9. Broad mutation routes to review explicitly

Phase B is the complete reviewer toolkit, but these broad mutation routes still require explicit policy review because they are wider than the documented price-change handoff and reviewer workflow verbs:

- `webflow-template-review-mcp__template_review_update_asset_metadata`
- `webflow-template-review-mcp__template_review_update_asset_publishing`
- `webflow-template-review-mcp__template_review_update_version_review`

If policy chooses to keep any routes out of reviewer-facing discovery, start with these. The supported reviewer price-change lane remains:

- `webflow-template-review-mcp__template_review_set_price`
- `webflow-template-review-mcp__template_review_bulk_set_price`

## 10. Policy posture

Use this reviewer policy posture:

- reviewer sessions may discover the full Phase B reviewer toolkit across the remote reviewer services
- reviewer price-change workflows are allowed and should return `mrp_id` for the Admin handoff
- broader mutation routes remain subject to explicit policy review and reviewer attribution checks
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

## 13. Recommended operator sequence

1. Enable missing remote reviewer servers in the Hub.
2. Verify they are connected and searchable.
3. Apply Phase A compact discovery posture to all six reviewer Hubs.
4. Confirm write tools are not visible in reviewer discovery.
5. Confirm reviewer sessions are read-only and actor-resolved.
6. Turn on Hub rate limits and quotas.
7. Move one reviewer to Phase B discovery once the remote analyzer server is healthy.
8. Enable `request_changes` for one reviewer only after trace validation.
9. Expand action-by-action.
10. Expand reviewer-by-reviewer.

## 14. Stop conditions

Revert a reviewer Hub to Phase A immediately if:

- actor context is missing
- mutable tools appear unexpectedly
- traces do not identify the reviewer cleanly
- write behavior is ambiguous
- fallback is too slow or unclear

If more than one reviewer Hub hits the same issue, revert all six to Phase A and pause write rollout.
