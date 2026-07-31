# Canon House Rules

Use these rules to adapt outside design advice to CREATE SOMETHING.

## Canon Is The Source Of Truth

- Performance Lab is the house identity. Read `docs/CREATE_SOMETHING_PERFORMANCE_LAB_DESIGN_LANGUAGE.md` before changing its expression.
- Prefer `packages/canon/src/lib/styles/tokens.css`, `packages/canon/src/lib/styles/performance.css`, and `packages/canon/src/lib/tokens/performance-contract.ts` over invented colors, radii, shadows, and timing.
- Respect the campaign-versus-product boundary in `docs/PERFORMANCE_LAB_VISUAL_GRAMMAR.md`.
- Use `docs/PERFORMANCE_PAGE_SHARPNESS.md` to judge whole-page decisions, proof, and handoff.
- Use semantic foreground tokens instead of freehand opacity ladders whenever possible.

## Borrow From Impeccable Carefully

Allowed imports:

- stronger hierarchy
- cleaner copy
- responsive cleanup
- better motion restraint
- anti-generic review passes such as `audit`, `critique`, `polish`, and `distill`

Blocked imports unless the user explicitly wants a new direction:

- replacing the Canon palette with tinted-neutral or light-first systems
- swapping out the house font stack by default
- decorative delight, confetti, startup-gradient language, or playful SaaS tropes
- copying third-party layouts, assets, copy, trade dress, or interaction sequences

## Borrow From Mobbin Carefully

Mobbin supplies comparative evidence about how real products structure a task. It does not supply CREATE SOMETHING's identity or an implementation to reproduce.

Allowed imports:

- a recurring journey model observed across distinct products
- action placement, disclosure, feedback, and state-transition conventions
- evidence about what users are likely to recognize
- explicit tradeoffs and counterexamples

Blocked imports:

- one-product imitation
- pixel matching or asset extraction
- preserving screenshots or source material in the repository
- treating popularity as proof that a pattern fits our user, policy, or task

## Repo Checkpoints

Open these when the task touches brand expression:

- `packages/agency/CANON_AUDIT.md` for token discipline and common drift
- `packages/space/BRAND_ALIGNMENT_HERMENEUTIC.md` for informative-over-decorative judgment
- `packages/canon/src/lib/registry/data.ts` for reusable Canon components
- the owning route and its live production surface for current composition evidence

## Default Design Test

Before shipping a design change, ask:

1. Is the page clearer at a glance?
2. Did the change become more house-aligned, not just more fashionable?
3. Did it remove drift from Canon tokens or brand tone?
4. Does it explain a system, workflow, or state better than before?
5. If outside precedent informed the choice, can the evidence, translation, and originality boundary be audited?
