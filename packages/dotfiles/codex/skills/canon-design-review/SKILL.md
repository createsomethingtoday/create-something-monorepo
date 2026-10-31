---
name: canon-design-review
description: Research, review, or refine CREATE SOMETHING UI and frontend work using the curated TASTE library, Canon contracts, Performance Lab, and optional comparative interaction evidence. Use for greenfield UX, unfamiliar or consequential flows, design critique, polish, responsive cleanup, motion review, and adapting outside references so they fit CREATE SOMETHING instead of generic SaaS output.
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
3. For substantial UI work, follow [taste-research.md](./references/taste-research.md) to retrieve and inspect a small packet from the existing TASTE library.
4. Preserve the existing visual language unless the user explicitly asks for a new direction.

## Reference Research

TASTE is the first reference source for substantial UI work: new surfaces, material changes to composition or hierarchy, unfamiliar interactions, and consequential journeys. Read [taste-research.md](./references/taste-research.md). Literal copy changes, token normalization, and isolated fixes can use the existing product contract without another research pass.

Start with the task and an initial domain-derived approach. Inspect the actual images for 3–7 relevant approved TASTE references when available; record what each contributes and what must not be copied. Plain `/llm.txt` provides vocabulary and token context; it does not replace viewing references. The JSON API includes reference data only with `include=references`.

Use Mobbin as an optional supplement when TASTE leaves a material interaction question unresolved or the user requests Mobbin research. Read [mobbin-research.md](./references/mobbin-research.md) before using it. Compare distinct products and translate the useful behavior through Canon, Performance Lab, accessibility, policy, and client context.

If either source is unavailable or lacks relevant coverage, state the evidence gap and continue with repository sources, permitted direct product inspection, user evidence, and prototypes. Missing precedent must never remove a required capability. Neither a failed search nor a channel label establishes relevance or quality.

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
2. Confirm the task decision and evidence boundary; inspect the TASTE packet when the trigger applies, then resolve any remaining interaction question with appropriate additional evidence.
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

When references informed the work, include a compact evidence table or list with `Reference`, `Why`, `Adopt`, `Avoid`, and `Source`. Cite the TASTE/Are.na references and any supplemental Mobbin flow, screen, or section URLs used. Record which images were actually inspected and any unverified media.

## Escalate

Slow down and ask before changing:

- the global palette
- the font system
- major navigation patterns
- the campaign-versus-product mode boundary
- core positioning or messaging on a public property
