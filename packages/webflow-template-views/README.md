# webflow-template-views

First-party view beacon for the Webflow Template Marketplace.

## Why this exists

On 2026-07-21 the marketing Segment decoupling (webflow/webflow#112237)
intentionally stopped all Segment events from webflow.com marketing pages —
including the Templates marketplace, which is a Webflow site loading the
marketing bundle. `Template Marketplace Viewed` stopped flowing to
Amplitude/Snowflake/Airtable, freezing the `📋 Unique Viewers` field that fed
the creator Asset Dashboard. The promised GA4 replacement covers baseline GA4
pageviews only; a GA4 → Snowflake pipeline for custom events was explicitly
not committed.

This worker collects views directly from the marketplace site's custom code,
independent of Segment/GA4/Amplitude, with no MTU cost.

The Asset Dashboard's viewer widgets are gated off behind
`packages/webflow-dashboard/src/lib/config/viewer-data.ts`
(`VIEWER_DATA_AVAILABLE = false`) until this beacon has collected enough
history to restore them. Beacon-era data must never be compared against
pre-2026-07-21 numbers — it is a new epoch with different semantics.

## Architecture

```
Templates site custom code (docs/site-snippet.html)
  └─ navigator.sendBeacon POST /v   (text/plain JSON, no preflight)
       └─ Worker: bot filter → validate → D1 daily rollup (+ Analytics Engine)
            └─ GET /stats (Bearer STATS_API_KEY) → webflow-dashboard
```

- **D1 `template_views_daily`** — durable rollup: `(day, slug) → views, sessions`.
  `sessions` counts beacons flagged as first-view-this-browser-session
  (client sessionStorage dedupe) — the unique-viewers stand-in.
- **Analytics Engine `webflow_template_views`** — optional per-event stream
  (slug, path, referrer host) for richer analysis; 90-day retention.
- No PII stored: no IPs, no user agents, no cookies.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/v` | none (CORS-restricted origins) | Beacon ingest |
| GET | `/stats?slug=&days=30` | `Authorization: Bearer <STATS_API_KEY>` | Daily rollups |
| GET | `/` | none | Health |

## Deploy

Requires an infisical session for wrangler auth (`infisical login`).

```bash
# one-time
pnpm --filter=@create-something/webflow-template-views exec wrangler d1 create webflow-template-views
# paste database_id into wrangler.toml, then:
pnpm --filter=@create-something/webflow-template-views exec wrangler d1 migrations apply webflow-template-views --remote
pnpm --filter=@create-something/webflow-template-views exec wrangler secret put STATS_API_KEY

# every deploy
pnpm --filter=@create-something/webflow-template-views deploy
```

Then install `docs/site-snippet.html` in the Template Marketplace site's
Footer Code (Site Settings → Custom Code) with the deployed URL, and publish
the site.

## Restoring the dashboard widget

Once ~30 days of beacon history exist:

1. Add a fetch of `GET /stats` to `webflow-dashboard` (server-side, using
   `STATS_API_KEY`), keyed by the asset's CMS slug (`🥞CMS Slug` — same slug
   as the marketplace URL).
2. Flip `VIEWER_DATA_AVAILABLE` to `true` and point the viewer widgets at the
   beacon data instead of the frozen Airtable `📋 Unique Viewers` field.
3. Label the metric with the new epoch ("views since Aug 2026") so creators
   don't compare it against pre-outage numbers.
