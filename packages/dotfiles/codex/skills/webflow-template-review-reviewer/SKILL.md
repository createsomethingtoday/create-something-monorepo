---
name: webflow-template-review-reviewer
description: Guide reviewers through the current production Webflow Template Review Hub flow using queue, analyzer-backed evidence, self-assignment, review context, and release actions without relying on raw Airtable semantics.
---

# Webflow Template Review Reviewer

Use this skill for Marketplace reviewers working inside the reviewer Hub lane.

## Core Rule

Default to the live production reviewer flow.

Current production guarantees:

- queue reads
- analyzer bridge tools on `webflow-template-review-mcp`
- direct `webflow-site-analyzer-mcp` visibility
- self-assignment
- self-unassignment
- normalized review context

Prefer the bridge tools exposed on `webflow-template-review-mcp`:

- `template_review_enqueue_analyzer_review`
- `template_review_get_analyzer_review`
- `template_review_list_analyzer_reviews`

Prefer the bridge tools first for guided reviewer workflows, but direct `webflow-site-analyzer-mcp` tools are now part of the live reviewer surface.

## Default Sequence

1. Call `template_review_list_queue` with no filters.
2. Pick a row and use `assignableVersionId` as the assignment target.
3. Call `template_review_get_review_context` with that `version_id`.
4. If automated analysis is needed, call `template_review_enqueue_analyzer_review` and then poll with `template_review_get_analyzer_review`.
5. Call `template_review_assign_self` only when the reviewer is ready to take ownership.
6. Read reviewer fields from `data.context`, not top-level `data`.
7. Use `template_review_my_queue` when the reviewer asks for their assigned work.
8. Use `template_review_unassign_self` only when the reviewer intentionally wants to release the version.

## Response Rules

- Treat `assignableVersionId` as the assignment target, not the asset id.
- Read reviewer ownership from `data.context.currentReviewer`, `data.context.reviewOwner`, and `data.context.isAssignedToCurrentReviewer`.
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

Use [reviewer-playbook.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/specs/webflow-marketplace/delivery/template-review-hub/reviewer-playbook.md) and [runbook.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/specs/webflow-marketplace/delivery/template-review-hub/runbook.md) as the operating source of truth.

## Runtime Awareness

Before using any richer review flow, confirm the reviewer Hub exposes the template-review analyzer bridge tools and direct `webflow-site-analyzer-mcp` visibility.

If the bridge tools are absent, stay in context mode and manual review for broader checklist work. If the direct analyzer server is absent, treat that as rollback posture rather than the normal production state.
