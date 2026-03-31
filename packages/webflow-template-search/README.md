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

## Ranking config

Set `SEARCH_RANKING_CONFIG_JSON` to tune text-field weights, business-signal weights, and long-description indexing limits.

The shipped profile assumes `Popularity Score` is derivative and leaves its weight at `0`, leans hard on structured taxonomy fields, and keeps long-description influence very low to reduce keyword gaming. You can offset the taxonomy-first behavior for very short queries by raising `taxonomyPrecedenceMinQueryLength`, and add a literal-title bonus with `exactTitle`.

### Signal weights

| Signal | Default | Purpose |
|--------|---------|---------|
| `text` | 4.5 | BM25 full-text relevance (strongest single signal) |
| `categoryMatch` | 2.5 | Boosts templates in query-matching categories — anti-name-gaming |
| `purchases` | 1.15 | Cumulative purchase count |
| `conversionRate` | 0.95 | Smoothed purchases/viewers ratio |
| `exactTitle` | 0.85 | Mild boost when query appears in template name |
| `revenue` | 0.7 | Cumulative revenue |
| `views` | 0.05 | Unique viewer count (low weight — easily gamed) |
| `popularity` | 0 | Airtable Popularity Score (derivative, disabled) |

### Text weights (BM25 per-field)

| Field | Default | Notes |
|-------|---------|-------|
| `childCategories` | 12 | Highest — curated taxonomy is most trustworthy |
| `name` | 9 | Template name |
| `categoryGroups` | 5 | Broad category groups |
| `descriptionShort` | 2 | Short description |
| `styles` | 1.3 | Design styles |
| `tags` | 0.8 | Tags |
| `descriptionLong` | 0.1 | Truncated to `longDescriptionMaxChars` to limit keyword gaming |

### Controls

| Control | Default | Purpose |
|---------|---------|---------|
| `longDescriptionMaxChars` | 350 | Caps indexed long-description text |
| `reciprocalRankOffset` | 20 | Smoothing constant for reciprocal rank fusion |
| `conversionRateSmoothingViews` | 50 | Minimum "virtual viewers" for conversion rate |
| `taxonomyPrecedenceMinQueryLength` | 5 | Min query length before taxonomy buckets activate |

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
  "signalWeights": {
    "text": 4.5,
    "popularity": 0,
    "views": 0.05,
    "purchases": 1.15,
    "conversionRate": 0.95,
    "revenue": 0.7,
    "exactTitle": 0.85,
    "categoryMatch": 2.5
  },
  "controls": {
    "longDescriptionMaxChars": 350,
    "reciprocalRankOffset": 20,
    "conversionRateSmoothingViews": 50,
    "taxonomyPrecedenceMinQueryLength": 5
  }
}
```

## How ranking works

Search uses a two-stage ranking pipeline:

1. **BM25 full-text search** via FTS5 with per-field text weights — finds candidates matching the query
2. **Reciprocal rank fusion** blends multiple signals (text relevance, purchases, revenue, conversion rate, category match, exact title match) into a single blended score

Additionally, two discrete bucket sorts can override the blended score:

- **Taxonomy precedence** — for multi-word or longer queries (>= `taxonomyPrecedenceMinQueryLength` chars), templates matching in category/child-category fields sort above name-only matches
- **Name query match** — templates with the query in their name sort above description-only matches

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

### 2026-03-29: exactTitle signal

Added `exactTitle` signal (default weight 0.85) that gives a mild boost when the search query appears in the template name. Exact match scores 2, contains scores 1.

### 2026-03-28: Reciprocal rank fusion, cumulative revenue

Replaced single-signal sorting with multi-signal reciprocal rank fusion. Added `cumulative_revenue` column and signal. Added taxonomy precedence buckets, long-description truncation, and externalized ranking config via `SEARCH_RANKING_CONFIG_JSON`.

### 2026-03-27: Resumable full sync, lookup caching

Full rebuilds now paginate across multiple invocations. Lookup tables (styles, child categories, tags) cached in D1 with configurable TTL.
