---
name: canon-design-review
description: Review or refine CREATE SOMETHING UI and frontend work using Canon tokens, house typography, and informative-over-decorative guardrails. Use for design critique, polish, responsive cleanup, motion review, and adapting generic AI design suggestions so they fit Canon instead of generic SaaS output.
---

# Canon Design Review

Use this skill for UI, layout, styling, motion, and UX-copy work inside CREATE SOMETHING.

If the task is specifically a public-facing landing page, hero, product page, or property homepage, also use [$canon-public-surface](../canon-public-surface/SKILL.md).

## Start Here

1. Read [house-rules.md](./references/house-rules.md).
2. Inspect the nearest source of truth before editing:
   - `packages/canon-tokens/tokens.css`
   - the route or component being changed
   - `packages/agency/CANON_AUDIT.md` for `.agency`
   - `packages/space/BRAND_ALIGNMENT_HERMENEUTIC.md` when decorative drift is a risk
3. Preserve the existing visual language unless the user explicitly asks for a new direction.

## Working Mode

Treat Impeccable-style operations as review passes, not external law:

- `audit`: accessibility, hierarchy, responsiveness, hardcoded design drift
- `critique`: clarity, emphasis, tone, buyer legibility
- `normalize`: replace one-off colors, radii, spacing, and timing with Canon tokens
- `polish`: tighten copy, states, alignment, spacing, and rhythm
- `distill`: remove decorative or repetitive elements
- `animate`: only when motion clarifies state, depth, or sequence

## Hard Guardrails

- Canon tokens are the design source of truth. Do not replace them with an external palette by default.
- Preserve the dark obsidian plus glass system when it is already present.
- Do not import generic AI-web aesthetics: purple gradients, playful dashboards, decorative glow spam, nested card sludge, confetti, or bounce and elastic motion.
- Prefer informative celebration over decorative celebration.
- Keep typography house-aligned. Do not swap the font system just because another skill dislikes defaults.
- When a token exists, prefer the token over hardcoded `rgba()`, hex values, or Tailwind design utilities.

## Review Sequence

1. Confirm the surface type: public page, product UI, experiment UI, internal tool, or docs.
2. Fix hierarchy first: section order, headline strength, measure, and CTA focus.
3. Fix system drift next: tokens, spacing, borders, radii, timing, and state styles.
4. Fix copy after structure: remove generic claims and make the nouns operational.
5. Fix motion last: add or remove motion based on clarity, not novelty.
6. Re-check mobile behavior and dark-surface readability.

## Output Standard

When you explain changes or findings, lead with:

1. what became clearer
2. what became more Canon
3. what was removed or simplified
4. any unresolved tradeoff

## Escalate

Slow down and ask before changing:

- the global palette
- the font system
- major navigation patterns
- dark-first assumptions
- core positioning or messaging on a public property
