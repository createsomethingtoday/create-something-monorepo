---
name: webflow-template-review-reviewer
description: Guide reviewers through the official Phase B Webflow Template Review Hub flow using queue, review context, reviewer packets, analyzer jobs, and reviewer-safe writes while failing closed when automation evidence is missing.
---

# Webflow Template Review Reviewer

Use this skill for Marketplace reviewers working inside the reviewer Hub lane.

## Core Rule

Default to the official Phase B reviewer flow when the lane exposes:

- `template_review_get_reviewer_packet`
- `template_review_enqueue_analyzer_review`
- `template_review_get_analyzer_review`

If those are unavailable or failing, fall back to the context-only workflow and say that automation evidence is incomplete.

## Official Reviewer Sequence

1. Call `template_review_list_queue` with no filters, or `template_review_my_queue` for assigned work.
2. Pick a row and treat `assignableVersionId` as the version target.
3. Call `template_review_get_review_context` with that `version_id`.
4. Call `template_review_get_reviewer_packet` to read submission truth, latest automation evidence, and manual-only gaps.
5. If the packet has no current analyzer result, call `template_review_enqueue_analyzer_review`.
6. Poll `template_review_get_analyzer_review` until it succeeds, or inspect recent runs with `template_review_list_analyzer_reviews`.
7. Call `template_review_assign_self` before any reviewer write action.
8. Use `template_review_request_changes`, `template_review_set_review_status`, `template_review_save_draft_feedback`, `template_review_approve_version`, or `template_review_reject_version` only after ownership is clear.
9. Use `template_review_unassign_self` only when the reviewer intentionally wants to release the version.

## Fallback Sequence

If analyzer-backed evidence is unavailable:

1. `template_review_list_queue`
2. `template_review_get_review_context`
3. `template_review_assign_self` if the reviewer is ready to claim the work
4. manual review with explicit `Manual` or `Partial` framing

## Response Rules

- Treat `assignableVersionId` as the assignment target, not the asset id.
- Read reviewer ownership from `data.context.currentReviewer`, `data.context.reviewOwner`, and `data.context.isAssignedToCurrentReviewer`.
- Treat `template_review_get_reviewer_packet` as the main reviewer brief: it separates submission truth, automation evidence, and manual-only checks.
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
- analyzer jobs fail or return stale / incomplete evidence
- published evidence is missing
- a tool suggests a write action outside current reviewer scope
- the Hub seems to assume fields that are not present in `data.context`

Use [reviewer-playbook.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/specs/webflow-marketplace/delivery/template-review-hub/reviewer-playbook.md) and [runbook.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/specs/webflow-marketplace/delivery/template-review-hub/runbook.md) as the operating source of truth.

## Phase Awareness

The official reviewer lane is now Phase B and should expose:

- `template_review_get_reviewer_packet`
- `template_review_enqueue_analyzer_review`
- `template_review_get_analyzer_review`
- `template_review_list_analyzer_reviews`

Use direct `webflow-site-analyzer-mcp` tools only for operator or specialist deep dives. Reviewers should prefer the packet-plus-job flow from `webflow-template-review-mcp`.
