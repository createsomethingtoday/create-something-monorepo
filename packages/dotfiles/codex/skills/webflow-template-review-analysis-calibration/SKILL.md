---
name: webflow-template-review-analysis-calibration
description: Calibrate reviewer-facing findings for the Webflow Template Review Hub using sandbox, plagiarism, Auto, Partial, and Manual evidence correctly and drafting feedback without overstating confidence.
---

# Webflow Template Review Analysis Calibration

Use this skill after the reviewer has Airtable/context access through the
Template Review Hub and a sandbox available for bounded published-site analysis.
The retired site analyzer MCP is no longer an active dependency.

If `webflow-local` is missing, do not run plagiarism/framework checks. Fall back
to [$webflow-template-review-reviewer](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/dotfiles/codex/skills/webflow-template-review-reviewer/SKILL.md).

## Objective

Turn analyzer and plagiarism outputs into reviewer-safe findings without overstating certainty.

## Coverage Contract

Use the checklist map as the authority for confidence framing:

- `Auto`: deterministic checks such as headings, some media/link/image checks, and exact-match content checks
- `Partial`: strong signals that still need reviewer validation, especially CMS structure, interactions, SEO composition, responsive behavior, and plagiarism/originality
- `Manual`: taste, legal, licensing, provenance, variables architecture, and deeper UX/design judgment

Source of truth:

- [checklist-map.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/specs/webflow-marketplace/delivery/template-review-hub/checklist-map.md)
- [webflow-template-checklist-mcp-coverage.md](/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/docs/webflow-template-checklist-mcp-coverage.md)

## Tool Framing

Use the agent sandbox for:

- page structure
- SEO extraction
- screenshots
- published-site media and performance evidence

Do not claim Designer metadata, Audit Panel results, Library state, or custom-code
state unless those are directly available from the reviewer context or a manual
inspection artifact.

Use `webflow-local` for:

- plagiarism/originality signals
- framework detection

Treat plagiarism/originality output as escalation evidence, not automatic final judgment.

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
