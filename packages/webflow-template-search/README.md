# Webflow Template Search

Cloudflare Worker and D1 search index for the Webflow template marketplace.

## Routes

- `GET /health`
- `GET /api/templates/search`
- `GET /api/templates/client.js`
- `POST /api/templates/admin/rebuild`
- `POST /api/templates/admin/sync`

## Sync auth

Use `Authorization: Bearer <SYNC_ADMIN_TOKEN>` or `X-API-Key`.

## Full rebuilds

Full rebuilds are resumable. Each `POST /api/templates/admin/rebuild` invocation processes a bounded number of Airtable pages and returns `complete: false` with `next_offset` until the full corpus is indexed.

Set `FULL_SYNC_PAGE_LIMIT` and `FULL_SYNC_PAGE_SIZE` to control how much Airtable data is processed per rebuild invocation.
Set `LOOKUP_CACHE_TTL_SECONDS` to cache styles, child categories, and tags in D1 `sync_state` instead of refetching them on every sync.

## Client takeover

This worker is designed to replace the existing Webflow-native search experience in place, on the same public marketplace URLs:

- `/templates/search?query=agency`
- `/templates/category/<slug>`
- `/templates/subcategory/<slug>`
- `/templates/featured`
- `/templates/free`

The client script already understands Webflow's current `query` URL parameter and preserves that public URL shape during interactions, while using the worker API behind the scenes.

### Rollout

1. Start in `shadow` mode to compare the worker results against the current page without changing the UI.
2. Switch to `active` mode to let the worker render the results grid, facet controls, pills, pagination, query heading text, and no-results chrome.
3. Keep the public URL unchanged. Do not move the experience to a separate `/search` route unless you also plan a redirect or canonical migration.

### Integration snippet

```html
<script>
  window.__WEBFLOW_TEMPLATE_SEARCH__ = {
    mode: 'active',
    apiBaseUrl: 'https://webflow-template-search.createsomething.workers.dev',
    queryParamKey: 'query',
    experimentKey: 'template-search-marketplace',
    experimentVariant: 'worker-active'
  };
</script>
<script defer src="https://webflow-template-search.createsomething.workers.dev/client.js"></script>
```

### Query-specific takeover

If you need a temporary targeted rollout, you can restrict active takeover to specific queries and leave Webflow native search in place for everything else:

```html
<script>
  window.__WEBFLOW_TEMPLATE_SEARCH__ = {
    mode: 'active',
    apiBaseUrl: 'https://webflow-template-search.createsomething.workers.dev',
    queryParamKey: 'query',
    activeQueryValues: ['marketplace']
  };
</script>
<script defer src="https://webflow-template-search.createsomething.workers.dev/client.js"></script>
```

With `activeQueryValues`, the worker only takes over when the current query matches one of those normalized values. If a user starts on `marketplace` and then searches for something else, the client hands control back to the native page by reloading the public search URL.

### 50/50 experiment snippet

For a simple 50/50 split on the existing marketplace page, keep the native experience as control and let the worker take over only for treatment:

```html
<script>
  window.__WEBFLOW_TEMPLATE_SEARCH__ = {
    apiBaseUrl: 'https://webflow-template-search.createsomething.workers.dev',
    queryParamKey: 'query',
    experimentKey: 'template-search-marketplace',
    experimentSplit: 0.5,
    experimentControlVariant: 'control',
    experimentTreatmentVariant: 'treatment',
    experimentModeByVariant: {
      control: 'shadow',
      treatment: 'active'
    }
  };
</script>
<script defer src="https://webflow-template-search.createsomething.workers.dev/client.js"></script>
```

The client stores the assigned variant in `localStorage`, so the same browser stays in the same bucket across visits unless you clear storage or override `experimentVariant` explicitly.

At runtime, the client also exposes the resolved assignment on `window.__WEBFLOW_TEMPLATE_SEARCH_RUNTIME__` and mirrors it to the root element as:

- `data-template-search-variant`
- `data-template-search-mode`

### Controlled 100-result rendering

If you want the search page takeover to render up to `100` results per query instead of the marketplace default `24`, set both `pageSize` and `minimumPageSize`:

```html
<script>
  window.__WEBFLOW_TEMPLATE_SEARCH__ = {
    mode: 'active',
    apiBaseUrl: 'https://webflow-template-search.createsomething.workers.dev',
    queryParamKey: 'query',
    pageSize: 100,
    minimumPageSize: 100
  };
</script>
<script defer src="https://webflow-template-search.createsomething.workers.dev/client.js"></script>
```

This forces the first render window to request `100` results from the worker without requiring `page_size=100` in the public URL. The API is capped at `100` results per page, so anything beyond that should still use pagination or a future load-more flow.

### Experiment notes

In `active` mode the client now detaches the live marketplace controls from native listeners, hides the native results grid, and renders into an owned grid beside it. That keeps the custom experience from being re-filtered by Webflow or Finsweet scripts on the page.

The client also emits experiment-safe analytics hooks through `window.amplitude.track(...)` when available, with a legacy `amplitude.getInstance().logEvent(...)` fallback:

- `Template Search Experiment Assigned`
- `Template Search Experiment Exposed`
- `Template Search Performed`
- `Template Search DOM Mismatch`
- `Template Search Result Clicked`
- `Template Search Request Failed`

Each event includes the configured experiment key and variant, query, normalized query, and the visible DOM result count so you can compare backend recall against what users actually saw.

### Expected DOM hooks

The client script can reuse the current marketplace markup, but the takeover is more reliable if the page exposes stable hooks:

- `data-template-search-results`
- `data-template-search-result-item`
- `data-template-search-card-template`
- `data-template-search-pagination`
- `data-template-search-subcategory-pills`
- `data-template-search-input`
- `data-template-search-query-text`
- `data-template-search-sort`
- `data-template-search-style`
- `data-template-search-type`
- `data-template-search-free`
- `data-template-search-empty`
- `data-template-search-no-results`
- `data-template-search-featured-heading`

If those hooks are not available, the script falls back to the current `.tm-*` marketplace selectors where possible.

If the native page only contains FAQ-style search cards instead of real template cards, the client now generates its own marketplace card shell and binds worker results into that structure. That lets queries like `marketplace` render properly even when the native page is in its broken FAQ state.

When you cut over to `active` mode, remove or disable legacy `DOMContentLoaded` scripts that only set `#search-term`, `#no-results`, or `#featuredHeading` once. The takeover script now owns those elements and keeps them in sync after client-side query changes.

## Ranking config

Set `SEARCH_RANKING_CONFIG_JSON` to tune text-field weights, broad-query concept weights, head-term profiles, business-signal weights, and long-description indexing limits.

The shipped profile assumes `Popularity Score` is derivative and leaves its weight at `0`, leans hard on structured taxonomy fields, and keeps long-description influence very low to reduce keyword gaming. It also treats short one-word queries as more title-sensitive, while keeping multi-word discovery queries taxonomy-first.

### Signal weights

| Signal | Default | Purpose |
|--------|---------|---------|
| `text` | 4.5 | BM25 full-text relevance (strongest single signal) |
| `categoryMatch` | 2.5 | Boosts templates in query-matching categories — anti-name-gaming |
| `purchases` | 1.15 | Smoothed purchase demand |
| `conversionRate` | 0.95 | Smoothed purchases/viewers ratio |
| `freshness` | 0.35 | Bounded recency lift for newer templates |
| `creatorTrackRecord` | 0.3 | Bounded prior from a creator's proven portfolio |
| `creatorDiversity` | 0.4 | Slightly favors the first strong result per creator |
| `exactTitle` | 0.85 | Mild boost when query appears in template name |
| `revenue` | 0.7 | Smoothed revenue demand |
| `intentCoverage` | 1.2 | Rewards templates that cover more distinct query tokens across title and taxonomy |
| `querySaturation` | 0.35 | Demotes repeated query stuffing in descriptions |
| `views` | 0.05 | Unique viewer count (low weight — easily gamed) |
| `popularity` | 0 | Airtable Popularity Score (derivative, disabled) |

### Text weights (BM25 per-field)

| Field | Default | Notes |
|-------|---------|-------|
| `childCategories` | 12 | Highest — curated taxonomy plus Airtable Related Keywords |
| `name` | 9 | Template name |
| `categoryGroups` | 5 | Broad category groups |
| `descriptionShort` | 2 | Short description |
| `styles` | 1.3 | Design styles |
| `tags` | 0.8 | Tags |
| `descriptionLong` | 0.1 | Truncated to `longDescriptionMaxChars` to limit keyword gaming |

### Concept field weights

These weights drive broad head-term concept assignment. They decide how much structured metadata beats incidental copy when a result is classified into marketplace concepts like `jobs`, `directory`, or `retail`.

| Field | Default | Notes |
|-------|---------|-------|
| `childCategories` | 7 | Strongest structured signal |
| `tags` | 6 | Curated marketplace metadata |
| `categoryGroups` | 5 | Broad but still structured |
| `name` | 3 | Useful, but easier to game |
| `descriptionShort` | 1 | Weak lexical hint |
| `descriptionLong` | 0.5 | Weakest, mostly tie-breaking |

### Controls

| Control | Default | Purpose |
|---------|---------|---------|
| `longDescriptionMaxChars` | 350 | Caps indexed long-description text |
| `reciprocalRankOffset` | 20 | Smoothing constant for reciprocal rank fusion |
| `conversionRateSmoothingViews` | 50 | Minimum "virtual viewers" for conversion rate |
| `conversionRateSmoothingPurchases` | 1 | Prior purchases added to conversion-rate numerator |
| `taxonomyPrecedenceMinQueryLength` | 5 | Min query length before taxonomy buckets activate |
| `shortQueryMaxTokens` | 1 | Max token count for title-sensitive query mode |
| `shortQueryMaxChars` | 12 | Max query length for title-sensitive query mode |
| `shortQueryTextWeightMultiplier` | 0.2 | Reduces BM25 pressure for short title queries |
| `shortQueryExactTitleWeightMultiplier` | 2 | Extra exact-title weight for short title queries |
| `shortQueryCategoryWeightMultiplier` | 0.35 | Reduces taxonomy pressure on short title queries |
| `purchaseSmoothingViews` | 1200 | Viewer discount used for purchase-demand scoring |
| `purchaseSmoothingPrior` | 0.5 | Prior purchases added before purchase smoothing |
| `revenueSmoothingViews` | 1200 | Viewer discount used for revenue-demand scoring |
| `revenueSmoothingPrior` | 25 | Prior revenue added before revenue smoothing |
| `freshnessHalfLifeDays` | 45 | Days required for freshness lift to halve |
| `querySaturationThreshold` | 3 | Description occurrences allowed before anti-gaming kicks in |
| `creatorDiversityRerankWindowSize` | 72 | Candidate window used for page-local diversity reranking |
| `creatorDiversityRerankMaxPages` | 2 | Number of early pages that receive the local diversity pass |
| `creatorDiversityRerankPenalty` | 0.25 | Per-repeat decay applied inside the local diversity window |
| `creatorDiversityRerankScoreTolerance` | 0.2 | Score and business margin required to skip the diversity penalty |
| `headTermConceptRerankWindowSize` | 96 | Candidate window used for broad-query concept reranking |
| `headTermConceptRerankMaxPages` | 2 | Number of early pages that receive the concept rerank |
| `headTermConceptRerankPenalty` | 1 | Per-repeat concept decay inside the concept rerank window |
| `headTermConceptRerankScoreTolerance` | 0.5 | Margin required before a repeated concept keeps its place |
| `headTermConceptProtectedSlots` | 5 | Default number of early slots protected from over-repeating one concept |
| `headTermCorroborationPenalty` | 1.25 | Extra decay for penalized concepts without corroborating marketplace metadata |
| `creatorTrackRecordMinTemplates` | 2 | Minimum creator portfolio size before the cold-start prior applies |
| `relaxedQueryMinTokens` | 3 | Minimum filtered token count before sparse-query fallback can activate |
| `relaxedQueryMaxTokens` | 6 | Maximum filtered token count eligible for sparse-query fallback |
| `relaxedQueryResultThreshold` | 12 | Strict-result ceiling below which the query falls back to drop-one-token recall |

### Head-term profiles

Broad discovery queries like `marketplace`, `directory`, `job board`, `multi-vendor`, and `ecommerce` are driven by `headTermProfiles`. Profiles merge by `id` from `SEARCH_RANKING_CONFIG_JSON`, so you can override one profile without replacing the built-in set.

Each profile can control:
- `triggers`, `ftsPhrases`, and `taxonomyPhrases`
- `conceptBuckets`
- `requiredPhraseGroups` inside a concept bucket when an overlap concept should only apply if multiple phrase families are present
- `corroborationPhrases` and `corroborationPenaltyConcepts`
- `protectedSlotConceptCaps`
- `protectedSlotCount`

### Example config

```json
{
  "textWeights": {
    "name": 9,
    "descriptionShort": 2,
    "descriptionLong": 0.1,
    "categoryGroups": 5,
    "childCategories": 12,
    "styles": 1.3,
    "tags": 0.8
  },
  "conceptFieldWeights": {
    "categoryGroups": 5,
    "childCategories": 7,
    "tags": 6,
    "name": 3,
    "descriptionShort": 1,
    "descriptionLong": 0.5
  },
  "signalWeights": {
    "text": 4.5,
    "popularity": 0,
    "views": 0.05,
    "purchases": 1.15,
    "conversionRate": 0.95,
    "revenue": 0.7,
    "freshness": 0.35,
    "creatorTrackRecord": 0.3,
    "creatorDiversity": 0.4,
    "exactTitle": 0.85,
    "categoryMatch": 2.5,
    "intentCoverage": 1.2,
    "querySaturation": 0.35
  },
  "controls": {
    "longDescriptionMaxChars": 350,
    "reciprocalRankOffset": 20,
    "conversionRateSmoothingViews": 50,
    "conversionRateSmoothingPurchases": 1,
    "taxonomyPrecedenceMinQueryLength": 5,
    "shortQueryMaxTokens": 1,
    "shortQueryMaxChars": 12,
    "shortQueryTextWeightMultiplier": 0.2,
    "shortQueryExactTitleWeightMultiplier": 2,
    "shortQueryCategoryWeightMultiplier": 0.35,
    "purchaseSmoothingViews": 1200,
    "purchaseSmoothingPrior": 0.5,
    "revenueSmoothingViews": 1200,
    "revenueSmoothingPrior": 25,
    "freshnessHalfLifeDays": 45,
    "querySaturationThreshold": 3,
    "creatorDiversityRerankWindowSize": 72,
    "creatorDiversityRerankMaxPages": 2,
    "creatorDiversityRerankPenalty": 0.25,
    "creatorDiversityRerankScoreTolerance": 0.2,
    "headTermConceptRerankWindowSize": 96,
    "headTermConceptRerankMaxPages": 2,
    "headTermConceptRerankPenalty": 1,
    "headTermConceptRerankScoreTolerance": 0.5,
    "headTermConceptProtectedSlots": 5,
    "headTermCorroborationPenalty": 1.25,
    "creatorTrackRecordMinTemplates": 2,
    "relaxedQueryMinTokens": 3,
    "relaxedQueryMaxTokens": 6,
    "relaxedQueryResultThreshold": 12
  },
  "headTermProfiles": [
    {
      "id": "marketplace",
      "protectedSlotCount": 8,
      "protectedSlotConceptCaps": {
        "job-directory": 1,
        "jobs": 1
      }
    }
  ]
}
```

Because head-term profiles merge by `id`, the example above only overrides the built-in `marketplace` profile's first-page concept cap. It does not replace the shipped triggers, concept buckets, or corroboration phrases.

## How ranking works

Search uses a two-stage ranking pipeline:

1. **BM25 full-text search** via FTS5 with per-field text weights — finds candidates matching the query
2. **Reciprocal rank fusion** blends multiple signals (text relevance, purchases, revenue, conversion rate, freshness, creator track record, creator diversity, category match, exact title match, query saturation) into a single blended score

Child-category recall is expanded with Airtable `Related Keywords`. Those curated keywords are indexed into the taxonomy search text and also count as category evidence for the `categoryMatch` signal, so discovery terms like `handmade` can retrieve the right templates even when creators never typed that word into the listing copy.

Search also applies a bounded singular/plural expansion pass at query time. That lets short lexical variants like `crafts`/`craft` and `agencies`/`agency` share the same candidate set and bucket logic without introducing a broader synonym system.

For multi-word queries, the `name` and taxonomy buckets count token coverage rather than requiring the exact phrase to appear contiguously. That means searches like `portfolio agency` and `arts craft store` still give structured title/category credit when the words are separated by punctuation or order.

Low-information wrapper words like `template`, `website`, `best`, and `top` are also dropped before lexical candidate generation when more meaningful tokens remain. That keeps queries like `best portfolio agency template` anchored on the actual intent instead of generic marketplace filler.

For a small set of ambiguous, high-value head terms, search also uses curated query expansions instead of relying on raw lexical overlap alone. Queries like `marketplace`, `directory`, `job board`, `multi-vendor`, and `ecommerce` expand into a bounded set of related marketplace concepts for candidate recall, then reuse those concepts as taxonomy evidence so relevant category matches can outrank unrelated templates that only mention the head term in copy.

When a longer filtered query still produces too few strict FTS candidates, search falls back to a bounded drop-one-token lexical query instead of opening the floodgates with a broad OR. That widens sparse intent-heavy searches like `portfolio agency consultants` or `online arts craft shop` without changing how the later title, taxonomy, and business signals rank the returned candidates.

For longer searches, the ranker also computes a distinct-token `intentCoverage` signal across the template name plus curated taxonomy text. That gives a lift to results covering more of the query's actual concepts, so a template that matches `arts`, `craft`, `shop`, and `pottery` will beat one that only matches `craft` plus strong legacy demand.

Additionally, two discrete bucket sorts can override the blended score:

- **Title-match precedence** — templates with any title match sort above description-only matches, but ties inside that title band fall back to the blended business score
- **Taxonomy precedence** — for multi-word or longer queries (>= `taxonomyPrecedenceMinQueryLength` chars), templates matching in category/child-category fields sort above name-only matches
- **Name query match** — templates with the query in their name sort above description-only matches

For short one-word title queries, the reranker also damps the full-text BM25 signal with `shortQueryTextWeightMultiplier` so better-converting title matches can outrank weaker lexical matches.

The ranker also computes a `querySaturation` signal from repeated query occurrences in the short and long descriptions. Once a listing repeats the query more than `querySaturationThreshold` times, it starts losing blended-rank ground to cleaner matches. This is meant to curb description-level keyword stuffing without punishing a normal short description plus one natural long-description mention.

Freshness is handled as a bounded half-life decay rather than a raw newest-first sort. A template gets the most lift near publication, then that lift gradually halves every `freshnessHalfLifeDays`. This gives strong new listings some exposure without letting recency swamp the conversion and revenue signals.

Creator diversity is also bounded in two places. The blended rank slightly rewards the first strong result per creator in the filtered candidate set, and then a second page-local rerank pass reorders only the first candidate window for the first few pages. That local pass decays repeated creators, but only when their next listing is still close to the best alternative from another creator. If the repeated listing is materially stronger on score, purchases, or revenue, the penalty is skipped.

Creator track record is the cold-start prior. It looks at the creator's existing indexed portfolio and computes a bounded demand prior from the creator's average smoothed purchase performance. The prior only activates once a creator has at least `creatorTrackRecordMinTemplates` indexed templates, so single-template creators do not self-bootstrap off their own lone result.

### Anti-name-gaming

The `categoryMatch` signal specifically combats name-gaming, where template creators stuff keywords into titles without being in a relevant category. Categories are curated (two levels: category groups and child categories), so they're harder to game than titles.

**Observed effect** (query: "craft"):
- Templates genuinely in "Arts & Crafts Store" child category hold positions 1-8
- Templates named "Craft*" but in "Portfolio & Agency" (no craft category) rank 9-20
- A template with 366 purchases ("Crafted") correctly ranks below 7-purchase templates that are in the right category

All weights are tunable at runtime via `SEARCH_RANKING_CONFIG_JSON` without redeploying code.

## Changelog

### 2026-03-30: categoryMatch signal

Added `categoryMatch` reciprocal rank fusion signal (default weight 2.5) that boosts templates in query-matching categories. Tested live on "craft" query — Arts & Crafts Store templates hold top 8 positions above Portfolio & Agency name-gamers with higher purchase counts.

### 2026-04-06: curated head-term mapping

Added a bounded curated expansion layer for ambiguous marketplace-intent queries like `marketplace`, `directory`, `job board`, `multi-vendor`, and `ecommerce`. These head terms now widen candidate recall with a small hand-picked concept set and count those concepts as taxonomy evidence, so relevant directory / job portal / retail templates can beat unrelated lexical matches.

### 2026-03-29: exactTitle signal

Added `exactTitle` signal (default weight 0.85) that gives a mild boost when the search query appears in the template name. Exact match scores 2, contains scores 1.

### 2026-03-28: Reciprocal rank fusion, cumulative revenue

Replaced single-signal sorting with multi-signal reciprocal rank fusion. Added `cumulative_revenue` column and signal. Added taxonomy precedence buckets, long-description truncation, and externalized ranking config via `SEARCH_RANKING_CONFIG_JSON`.

### 2026-03-27: Resumable full sync, lookup caching

Full rebuilds now paginate across multiple invocations. Lookup tables (styles, child categories, tags) cached in D1 with configurable TTL.
