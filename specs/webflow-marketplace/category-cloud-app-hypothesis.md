# Category Webflow Cloud App Hypothesis

## Hypothesis

Marketplace category pages are a better first indexed route takeover than template detail pages because they need richer sort, filter, search, and progressive loading behavior while still preserving a stable SEO landing-page shape.

## Production Pilot

- Own only `/templates/category/[slug]`.
- Use `packages/webflow-template-search` as the Database tier: D1-backed template index, category counts, filters, facets, and search results.
- Use `apps/webflow-marketplace-category-cloud` as the Automation tier: Webflow Cloud SSR renderer plus client-side load-more enhancement.
- Keep SEO/AEO policy as the Judgment tier: parity gates decide whether a category route can be promoted.
- Pull durable template thumbnails from the Webflow CMS API into the search index with a read-only `CMS_READ_ONLY` token. Runtime category page requests read D1/search-worker data only.

## Reliability Requirements

- The Cloud app must not read Airtable directly on page requests.
- Search worker health must pass before any route takeover.
- Category pages must fail as errors if the search worker is unavailable instead of serving partial marketplace content.
- Existing Webflow CMS category pages remain the rollback path until production takeover is approved.
- The Webflow CMS API is a sync dependency, not a page-render dependency. A failed optional image sync must not block search rebuilds unless `WEBFLOW_IMAGE_SYNC_REQUIRED=true`.

## SEO/AEO Requirements

- Server-render the first page of results.
- Preserve title, description, canonical, H1, result links, and pagination links.
- Keep filter and sort states canonicalized to the base category unless a future route policy promotes them as indexable pages.
- Emit `BreadcrumbList`, `CollectionPage`, and `ItemList` JSON-LD.
- Leave `Product` and `Offer` JSON-LD to template detail pages.

## Promotion Checklist

- `webflow-template-search` check passes.
- Category app typecheck and build pass.
- Preview URL for a populated category includes at least 24 template detail links in SSR HTML.
- Search worker has `CMS_READ_ONLY` configured and `POST /api/templates/admin/webflow-images` reports durable Webflow image matches.
- Parity script compares live CMS vs Cloud preview for title, description, canonical, robots, H1, internal link count, and JSON-LD.
- Linear issue records route prefix, package, commands, preview URL, and rollback note.

## Open Promotion Risk

- The code path for Webflow CMS image sync is implemented, but the deployed search worker must be promoted with `CMS_READ_ONLY` and the image-sync admin route must be run before a stakeholder demo or route takeover.
