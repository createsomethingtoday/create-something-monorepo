# Webflow Marketplace Category Cloud

Production-pilot Webflow Cloud app for replacing marketplace category pages at `/templates/category/[slug]`.

## Scope

- Server-render category pages from the existing `webflow-template-search` worker.
- Preserve crawlable category HTML, pagination, canonical metadata, and JSON-LD.
- Add client-side load-more behavior as progressive enhancement.

Out of scope:

- Template detail pages.
- Checkout.
- `/templates/all`, `/templates/featured`, free, landing page, designer, and subcategory route takeovers.

## Runtime

Required:

- `TEMPLATE_SEARCH_API_BASE`

Recommended:

- `MARKETPLACE_BASE_URL=https://webflow.com`
- `NEXT_PUBLIC_BASE_PATH=/templates/category`
- `BASE_URL` / `ASSETS_PREFIX` when Webflow Cloud injects a mounted asset prefix.

Images:

- Category pages read durable image URLs from `webflow-template-search`.
- The search worker syncs those URLs from the Webflow CMS with a read-only site/project API token in `CMS_READ_ONLY`.
- Page requests must not call the Webflow API directly; run the worker sync before demos or route takeover.

## Commands

```bash
pnpm --filter @create-something/webflow-marketplace-category-cloud dev
pnpm --filter @create-something/webflow-marketplace-category-cloud check
pnpm --filter @create-something/webflow-marketplace-category-cloud build
pnpm --filter @create-something/webflow-marketplace-category-cloud preview
```

## Route Ownership

The intended Webflow Cloud mount is `/templates/category`. Under that mount, `app/[slug]/page.tsx` serves live category URLs like:

```text
/templates/category/portfolio-and-agency-websites
```

The existing Webflow CMS pages remain the production source of truth until parity checks pass and the route takeover is explicitly approved.

## Search Worker Image Sync

Set `CMS_READ_ONLY` on `packages/webflow-template-search` from Infisical before deploying or running the worker sync. The sync defaults to the production template collection ID in the worker config.

```bash
pnpm --filter @create-something/webflow-template-search deploy
curl -X POST "$TEMPLATE_SEARCH_API_BASE/api/templates/admin/webflow-images" \
  -H "Authorization: Bearer $SYNC_ADMIN_TOKEN"
```

Full rebuilds also attempt the Webflow image sync when `CMS_READ_ONLY` is configured, while incremental Airtable syncs preserve existing durable Webflow image URLs instead of replacing them with expiring attachment URLs.
