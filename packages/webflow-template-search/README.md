# Webflow Template Search

Cloudflare Worker and D1 search index for the Webflow template marketplace.

## Routes

- `GET /health`
- `GET /api/templates/search`
- `GET /api/templates/client.js`
- `POST /api/templates/admin/rebuild`
- `POST /api/templates/admin/sync`
- `POST /api/templates/admin/backfill-images`

## Sync auth

Use `Authorization: Bearer <SYNC_ADMIN_TOKEN>` or `X-API-Key`.

## Template thumbnails

The sync pipeline indexes Marketplace template metadata from Airtable, then optionally resolves
template thumbnail URLs from Webflow CMS items managed by Whalesync. Configure:

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
newest missing thumbnails plus rows with temporary Airtable thumbnail URLs, resolves stable Webflow
thumbnails from configured Webflow sources or the published project site, and clears the temporary
URL when no stable replacement is available.

For an observed broken listing, target exact templates with `slug` or comma-separated `slugs`, e.g.
`POST /api/templates/admin/backfill-images?slugs=qrello-website-template,gemfit-website-template`.
