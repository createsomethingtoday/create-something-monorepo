---
name: webflow-template-review-analysis-calibration
description: Calibrate reviewer-facing findings for the Webflow Template Review Hub once analyzer-backed evidence is available, using Auto versus Partial versus Manual evidence correctly and drafting feedback without overstating confidence.
---

# Webflow Template Review Analysis Calibration

Use this skill only after the live reviewer flow exposes analyzer-backed evidence through:

- `template_review_get_reviewer_packet`
- `template_review_get_analyzer_review`

If those are missing, do not run an analysis-led review flow. Fall back to [$webflow-template-review-reviewer](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/dotfiles/codex/skills/webflow-template-review-reviewer/SKILL.md).

## Objective

Turn reviewer packets and published-first analyzer outputs into reviewer-safe findings without overstating certainty.

## Coverage Contract

Use the checklist map as the authority for confidence framing:

- `Auto`: deterministic checks such as headings, some media/link/image checks, and exact-match content checks
- `Partial`: strong signals that still need reviewer validation, especially CMS structure, interactions, SEO composition, and responsive behavior
- `Manual`: taste, legal, licensing, provenance, variables architecture, and deeper UX/design judgment

Source of truth:

- [checklist-map.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/specs/webflow-marketplace/delivery/template-review-hub/checklist-map.md)
- [webflow-template-checklist-mcp-coverage.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/docs/webflow-template-checklist-mcp-coverage.md)

## Tool Framing

Use `template_review_get_reviewer_packet` for:

- submission truth from Airtable
- latest analyzer state
- explicit manual-only gaps

Use `template_review_enqueue_analyzer_review` plus `template_review_get_analyzer_review` for:

- fresh published-first review runs
- current check IDs, page paths, and evidence
- job status and duration

Use `webflow-site-analyzer-mcp` directly only for operator or specialist deep dives such as:

- page structure
- SEO extraction
- screenshots
- media and performance evidence

## Reviewer-Facing Output Rules

- Separate findings into `Auto`, `Partial`, and `Manual`.
- Quote direct evidence briefly and summarize the rest.
- State uncertainty plainly when evidence is heuristic or incomplete.
- Draft feedback as a reviewer edit target, not a creator-ready final message.
- Never collapse subjective design judgment into an automated fail.

## Pilot Calibration Loop

When reviewers override or distrust a finding, capture:

- false positive
- false negative
- confusing evidence
- missing context
- extra work created by the recommendation

Feed those issues back into pilot tuning rather than patching around them ad hoc.
