---
name: svg-education-precision
description: Create exact educational SVG diagrams and proof surfaces from structured specs with deterministic overflow, text-fit, collision, and browser-render verification while preserving Image2 for expressive publication visuals.
---

# SVG Education Precision

Use this skill for exact educational diagrams and proof surfaces: workflows,
policy gates, comparisons, system maps, evidence maps, and data-backed
explanations.

Do not use it as a general illustration replacement. Keep Image2 as the default
for expressive imagery and polished `.agency` marketing visuals. A validated SVG
can ship directly only when it clears the visual-quality and human review gate;
otherwise preserve it as the structured source brief for Image2.

## Start Here

1. Read [spec.md](./references/spec.md).
2. Read the applicable image policy:
   - `docs/IMAGE_LANGUAGE_FOUNDATION.md`
   - `docs/guides/AGENCY_ARTICLE_IMAGE_WORKFLOW.md` for `.agency`
3. Identify the proof requirement and target surface before drawing.
4. Reuse a current graph, Atlas artifact, policy, receipt, or data source when
   one owns the facts. Do not move the source of truth into the renderer.

## Tier ownership

| Tier       | Ownership                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------- |
| Database   | Versioned JSON spec, source facts, stable IDs, layout boxes, and declared relationships   |
| Automation | Deterministic compilation, geometry validation, SVG rendering, and browser checks         |
| Judgment   | Teaching clarity, brand quality, direct-SVG versus Image2 route, and publication approval |

## Public interface

From the repo root:

```bash
pnpm agent:svg-education validate path/to/spec.json
pnpm agent:svg-education build path/to/spec.json path/to/output.svg
pnpm agent:svg-education check path/to/spec.json path/to/output.svg
```

- `validate` reports structural, canvas, text-fit, and collision failures.
- `build` validates and writes deterministic SVG markup.
- `check` runs the same gate and optionally writes a review artifact.

Treat any nonzero exit as a failed artifact. Do not continue to visual review
until the report is clean.

## Required loop

1. Translate the educational intent into a versioned JSON spec with explicit
   canvas dimensions, metadata, stable element IDs, and fixed geometry.
2. Use explicit text lines and declared text boxes. Rewrite or reflow content
   when `TEXT_OVERFLOW` fails; do not relax the text budget to preserve copy.
3. Declare intentional containment with `contains` and rare decorative overlap
   with `allowOverlapWith`. Never use a global collision bypass.
4. Run `validate`, then `build` or `check`.
5. Render the SVG on the real target surface. For browser-bound assets, inspect
   it in the in-app browser at native and smallest supported display sizes.
6. Use DOM geometry readback plus visual inspection. Successful XML parsing or
   rasterization is not proof that the layout is correct.
7. Decide the publication route:
   - direct SVG for exact instructional, accessible, editable, or interactive
     surfaces that meet the visual bar;
   - SVG as source context for Image2 when expressive composition or public
     marketing polish matters more;
   - Image2 directly only when there is no exact system relationship to preserve.
8. Keep the spec, SVG, source evidence, target sizes, review result, and Image2
   prompt/export metadata together.

## Validation contract

The deterministic gate must fail on:

- `INVALID_CANVAS`
- `INVALID_ELEMENT_ID`
- `DUPLICATE_ID`
- `INVALID_ELEMENT_BOUNDS`
- `UNKNOWN_RELATIONSHIP_TARGET`
- `INVALID_CONTAINMENT`
- `ELEMENT_OUT_OF_BOUNDS`
- `TEXT_OVERFLOW`
- `ELEMENT_COLLISION`

Errors must name actionable element IDs. Fix the spec or source copy rather than
editing generated SVG markup by hand.

## Browser review

Use the browser surface when the output will render in a browser, app, deck
preview, or responsive route. Verify:

- the root SVG retains its declared `viewBox`;
- checked element boxes stay inside the SVG viewport;
- text remains legible at the smallest supported size;
- arrowheads, strokes, and labels are not clipped;
- hierarchy, reading order, and proof requirement remain clear;
- reload produces the same result.

Capture a screenshot and geometry readback for handoff-worthy work. If browser
control is unavailable, preserve the exact manual test and stop; do not replace
the real-surface verifier with source inspection.

## Anti-patterns

- Freehand SVG strings without a structured spec.
- Treating deterministic markup as deterministic visual correctness.
- Hiding failures with clipping paths or `overflow: hidden`.
- Converting every collision into an allowance.
- Using arbitrary system fonts when pixel identity is a requirement.
- Publishing a flat SVG merely because its labels are exact.
- Asking Image2 to reproduce exact labels, data, or topology that the SVG spec
  already owns.

## Completion bar

The work is complete only when the deterministic CLI passes, the real target
surface has been inspected at required sizes, the SVG-versus-Image2 route is
recorded, and any public publication remains explicitly approved.
