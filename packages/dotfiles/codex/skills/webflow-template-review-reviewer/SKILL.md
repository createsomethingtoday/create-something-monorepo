---
name: webflow-template-review-reviewer
description: Guide reviewers through the live Webflow Template Review Hub flow using queue, review context, analyzer-backed evidence, self-assignment, and reviewer-safe writes without relying on raw Airtable semantics.
---

# Webflow Template Review Reviewer

Use this skill for Marketplace reviewers working inside the reviewer Hub lane.

## Core Rule

Default to the current production reviewer flow. Start from queue and normalized review context, use analyzer-backed evidence when it is visible, and establish ownership before any reviewer-safe write.

Do not treat a "Phase A-only" posture as the normal reviewer lane. If analyzer-backed reviewer tools are missing, that is a discovery/runtime regression to report, not a reason to invent a different workflow.

## Default Sequence

1. Call `template_review_list_queue` with no filters.
2. Pick a row and use `assignableVersionId` as the review target.
3. Call `template_review_get_review_context` with that `version_id`.
4. If the lane exposes analyzer wrappers, call `template_review_enqueue_analyzer_review`, then `template_review_get_analyzer_review` or `template_review_list_analyzer_reviews`.
5. Call `template_review_assign_self` before any reviewer-safe write action.
6. Use `template_review_my_queue` when the reviewer asks for their assigned work.
7. Use `template_review_request_changes`, `template_review_set_review_status`, and `template_review_save_draft_feedback` only while the version is assigned to the current reviewer.
8. Use `template_review_unassign_self` only when the reviewer intentionally wants to release the version.

## Response Rules

- Treat `assignableVersionId` as the assignment target, not the asset id.
- Read reviewer ownership from `data.context.currentReviewer`, `data.context.reviewOwner`, and `data.context.isAssignedToCurrentReviewer`.
- Treat `template_review_enqueue_analyzer_review`, `template_review_get_analyzer_review`, and `template_review_list_analyzer_reviews` as the primary reviewer analysis lane.
- Explain the workflow in reviewer language, not Airtable field language.
- Stop and route to manual fallback when identity, mapping, or evidence is missing.

## Evidence Classes

Use the delivery pack language consistently:

- `Auto`: deterministic evidence that can be trusted quickly
- `Partial`: useful signal that still needs reviewer validation
- `Manual`: intentionally human-owned judgment

Do not present `Partial` findings as settled facts.

## Trust and Override

Trust the Hub most when:

- the issue is deterministic
- evidence is direct and specific
- multiple views agree

Override or slow down when:

- the issue depends on taste or UX judgment
- the evidence is incomplete
- the recommendation is low-confidence
- the reviewer can see context the Hub missed

## Escalate Instead of Improvising

Escalate when:

- reviewer identity is unavailable
- assignment ownership is unclear
- preview or published evidence is missing
- a tool suggests a write action outside current reviewer scope
- the Hub seems to assume fields that are not present in `data.context`
- analyzer wrapper tools are missing from discovery

Missing analyzer wrappers or missing `assign_self` in a reviewer lane is a hub discovery bug. Report it and stop instead of downgrading the review into a fictional "Phase A-only" mode.

Use [reviewer-playbook.md](/Users/micahjohnson/Code/worktrees/natalia-webflow-template-review-hub-3vb/specs/webflow-marketplace/delivery/template-review-hub/reviewer-playbook.md) and [runbook.md](/Users/micahjohnson/Code/worktrees/natalia-webflow-template-review-hub-3vb/specs/webflow-marketplace/delivery/template-review-hub/runbook.md) as the operating source of truth.

## Runtime Checks

Confirm the reviewer Hub exposes the primary reviewer workflow tools:

- `template_review_list_queue`
- `template_review_get_review_context`
- `template_review_enqueue_analyzer_review`
- `template_review_get_analyzer_review`
- `template_review_list_analyzer_reviews`
- `template_review_assign_self`

If any of these are missing, stop and report the reviewer lane discovery issue. Do not assume the reviewer should fall back to a narrower posture unless the runtime owner explicitly says so.
