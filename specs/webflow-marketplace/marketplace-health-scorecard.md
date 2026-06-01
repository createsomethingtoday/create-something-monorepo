# Marketplace Health Scorecard

Status: v0.1
Last updated: 2026-05-31
Owner: Marketplace systems

## Purpose

The template marketplace should be managed as a matching system: buyers need to
find the right template quickly, creators need fair distribution, and the
marketplace needs enough trust signals to support purchase decisions without
turning every page into a popularity contest.

This scorecard keeps those concerns visible during UI, search, and ranking
changes. It separates findability, trust, conversion, supply, and technical
health so a single conversion-pressure metric does not over-optimize the whole
system.

## Service Map

| Layer | Service or package | Marketplace role |
| --- | --- | --- |
| Discovery index | `packages/webflow-template-search` | Cloudflare Worker and D1 search API for templates, filters, facets, pills, and popularity sorting |
| Webflow components | `packages/webflow-components` | Code Components for grid, cards, filter bar, search, sidebar, headings, and analytics bridge |
| Published surface | `webflow.com/templates` | User-facing pages, category pages, special pages, and template detail paths |
| Intake and review | `apps/marketplace-template-submission-cloud`, validation and analyzer packages | Creator supply, review flow, quality control, and metadata normalization |
| Creator operations | Dashboard, Airtable, Zendesk, support workflows | Creator lifecycle, issue handling, feedback loops, and recovery paths |
| Analytics | Webflow analytics, Amplitude, Clarity, component analytics bridge | Demand, friction, error, and conversion measurement |

## North Star

Help buyers reach a template detail page that matches intent and has enough
confidence to purchase, while distributing qualified demand across new and
established creators.

The marketplace is healthy when:

- Users with intent can narrow from broad browsing to relevant results.
- Result pages expose enough trust data to support comparison.
- Purchase paths hold steady across browser, device, query, category, and creator
  cohort.
- New creators can earn qualified impressions without requiring prior sales.
- Technical errors do not silently remove templates, filters, or cards from the
  buyer journey.

## Scorecard Metrics

| Dimension | Metric | Source | First threshold |
| --- | --- | --- | --- |
| Findability | Search or filter result render rate | `TemplateGrid` health event | 99 percent successful result renders |
| Findability | No-result or dead-end rate | Amplitude and component health event | Alert if 7-day average rises by 1 point |
| Findability | Query-present result rate | `TemplateGrid` health event | Track by query-present boolean, not raw query text |
| Trust | Share of visible results with purchase/view signals | Search API fields on rendered page | Watch for category pages with weak trust coverage |
| Trust | Share of visible results with creator identity | Search API fields on rendered page | Alert if creator identity missing on top result rows |
| Conversion | Purchase CTA per marketplace view | Amplitude | Compare same day-of-week and same-hour cohorts |
| Conversion | Orders per marketplace view | Amplitude and order events | Use as outcome, not the only ranking target |
| Supply | Visible unique creators per result page | `TemplateGrid` health event | Watch concentration by page, category, and sort |
| Supply | New creator exposure share | Search Worker cohort field, future | Requires server-side cohort derivation |
| Technical | Component error rate by component/browser | Component error analytics and Clarity | Alert on sustained browser-specific spikes |
| Technical | Search API fetch failures | Component error analytics and Worker logs | Alert immediately for production pages |

## Cohorts

Creator-cohort analysis should be server-side and explicit. The current search
response exposes creator display fields and demand fields, but not a public
creator cohort. The Search Worker already indexes creator record identity, so
the next safe extension is to derive coarse cohorts in the API or analytics
pipeline:

- `new_creator`: creator has recently published their first templates.
- `emerging_creator`: creator has measurable demand but limited purchase history.
- `established_creator`: creator has consistent purchases or featured supply.

Do not expose raw creator revenue or internal review values in public component
props. Cohorts should be coarse enough for marketplace health analysis and, if
later shown in UI, framed as buyer-helpful signals rather than creator ranking
labels.

## Signal Policy

Quality and demand signals should be treated as buyer-assistive evidence, not
global truth.

- Good card signals: scarce proof labels such as "Marketplace favorite",
  "Top seller", or "Strong seller" rendered as compact proof badges when backed
  by 250+, 100+, or 50+ rolling-30-day purchases. Mid-tier "Sales momentum"
  starts at 20+ purchases and should remain quiet text. Softer signals such as
  "Recently purchased" or "High interest" should remain quiet text or be hidden
  by density rules. Featured, free, new, creator identity, and preview
  availability remain separate signals.
- Risky card signals: raw ranking score, exact internal popularity score, exact
  conversion rate, review-status labels, or creator-tier labels.
- Good filter/sort additions: sort by popularity, newest, price, free-only,
  style, type, category, and future "new creators" discovery when intentionally
  designed.
- Risky filter/sort additions: "best", "highest quality", or hard creator-tier
  filters before cohort fairness is measured.

Any new quality signal should ship behind a component prop or experiment flag,
with health telemetry enabled before it becomes default.

## Instrumentation Contract

The `TemplateGrid` component should emit an aggregate health event after each
successful search fetch. It must be one event per result batch, not one event per
card.

Event name:

```text
[Template Marketplace] Code Component Event
```

Required properties:

- `component`: `TemplateGrid`
- `scope`: `results_rendered`
- `result_count`
- `total_items`
- `page`
- `page_size`
- `has_next_page`
- `sort`
- `q_present`
- `marketplace_signal_window`
- `styles_count`
- `tags_count`
- `types_count`
- `free_only`
- `scope_filter`
- `category_group_slug`
- `child_category_slug`
- `style_slug`
- `tag_slug`
- `marketplace_signals_enabled`
- `visible_featured_count`
- `visible_free_count`
- `visible_new_count`
- `visible_with_purchases_count`
- `visible_with_viewers_count`
- `visible_unique_creators_count`
- `top_result_popularity_score`

The event must not include raw search query text, template names, creator names,
emails, or internal review notes.

The grid-to-detail conversion bridge uses `sessionStorage`, not cookies or
cross-site identifiers. On a template-card detail click, `TemplateGrid` stores a
short-lived attribution record with only source context:

- source component, path, scope, sort, category/style/tag slugs
- query-present boolean and filter counts, not the raw query
- result page and position
- template slug
- bucketed visible signal, such as `Marketplace favorite` or `High interest`
- signal window, currently `rolling_30d`

`Template Detail Conversion Tracker` can then be placed on `/templates/html/*`
detail pages to connect that attribution to detail views, preview CTA clicks,
and purchase CTA clicks. It should send only slug, free/paid/unknown price
bucket, CTA location, CTA type, and the safe attribution fields above.

This is acceptable on Free, Landing Page, and Featured template grids because
those pages are high-intent, first-party marketplace surfaces and the displayed
signals are derived from public marketplace/search data. Keep the signal UI
default-off by component prop until enough same-hour conversion evidence exists.

The current purchase signal is a rolling 30-day backend count despite the
historical `cumulative_purchases` field name. Card copy must not imply lifetime
sales. Low purchase counts should be grouped into buyer-friendly buckets rather
than shown as exact proof claims.

Signal density should decrease as users scroll. The first 12 results can show
soft signals such as `Recently purchased`, `Buyer interest`, or high-view
interest. Results 13-24 should show only 20+ purchase momentum or popular with
high views. Results after 24 should show only high-confidence purchase buckets
of 50+ rolling-30-day purchases.

Only 50+ purchase buckets should render as badge-like UI in the card metadata:
`Strong seller`, `Top seller`, and `Marketplace favorite`. Keep image badges
reserved for editorial/product status such as `Featured` and `New`.

Current sampled purchase distribution across key scopes:

| Scope | Count | 50+ | 100+ | 250+ | 500+ |
| --- | ---: | ---: | ---: | ---: | ---: |
| All templates | 10,764 | 20.1% | 10.3% | 3.1% | 0.8% |
| Featured | 531 | 18.5% | 6.4% | 1.1% | 0% |
| Free | 162 | 1.9% | 1.9% | 0.6% | 0.6% |
| Landing pages | 1,058 | 21.7% | 12.7% | 4.2% | 0.9% |

## Operating Cadence

Daily during conversion pressure:

1. Check technical health first: component errors, search fetch failures, and
   missing result renders.
2. Check findability: no-result rate, dead-end rate, result counts by high-volume
   category, and sort/filter usage.
3. Check conversion: purchase CTA rate and orders per view using same-hour and
   same-day-of-week comparisons.
4. Check ecosystem balance: visible unique creators per page and, once available,
   new/emerging/established creator exposure.
5. Treat UI changes as experiments until conversion and ecosystem metrics both
   hold.

Weekly:

1. Review categories where demand is high but trust-signal coverage is low.
2. Review creators gaining impressions but not clicks to identify metadata,
   thumbnail, or card-content gaps.
3. Review top no-result query themes without storing raw query text in public
   component telemetry.
4. Propose one ranking or merchandising adjustment at a time, with rollback
   criteria.

## Decision Rules

- If errors rise, fix technical health before changing ranking.
- If no-result or dead-end rates rise, improve matching and filter clarity before
  adding more card chrome.
- If purchases fall but clicks hold, inspect template detail and checkout.
- If clicks fall but impressions hold, inspect card trust signals and result
  quality.
- If established creators gain share while new creator exposure falls, add
  discovery lanes rather than weakening relevance globally.
- If new creator exposure rises but conversion falls, improve qualification and
  merchandising instead of removing the lane.
