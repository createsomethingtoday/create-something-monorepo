# Webflow Template Search

Cloudflare Worker and D1 search index for the Webflow template marketplace.

## Routes

- `GET /health`
- `GET /api/templates/search`
- `GET /api/templates/client.js`
- `POST /api/templates/admin/rebuild`
- `POST /api/templates/admin/sync`
- `POST /api/templates/admin/sync-records`
- `GET /api/templates/admin/sync-status`
- `GET|POST /api/templates/admin/backfill-mrp`
- `POST /api/templates/admin/refresh-images`
- `POST /api/templates/admin/refresh-reviewer-picks`
- `POST /api/templates/admin/backfill-images`
- `POST /api/templates/webhooks/webflow`

## Sync auth

Use `Authorization: Bearer <SYNC_ADMIN_TOKEN>` or `X-API-Key`.

## Search filters

`GET /api/templates/search` accepts page context filters and user refinement filters:

- `scope`: `all`, `featured`, `free`, or `landing_pages`
- `category_group_slug` / `child_category_slug`: category collection-page context
- `creator_slug` / `designer_slug`: creator profile context for `/templates/designers/{slug}` pages
- `creator_record_id`: optional exact creator sync record ID for designer profile pages
- `style_slug` / `tag_slug`: style or tag collection-page context
- `styles` / `tags`: one or more user-selected refinement slugs
- `types`: one or more template types
- `free_only`, `sort`, `page`, `page_size`, and `include`

Designer profile pages should use the Webflow **Template Filter Bar** plus **Template Grid** components instead of a native Collection List when the page needs to show every published template for a creator. The components infer `creator_slug` from `/templates/designers/{slug}` automatically and can bind `creator_record_id` when the current Designer CMS item exposes the sync record ID.

## Featured creator monthly batch

Generate a read-only monthly candidate batch from Airtable for the Webflow CMS-backed
`Featured Creator Card` component:

```bash
infisical run --env=prod --path=/ -- \
  pnpm --filter @create-something/webflow-template-search featured-creators -- \
  --month 2026-06 \
  --as-of 2026-06-01 \
  --limit 12
```

The script outputs CMS-friendly JSON by default. Use `--format csv` for spreadsheet or
manual CMS-import review. Ranking is intentionally server-side and uses Airtable
Marketplace Assets fields already indexed by this package:

- current featured template count
- templates published in the last 90 days
- cumulative purchases
- unique viewers
- average popularity score
- category breadth

Review the generated rows before publishing. Public Webflow component props should receive
rounded display labels such as `52.6k buys`, not raw Airtable credentials or direct Airtable
API URLs. The generator labels Airtable attachment values as `creatorAvatarSourceUrl` and
`topTemplateImageSourceUrl`; upload those sources into Webflow assets or CMS image fields
before binding them to the public Code Component.

## Template thumbnails

The sync pipeline indexes Marketplace template metadata from Airtable, but Webflow is the
source of truth for public template thumbnails. Source precedence:

1. Webflow CMS template fields are preferred for canonical slugs, listing URLs,
   thumbnails, hover thumbnails, and carousel images when a Webflow API token is configured.
2. Airtable `Marketplace Assets` remains the metadata source of truth for names,
   categories, styles, tags, creator links, popularity, and published status.
   Webflow CMS offer metadata overrides Airtable price/free fields when available so
   published template detail pages and search results stay aligned.
3. Webflow site assets are used as a fallback image index when `WEBFLOW_API_TOKEN` and
   `WEBFLOW_TEMPLATE_ASSET_SITE_ID` are configured.
4. The published Webflow template page `og:image` is used as a bounded fallback for stale
   or missing indexed thumbnail rows.
5. Airtable attachment URLs are used only when they are stable. Temporary Airtable hosts
   such as `airtableusercontent.com` and `dl.airtable.com` are filtered out of the public
   index.

Configure:

- `WEBFLOW_TEMPLATE_ASSET_SITE_ID`: Webflow site ID that owns stable template image assets.
- `WEBFLOW_TEMPLATE_COLLECTION_ID`: optional Webflow collection ID for template CMS items. When
  omitted, the Worker discovers likely template collections from the site.
- `WEBFLOW_TEMPLATE_ENABLE_CMS_INDEX`: optional flag. CMS image indexing is enabled by default
  when a Webflow token is configured; set this to `false` only to disable CMS image indexing.
- `WEBFLOW_TEMPLATE_ASSET_FOLDER_ID`: optional asset folder filter when template assets live in a dedicated folder.
- `WEBFLOW_API_TOKEN`: secret with Webflow `assets:read` access. The Worker also accepts the
  existing `CMS_READ_ONLY` secret as a fallback. `cms:read` is enough for the preferred CMS item
  lookup.

When Webflow lookup is configured, sync prefers stable Webflow slugs and image URLs matched by
sync-record-id, template slug, or exact template name. Airtable attachment URLs from known temporary attachment hosts are ignored so expired
attachment links do not enter the public search index.

Incremental sync also refreshes recently changed Airtable rows plus stale or missing images on
already-indexed templates. The bounded refresh prioritizes Featured/popular templates and uses the
published Webflow template detail page as a fallback, which keeps the search/API response aligned
when Airtable review status changes first and Whalesync publishes or updates the corresponding
Webflow image shortly afterward.

## Template price and free state

The public search API stores both `price` and `is_free`. Search display, free-only
filtering, and price sorting treat numeric `price` as authoritative: `0` means free
and any positive number means paid.

Sync starts from Airtable's `🥞💲Template Price Filter (🏗️ only)` and `Is free?`
fields, then overrides those values with Webflow CMS offer metadata when a matching
published template item exposes price/free fields such as `price`, `template-price`,
or free/purchase-type fields. This prevents stale Airtable price filters from keeping
search results paid after the published detail page has moved to free.

The same override runs in three places:

- full rebuild and targeted record sync through the Webflow CMS index
- signed Webflow template collection webhooks
- scheduled/admin Webflow CMS refresh via `POST /api/templates/admin/refresh-images`

Use `POST /api/templates/admin/backfill-images?limit=48` for historical cleanup. The endpoint scans
existing rows with missing or temporary Airtable thumbnail URLs, resolves stable Webflow thumbnails
from the published template page or configured Webflow sources, and clears temporary URLs when no
stable replacement is available.

Use `slug=<template-slug>` or comma-separated `slugs=<template-slug>,<template-slug>` to target
specific broken rows before broad batch cleanup.

Use `POST /api/templates/admin/prune-missing-images` for stale rows that still have no resolvable
Webflow image after backfill. This endpoint only removes rows whose configured Webflow listing URL
returns `404`; rows with a live listing or Webflow image candidate are skipped.

Scheduled maintenance keeps this path hands-off:

- `17 * * * *`: runs a bounded `image_backfill` pass (`limit=96`) for missing or temporary thumbnails.
- `47 3 * * *`: runs a conservative `image_prune` pass (`limit=24`) for unresolved missing-image rows
  whose Webflow listing returns `404`.

## Sync locking

Rebuild, incremental sync, image refresh, and image backfill all share a D1 lease in the
`sync_jobs` table. The lock key is `template_sync`, the default lease is 20 minutes, and the
row records the current mode, status, start/finish timestamps, summary JSON, or failure error.
Manual endpoints return `409` with `active_job` when another job is still running. Scheduled
cron invocations record lock skips in `sync_state.last_sync_skipped` instead of treating an
overlap as a sync failure.

Use `GET /api/templates/admin/sync-status` with the sync admin token to inspect the active
lock, latest sync job, health counts, and recent sync summaries/errors/skips in one response.
Successful sync summaries clear a stale `sync_state.last_sync_error` for the same mode; failed
jobs remain visible on the latest job row until another job replaces the lock record.

## Safe MRP ID backfill

`mrp_id` powers the direct marketplace checkout URL returned as `purchase_url`. Historical rows
must be filled through the authenticated `backfill-mrp` workflow, not Wrangler file imports,
scratch scripts, or direct Cloudflare API writes.

The CLI defaults to the production Worker. Use the service-specific
`WEBFLOW_TEMPLATE_SEARCH_URL` environment variable for a preview or local override; generic
`WORKER_URL` variables from shared secret-manager environments are intentionally ignored.

```bash
# Inspect durable checkpoint and coverage without writing.
SYNC_ADMIN_TOKEN=... pnpm backfill:mrp -- --status

# Compare the next bounded batch with Airtable without writing or advancing the checkpoint.
SYNC_ADMIN_TOKEN=... pnpm backfill:mrp -- --dry-run --batch-size 25

# Resume from the stored D1 cursor. The CLI probes queryless and FTS search and stops on failure.
SYNC_ADMIN_TOKEN=... pnpm backfill:mrp -- --resume --batch-size 25

# Explicitly rescan from the beginning; equal values remain no-ops.
SYNC_ADMIN_TOKEN=... pnpm backfill:mrp -- --resume --restart --batch-size 25
```

Each POST processes at most 50 D1 rows in stable ID order, fetches only those Airtable records,
updates only rows whose non-empty source MRP ID differs, and records cursor, cumulative counts,
source mismatches, missing MRP IDs, completion, or failure in `sync_state.mrp_backfill`. Every write
batch uses the shared `template_sync` lease. A killed CLI can be rerun with `--resume`; it never
needs to restart at batch zero. If an incremental sync or maintenance job owns the lease between
batches, the CLI waits up to ten minutes and continues automatically rather than treating the
expected `409` response as failed backfill work.

Public search keeps the strict ten-second circuit breaker. Admin batch requests have a separate
30-second timeout because they include an Airtable lookup; transient admin timeouts and network
resets are retried up to six times with search probes and backoff. Since every request reads the
durable cursor first and writes only changed values, a response lost after commit is safe to retry.

The CLI runs both queryless and FTS public search probes before work, every five batches by
default, and after completion. It stops if either probe fails, returns no items, or exceeds ten
seconds. Treat `missing_source_records` and `missing_mrp_records` as explicit reconciliation work;
do not claim complete MRP coverage merely because the D1 scan finished.

Rollback: stop the CLI (the checkpoint is durable), redeploy the previous Worker version if
needed, and leave populated `mrp_id` values in place. The values are additive and the search
payload already falls back to the template detail URL when `mrp_id` is null.

## D1 migration history

The production D1 database had creator metadata columns before this repository's consolidated
`0002_creator_fields.sql` migration name was recorded. On 2026-05-22, the remote migration
ledger was reconciled by confirming those columns already existed, inserting the missing
`0002_creator_fields.sql` ledger row, and then applying `0003_sync_jobs.sql`.

Before re-running older migrations against production, compare `PRAGMA table_info(...)` and
`SELECT name FROM d1_migrations ORDER BY applied_at` so schema drift is reconciled in the
ledger instead of replaying an already-applied `ALTER TABLE`.

## Webflow webhooks

Register Webflow API v2 `collection_item_created`, `collection_item_changed`, and
`collection_item_published` webhooks against:

```text
POST /api/templates/webhooks/webflow
```

Set `WEBFLOW_WEBHOOK_SECRET` to the comma-separated signing secrets for the active Webflow
webhook subscriptions. Template collection events update image fields by `sync-record-id`;
designer collection events update creator avatars by `sync-record-id` first, then exact
creator name for older rows missing a linked creator record.
