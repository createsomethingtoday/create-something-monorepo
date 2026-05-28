# Marketplace Landing Page Code Components Baseline

Date: 2026-05-24
Linear: CRE-429
Tier focus: Automation, with Database and Judgment dependencies

## Source Inputs

- Brief: `/Users/micahjohnson/Downloads/Web Brief - Update_ Templates Landing Page.md`
- Exported Webflow source of truth: `/Users/micahjohnson/Downloads/template-marketplace.webflow`
- Exported page reviewed: `/Users/micahjohnson/Downloads/template-marketplace.webflow/landing-page.html`
- Exported styles reviewed: `/Users/micahjohnson/Downloads/template-marketplace.webflow/css/template-marketplace.webflow.css`
- Code Component package: `packages/webflow-components`
- Search Worker package: `packages/webflow-template-search`

## Brief Target

The FY27 brief moves `/templates` toward an editorial landing experience:

1. Hero with updated positioning and search.
2. Curated by Webflow carousel for strongest user reviews this quarter.
3. Built for marketing teams carousel.
4. Recently added carousel.
5. Popular categories 2x4 icon table.
6. Free templates carousel.
7. Creator CTA.
8. FAQ/AEO section.

## Current Implementation Snapshot

The exported landing-page file is still a category/listing page pattern, not the new editorial `/templates` landing page. It has strong marketplace primitives: sidebar categories, breadcrumbs, title/description, category/subcategory pills, style/free/sort controls, a four-column Collection List, empty state, analytics scripts, SEO metadata, and the sell-templates CTA.

The current Code Components provide a solid replacement foundation for the listing surface:

- `TemplateCard` renders the marketplace card with self-contained structural and hover styling.
- `TemplateGrid` fetches templates from `templates.webflow.com/templates-api`, supports URL-derived scopes, filters, sorts, pagination, loading/error states, and infinite scroll.
- `TemplateFilterBar` fetches facets/pills, mirrors native filter class vocabulary, writes URL filter state, dispatches `templateFiltersChanged`, and supports Designer preview props.
- `webflow-template-search` supports `all`, `featured`, `free`, and `landing_pages` scopes, text search, style/type filters, free-only filtering, sort, pagination, facets, category pills, and subcategory pills.

## Available Style Anchors

Use these exported classes as the style source of truth when building new Code Components:

- Page/listing shell: `section cc-top-internal`, `container`, `static-content-grid cc-aside-menu`, `filtering-aside-wrapper`, `mp-main`, `mp-title-sort with-category-filter`, `mp-title-breadcrumb`.
- Filters: `filter-sort-form`, `filter-sort-container`, `mp-filter`, `filter-sort-wrapper`, `filter-sort-toggle`, `filter-sort-toggle-label`, `filter-sort-dropdown-list`, `filter-sort-dropdown-item`, `fs-radio_field`, `fs-radio_label-filter`, `filter-free-wrapper`, `ms-toggle-*`.
- Pills: `mp-subcategory`, `cc-subcategory`; avoid generic `swiper` class names inside Code Components because earlier component work found layout leakage from generic Swiper classes.
- Cards/grid: `grid lg-col-4 gap-24`, `tm-templates_grid_item`, `mp-template-item`, `tm-link`, `tm-card_image`, `tm-card_image_secondary`, `mp-card_hover`, `mp-template-content`, `tm-templates-creator-icon`, `template-details-wrap`, `template-name-link`.
- CTA: `cta-sell-your-templates`, `sell-your-templates_container`, `sell-your-templates_grid`, `sell-your-templates_cell`, `sell-your-templates_cell_title cc-cta-templates`.
- Empty state: `search-empty-wrap`, `search-empty`, `cc_no-results-icon`.

## Baseline Score

Overall implementation readiness: **59 / 100**

| Area | Weight | Score | Evidence |
| --- | ---: | ---: | --- |
| Brief structure coverage | 25 | 10 | Current export covers listing/search/filter/CTA, but does not yet implement the hero, curated carousel sections, popular category grid, free carousel, or FAQ section from the brief. |
| Webflow style alignment | 20 | 14 | Existing card/filter/grid components already mirror many marketplace classes and injected styles, but no Code Components exist yet for the new landing-page modules. |
| Code Component functionality | 20 | 15 | `TemplateGrid` and `TemplateFilterBar` are functional, URL-driven, and Worker-backed. Missing: section/carousel/category/FAQ components and explicit page-composition component contracts. |
| Data/API readiness | 15 | 12 | Search API supports scopes, filters, sorting, facets, pills, and pagination. Missing: user-review-quarter ranking, marketing-team curation, editorial popular-category set, category icons, and FAQ content source. |
| SEO/AEO and analytics parity | 10 | 3 | Export has meta/canonical and analytics scripts, but Code Components do not own FAQ schema, section-level AEO content, impression/click events, or parity with the current landing-page analytics hooks. |
| Operational readiness | 10 | 5 | CSP-safe API default, Designer preview props, and package config exist. Remaining risk: legacy Finsweet/custom scripts, Code Component hydration on appended CMS items, Webflow Designer/published validation, and library share verification. |

## Key Gaps

1. **Editorial curation contract**
   - "Curated by Webflow" needs a ranking definition for strongest reviews this quarter.
   - "Built for marketing teams" needs a durable selection rule: category groups, tags, manual editorial list, or a new flag.
   - "Popular categories" needs a source of truth for ten categories plus icon assets.

2. **Landing-page component model**
   - Current components replace a listing grid and filters.
   - The brief needs landing modules: hero/search, section header, carousel, popular category grid, free section, creator CTA, and FAQ.

3. **SEO/AEO ownership**
   - The current exported page has document metadata and canonical tags.
   - The brief requires FAQ/AEO visibility; that needs page-level copy and likely FAQ structured data outside the existing grid/filter components.

4. **Analytics parity**
   - The exported page includes tracking for template cards, filter interactions, sort choices, and free toggle behavior.
   - Replacing behavior with Code Components needs equivalent events before cutting over.

5. **Legacy script boundary**
   - The current page uses Finsweet CMS Load/Filter/Sort, category-filter scripts, Swiper, and inline page scripts.
   - The Code Component path should remove legacy scripts only where the component owns the behavior end to end.

## Recommended Implementation Path

1. **Define the landing data contract**
   - Add a section-oriented API contract before building UI:
     - `curated_by_webflow`
     - `marketing_teams`
     - `recently_added`
     - `popular_categories`
     - `free_templates`
   - Prefer a Worker response that returns section metadata plus template items so Webflow does not need to expose Airtable/Webflow tokens in the browser.

2. **Build new Code Components around existing primitives**
   - `MarketplaceLandingHero`: headline, supporting copy, search submit URL.
   - `TemplateCarouselSection`: title, dek, CTA, section key, sort/filter config, item limit.
   - `PopularCategoryGrid`: 2x4 category/icon/link grid.
   - `MarketplaceCreatorCta`: self-contained CTA using exported CTA classes.
   - `MarketplaceFaq`: static or CMS-fed FAQ content, with AEO/structured-data handoff documented.

3. **Reuse current components instead of reimplementing cards**
   - `TemplateCarouselSection` should render `TemplateCard` items.
   - If a full grid is needed later, keep `TemplateGrid` as the listing component and do not mix it with Finsweet-loaded Collection List items.

4. **Mirror exported styles, but keep components self-contained**
   - Use exported class names and dimensions as the vocabulary.
   - Inject component-scoped CSS for structure and interaction because Webflow Code Components do not reliably inherit the site stylesheet.

5. **Validation gates**
   - `pnpm --filter @create-something/webflow-components check`
   - `pnpm --dir packages/webflow-components run bundle`
   - Designer preview check for all new components.
   - Published-page smoke for desktop and mobile.
   - Analytics parity spot check before removing legacy page scripts.

## First Implementation Slice

Build `TemplateCarouselSection` first. It reuses the highest-confidence assets already in the repo: `TemplateCard`, `webflow-template-search`, and the existing image/proxy path. It also gives fast proof for three brief sections: Curated by Webflow, Recently added, and Free templates. After that, add `PopularCategoryGrid`, then the hero/search and FAQ surfaces.

Status: **partially implemented in this worktree**.

Added:

- `packages/webflow-components/src/components/marketplace/MarketplaceLandingHero.tsx`
- `packages/webflow-components/src/components/marketplace/MarketplaceLandingHero.webflow.tsx`
- `packages/webflow-components/src/components/marketplace/TemplateCarouselSection.tsx`
- `packages/webflow-components/src/components/marketplace/TemplateCarouselSection.webflow.tsx`
- `packages/webflow-components/src/components/marketplace/PopularCategoryGrid.tsx`
- `packages/webflow-components/src/components/marketplace/PopularCategoryGrid.webflow.tsx`
- `packages/webflow-components/src/components/marketplace/MarketplaceFaq.tsx`
- `packages/webflow-components/src/components/marketplace/MarketplaceFaq.webflow.tsx`
- `packages/webflow-components/src/components/marketplace/MarketplaceLandingExperimentGate.tsx`
- `packages/webflow-components/src/components/marketplace/MarketplaceLandingExperimentGate.webflow.tsx`
- `packages/webflow-components/src/components/marketplace/analytics.ts`

The component currently supports these Designer presets:

- `curated_by_webflow`: uses current `featured + popular` search data as the nearest available proxy until a dedicated curation source exists.
- `marketing_teams`: uses a marketing keyword query as the nearest available proxy until a durable editorial source is defined.
- `recently_added`: uses `all + newest`.
- `free_templates`: uses `free + popular`.
- `custom`: allows manual scope, sort, category, subcategory, type, style, and query configuration.

`MarketplaceLandingHero` now depends on the Webflow template search API for its suggestion chips:

- Search submissions route to the configured templates search URL with the configured query parameter.
- Popular category suggestions are populated from `category_pills`, sorted by count.
- The JSON suggestions prop remains available as fallback data or for pinned editorial chips.

`PopularCategoryGrid` now depends on the Webflow template search API by default:

- Category titles, links, and counts are populated from `category_pills`.
- The default layout now matches the updated brief screenshot: an icon-card use-case grid.
- Thumbnail cards remain available as an optional layout and populate images from `category_group_slug` item searches.
- The JSON category prop remains available as fallback data or for a pinned editorial category order.

`MarketplaceFaq` is ready for the incoming FAQ content:

- FAQ items are configured as JSON: `{ question, answer }`.
- Accordion behavior is native React, not dependent on Finsweet accordion scripts.
- FAQPage JSON-LD is available but defaulted off until final copy is approved.

Analytics parity has a first implementation pass:

- `analytics.ts` adds a shared marketplace landing analytics bridge.
- Components dispatch `marketplaceLandingAnalytics` DOM events, call `wf_analytics.track` when Webflow analytics is available, and forward events to the existing `analytics.track` Amplitude/Segment surface used by the exported marketplace navigation CTA tracking.
- `MarketplaceLandingHero` tracks search submissions and suggestion clicks.
- `TemplateCarouselSection` tracks section CTA clicks, carousel navigation, template clicks, and creator clicks.
- `PopularCategoryGrid` tracks category-grid CTA clicks and category clicks.
- `MarketplaceFaq` tracks FAQ item open/close toggles.
- All four landing components expose `enableAnalytics` in Designer so tracking can be disabled for preview or isolated testing.

Experiment readiness has a first implementation pass:

- `MarketplaceLandingExperimentGate` reveals either `[data-marketplace-landing-experiment="control"]` or `[data-marketplace-landing-experiment="treatment"]`.
- Optimizely mode defaults to the control experience and waits for Optimizely variation code to call `window.TemplateMarketplaceLandingExperiment.showTreatment('optimizely')` or `showControl('optimizely')`.
- Optimizely traffic allocation should be configured in Optimizely at 50%; the gate includes `local_traffic_split` as a QA fallback with a sticky 50/50 assignment.
- The gate tracks exposure through `Marketplace Landing Experiment - Exposure`, forwards the exposure event to Amplitude/Segment, and pushes the configured Optimizely custom event API name.
- Visual landing components default to `experimentRole="treatment"`, so they are automatically targetable by the gate unless the Designer prop is changed to `none`.

Recommended Designer composition order:

1. `MarketplaceLandingHero`
2. `TemplateCarouselSection` with `curated_by_webflow`
3. `TemplateCarouselSection` with `marketing_teams`
4. `TemplateCarouselSection` with `recently_added`
5. `PopularCategoryGrid` with `icon_table`
6. `TemplateCarouselSection` with `free_templates`
7. Existing exported creator CTA section, or a follow-up `MarketplaceCreatorCta` component if the CTA needs Code Component ownership.
8. `MarketplaceFaq` after final FAQ copy is approved.

Recommended Optimizely setup:

- Set the Optimizely experiment traffic allocation to 50% treatment / 50% control.
- Add `MarketplaceLandingExperimentGate` near the top of the page with `mode=optimizely`.
- Keep the existing/native page modules marked or wrapped with `data-marketplace-landing-experiment="control"`.
- Let the new Code Components keep their default `experimentRole=treatment`.
- In the Optimizely treatment variation JavaScript, set `window.__templateMarketplaceLandingExperimentPending = { variant: 'treatment', source: 'optimizely' }` and call `window.TemplateMarketplaceLandingExperiment?.showTreatment?.('optimizely')`.
- In the Optimizely control variation JavaScript, optionally set `window.__templateMarketplaceLandingExperimentPending = { variant: 'control', source: 'optimizely' }` and call `window.TemplateMarketplaceLandingExperiment?.showControl?.('optimizely')`; if omitted, the gate records control after the configured wait.
- Use `?tm_landing_variant=treatment` and `?tm_landing_variant=control` for QA overrides.

Post-slice readiness estimate: **92 / 100**. This improves Code Component functionality, brief structure coverage, marketplace data-source alignment, FAQ/AEO implementation readiness, analytics implementation readiness, and A/B-test implementation readiness. It still does not close published Webflow validation, final analytics event-name approval, final FAQ copy, Optimizely in-account configuration, or library share verification.

## Validation Run

Commands run from `/Users/micahjohnson/emdash/worktrees/create-something-monorepo/emdash/marketplace-landing-page-update-fy3zj`:

- `pnpm bootstrap:worktree` passed. It installed workspace dependencies and completed with existing missing-bin warnings in unrelated workspace packages.
- `pnpm --filter @create-something/webflow-components check` passed.
- `pnpm --filter @create-something/webflow-template-search check` passed: 2 test files, 24 tests.
- `pnpm --dir packages/webflow-components exec webflow library --help` passed and confirmed local Code Components library commands are available.
- `pnpm --dir packages/webflow-components run bundle` passed and generated the Code Components library bundle locally. No `share` command was run.
- `WEBFLOW_SKIP_UPDATE_CHECKS=true pnpm --dir packages/webflow-components run bundle` passed after one bundle attempt hung in the Webflow CLI `npm outdated` update-check subprocess.
- The same `webflow-components` check, bundle, and `git diff --check` gates were rerun after the category-grid brief pivot and FAQ component addition; all passed.
- `pnpm --filter @create-something/webflow-components check` passed again after adding marketplace landing analytics.
- `WEBFLOW_SKIP_UPDATE_CHECKS=true pnpm --dir packages/webflow-components run bundle` passed again after adding marketplace landing analytics.
- `git diff --check` passed after the analytics and baseline-document updates.
- `pnpm --filter @create-something/webflow-components check` passed again after adding the Optimizely-compatible experiment gate and Amplitude/Segment forwarding.
- `WEBFLOW_SKIP_UPDATE_CHECKS=true pnpm --dir packages/webflow-components run bundle` passed again after adding the Optimizely-compatible experiment gate.
- `git diff --check` passed after the experiment-gate updates.
- The same `webflow-components` check, bundle, and `git diff --check` gates passed again after adding the early Optimizely pending-assignment hook.
- Live API smoke passed for the carousel contract:
  - `scope=featured&sort=popular&page_size=3` returned 3 items from 534 total.
  - `scope=free&sort=popular&free_only=true&page_size=2` returned 2 items from 162 total.
- Live API smoke passed for the category-grid contract:
  - `include=pills&page_size=1` returned category pills; sorted by count, the top categories included Portfolio & Agency, Technology, Professional Services, Retail & E-Commerce, Architecture & Design, Blog & Editorial, Wellness, Home Services, Food & Drink, and Real Estate.
  - `category_group_slug=portfolio-and-agency-websites&page_size=3` returned 3 items from 3,838 total, each with a thumbnail.

## Baseline Decision

The Code Component path is viable, but the current implementation is not ready for a direct landing-page swap. It is ready for an incremental landing-module build that preserves exported Webflow style anchors, extends the Worker data contract for editorial sections, and validates analytics/SEO parity before production replacement.
