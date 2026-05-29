# Public Web Data Provider Routing

- Status: `draft`
- Owner: `CREATE SOMETHING integration architecture`
- Linear: `CRE-420`
- Last reviewed: `2026-05-22`

## Purpose

This document codifies how CREATE SOMETHING should route public web data collection work between Bright Data, Apify, and house-built adapters.

The decision is to codify around CREATE SOMETHING use cases, schemas, and policy boundaries first. Bright Data should be the default durable backend for production public web and social data collection. Apify remains a fast actor marketplace, prototyping lane, and fallback for existing low-volume workflows where a maintained Actor is already good enough.

## Operating Rule

Do not build product logic directly around vendor-specific names such as "Bright Data Instagram scraper" or "Apify Actor output" unless the code is clearly inside the provider adapter.

Use house-level capabilities instead:

- `public_social_posts`
- `public_social_profiles`
- `public_web_page_extract`
- `public_web_browser_session`
- `serp_results`

Provider-specific details belong in routing configuration, adapter code, fixtures, and operational runbooks.

## Three-Tier Mapping

| Tier | Responsibility |
|------|----------------|
| Database | Store normalized records, raw provider payloads, provenance, provider run IDs, timestamps, and cost/error evidence. |
| Automation | Execute provider adapters, retries, scheduling, async job polling, warehouse delivery, and fallback routing. |
| Judgment | Decide provider selection, legality/compliance gates, spend thresholds, promotion from smoke to production, and whether fallback is allowed. |

## Default Routing

| Use case | Default | Secondary | Notes |
|----------|---------|-----------|-------|
| Public Instagram post monitoring | Bright Data Social Media Scraper API | Apify Instagram Actor | Use Bright Data for durable production monitoring; keep Apify during shadow validation and for quick actor-based tests. |
| Public Instagram profile enrichment | Bright Data Social Media Scraper API | Apify profile Actor | Profiles are enrichment data, not the primary post-monitoring lane. |
| Public X/Twitter monitoring | Bright Data Social Media Scraper API | Apify Actor or official API where available | Prefer Bright Data for public extraction; prefer official APIs for account-owned/authenticated actions. |
| JS-heavy public venue pages | Bright Data Browser API or Web Unlocker API | House browser worker | Browser API fits pages requiring rendering, interaction, or in-browser unblocking. |
| Simple public site crawl | Bright Data Crawl API or house crawler | Apify crawler Actor | Choose by volume, freshness, and required delivery target. |
| Official platform actions | Official API via house MCP or Composio plumbing | None by default | Scrapers are not a substitute for authenticated first-party actions. |

## Bright Data Routes Captured For Kickstand

These routes came from the Bright Data console flow reviewed on `2026-05-22`. They should be treated as candidate routes until smoke tests confirm response shape, latency, and cost.

### Instagram posts: discover by profile URL

- Capability: `public_social_posts`
- Provider route ID: `bright_data.instagram.posts.discover_by_url`
- Dataset ID: `gd_lk5ns7kz21pck8jpis`
- Endpoint: `POST /datasets/v3/scrape`
- Access path: direct Bright Data API route from the Bright Data console
- Query:
  - `notify=false`
  - `include_errors=true`
  - `type=discover_new`
  - `discover_by=url`
- Input shape:

```json
{
  "input": [
    {
      "url": "https://www.instagram.com/example/",
      "num_of_posts": 10,
      "post_type": "Post"
    }
  ]
}
```

Use this as the first Bright Data pilot for Kickstand's public Instagram monitoring.

Important connector note: the Composio Bright Data `brightdata_crawl_api` wrapper did not exercise this profile-discovery route in the `2026-05-22` smoke. Passing a profile URL to that wrapper against `gd_lk5ns7kz21pck8jpis` returned `It is not a post URL`. Use the direct Bright Data `/datasets/v3/scrape?...type=discover_new&discover_by=url` API path for this route unless the Composio wrapper adds first-class support for dataset scraper query modes.

Observed direct smoke on `2026-05-22`: Infisical-injected `BRIGHT_DATA_API_TOKEN` against `https://www.instagram.com/zoobarcelona/` with `num_of_posts: 1` returned HTTP `200`, content type `application/jsonl; charset=utf-8`, and one Instagram post record. The record was returned as a single JSON object rather than a JSON array, so adapters must handle arrays, single-record JSON objects, JSONL lines, and snapshot IDs.

### Instagram posts: collect known post URLs

- Capability: `public_social_posts`
- Provider route ID: `bright_data.instagram.posts.collect_by_url`
- Dataset ID: `gd_lk5ns7kz21pck8jpis`
- Endpoint: `POST /datasets/v3/scrape`
- Access path: direct Bright Data API or Composio Bright Data `brightdata_crawl_api`
- Query:
  - `notify=false`
  - `include_errors=true`
- Input shape:

```json
{
  "input": [
    {
      "url": "https://www.instagram.com/p/example"
    }
  ]
}
```

Use this for backfills, spot checks, and permalink-level verification.

Observed smoke on `2026-05-22`: Composio Bright Data `brightdata_crawl_api` with one known Instagram post URL returned snapshot `sd_mph2g3a31vsn4lm52p`, status `ready`, `records: 1`, `errors: 0`. Returned fields included `url`, `shortcode`, `description`, `date_posted`, `likes`, `num_comments`, `hashtags`, `images`, `photos`, `thumbnail`, `profile_url`, `user_posted`, `followers`, `location`, and `latest_comments`.

### Instagram profiles: discover by username

- Capability: `public_social_profiles`
- Provider route ID: `bright_data.instagram.profiles.discover_by_user_name`
- Dataset ID: `gd_l1vikfch901nx3by4`
- Endpoint: `POST /datasets/v3/scrape`
- Access path: direct Bright Data API route from the Bright Data console
- Query:
  - `notify=false`
  - `include_errors=true`
  - `type=discover_new`
  - `discover_by=user_name`
- Input shape:

```json
{
  "input": [
    {
      "user_name": "zoobarcelona"
    }
  ]
}
```

Use this for profile enrichment and account-health checks.

## Kickstand Pilot Recommendation

Start with a shadow pilot, not an immediate migration.

1. Keep the current Apify Instagram monitor live as the control path.
2. Add a Bright Data adapter behind the same normalized `public_social_posts` interface.
3. Use Composio Bright Data for known-post verification and dataset inventory.
4. Use direct Bright Data API credentials for the profile-discovery route unless/until the Composio wrapper supports `type=discover_new&discover_by=url`.
5. Run a synchronous Bright Data smoke against 1-3 public venue profiles with `num_of_posts: 10`.
6. Compare Bright Data results to the existing Kickstand Airtable fields:
   - permalink
   - caption/text
   - timestamp
   - media URL
   - engagement counts
   - duplicate detection key
   - artist/event extraction yield
7. Move to async Bright Data jobs only after the field map and error behavior are documented.
8. Keep Apify as fallback until Bright Data has passed at least one full scheduled monitoring window.

## Apify vs Bright Data Data Fit

Kickstand's current Instagram path expects a narrow Apify-shaped object:

| Kickstand field | Current Apify field | Observed Bright Data field |
|-----------------|---------------------|----------------------------|
| post ID | `id` or `shortCode` | `post_id`, `pk`, `shortcode`, or `content_id` |
| post URL | `url` or built from `shortCode` | `url` |
| caption/content | `caption` | `description` |
| post date | `timestamp` | `date_posted` |
| likes | `likesCount` | `likes` |
| comments | `commentsCount` | `num_comments` |
| video count | `videoPlayCount` or `videoViewCount` | route-specific; not present in the known-photo smoke |
| media type | `type` or video fields | `content_type`, `post_content[].type`, `photos_number` |

Bright Data is not a drop-in replacement for the existing Apify result shape, but it returns enough data for Kickstand's current Airtable records and artist extraction flow. It also returns richer metadata such as `hashtags`, `images`, `photos`, `thumbnail`, `profile_url`, `user_posted`, `followers`, `location`, and `latest_comments`.

Practical implication: build a provider adapter that normalizes Bright Data records into the existing Kickstand post interface. Do not rewrite the Airtable or artist-extraction layers first. The adapter should tolerate Bright Data's direct API returning immediate JSONL/single-record responses for small synchronous jobs.

### Actual Kickstand Record Comparison

Observed on `2026-05-22` using a recent Kickstand Airtable `Instagram Posts` record created by the current Apify-backed system:

- Airtable record: `recw8pzCWwaBiWufW`
- Instagram URL: `https://www.instagram.com/p/DYkjh7HlNPO/`
- Airtable/Kickstand post ID: `3901399440058274766`
- Bright Data snapshot: `sd_mph2n51y288l4wpcca`
- Bright Data status: `ready`, `records: 1`, `errors: 0`

Core parity:

| Field | Airtable / current system | Bright Data |
|-------|---------------------------|-------------|
| post ID | `3901399440058274766` | `post_id` and `pk`: `3901399440058274766` |
| post URL | `https://www.instagram.com/p/DYkjh7HlNPO/` | `url`: same |
| caption/content | same caption prefix beginning `JUST ANNOUNCED` | `description`: same caption text |
| post date | `2026-05-20T18:51:17.000Z` | `date_posted`: same |
| likes | `5` | `likes`: `5` |
| comments | `0` | `num_comments`: `0` |
| media type | `Carousel` | `content_type`: `Carousel` |

Bright Data also returned useful enrichment that the current Airtable row does not preserve directly: `shortcode`, `hashtags`, `photos`, `images`, `thumbnail`, `profile_url`, `user_posted`, `followers`, `location_details`, and `tagged_users`.

System fields such as `Discovered At`, `Engagement Score`, `Status`, urgency keyword detection, and artist extraction should remain computed by Kickstand. They should not be trusted to come from the provider.

## Direct API vs Composio

Use both, but not for the same job layer.

| Access path | Best for | Pros | Cons |
|-------------|----------|------|------|
| Direct Bright Data API | Production provider adapter, profile discovery, high-volume scheduled jobs | Exact access to Bright Data scraper modes such as `type=discover_new&discover_by=url`; clearer parity with Bright Data console docs; fewer wrapper semantics; easier to tune async polling and delivery. | Requires direct token storage, provider-specific adapter code, direct rate/cost/error handling, and more ownership of retries and observability. |
| Composio Bright Data | Operator testing, dataset inventory, known-post verification, broad MCP reachability | Centralized connection/account handling; useful through the hub; works for dataset inventory and known-post collection; aligns with brokered discovery policy. | Current wrapper does not expose the Instagram profile `discover_by=url` mode; extra abstraction can hide provider-specific errors; not sufficient as the only production path for Kickstand monitoring. |
| Apify direct API | Current Kickstand control path and fallback | Already wired into Kickstand; actor run/dataset flow fits existing monitor code; simple actor-level retries. | Prior evidence shows token/quota/actor-ID operational fragility; actor output quality depends on actor maintenance; less ideal as the durable enterprise data backend. |

Recommendation:

- Use direct Bright Data API for the production Kickstand adapter.
- Use Composio Bright Data for hub-mediated operator tests, dataset discovery, and known-post spot checks.
- Keep Apify direct as the control/fallback path until Bright Data profile discovery passes shadow monitoring.

## Smoke Test Command

Use the repository smoke script for the first live Bright Data check. The script reads `BRIGHT_DATA_API_TOKEN` or `API_TOKEN` from the environment and never prints the token.

```bash
BRIGHT_DATA_API_TOKEN="..." pnpm brightdata:instagram:smoke -- \
  --mode posts-discover-by-url \
  --url https://www.instagram.com/zoobarcelona/ \
  --limit 10 \
  --post-type Post
```

For a redacted request preview without spending Bright Data credits:

```bash
pnpm brightdata:instagram:smoke -- --dry-run
```

For a known-post backfill or verification smoke:

```bash
BRIGHT_DATA_API_TOKEN="..." pnpm brightdata:instagram:smoke -- \
  --mode posts-collect-by-url \
  --url https://www.instagram.com/p/Cuf4s0MNqNr
```

## Promotion Gates

Do not promote a provider route from candidate to default until there is evidence for:

- Non-empty data on representative public profiles.
- Stable normalized field map.
- Duplicate behavior understood.
- Provider error payloads captured and classified.
- Cost per successful record estimated.
- Latency acceptable for the job schedule.
- Secrets stored outside the repo.
- Rollback path documented.

## Compliance Boundaries

- Public data only.
- No private, logged-in-only, DM, restricted, or access-controlled data.
- No fake engagement, fake account behavior, spam, impersonation, or account automation.
- Prefer official platform APIs for account-owned operations and writes.
- Store provider raw payloads only when needed for audit/debugging, and attach retention rules before scaling.

## Implementation Notes

- Config source: `config/provider-routing/public-web-data.v1.json`
- Existing MCP registry entries:
  - `composio-toolkit-brightdata`
  - `composio-toolkit-apify`
- Broad provider tool catalogs should remain brokered per `docs/MCP_CATALOG_EXPOSURE_POLICY.md`.
- The client-facing surface should remain a CREATE SOMETHING capability or MCP, not a provider-branded tool dump.
