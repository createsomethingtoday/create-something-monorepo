---
name: webflow-template-review-reviewer
description: Guide reviewers through the safe Phase A Webflow Template Review Hub flow using queue, self-assignment, review context, resume, and release actions without relying on raw Airtable semantics or unavailable analysis tools.
---

# Webflow Template Review Reviewer

Use this skill for Marketplace reviewers working inside the reviewer Hub lane.

## Core Rule

Default to the live-safe Phase A flow unless runtime evidence proves Phase B analysis tools are connected and approved for reviewer use.

Phase A guarantees:

- queue reads
- self-assignment
- self-unassignment
- normalized review context

Do not invent analysis, feedback drafting, or approval-state writes when the live Hub only exposes `webflow-template-review-mcp`.

## Phase A Default Sequence

1. Call `template_review_list_queue` with no filters.
2. Pick a row and use `assignableVersionId` as the assignment target.
3. Call `template_review_assign_self` with that `version_id`.
4. Call `template_review_get_review_context` with the same `version_id`.
5. Read reviewer fields from `data.context`, not top-level `data`.
6. Use `template_review_my_queue` when the reviewer asks for their assigned work.
7. Use `template_review_unassign_self` only when the reviewer intentionally wants to release the version.

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

## Phase Awareness

The retired site analyzer MCP is no longer part of the reviewer flow. Use the
reviewer Hub for Airtable/context tools and use the agent sandbox for bounded
published-site analysis.

Before using any richer review flow, confirm the reviewer Hub actually exposes
`webflow-local` for plagiarism/framework checks. If it is not connected, stay in
Phase A context mode and manual review for broader checklist work.
