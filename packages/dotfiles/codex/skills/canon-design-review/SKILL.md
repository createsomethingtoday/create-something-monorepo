---
name: canon-design-review
description: Research, review, or refine CREATE SOMETHING UI and frontend work using Mobbin interaction evidence, Canon contracts, Performance Lab, and informative-over-decorative guardrails. Use for greenfield UX, unfamiliar or consequential flows, design critique, polish, responsive cleanup, motion review, and adapting outside references so they fit CREATE SOMETHING instead of generic SaaS output.
---

# Canon Design Review

Use this skill for UI, layout, styling, motion, and UX-copy work inside CREATE SOMETHING.

If the task is specifically a public-facing landing page, hero, product page, or property homepage, also use [$canon-public-surface](../canon-public-surface/SKILL.md).

## Start Here

1. Read [house-rules.md](./references/house-rules.md).
2. Inspect the nearest source of truth before editing:
   - `packages/canon/src/lib/tokens/performance-contract.ts`
   - `packages/canon/src/lib/styles/performance.css`
   - `docs/CREATE_SOMETHING_PERFORMANCE_LAB_DESIGN_LANGUAGE.md`
   - `docs/PERFORMANCE_PAGE_SHARPNESS.md` for a whole-page or task-surface change
   - the route or component being changed
   - `packages/agency/CANON_AUDIT.md` for `.agency`
   - `packages/space/BRAND_ALIGNMENT_HERMENEUTIC.md` when decorative drift is a risk
3. Preserve the existing visual language unless the user explicitly asks for a new direction.

## Reference Research

Read [mobbin-research.md](./references/mobbin-research.md) before using Mobbin.

Use Mobbin when the task creates a new experience, introduces an unfamiliar interaction, changes a high-consequence journey, or asks whether outside precedent would materially improve UX. It is optional for narrow visual fixes where the existing contract is already clear.

1. Define the user intent and decision before searching.
2. Use `search_flows` for journeys, `search_screens` for interaction details, and `search_sections` for public-page sections.
3. Search one intent at a time and inspect the returned images, not metadata alone.
4. Compare three distinct products when useful results exist.
5. Extract the common pattern, tradeoff, what to adopt, what to avoid, and the Mobbin source links.
6. Translate the evidence through Canon, Performance Lab, the owning product contract, accessibility, and client context before proposing a change.

If Mobbin is unavailable, authentication or credits fail, or the corpus has no relevant precedent, state the evidence gap and continue with repository sources, live product inspection, and user research. Never present a failed search as proof that no pattern exists.

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
- Performance Lab is the house identity. External references are inputs, not the operating center.
- Do not import generic AI-web aesthetics: purple gradients, playful dashboards, decorative glow spam, nested card sludge, confetti, or bounce and elastic motion.
- Prefer informative celebration over decorative celebration.
- Keep typography house-aligned. Do not swap the font system just because another skill dislikes defaults.
- When a token exists, prefer the token over hardcoded `rgba()`, hex values, or Tailwind design utilities.
- Never copy a Mobbin layout, asset, copy, trade dress, or product-specific sequence. Do not commit Mobbin screenshots or downloaded source material.

## Review Sequence

1. Confirm the surface type: campaign, product, proof, operator, experiment, internal tool, or docs.
2. Confirm the task decision and evidence boundary; run reference research when the trigger applies.
3. Fix hierarchy first: task sequence, section order, headline strength, measure, and action focus.
4. Fix system drift next: tokens, spacing, borders, radii, timing, and state styles.
5. Fix copy after structure: remove generic claims and make the nouns operational.
6. Fix motion last: add or remove motion based on clarity, not novelty.
7. Re-check desktop, mobile, keyboard, reduced-motion, and relevant loading, empty, error, approval, recovery, and completed states.

## Output Standard

When you explain changes or findings, lead with:

1. what became clearer
2. what became more Canon
3. what was removed or simplified
4. any unresolved tradeoff

When Mobbin informed the work, also include a compact evidence table or list with `Pattern`, `Why`, `Adopt`, `Avoid`, and `Source`. Cite the Mobbin flow, screen, or section URLs used.

## Escalate

Slow down and ask before changing:

- the global palette
- the font system
- major navigation patterns
- the campaign-versus-product mode boundary
- core positioning or messaging on a public property
