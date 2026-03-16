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
