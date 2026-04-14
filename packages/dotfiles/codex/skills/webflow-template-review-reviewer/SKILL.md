---
name: webflow-template-review-reviewer
description: Guide reviewers through the production Webflow Template Review Hub flow using queue, self-assignment, review context, release actions, and approved analyzer evidence without relying on raw Airtable semantics.
---

# Webflow Template Review Reviewer

Use this skill for Marketplace reviewers working inside the reviewer Hub lane.

## Core Rule

Default to the production reviewer flow:

- use `webflow-template-review-mcp` for official reviewer workflow actions
- use approved `webflow-site-analyzer-mcp` reads for deterministic site evidence
- keep writes narrow and explicit

Do not invent broader approval-state writes, raw Airtable semantics, or unsupported originality tooling.

## Default Sequence

1. Call `template_review_workflow` first to load the reviewer playbook and tool sequence.
2. Call `template_review_list_queue` with no filters.
3. Pick a row and use `assignableVersionId` as the assignment target.
4. Call `template_review_assign_self` with that `version_id`.
5. Call `template_review_get_review_context` with the same `version_id`.
6. Read reviewer fields from `data.context`, not top-level `data`.
7. Use `template_review_my_queue` when the reviewer asks for their assigned work.
8. Use `template_review_unassign_self` only when the reviewer intentionally wants to release the version.
9. Use `template_review_enqueue_analysis` to start remote analyzer jobs from `version_id`, and `get_template_review_job` to poll them.
10. Use connected analyzer tools only when they provide direct review evidence for the current asset or version.

## Response Rules

- Treat `assignableVersionId` as the assignment target, not the asset id.
- Read reviewer ownership from `data.context.currentReviewer`, `data.context.reviewOwner`, and `data.context.isAssignedToCurrentReviewer`.
- Explain the workflow in reviewer language, not Airtable field language.
- Treat analyzer output as evidence, not as a replacement for reviewer judgment.
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

Use `specs/webflow-marketplace/delivery/template-review-hub/reviewer-playbook.md` and `specs/webflow-marketplace/delivery/template-review-hub/runbook.md` as the operating source of truth.

## Availability Check

Before relying on analyzer evidence, confirm the reviewer Hub actually exposes:

- `webflow-site-analyzer-mcp`
- `template_review_enqueue_analysis`
- `get_template_review_job`
- `list_template_review_jobs`

If analyzer tools are unavailable, continue with `webflow-template-review-mcp` context and manual review instead of improvising missing evidence.
