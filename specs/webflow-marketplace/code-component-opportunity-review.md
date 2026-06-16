# Marketplace Code Component Opportunity Review

Status: v0.1
Last updated: 2026-05-31
Related scorecard: `specs/webflow-marketplace/marketplace-health-scorecard.md`

## Review Goal

Identify Code Components that could improve marketplace matching and conversion
under current purchase pressure, using the data already available in the search
system before proposing new ranking or creator-cohort fields.

## Current Component Coverage

| Need | Current component coverage | Gap |
| --- | --- | --- |
| Browse categories | `TemplateSearchSidebar`, `TemplateMarketplaceHeading`, `TemplateFilterBar` | Category icons and counts are covered; category intent is still split across sidebar and top pills |
| Search and refine | `TemplateSearchBox`, `TemplateFilterBar`, `TemplateSearchPage` | Result recovery is basic when filters or queries dead-end |
| Render results | `TemplateGrid`, `TemplateCard`, `TemplateSearchResults` | Cards can now show compact signals, but creator cohort/fairness data is not exposed |
| Highlight curated groups | `TemplateCarouselSection`, `PopularCategoryGrid`, `FeaturedCreatorCard` | Useful for editorial lanes, not yet connected to search-result context |
| Measure health | `MarketplaceComponentErrorBoundary`, `analytics.ts`, `TemplateGrid` health event, `Template Detail Conversion Tracker` | Aggregate result health and safe grid-to-detail attribution are available; cohort exposure needs a server-side field |

## Create Now

No brand-new user-facing Code Component should be created immediately. The
highest-leverage current work is to strengthen the existing `TemplateGrid`,
`TemplateCard`, `TemplateFilterBar`, and `TemplateSearchResults` contract.
A non-visual `Template Detail Conversion Tracker` is appropriate because it
does not change the detail-page UI; it only closes the measurement gap between
result-card proof signals and detail-page conversion actions.

Reasons:

- The search API already supplies demand signals, facets, category pills, and
  creator display fields.
- Replacing the grid or filter surface would add regression risk while the
  marketplace is under conversion pressure.
- The biggest measurement gap is not component count; it is health telemetry and
  creator-cohort exposure.

## Component Candidates

### 1. Template Result Recovery

Purpose: help users recover from no-result or weak-result states without leaving
the current marketplace context.

Use when:

- Query-present searches return zero or very low results.
- A category plus filters combination produces a dead end.
- A user needs suggested broadening actions.

Data needed:

- Current filters from URL or `templateFiltersChanged`.
- Existing facets and pills from `/api/templates/search?include=facets,pills`.
- Result count from `TemplateGrid` health telemetry or API response.

Recommended shape:

- This should be added as a mode inside `TemplateSearchResults` or
  `TemplateGrid` before becoming a standalone component.
- Actions should be deterministic: clear style, clear type, remove free-only,
  view all category, or view all templates.
- Do not generate AI suggestions in the browser.

### 2. Marketplace Context Summary

Purpose: explain the current result set in one compact line above cards, e.g.
"531 featured templates" or "59 documentation templates, sorted by popular".

Use when:

- Category, subcategory, search, or free-only context is active.
- Product wants more confidence without adding card clutter.

Data needed:

- Current filters.
- Total result count.
- Sort.
- Category/subcategory display names when available.

Recommended shape:

- Fold into `TemplateMarketplaceHeading` or `TemplateFilterBar`, not a new
  component, unless the layout needs a separate mount point.
- Avoid qualitative labels such as "best" or "highest quality".

### 3. Creator Discovery Rail

Purpose: create a deliberate lane for new or emerging creators without weakening
the main relevance sort.

Use when:

- Established creators dominate top-result exposure.
- The marketplace needs supply-side health without sacrificing buyer relevance.

Data needed:

- Server-side creator cohort: new, emerging, established.
- Candidate templates with stable thumbnails and purchase/view signals.
- Placement analytics for impressions and clicks.

Recommended shape:

- Do not build until the Search Worker exposes a coarse cohort or a curated
  candidate endpoint.
- Prefer a rail or carousel below the first result set, not a global sort change.
- Keep copy buyer-oriented, such as "Fresh templates to explore", not creator
  tier labels.

### 4. Trust Signal Strip

Purpose: show aggregate trust coverage for a result set, such as how many visible
templates have purchases, views, previews, or creator profiles.

Use when:

- Buyers hesitate because cards feel visually similar.
- The team wants to test whether social proof improves click-through.

Data needed:

- Aggregate counts from the currently rendered result batch.
- Card-level availability of preview, purchases, views, and creator identity.

Recommended shape:

- Start as telemetry and quiet card proof text, not a visible strip.
- If tested, keep it subtle and contextual; avoid making low-signal categories
  look low quality.

## Search and Sort Opportunities

Current safe sort/filter set:

- Popular
- Newest
- Price low to high
- Price high to low
- Free-only
- Style
- Type
- Category/subcategory

Future candidates:

- Fresh/new templates lane: safe as editorial or rail, risky as default sort.
- Creator discovery lane: needs cohort data first.
- Preview-available filter: useful if preview availability is consistently
  indexed.
- High-confidence/popular-within-category sort: useful only if measured against
  creator concentration.

Avoid for now:

- Quality score sort
- Creator tier sort
- Exact purchase-count filter
- Raw popularity-score display
- AI-generated tags or recommendations without a review loop

## Immediate Implementation Decision

The current implementation path is correct:

1. Keep Marketplace Signals default-off at the card/grid level, and render them
   as bucketed proof labels rather than independent popularity, sales, and view
   chips.
2. Add aggregate `TemplateGrid` health telemetry.
3. Expose the same signal and telemetry controls through
   `TemplateSearchResults` and `TemplateSearchPage`.
4. Add non-visual detail-page conversion tracking before designing new Template
   Detail UI components.
5. Use the health scorecard to decide whether a future `Template Result
   Recovery` component is needed.
6. Add server-side creator cohorts before building creator-discovery UI.

## Analytics Boundary

The current additional analytics are acceptable only as first-party marketplace
health telemetry:

- Do include slugs, booleans, filter counts, result position, CTA location, and
  bucketed proof labels.
- Do include free/paid/unknown price bucket, not exact revenue or creator
  earnings.
- Do not include raw query text, template names, creator names, emails, review
  notes, or internal quality scores.
- Do not imply lifetime sales. The current purchase label comes from the
  backend's rolling 30-day value, even though the field is historically named
  `cumulative_purchases`.
- Bucket rolling-30-day purchases before display: `250+ purchases` as
  `Marketplace favorite`, `100+ purchases` as `Top seller`, `50+ purchases` as
  `Strong seller`, `20+ purchases` as quiet-text `Sales momentum`, and `10+
  purchases` as quiet-text `Recently purchased` only near the top of the grid.
- Render badges only for the 50+ purchase buckets: `Marketplace favorite`,
  `Top seller`, and `Strong seller`. Keep `Sales momentum`, `Recently
  purchased`, `High interest`, and view-only signals as muted text or hidden by
  density.
- Reduce signal density by position: show softer proof only in the first 12
  results, 20+ purchase momentum or popular-with-high-views proof through result
  24, and only 50+ rolling-30-day purchase badges after that.
