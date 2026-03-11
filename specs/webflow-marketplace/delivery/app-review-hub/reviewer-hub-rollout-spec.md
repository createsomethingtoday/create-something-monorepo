# Reviewer Hub Rollout Spec

**Status:** Working draft  
**Audience:** Marketplace review lead, Senior Systems Architect, pilot operators  
**Workflow:** `app_review_hub_lane`  
**Date:** `2026-03-10`

## 1. Purpose

This document defines the rollout shape for the first two Webflow Marketplace app reviewers using the app review Hub lane.

The goal is to make the pilot operationally safe before broader rollout by aligning the workflow with the actual codebase posture:

- reviewer-specific identity at the Hub layer
- restricted reviewer-facing tool exposure
- approval-gated writes
- reviewer-attributed traces for every write path

## 2. Rollout decision

The initial app-review pilot should use **two reviewer-specific Hubs**, not one shared write-capable Hub.

Reason:

- app review volume is low and concentrated
- the app-review MCP currently exposes direct mutation tools
- the current MCP worker auth is a shared bearer token, so reviewer attribution must be enforced above the server
- a reviewer-specific Hub is the cleanest way to preserve reviewer ownership without turning the lane into a generic Airtable editor

This does not mean two different workflows. It means one workflow delivered through two reviewer-scoped Hub surfaces.

## 3. Reviewer to Hub mapping

The current repo data points to these app reviewers:

| Reviewer | Email | Recommended Hub slug | Primary approval owner | Evidence |
| --- | --- | --- | --- | --- |
| Pablo Miranda | `pablo.miranda@webflow.com` | `wf-app-review-pablo` | Pablo Miranda | App reviews concentrated with Pablo in marketplace volume analysis |
| Shea Sisco | `shea.sisco@webflow.com` | `wf-app-review-shea` | Shea Sisco | Secondary app reviewer in marketplace volume analysis |

If a different pilot pair should be used, update this document and the policy records before rollout.

## 4. Actual app-review MCP surface

The codebase app-review MCP currently exposes these tools:

### Read/context tools

- `app_review_health`
- `app_review_list_queue`
- `app_review_get_asset`
- `app_review_list_versions`
- `app_review_get_version`
- `app_review_get_field_map`

### Mutation tools

- `app_review_update_version_review`
- `app_review_update_asset_metadata`
- `app_review_set_marketplace_status`

### Prompts

- `app_review_decision_support`
- `app_review_feedback_refiner`

### Resources

- `app-review://field-map`
- `app-review://status-options`
- `app-review://queue-snapshot`

## 5. Tool exposure policy

### Phase A: read-only alpha default

Expose these tools to both reviewer Hubs by default:

- `app_review_health`
- `app_review_list_queue`
- `app_review_get_asset`
- `app_review_list_versions`
- `app_review_get_version`
- `app_review_get_field_map`

Allow prompts and resources that help produce recommendations and field-map context.

These are safe because they provide queue access, context loading, status taxonomy, and feedback drafting without changing official review state.

### Phase B: approval-gated reviewer writes

Do not expose write tools until the write-enable gates in section 7 pass.

Once the gates pass, the reviewer lane may selectively expose:

- `app_review_update_version_review`
- `app_review_set_marketplace_status`

These must remain reviewer-owned actions and must only be callable through a Hub path that records reviewer identity and approval evidence.

### Keep blocked from reviewer-facing discovery during alpha

Keep these tools out of reviewer-facing discovery during alpha:

- `app_review_update_version_review`
- `app_review_set_marketplace_status`
- `app_review_update_asset_metadata`

`app_review_update_asset_metadata` should remain operator-only unless the workflow scope is explicitly expanded and reapproved.

Reason:

- it is much broader than the core reviewer decision flow
- it includes fields like credentials, URLs, descriptions, images, categories, and notes
- it can drift quickly from governed app review into general Marketplace data editing

## 6. Runtime and identity requirements

Each reviewer-specific Hub must satisfy all of the following:

1. Reviewer identity is resolved from the Hub login/session path, not typed into prompts.
2. The Hub can attach reviewer identity to every write request.
3. The Hub can emit a stable `correlation_id` per workflow run.
4. The Hub can distinguish recommendation traces from write traces.
5. Review actions cannot execute anonymously or under one shared generic reviewer identity.

Minimum required write trace fields:

- `decision`
- `matched_policy_class`
- `asset_id`
- `version_id`
- `reviewer_id`
- `correlation_id`

Important implementation note:

The current `webflow-app-review-mcp` worker validates a single shared `MCP_API_KEY` bearer token. That is not enough by itself for reviewer-attributed writes. If the outer Hub layer cannot prove reviewer identity independently, reviewer Hubs must stay read-only.

## 7. Write-enable gates

Write tools remain disabled until all of the following are demonstrated in the pilot environment:

1. `app_review_update_version_review`
   - reviewer identity is visible in trace output
   - updated Airtable version record matches the requested state change
   - correlation id links the recommendation and the write
   - retry behavior is understood and documented

2. `app_review_set_marketplace_status`
   - marketplace status writes are attributable to the reviewer Hub identity
   - write scope is limited to approved status transitions
   - no unsupported field is silently mutated as part of the route

If either check fails, revert both reviewer Hubs to read-only evidence mode until corrected.

## 8. Approval model

The reviewer Hubs should use this action model:

- reads and analysis: auto-allow
- recommendation drafting: auto-allow
- feedback refinement: auto-allow
- version review state change: approval-required
- marketplace status change: approval-required
- asset metadata edits: blocked
- creator-facing sends: blocked
- Hub control-plane mutation from reviewer surface: blocked

The reviewer should be the approval owner for any write. Operators should intervene only through exception handling and pilot containment.

## 9. Rollout phases

### Alpha week one

- create the two reviewer-specific Hubs
- keep both Hubs read-only by default
- validate queue, asset, version, and field-map context
- use prompts for recommendation support and feedback drafting
- collect trust, false-positive, false-negative, and friction data
- run at least one manual fallback drill per reviewer

### Alpha week two

- enable `app_review_update_version_review` first if trace and audit checks pass
- keep `app_review_set_marketplace_status` gated until proven separately
- review every write trace and Airtable update with the workflow owner

### Beta

- enable marketplace-status changes only after clean alpha evidence
- keep asset metadata writes out of reviewer scope unless governance is expanded explicitly
- maintain rollback to read-only mode as the default containment action

## 10. Operational rules

During the two-reviewer pilot:

- every reviewer override should be captured
- every failed write should trigger manual fallback and be logged
- every blocked-action mismatch should be treated as a stop condition
- both reviewer Hubs should be reviewed daily during alpha

Containment rules:

- if reviewer attribution is missing, disable writes immediately
- if asset metadata mutation appears in reviewer discovery, remove it immediately
- if trace coverage drops below required fields, revert to read-only mode
- if recommendation quality degrades enough to reduce trust materially, narrow the pilot before expanding it

## 11. Exit criteria for broader rollout

Broader rollout should not happen until:

- both reviewer Hubs are in steady use
- reviewer identity is consistently attributable on write traces
- write-path audit fields are complete
- broad mutation surfaces stay hidden from reviewer-facing discovery
- manual fallback is proven and fast enough for daily operations
- Marketplace review lead and Senior Systems Architect approve the expanded rollout

## 12. Open implementation questions

These must be answered before enabling writes broadly:

- does the outer Hub layer already inject reviewer identity independent of the shared MCP bearer token?
- where is the canonical write audit event stored and queried?
- how are reviewer-specific tool exposure and discovery controlled operationally?
- what is the exact rollback mechanism for reverting both reviewer Hubs to read-only mode?
- is `marketplace_status` always reviewer-owned, or should some transitions remain operator-owned?

Until those answers are demonstrated in runtime behavior, the reviewer-specific Hubs should be treated as read-only evidence lanes with manual Airtable fallback for official state changes.
