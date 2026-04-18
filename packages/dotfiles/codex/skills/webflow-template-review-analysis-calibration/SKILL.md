---
name: webflow-template-review-analysis-calibration
description: Calibrate reviewer-facing findings for the live analyzer-backed Webflow Template Review Hub, using Auto versus Partial versus Manual evidence correctly and drafting feedback without overstating confidence.
---

# Webflow Template Review Analysis Calibration

Use this skill when the live reviewer Hub exposes analyzer-backed review tools.

- `webflow-site-analyzer-mcp`

`webflow-local` is optional. If originality or plagiarism tools are not visible, continue with analyzer-backed review evidence and mark originality as unavailable or manual.

If the reviewer Hub is missing both the analyzer wrappers and `webflow-site-analyzer-mcp`, do not run an analysis-led review flow. Fall back to [$webflow-template-review-reviewer](/Users/micahjohnson/Code/worktrees/natalia-webflow-template-review-hub-3vb/packages/dotfiles/codex/skills/webflow-template-review-reviewer/SKILL.md).

## Objective

Turn analyzer and plagiarism outputs into reviewer-safe findings without overstating certainty.

## Coverage Contract

Use the checklist map as the authority for confidence framing:

- `Auto`: deterministic checks such as headings, some media/link/image checks, and exact-match content checks
- `Partial`: strong signals that still need reviewer validation, especially CMS structure, interactions, SEO composition, responsive behavior, and plagiarism/originality
- `Manual`: taste, legal, licensing, provenance, variables architecture, and deeper UX/design judgment

Source of truth:

- [checklist-map.md](/Users/micahjohnson/Code/worktrees/natalia-webflow-template-review-hub-3vb/specs/webflow-marketplace/delivery/template-review-hub/checklist-map.md)
- [webflow-template-checklist-mcp-coverage.md](/Users/micahjohnson/Code/worktrees/natalia-webflow-template-review-hub-3vb/docs/webflow-template-checklist-mcp-coverage.md)

## Tool Framing

Use `webflow-site-analyzer-mcp` for:

- page structure
- SEO extraction
- screenshots
- designer metadata
- media and performance evidence
- queued template-review job results

Use `webflow-local` when it is visible for:

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
