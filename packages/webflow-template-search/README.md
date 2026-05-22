# Webflow Template Search

Cloudflare Worker and D1 search index for the Webflow template marketplace.

## Routes

- `GET /health`
- `GET /api/templates/search`
- `GET /api/templates/client.js`
- `POST /api/templates/admin/rebuild`
- `POST /api/templates/admin/sync`
- `GET /api/templates/admin/sync-status`
- `POST /api/templates/admin/refresh-images`
- `POST /api/templates/admin/backfill-images`
- `POST /api/templates/webhooks/webflow`

## Sync auth

Use `Authorization: Bearer <SYNC_ADMIN_TOKEN>` or `X-API-Key`.

## Template thumbnails

The sync pipeline indexes Marketplace template metadata from Airtable, then resolves public
asset URLs from the most stable configured source. Source precedence:

1. Airtable `Marketplace Assets` remains the metadata source of truth for names, slugs,
   categories, styles, tags, creator links, price, popularity, and published status.
2. Webflow CMS template image fields are preferred for thumbnails, hover thumbnails, and
   carousel images when `CMS_READ_ONLY` is configured.
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
- `WEBFLOW_TEMPLATE_ASSET_FOLDER_ID`: optional asset folder filter when template assets live in a dedicated folder.
- `WEBFLOW_API_TOKEN`: secret with Webflow `assets:read` access. The Worker also accepts the
  existing `CMS_READ_ONLY` secret as a fallback. `cms:read` is enough for the preferred CMS item
  lookup.

When Webflow lookup is configured, sync prefers stable Webflow image URLs matched by template
slug/name. Airtable attachment URLs from known temporary attachment hosts are ignored so expired
attachment links do not enter the public search index.

Incremental sync also refreshes recently changed Airtable rows plus stale or missing images on
already-indexed templates. The bounded refresh prioritizes Featured/popular templates and uses the
published Webflow template detail page as a fallback, which keeps the search/API response aligned
when Airtable review status changes first and Whalesync publishes or updates the corresponding
Webflow image shortly afterward.

Use `POST /api/templates/admin/backfill-images?limit=48` for historical cleanup. The endpoint scans
existing rows with temporary Airtable thumbnail URLs, resolves stable Webflow thumbnails from the
published template page or configured Webflow sources, and clears the temporary URL when no stable
replacement is available.

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
