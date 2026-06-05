# Marketplace Experience and Search Report

**Prepared:** 2026-06-05
**Tier focus:** Database and Automation
**Surfaces:** Code Components, `webflow-template-search`, category Cloud app, detail-page tracking

## Summary

The Marketplace experience work moved the template surface from native Webflow collection-list behavior toward repo-owned Code Components backed by a richer search API. This creates a stronger product surface for search, filtering, category browsing, marketplace signals, and conversion tracking.

The implementation is credible and meaningfully more capable than the prior native-list path. The business caveat is that live metrics show stabilization, not yet top-of-funnel recovery.

## Code Component Scope

The Webflow component package now includes a Marketplace group with:

- `Template Card`
- `Template Grid`
- `Template Filter Bar`
- `Template Search Box`
- `Template Search Page`
- `Template Search Sidebar`
- `Template Search Results`
- `Marketplace Landing Hero`
- `Template Carousel Section`
- `Popular Category Grid`
- `Marketplace FAQ`
- `Marketplace Landing Experiment Gate`
- `Featured Creator Card`
- Template detail hero/highlights/offer/sticky-bar/conversion components

Repo links:

- [packages/webflow-components/README.md](../../../packages/webflow-components/README.md)
- [packages/webflow-components/webflow.json](../../../packages/webflow-components/webflow.json)
- [packages/webflow-components/src/components/marketplace](../../../packages/webflow-components/src/components/marketplace)
- [packages/webflow-components/src/components/grid/TemplateGrid.tsx](../../../packages/webflow-components/src/components/grid/TemplateGrid.tsx)

## Search Worker Capabilities

`webflow-template-search` is the Database tier for template discovery. It exposes:

- `GET /api/templates/search`
- full-text query support
- scopes: `all`, `featured`, `free`, `landing_pages`
- category/subcategory filters
- creator/designer filters
- style/tag/type filters
- free-only filtering
- sort: popular, newest, price ascending, price descending
- pagination
- facets
- category and subcategory pills
- stable thumbnail and creator image sync from Webflow CMS
- Webflow webhooks for template and designer collection changes
- admin sync, rebuild, image backfill, prune, and sync-status routes

Repo links:

- [packages/webflow-template-search/README.md](../../../packages/webflow-template-search/README.md)
- [packages/webflow-template-search/src/search.ts](../../../packages/webflow-template-search/src/search.ts)
- [packages/webflow-template-search/src/query.ts](../../../packages/webflow-template-search/src/query.ts)
- [packages/webflow-template-search/src/index.ts](../../../packages/webflow-template-search/src/index.ts)

## Category Cloud App

The category Cloud app provides an SSR route-takeover candidate for `/templates/category/[slug]`. It:

- server-renders category pages from `webflow-template-search`
- preserves metadata, canonical URLs, Open Graph, Twitter metadata, and crawlable links
- emits `BreadcrumbList`, `CollectionPage`, and `ItemList` JSON-LD
- renders subcategory pills
- renders filter/sort controls
- supports progressive load-more behavior
- keeps existing Webflow CMS category pages as rollback until parity is approved

Repo links:

- [apps/webflow-marketplace-category-cloud/README.md](../../../apps/webflow-marketplace-category-cloud/README.md)
- [apps/webflow-marketplace-category-cloud/app/[slug]/page.tsx](../../../apps/webflow-marketplace-category-cloud/app/%5Bslug%5D/page.tsx)
- [apps/webflow-marketplace-category-cloud/components/category-results.tsx](../../../apps/webflow-marketplace-category-cloud/components/category-results.tsx)
- [apps/webflow-marketplace-category-cloud/components/filter-sort-toolbar.tsx](../../../apps/webflow-marketplace-category-cloud/components/filter-sort-toolbar.tsx)
- [specs/webflow-marketplace/category-cloud-app-hypothesis.md](../../../specs/webflow-marketplace/category-cloud-app-hypothesis.md)

## Marketplace Signal Language

The card signal language was corrected to avoid overstating low rolling-30-day sales as lifetime proof. The code now treats the field as a rolling demand signal and buckets labels:

- `Marketplace favorite`, `250+ purchases`
- `Top seller`, `100+ purchases`
- `Strong seller`, `50+ purchases`
- `Sales momentum`, `20+ purchases`
- `Recently purchased`, `10+ purchases`
- lower-signal labels such as `Buyer interest`, `High interest`, or `Popular`

This matters because PM-facing claims should not overpromise low-count sales. The implementation is aligned with buyer trust language, not fragile exact counts.

Repo link:

- [TemplateGrid marketplace signals](../../../packages/webflow-components/src/components/grid/TemplateGrid.tsx)

## Detail Conversion Tracking

The detail-page tracker is non-visual and intended to connect result-card interactions to detail-page intent:

- `detail_viewed`
- `detail_preview_cta_clicked`
- `detail_purchase_cta_clicked`
- price bucket: free, paid, unknown
- preview location/type
- purchase CTA type
- grid-to-detail attribution from `sessionStorage`

The tracker uses `TemplateDetailConversionTracker` and attribution helpers.

Repo links:

- [TemplateDetailConversionTracker.tsx](../../../packages/webflow-components/src/components/marketplace/TemplateDetailConversionTracker.tsx)
- [templateAttribution.ts](../../../packages/webflow-components/src/components/marketplace/templateAttribution.ts)
- [analytics.ts](../../../packages/webflow-components/src/components/marketplace/analytics.ts)

## Validation Already Captured in Repo

The landing-page baseline documents a movement from a 59/100 implementation-readiness estimate to a 92/100 post-slice estimate, while leaving published Webflow validation, final analytics event-name approval, final FAQ copy, Optimizely configuration, and library share verification as remaining risks.

Repo link:

- [Marketplace Landing Page Code Components Baseline](../../../specs/webflow-marketplace/marketplace-landing-page-code-components-baseline-2026-05-24.md)

## Impact Interpretation

Implementation impact is strong: the Marketplace now has a richer owned search and tracking surface.

Business impact is not proven yet: live notes showed the browse-to-select metric flat across the pre/post deploy week. The correct north-star for this work is:

```text
template_card_clicked / results_rendered
```

or the longer-history proxy:

```text
Template Selected / Marketplace Views
```

The target is recovery toward the winter 8 to 10 percent range. Current notes show the metric is still near 5 percent.

## Risks

- Desktop Safari/WebKit errors remain high and need stack-level debugging.
- Amplitude did not show the normalized signal/attribution fields as queryable despite code support.
- Production may not be serving the latest shared component build everywhere.
- Search and signal attribution need direct payload verification before PMs use signal-density conversion claims.
