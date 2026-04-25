# Published Surface Expansion Validation — 2026-04-24

Scope: expand `webflow-site-analyzer-mcp` so more of the Webflow Way / template-review checklist can be validated or surfaced from the **published URL** alone, then validate the new rows live against `https://athelas-template.webflow.io/`.

## Changes

- Added published-only state/motion signals:
  - hover / focus / focus-visible / active selector counts
  - transition specificity vs `all`
  - expensive transition property detection
  - transition duration ranges
- Added published-only accessibility / semantic signals:
  - main + nav landmark presence
  - skip-link presence
  - generic link-label detection (`view more`, `learn more`, etc.)
- Added published-only asset / settings signals:
  - responsive image coverage via `srcset` / `sizes` / `picture`
  - custom webclip detection
  - form field type mismatch detection (`email`, `tel`, `url`)
- Added a separate multi-viewport published responsive probe:
  - `991`, `767`, `479`
  - horizontal overflow
  - clipped text
  - undersized tap-target signal
- Refined the responsive output shape:
  - `responsive.multi_breakpoint_check` now reflects overflow / clipped-text outcomes only
  - undersized tap-target findings now live in a separate advisory row: `responsive.tap_target_sizing`
  - sampled tiny tap-target selectors are surfaced for reviewer follow-up
- Broadened responsive sampling to use:
  - homepage
  - first non-utility published content URL discovered from precheck/classification

## Local Verification

- `pnpm --dir packages/webflow-site-analyzer-mcp test` passed.
- `git diff --check` passed.

## Deployment

- Fresh worker URL: `https://webflow-site-analyzer-mcp-remote.createsomething.workers.dev/mcp`
- Deployed version: `a3fc5702-d8b2-47e2-82c3-76e3f643073f`

## Live Validation: Athelas

Invocation:

- Tool path: `enqueue_template_review` -> `get_template_review_job`
- Job: `template-review-1777072965619-0vo2z9`
- Args:
  - `publishedUrl=https://athelas-template.webflow.io/`
  - `designerMode=skip`
  - `includeManual=true`
  - `crawlMaxPages=3`
  - `crawlMaxDepth=1`

Observed result:

- Provider: `steel`
- Published crawl coverage:
  - `totalKnownPages=23`
  - `crawledPages=3`
  - `skippedPages=21`
- Responsive probe:
  - `pagesSampled=2`
  - `totalViewportChecks=6`
  - sampled pages:
    - `/`
    - `/about`

Selected live rows:

- `components.nav_footer_cta=partial`
  - `publishedHasNav=true`
  - `publishedHasFooter=true`
  - `publishedCtaCount=19`
  - `publishedVariantSelectors=13`
- `styles.interactive_states=pass`
  - `hoverSelectors=16`
  - `focusSelectors=12`
  - `focusVisibleSelectors=2`
  - `activeSelectors=1`
- `interactions.transition_properties=pass`
  - `withSpecificTransition=54`
  - `withTransitionAll=0`
  - `expensiveTransitions=0`
  - `averageDurationMs=288`
  - `maxDurationMs=300`
- `assets.responsive_images=pass`
  - `images=9`
  - `responsiveImages=9`
  - `imagesWithSrcset=9`
  - `imagesWithSizes=9`
  - `coverage=100%`
- `forms.field_types=pass`
  - `pagesWithForms=3`
  - `wrongFieldTypes=0`
- `settings.custom_webclip=pass`
  - `hasCustomWebclip=true`
- `a11y.landmarks_present=partial`
  - `allHaveMainLandmark=true`
  - `allHaveNavLandmark=true`
  - `anySkipLink=false`
- `a11y.descriptive_link_labels=partial`
  - `genericLinkLabels=1`
  - `samples=view more`
- `responsive.multi_breakpoint_check=pass`
  - `pagesSampled=2`
  - `viewportChecks=6`
  - `overflowChecks=0`
  - `clippedTextChecks=0`
- `responsive.tap_target_sizing=partial`
  - `pagesSampled=2`
  - `viewportChecks=6`
  - `tapTargetChecksWithIssues=6`
  - `tapTargetExample=/@tablet:25`
  - sample selectors include:
    - `a.brand_navbar.w-nav-brand.w--current`
    - `a.cta_tertiary.w-variant-4b95ea61-f4ca-23a0-9da8-14a513c6e81b.w-inline-block`
    - `a.brand_navbar.w-variant-de156fa7-ec78-de78-148c-9790ed215831.w-nav-brand`
    - `a.cta_tertiary.w-inline-block`

## Timing

- One live `run_template_review` call against Athelas with the new published-only probes completed in `39.09s`.
- This is useful as operator telemetry for cost / value-add analysis.
- It should not be surfaced as reviewer-facing product output.
- On the refined deploy, the synchronous MCP stream still proved sticky, so live validation used the async job tools instead. The review work completed successfully and returned the expected rows, but end-to-end async duration was not recorded in the final job payload.

## Notes

- Immediately after redeploy there was one transient `502` from the remote worker during container rollout. A subsequent retry succeeded.
- The responsive split improved reviewer signal quality: the main responsive row now stays tied to stronger published evidence, while undersized tap targets remain a heuristic follow-up row with concrete selectors.
- The new rows materially increase published-only confidence without overclaiming preview/Designer truth.
