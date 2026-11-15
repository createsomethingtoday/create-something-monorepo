# Public hero-background coverage

Tracked promotion: **CRE-2472**. Tier: **Automation**, with route ownership and approved artwork as **Database** artifacts.

## Scope and ownership

All 52 public page templates have background ownership: the unchanged homepage, 42 other existing route-owned heroes, and nine coverage-owned openings. Authentication, admin, account/app workspaces, development fixtures and deprecated redirects stay excluded. Dynamic templates cover their published children, not arbitrary 404 pages.

The accepted local prototype originally applied backgrounds to 49 non-home templates in an older checkout. Production integration preserves newer `AgencyHeroFrame`, `AgencyMeasuredOpening`, native OpenAI guide CSS and homepage releases instead of layering a second scene over them. Only these audited gaps receive the fallback:

- `/map`, `/scopefield`, `/basketball-systems-lab`, `/dental-ai-agents`
- `/ai-workflow-control`, `/ai-workflow-recovery`, `/marketplace-review-automation`
- `/case-studies/webflow-marketplace` and `/case-studies/webflow-marketplace/[study]`

## Implementation

- `src/lib/data/agencyHeroCoverage.ts`: explicit ownership, exclusions, redirect handling, exact-before-dynamic matching. Adding a route to navigation does not assign hero ownership.
- `src/lib/components/AgencyHeroBackground.svelte`: SSR head styles and mutually exclusive desktop/mobile image preloads. Error responses do not get a fallback.
- `src/lib/data/agencyHeroStyles.ts`: CSS generated solely from repository-owned selectors and asset paths, never request strings or CMS content.
- `src/lib/styles/hero-background.css`: bounded, decorative pseudo-elements, black foundation, responsive copy/art/proof ordering and forced-colors fallback. No DOM image injection or JavaScript requirement.
- `AgencyPageTreatment.svelte`: leaves coverage-owned opening composition to the SSR component; existing route-owned compositions remain unchanged. A wrapper may still be `AgencyHeroFrame`/`AgencyMeasuredOpening` where its native scene is disabled.

Scopefield and the three high-intent campaign routes were included in the operator-accepted prototype. Their fallback backgrounds intentionally extend the newer native scene-off choices under the all-public-pages request; product download controls and actual Playbook diagrams remain intact. The black case-study opening likewise follows the accepted hero treatment without recoloring its independently owned page body. These are documented product choices, not claims that the independent visual critic threshold passed.

Fallbacks reuse `agencyWelcomeScene` and `agencyInvitationScene` from `canonAgencyScenes.ts`, including the newer approved hand-repaired welcome artwork. No assets are copied, generated or retired artwork restored. Native owners retain their own art, preloads and query-specific study behavior. Asset provenance remains in `static/images/canon-agency-v1/ARTWORK.md` and its existing receipts.

## Validation and acceptance

```sh
pnpm --filter @create-something/agency test:hero-coverage
pnpm --filter @create-something/agency check
pnpm --filter @create-something/agency build
node scripts/check-canon-character-retirement.mjs
```

The coverage suite is included in package `check`. It enumerates page templates so unclassified routes fail; checks exclusions, redirects, exact/dynamic matching, assets, SSR generation, request-data boundaries, ownership and decorative accessibility.

The integrated browser sweep covers all 51 non-home templates at 320, 390, 768, 800, 801, 1024, 1025 and 1440 CSS pixels, including both sides of the fallback breakpoint. Native scenes must exist without an injected fallback; coverage-owned routes require one background stylesheet and one active responsive preload. Scope includes overflow and actual viewport checks. No-JS, missing-image, forced-colors and navigation cleanup are separate resilience checks. Release evidence and live verification belong to CRE-2472.

The operator accepted the original local work and subsequently requested deployment. Original independent visual critiques did **not** meet the strict nine-per-dimension target, primarily because of mobile pacing and repeated imagery. Human acceptance does not change those results. Production integration requires fresh correctness/release review, not a fictional passing critic score. Booking execution and external scheduler availability are outside this visual release.

## Mobile paint reliability (CRE-2473)

An iPhone `/products` screenshot showed a blank reserved-art area despite a valid CSS image URL. CSS presence and overflow checks alone therefore do not establish visual success.

Agency now gives its active container-query scene artwork a non-negative paint layer and places copy above it. Flattened `display: contents` openings lift their actual grid children, not only the boxless wrapper. The Canon scene override is Agency-scoped and more specific than the component's scoped CSS, avoiding stylesheet-order dependence. Other properties' Canon behavior is unchanged.

A separate reproducible defect was found during the full mobile audit: the legacy operator-palette `::before` mask could cover an entire scene—including copy—with 90% black on mobile. Scene-backed campaign openings now suppress that outer mask; their own artwork contrast treatment remains. Light Webflow portfolio headers also keep their black logo and a visible outlined menu control. Dormant legacy footer-art rules are unchanged.

Regression tests guard layering, specificity, scene-only mask removal and light-header contrast. Browser review must decode the selected image, inspect actual captured artwork pixels, and visually inspect the resulting scene—not merely look for `background-image`. Review all public templates, viewport overflow, controls and no-JS output. Await hydration and the layout's 50ms enter-navigation scroll reset before positioning screenshots; early captures and incorrectly offset crops are not valid paint evidence.

The available browser is Chromium with mobile/touch emulation, not physical iPhone Safari. A passing emulated sweep must not be represented as confirmation that the reported WebKit/device symptom is resolved. Keep that verification limit in the release receipt.

## Rollback

Revert the scoped CRE-2472 promotion commit through the normal Agency Pages workflow, then verify the live surface. If immediate recovery is necessary, use the previously verified Cloudflare Pages deployment recorded in the Linear release receipt. Do not deploy or reset the operator's unrelated dirty checkout.
