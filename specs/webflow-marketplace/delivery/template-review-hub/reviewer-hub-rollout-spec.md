# Reviewer Hub Rollout Spec

**Status:** Working draft  
**Audience:** Marketplace review lead, Senior Systems Architect, pilot operators  
**Workflow:** `template_review_hub_lane`  
**Date:** `2026-03-10`

## 1. Purpose

This document defines the rollout shape for the current five Webflow Marketplace reviewers using the template review Hub lane.

The goal is to keep the official live reviewer baseline operationally safe and easy to reprovision by aligning the runtime with the documented policy model:

- reviewer-specific identity
- packet-plus-analyzer evidence flow
- reviewer-safe writes
- reviewer-scoped tool exposure
- reviewer-attributed traces for every write path

This spec should be treated as the concrete rollout and reprovision plan for the official Phase B reviewer lane, with rollback guidance retained for containment.

## 2. Rollout decision

The initial reviewer pilot should use **five reviewer-specific Hubs**, not one shared write-capable Hub.

Reason:

- the current policy pack assumes `per_user` reviewer ownership
- the current MCP surface exposes direct mutation tools
- a reviewer-specific Hub is the cleanest way to enforce identity, tool exposure, and audit attribution without blocking the pilot entirely

This does **not** mean five materially different workflows. It means one workflow delivered through five reviewer-scoped Hub surfaces.

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

### Official reviewer baseline

The live reviewer lane should center on:

- `template_review_list_queue`
- `template_review_my_queue`
- `template_review_get_review_context`
- `template_review_get_reviewer_packet`
- `template_review_enqueue_analyzer_review`
- `template_review_get_analyzer_review`
- `template_review_list_analyzer_reviews`
- `template_review_assign_self`
- `template_review_unassign_self`
- `template_review_request_changes`
- `template_review_set_review_status`
- `template_review_save_draft_feedback`

These tools support queue access, reviewer context, submission truth, published-first evidence gathering, and narrow reviewer workflow writes.

### Later-gated broader decision actions

Keep broader decision actions gated until the write-enable checks in section 6 pass:

- `template_review_approve_version`
- `template_review_reject_version`
- `template_review_complete_publishing`

These tools remain reviewer-owned actions and must only be callable through a Hub path that records reviewer identity and approval evidence.

### Do not expose in reviewer-facing discovery by default

Keep these tools out of the reviewer-facing lane unless the workflow scope is explicitly expanded and reapproved:

- `template_review_update_asset_metadata`
- `template_review_update_asset_publishing`
- `template_review_update_version_review`

Reason:

- they are broader mutation surfaces than the reviewer playbook currently authorizes
- they are harder to explain operationally than explicit reviewer workflow actions
- they make it easier for the lane to drift from a governed review workflow into a general Airtable editing surface

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

If the Hub layer cannot provide those fields yet, broader decision writes must stay disabled.

## 6. Write-enable gates

Write tools remain disabled until all of the following are demonstrated in the pilot environment for each write action:

1. `template_review_request_changes`
   - reviewer identity is visible in trace output
   - updated Airtable record matches the requested state change
   - correlation id links the recommendation and the write

2. `template_review_approve_version`
   - approval action is attributable to the reviewer Hub identity
   - release linkage behavior is validated against live Airtable mappings
   - no unsupported field is silently dropped

3. `template_review_reject_version`
   - rejection reason and feedback are preserved correctly
   - reviewer identity is present in the write trace
   - retry behavior is understood and documented

4. `template_review_complete_publishing`
   - release resolution by record id and by local date is validated
   - ambiguous release resolution is blocked correctly
   - approving as part of publishing is traceable as an explicit reviewer action

If any one of these checks fails, revert the affected reviewer Hubs to the rollback evidence mode until corrected.

## 7. Approval model

The reviewer Hubs should use this action model:

- reads, reviewer packets, and analyzer jobs: auto-allow
- draft feedback and controlled review-status changes: approval-required or narrow reviewer write per current policy
- request changes: approval-required
- approve version: gated until explicitly enabled
- reject version: gated until explicitly enabled
- complete publishing: gated until explicitly enabled
- creator-facing sends: blocked
- out-of-scope Airtable mutation: blocked
- Hub control-plane mutation from reviewer surface: blocked

The reviewer should be the approval owner for the write, and the workflow owner should only intervene through exception handling and pilot containment.

## 8. Rollout phases

### Official baseline

- maintain the five reviewer-specific Hubs
- keep reviewer packets and published-first analyzer jobs healthy
- collect reviewer trust, false-positive, false-negative, and friction data
- run repeatable fallback drills

### Hardening

- keep `request_changes`, controlled status updates, and draft feedback within reviewer-safe boundaries
- gate approve, reject, and publishing completion until proven individually
- review write traces and Airtable updates with the workflow owner

### Rollback

- maintain rollback to the context-only evidence mode as the default containment action

## 9. Operational rules

During the five-reviewer pilot:

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

Broader decision-write expansion should not happen until:

- all five reviewer Hubs are in steady use
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
- what is the exact rollback mechanism for reverting all five reviewer Hubs to read-only mode?

Until those answers are demonstrated in runtime behavior, the reviewer-specific Hubs should stay on the official packet-plus-analyzer baseline with manual Airtable fallback for broader official state changes.
