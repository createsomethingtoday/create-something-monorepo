# Canon House Rules

Use these rules to adapt outside design advice to CREATE SOMETHING.

## Canon Is The Source Of Truth

- Prefer `packages/canon-tokens/tokens.css` over invented colors, radii, shadows, and timing.
- Preserve the dark canvas and obsidian-glass metaphor when it is already the house language.
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
- blanket bans on black backgrounds when Canon intentionally uses them
- swapping out the house font stack by default
- decorative delight, confetti, startup-gradient language, or playful SaaS tropes

## Repo Checkpoints

Open these when the task touches brand expression:

- `packages/agency/CANON_AUDIT.md` for token discipline and common drift
- `packages/space/BRAND_ALIGNMENT_HERMENEUTIC.md` for informative-over-decorative judgment
- `packages/agency/src/routes/+page.svelte` for a current public-surface example

## Default Design Test

Before shipping a design change, ask:

1. Is the page clearer at a glance?
2. Did the change become more house-aligned, not just more fashionable?
3. Did it remove drift from Canon tokens or brand tone?
4. Does it explain a system, workflow, or state better than before?
