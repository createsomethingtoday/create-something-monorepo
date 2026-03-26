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

Example:

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
    "exactTitle": 0.85
  },
  "controls": {
    "longDescriptionMaxChars": 350,
    "reciprocalRankOffset": 20,
    "conversionRateSmoothingViews": 50,
    "taxonomyPrecedenceMinQueryLength": 5
  }
}
```
