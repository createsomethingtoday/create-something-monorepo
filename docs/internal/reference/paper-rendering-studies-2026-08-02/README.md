# Paper rendering studies — reference archive

Status: reference only; not approved campaign artwork

Archived: 2026-08-02

Linear: CRE-1587

Related Codex tasks:

- `019fc0f5-5812-73c2-be4e-832edaf070d2` — 30-study Three.js library
- `019fc08c-102d-7520-8b89-0848192216bb` — Paper brand and immersive experience direction
- `019fc2d9-343d-7e20-90a5-717d97c8ae75` — Imagegen vs. Three.js evaluation

## Decision

Pause the effort to make these procedural Three.js studies serve as final
marketing artwork. The work proved a strong engineering foundation—stable
catalog ids, deterministic rendering, responsive behavior, semantic fallback,
reduced motion, context recovery, and measurable budgets—but repeated material,
camera, and lighting passes did not reliably reach campaign-grade finish.

The current visualization direction is:

- use Imagegen for approved static campaign, editorial, and social images;
- retain Three.js only where live interaction itself explains a workflow state
  or transformation;
- use a Blender/C4D-class asset pipeline when exact object continuity across
  many views or long animation is required;
- keep labels, receipts, brand marks, and proof claims in authored HTML/SVG.

This archive preserves the useful composition and semantic work without
implying that the pixels are ready for public use.

## Inventory

- `contact-sheet.png` — all 30 deterministic studies in catalog order.
- `studies/` — 30 individual PNG studies across five semantic families:
  compression, route, boundary, receipt, and recovery.
- `v6-review/folded-handoff-canvas.png` — rejected tonal exemplar showing the
  remaining synthetic material problem.
- `v6-review/folded-handoff-page.png` — the same exemplar in the Agency opening
  composition.

The archive intentionally excludes:

- the unfinished and unverified v7 renderer rewrite;
- concurrent Agency route work tracked separately in CRE-1585;
- the unrelated `output/imagegen/` bundle;
- user-supplied or third-party reference screenshots.

## Permitted use

Use these files as:

- composition briefs for an Imagegen pilot;
- semantic references for Signal / Decision / Proof objects;
- comparison evidence when evaluating a future renderer or DCC pipeline;
- regression evidence if an interactive Three.js scene is retained.

Do not publish these files as final marketing art, use them as the public visual
quality bar, or infer approval from their presence in the repository.

## Recommended pilot

Generate and art-direct three canonical Paper images before expanding the
library:

1. Folded handoff — principal Paper Under Pressure hero.
2. Clamped decision — controlled boundary/services image.
3. Attached receipt — proof and field-report image.

For each composition, produce desktop and mobile crops from a shared reference,
then layer exact typography and proof language outside the generated pixels.
Compare those images in the real Agency pages against the archived Three.js
versions before selecting a production medium.

## Resumption boundary

Do not resume broad Three.js visual tuning merely because the renderer can be
made more complex. Resume only when a proposed interactive behavior cannot be
communicated as clearly with an authored static image plus HTML/SVG, and verify
that behavior in a real desktop/mobile browser with fallback and reduced-motion
coverage.
