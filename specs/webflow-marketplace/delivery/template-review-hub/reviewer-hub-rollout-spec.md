# Reviewer Hub Rollout Spec

**Status:** Working draft  
**Audience:** Marketplace review lead, Senior Systems Architect, pilot operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-03-10`

## 1. Purpose

This document defines the rollout shape for the active Webflow Marketplace reviewers using the template review Hub lane.

The goal is to make the pilot operationally safe before broader rollout by aligning the runtime with the documented policy model:

- reviewer-specific identity
- approval-gated writes
- restricted reviewer-facing tool exposure
- reviewer-attributed traces for every write path

This spec should be treated as the concrete rollout plan for alpha.

## 2. Rollout decision

The reviewer pilot should use **active reviewer-specific Hubs**, not one shared write-capable Hub.

Reason:

- the current policy pack assumes `per_user` reviewer ownership
- the current MCP surface exposes direct mutation tools
- a reviewer-specific Hub is the cleanest way to enforce identity, tool exposure, and audit attribution without blocking the pilot entirely

This does **not** mean materially different workflows per reviewer. It means one workflow delivered through reviewer-scoped Hub surfaces.

## 3. Reviewer to Hub mapping

| Reviewer | Email | Recommended Hub slug | Primary approval owner |
| --- | --- | --- | --- |
| Natalia Ledford | `natalia.ledford@webflow.com` | `wf-template-review-natalia` | Natalia Ledford |
| Eric Unger | `eric.unger@webflow.com` | `wf-template-review-eric` | Eric Unger |
| Vicki Chen | `vicki.chen@webflow.com` | `wf-template-review-vicki` | Vicki Chen |
| Mariana Segura | `mariana.segura@webflow.com` | `wf-template-review-mariana` | Mariana Segura |
| Micah Johnson | `micah@webflow.com` | `wf-template-review-micah` | Micah Johnson |

Requirements for each reviewer Hub:

- reviewer identity must be bound to the authenticated reviewer account
- reviewer-facing writes must be attributable to that reviewer
- traces must include reviewer identity and correlation id
- non-reviewer operators must not share the same reviewer runtime identity

## 4. Tool exposure policy

### Phase A: current reviewer-visible surface

Expose these tools to all active reviewer Hubs by default:

- `template_review_health`
- `template_review_get_metrics`
- `template_review_list_queue`
- `template_review_my_queue`
- `template_review_search_assets`
- `template_review_search_versions`
- `template_review_get_asset`
- `template_review_list_versions`
- `template_review_get_version`
- `template_review_get_review_context`
- `template_review_list_releases`
- `template_review_get_field_map`
- `template_review_assign_self`
- `template_review_unassign_self`
- `template_review_request_changes`
- `template_review_set_review_status`
- `template_review_save_draft_feedback`

These tools support queue access, context loading, self-assignment, bounded feedback writes, request-changes, and controlled reviewer status updates without exposing broad Airtable mutation routes. Read-only mode is the Phase A rollback/preflight posture, not the expected reviewer-visible surface once the reviewer lanes are normalized.

### Later expansion: approval-gated official decision writes

Expose these tools only after the write-enable gates in section 6 pass:

- `template_review_approve_version`
- `template_review_reject_version`
- `template_review_complete_publishing`

These tools remain reviewer-owned actions and must only be callable through a Hub path that records reviewer identity and approval evidence.

### Do not expose in reviewer-facing discovery during alpha

Keep these tools out of the reviewer-facing lane unless the workflow scope is explicitly expanded and reapproved:

- `template_review_update_asset_metadata`
- `template_review_update_asset_publishing`
- `template_review_update_version_review`
- `template_review_assign_reviewer`

Reason:

- they are broader mutation surfaces than the reviewer playbook currently authorizes
- they are harder to explain operationally than explicit decision actions
- they make it easier for the pilot to drift from a governed review lane into a general Airtable editing surface

## 5. Runtime and identity requirements

Each reviewer-specific Hub must satisfy all of the following:

1. Reviewer identity is resolved from the Hub login path, not typed manually into prompts.
2. The Hub can attach reviewer identity to every write request.
3. The Hub can emit a stable `correlation_id` per workflow run.
4. The Hub can distinguish recommendation traces from write traces.
5. Review actions cannot be executed anonymously or under a shared generic reviewer identity.

Minimum required write trace fields:

- `decision`
- `matched_policy_class`
- `asset_id`
- `version_id`
- `reviewer_id`
- `correlation_id`

If the Hub layer cannot provide those fields yet, reviewer Hubs must fall back to the read-only preflight posture.

## 6. Write-enable gates

The Phase A narrow write tools remain enabled only while all of the following are demonstrated in the pilot environment. Official decision writes remain disabled until their dedicated gates pass.

1. `template_review_request_changes`
   - reviewer identity is visible in trace output
   - updated Airtable record matches the requested state change
   - correlation id links the recommendation and the write

2. `template_review_set_review_status`
   - reviewer identity is visible in trace output
   - the requested status is from the allowlisted reviewer workflow states
   - before/after status is preserved in trace or audit evidence

3. `template_review_save_draft_feedback`
   - reviewer identity is visible in trace output
   - only draft-safe feedback fields are changed
   - official decision state remains unchanged

4. `template_review_approve_version`
   - approval action is attributable to the reviewer Hub identity
   - release linkage behavior is validated against live Airtable mappings
   - no unsupported field is silently dropped

5. `template_review_reject_version`
   - rejection reason and feedback are preserved correctly
   - reviewer identity is present in the write trace
   - retry behavior is understood and documented

6. `template_review_complete_publishing`
   - release resolution by record id and by local date is validated
   - ambiguous release resolution is blocked correctly
   - approving as part of publishing is traceable as an explicit reviewer action

If any one of these checks fails, revert affected reviewer Hubs to read-only evidence mode until corrected.

## 7. Approval model

The reviewer Hubs should use this action model:

- reads and analysis: auto-allow
- draft feedback: auto-allow
- request changes: approval-required
- approve version: approval-required
- reject version: approval-required
- complete publishing: approval-required
- creator-facing sends: blocked
- out-of-scope Airtable mutation: blocked
- Hub control-plane mutation from reviewer surface: blocked

The reviewer should be the approval owner for the write, and the workflow owner should only intervene through exception handling and pilot containment.

## 8. Rollout phases

### Alpha week one

- create the active reviewer-specific Hubs
- normalize all active reviewer Hubs to the Phase A read/context plus narrow reviewer-owned write surface
- validate queue, asset, version, analysis, and release context
- smoke self-assignment, self-unassignment, draft feedback, controlled status, and request-changes on a noncritical record before regular reviewer use
- collect reviewer trust, false-positive, false-negative, and friction data
- run at least one manual fallback drill per reviewer

### Alpha week two

- keep reviewing Phase A narrow-write traces and Airtable updates daily
- keep approve, reject, and publishing writes gated until proven individually
- review daily write traces and Airtable updates with the workflow owner

### Beta

- enable approve and reject only after clean alpha evidence
- enable publishing completion last because it has the highest release-state coupling
- maintain rollback to read-only mode as the default containment action

## 9. Operational rules

During the reviewer pilot:

- every reviewer override should be captured
- every failed write should trigger manual fallback and be logged
- every blocked action mismatch should be treated as a stop condition
- every reviewer Hub should be reviewed daily during alpha

Containment rules:

- if reviewer attribution is missing, disable writes immediately
- if unsupported mutations are exposed in reviewer discovery, remove them immediately
- if trace coverage drops below required fields, revert to read-only mode
- if recommendation quality degrades enough to reduce trust materially, narrow the pilot before expanding it

## 10. Exit criteria for broader rollout

Broader rollout should not happen until:

- all active reviewer Hubs are in steady use
- reviewer identity is consistently attributable on write traces
- write-path audit fields are complete
- unsupported mutation surfaces are hidden from reviewer-facing discovery
- manual fallback is proven and fast enough for daily operations
- Marketplace review lead and Senior Systems Architect approve the expanded rollout

## 11. Open implementation questions

These must be answered before enabling writes broadly:

- does the outer Hub layer already inject reviewer identity independent of the shared MCP bearer token?
- where is the canonical write audit event stored and queried?
- how are reviewer-specific tool exposure and discovery controlled operationally?
- what is the exact rollback mechanism for reverting all active reviewer Hubs to read-only mode?

Until those answers are demonstrated in runtime behavior, the reviewer-specific Hubs may use only the Phase A narrow reviewer-owned write lane; everything outside that lane must stay read-only/manual with Airtable fallback for official state changes.
