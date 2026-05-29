# Webflow Template Search

Cloudflare Worker and D1 search index for the Webflow template marketplace.

## Routes

- `GET /health`
- `GET /api/templates/search`
- `GET /api/templates/client.js`
- `POST /api/templates/admin/rebuild`
- `POST /api/templates/admin/sync`
- `POST /api/templates/admin/webflow-images`
- `POST /api/templates/admin/webflow-images?mode=batch`

## Sync auth

Use `Authorization: Bearer <SYNC_ADMIN_TOKEN>` or `X-API-Key`.

## Image sync

Template metadata is indexed from Airtable. Durable thumbnail URLs are refreshed from the Webflow templates CMS collection with `CMS_READ_ONLY`.

- `*/5 * * * *`: incremental Airtable metadata sync.
- `37 * * * *`: bounded Webflow thumbnail batch sync using `WEBFLOW_IMAGE_SYNC_MAX_ITEMS` and the `webflow_image_sync_offset` cursor in D1.
- `17 3 * * *`: full rebuild with a full Webflow image overlay.
