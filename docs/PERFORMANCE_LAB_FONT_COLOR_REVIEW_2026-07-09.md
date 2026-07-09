# Performance Lab Font And Color Review

> Date: July 9, 2026
> Scope: First-pass review for the CREATE SOMETHING Performance Lab design-language shift

## Final System Decision

The second-pass system review resolved the font ownership question:

- Canon no longer declares or requests fonts from `ona.com`.
- `--font-sans` and `--font-display` use an Arial/Helvetica/system stack.
- `--font-mono` uses the platform monospace stack.
- `--font-serif` uses Georgia/Times fallbacks.
- The public token names remain stable so a future licensed, self-hosted family
  can be introduced without changing consumers.

This trades a small amount of bespoke letterform character for availability,
legal clarity, load reliability, and an identity that CREATE SOMETHING owns.
The distinctive system now comes from hierarchy, continuous operating rails,
artifacts, state, and proof rather than a hotlinked typeface.

## Pre-Change Typography Baseline

Observed before implementation:

- `packages/canon/src/lib/styles/tokens.css` defines `@font-face` for
  `ABC Diatype`, `ABC Diatype Mono`, and `Martina Plantijn` from `ona.com`
  hosted URLs.
- `packages/agency/src/app.css` maps `.agency` display and heading type back to
  Canon's sans stack: `--font-heading: var(--font-sans)` and
  `--font-display: var(--font-sans)`.
- Canon components use `--font-sans`, `--font-heading`, `--font-display`, and
  `--font-mono` rather than route-local font families.

Assessment:

- The two-family operating model is correct for Performance Lab: sans for
  public/product hierarchy, mono for state, receipts, policies, IDs, timestamps,
  and workflow proof.
- The current implementation has a dependency risk: fonts load from a
  third-party public domain. A performance-oriented identity should not depend
  long-term on another company's hosted font files unless licensing and
  availability are explicitly approved.
- No new font should be introduced during the first design-language pass. The
  right move is to keep the token API stable while resolving source/license
  ownership.

Pre-change Browser review:

- In-app Browser verification of `http://localhost:4173/` confirmed the
  homepage renders with `ABC Diatype` for the hero and public copy.
- `ABC Diatype Mono` is available to the rendered page.
- `Martina Plantijn` is declared in tokens and `.agency` fallback stacks, but
  it was not active on the verified homepage surface.
- The homepage uses large, tight sans hierarchy well for the Performance Lab
  direction. Browser overflow measurement flagged minor heading scroll-height
  overflows on large headings; treat this as a typography QA item for the next
  visual pass rather than a blocker for this copy-only alignment.

Recommendation:

1. Keep `--font-sans`, `--font-display`, and `--font-mono` as the public API.
2. Do not copy third-party font files into the repo.
3. Create a follow-up approval decision for font ownership:
   - continue current remote font references with documented approval,
   - license and self-host equivalent owned fonts,
   - or switch to a system/available family while preserving token names.
4. For Performance Lab surfaces, use mono more intentionally for readiness,
   state, proof, and receipt labels rather than as decoration.

## Color System Baseline

Observed token families:

- `--color-clear-*`: porcelain, white panels, onyx, grey, borders, moss, ocean,
  pastel blue, stop red, and related proof-surface accents.
- `--color-performance-*`: paper, panel, ink, muted, line, court, growth,
  signal, pressure, risk, gold, shadows, and radii.
- `--color-shell-*`, `--color-bg-*`, `--color-fg-*`, and semantic colors:
  operator shells, dense data, warnings, errors, success, info, and focus.
- `docs/CANON_DATABASE_LAYER_DESIGN.md` already says color should appear only as
  semantic state on dense database/operator surfaces.

Assessment:

- The existing token families are enough for the first Performance Lab pass.
- `--color-clear-*` should remain the baseline for public proof surfaces.
- `--color-performance-*` gives the needed lab/pressure/readiness vocabulary,
  but it has a palette risk: court and pressure colors can drift into a
  brown/orange theme if overused.
- Dense operational surfaces should stay mostly monochrome, with state colors
  reserved for decisions, failures, warnings, and receipts.

Rendered Browser review:

- The verified homepage reads as Canon Clear: white/porcelain surfaces,
  onyx-like text, quiet grey support copy, and restrained blue/red/green state
  accents in the Atlas/proof sections.
- The page does not currently lean on a dominant orange, brown, court, or
  pressure palette, which is the right first-pass posture.
- Browser computed-style readback did not expose every `--color-clear-*` and
  `--color-performance-*` token at `:root` on the verified page, even though
  source imports Canon CSS and `.agency` uses fallbacks for critical base
  colors. The next token pass should verify token scope/import behavior before
  broadening color usage.

Recommendation:

1. Do not introduce a new palette yet.
2. Use `--color-performance-*` as an accent layer over Canon Clear, not as a
   dominant page wash.
3. Keep page grounds white/porcelain or near-black depending on the surface.
4. Reserve orange/court/pressure tokens for readiness rails, stress markers,
   test states, and decisive CTAs.
5. Keep success/warning/error/info semantic tokens for system state; do not use
   chart/data colors as status colors.
6. Add any future Performance Lab token changes in Canon first, then consume
   them in `.agency` and other properties.

## First-Pass Token Use

| Need | Use now | Avoid |
| --- | --- | --- |
| Public proof pages | `--color-clear-*`, Clear components | New route-local hex palettes |
| Lab/readiness accents | `--color-performance-pressure`, `--color-performance-signal`, `--color-performance-line` | Full orange/brown page themes |
| Dense data | `--color-shell-*`, `--color-fg-*`, semantic states | Glass tables, decorative gradients |
| State/receipts | semantic success/warning/error/info plus mono labels | Per-category decorative colors |
| Typography | `--font-sans`, `--font-display`, `--font-mono` | New font files without approval |

## Resolved Decision

Font ownership is resolved for the current system: use the local/system stacks
behind the stable token API. A future licensed family is an enhancement, not a
dependency or blocker.

## Full-Shift Update

The July 9 full-shift pass kept the stable Canon font API and used Performance
Lab color as an accent system rather than a dominant palette:

- `.agency` now imports the Canon Performance Lab layer and uses token-backed
  readiness metrics on the homepage and services page.
- `.ltd` active Canon guidance now names Performance Lab as the design system
  reference instead of Ona-derived clear communication.
- `.io` keeps the research property voice while mapping existing shell colors
  to the Performance Lab readability surface.
- Initial Browser computed-style readbacks on `.agency`, `.ltd`, and `.io`
  showed the former `ABC Diatype`, `Stack Sans Notch`, system fallback stack;
  the final system review below verified its replacement.
- Browser computed-style readbacks on `.agency` readiness metrics showed
  token-backed state accents: signal blue, pressure orange, and growth green.

The former residual font-host risk is closed by the system review. No font file
was copied or added; the implementation uses local/system stacks only.

## Browser Evidence

- `.agency` screenshots:
  - `output/browser/performance-lab-full-home-desktop.png`
  - `output/browser/performance-lab-home-mobile-readiness.png`
  - `output/browser/performance-lab-full-services-desktop.png`
  - `output/browser/performance-lab-services-mobile-readiness.png`
- `.ltd` screenshots:
  - `output/browser/performance-lab-ltd-taste-desktop.png`
  - `output/browser/performance-lab-ltd-taste-mobile.png`
  - `output/browser/performance-lab-ltd-standards-desktop.png`
  - `output/browser/performance-lab-ltd-standards-mobile.png`
- `.io` screenshots:
  - `output/browser/performance-lab-io-home-desktop.png`
  - `output/browser/performance-lab-io-home-mobile.png`
- In-app Browser readbacks across representative surfaces:
  - Performance Lab language: present
  - `Nike`, `NikeLab`, `Nike of`, `inspired by Nike`, and public `Ona`
    positioning leakage: absent
  - horizontal overflow: absent on checked desktop and mobile viewports

## System Review Evidence

The second-pass Browser review used fresh production previews at 1440 x 1000
and 390 x 844. It confirmed the system Arial/Helvetica stack, no registered
legacy font families, no horizontal overflow, and one shared
`PerformanceLabBand` on each representative property surface.

- `.agency`: `output/browser/performance-lab-system-agency-home-desktop-viewport.png`,
  `output/browser/performance-lab-system-agency-home-mobile-band.png`,
  `output/browser/performance-lab-system-agency-services-desktop.png`, and
  `output/browser/performance-lab-system-agency-services-mobile.png`
- `.ltd`: `output/browser/performance-lab-system-ltd-standards-desktop.png`,
  `output/browser/performance-lab-system-ltd-standards-mobile.png`,
  `output/browser/performance-lab-system-ltd-taste-desktop.png`, and
  `output/browser/performance-lab-system-ltd-taste-mobile.png`
- `.io`: `output/browser/performance-lab-system-io-home-desktop.png` and
  `output/browser/performance-lab-system-io-home-mobile.png`
- `.space`: `output/browser/performance-lab-system-space-home-desktop.png` and
  `output/browser/performance-lab-system-space-home-mobile.png`

The `.io` preview still logged `D1_ERROR: no such table: papers`; the existing
fallback rendered the reviewed page with 21 artifacts. This is a local data
state issue, not a design-system failure, and remains a separate repair.
