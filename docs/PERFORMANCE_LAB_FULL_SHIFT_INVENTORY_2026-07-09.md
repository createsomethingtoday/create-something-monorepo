# Performance Lab Full Shift Inventory

> Date: July 9, 2026
> Scope: Active CREATE SOMETHING design-language references and representative surfaces for the NikeLab-grade Performance Lab shift

## Decision

The full shift is from an Ona-centered clarity benchmark to an owned CREATE
SOMETHING Performance Lab system.

NikeLab is an internal reference for product discipline: innovation, function,
performance, research, field testing, technical materiality, and controlled
pressure. Public surfaces must not imply any Nike relationship, and internal
implementation must not copy Nike or NikeLab assets, slogans, page layouts,
trade dress, font files, or product imagery.

## Translation Rules

| Adopt from the internal NikeLab reference | Translate into CREATE SOMETHING |
| --- | --- |
| Performance before style | Workflow readiness, test state, and proof before automation claims |
| Research lab credibility | Atlas maps, policy gates, eval traces, owner decisions, receipts |
| Function plus form | Interfaces that are useful first, precise second, expressive third |
| Pressure-tested product | Run / wait / stop rails, blocked states, rollback notes, recovery proof |
| Technical material cues | Dense panels, hard lines, mono labels, artifact cards, state strips |
| Field evidence | Screenshots, logs, source bindings, delivery receipts, live readbacks |

Avoid:

- public phrases like `Nike of AI governance`, `NikeLab for agents`, or
  `inspired by Nike`;
- sportwear mimicry, swoosh-like marks, campaign compositions, product shots,
  athlete imagery, and third-party brand assets;
- generic AI gradients, glass-heavy SaaS atmospherics, or decorative dashboards;
- making `--color-performance-*` a dominant orange/brown/court theme.

## Pre-Shift Source-Of-Truth Audit

These were the source-of-truth targets identified before implementation:

- `docs/CREATE_SOMETHING_PERFORMANCE_LAB_DESIGN_LANGUAGE.md`
  - Current state: frames Performance Lab as a move from Ona and still explains
    Ona as a named clarity layer.
  - Target: make Performance Lab the active language, with Ona moved to
    historical/reference context only.
- `docs/PERFORMANCE_LAB_FONT_COLOR_REVIEW_2026-07-09.md`
  - Current state: review exists but is conservative.
  - Target: add implementation decisions and Browser evidence as the system
    changes.
- `packages/canon/README.md`
  - Current state: includes Performance Lab, but still names Ona as the clarity
    reference and mentions `ona-system-*` primitives.
  - Target: make Canon Performance Lab and proof/readability primitives the
    active system vocabulary.
- `packages/canon/src/lib/styles/tokens.css`
  - Current state: comments tie Clear and Performance tokens to Ona and
    athletic discipline.
  - Target: describe Clear as Performance Lab readability/proof substrate and
    Performance as pressure/readiness layer.
- `packages/canon/src/lib/styles/performance.css`
  - Current state: performance layer describes itself as leaving the
    Ona-derived clear communication foundation.
  - Target: describe an owned Performance Lab layer directly.
- `packages/canon/src/lib/styles/components.css`
  - Current state: `ona-system-*` primitives are named and documented as an Ona
    system surface.
  - Target: preserve compatibility but introduce Performance Lab naming or
    clearly mark the `ona-system-*` namespace as legacy.

## Public And Rendered Verification Targets

These were verified with Browser during the full-shift review:

1. `.agency` homepage at `/`
   - Why: primary buyer-facing identity.
   - Target: beyond copy, the hero and proof object should feel like a lab-grade
     governed workflow surface.
2. `.agency` deeper surface, recommended `/services` or `/atlas`
   - Why: proves the system outside the homepage.
   - Target: same hierarchy, pressure states, proof artifacts, and token usage.
3. `.ltd` `/standards` and `/taste`
   - Why: active source-of-truth public surfaces still center Ona.
   - Target: reframe standards/taste around Performance Lab, with external
     references treated as inputs rather than the operating center.
4. One additional property, recommended `.space` or `.io`
   - Why: prevents the shift from becoming `.agency`-only.
   - Target: narrow visible alignment or documented verifier gap.

## Guidance Rewritten In This Pass

These are not archive-only; they guide future work and moved in this pass:

- `packages/ltd/src/routes/standards/+page.svelte`
  - `Use Ona's design/UI/UX as the communication reference...`
- `packages/ltd/src/routes/taste/+page.svelte`
  - `Ona benchmark`, `Public pattern: Ona.com`, `Use TASTE to keep Ona-level
    clarity alive`, `Inspect Ona.com`, and related aria labels.
- `packages/ltd/src/lib/content/canon/components/clear.md`
  - `Ona-derived communication primitives...`
- `packages/ltd/src/lib/content/canon/foundations/colors.md`
  - `The Ona-derived CREATE SOMETHING communication layer...`
- `packages/ltd/src/lib/content/canon/guidelines/images.md`
  - `Use Ona.com as the design and communication foundation...`
- `docs/guides/ARENA_TASTE_INTEGRATION.md`
  - `Ona Clarity Loop` as the active loop.
- `docs/guides/MONOREPO_DELIVERY_UPDATES.md`
  - generated image guidance still says Ona.com is the design and
    communication foundation.
- `packages/agency/content/templates/marketing/image-prompt.md`
  - active prompt template still references Ona as the communication foundation.
- `packages/ltd/src/lib/taste/context.ts`
  - programmatic taste context still emits Ona-centered design principles.

## Historical Or Low-Priority Context

Do not rewrite these blindly:

- old delivery reports, job applications, client static exports, and historical
  project notes;
- policy docs where `Ona` means a development environment rather than a design
  reference;
- generated assets or large embedded animation files unless they are current
  public source-of-truth assets.

## Verification Surface

The full shift requires:

- Browser desktop and mobile screenshots for `.agency` `/`;
- Browser desktop and mobile screenshots for one deeper `.agency` surface;
- Browser screenshot for `.ltd` `/taste` or `/standards`;
- Browser screenshot or explicit verifier gap for one additional property;
- source scan proving no public route copy says `Nike`, `NikeLab`, `Nike of`,
  `inspired by Nike`, or `Ona` as current positioning;
- supporting package checks for touched properties.

## First Implementation Order

1. Canon source-of-truth comments and docs.
2. `.ltd` active standards/taste language.
3. `.agency` visible design slice.
4. Image/prompt guidance.
5. Browser review and package checks.
