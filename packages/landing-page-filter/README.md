# Landing Page Category Filter (Cloudflare)

Cloudflare Pages deployment for the Webflow template category filter scripts.

## Overview

This package serves JavaScript files and API endpoints for filtering Webflow templates by category. It replaces the previous Vercel deployment.

### What's Included

**Static Files** (served from `/public`):
- `category-filter-analytics.min.js` - Analytics tracking
- `category-filter-free.min.js` - Free templates filter
- `category-filter-featured.min.js` - Featured templates filter
- `category-filter.min.js` - One-page templates filter
- `custom-nest.min.js` - Custom nesting logic
- `seo-enhancements.min.js` - SEO improvements

**API Endpoints** (Cloudflare Functions):
- `GET /api/categories` - Fetch categories from Airtable
- `GET /api/subcategories` - Get static subcategory data
- `POST /api/analytics` - Receive analytics events
- `GET /api/template-proxy` - Proxy template content from Webflow

## Setup

### 1. Install Dependencies

```bash
cd packages/landing-page-filter
pnpm install
```

### 2. Configure Environment Variables

Set these secrets in Cloudflare Pages dashboard (Settings → Environment Variables):

```
AIRTABLE_API_KEY=your_api_key
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_TABLE_ID=your_table_id
AIRTABLE_VIEW_ID=your_view_id

# Optional: Free templates config
AIRTABLE_FREE_TABLE_ID=your_free_table_id
AIRTABLE_FREE_VIEW_ID=your_free_view_id

# Optional: Featured templates config
AIRTABLE_FEATURED_TABLE_ID=your_featured_table_id
AIRTABLE_FEATURED_VIEW_ID=your_featured_view_id

# Optional: Category groups for hierarchical data
AIRTABLE_CATEGORY_GROUPS_TABLE_ID=your_category_groups_table_id
AIRTABLE_CATEGORY_GROUPS_VIEW_ID=your_category_groups_view_id
```

Or use wrangler CLI:

```bash
wrangler pages secret put AIRTABLE_API_KEY
wrangler pages secret put AIRTABLE_BASE_ID
# ... etc
```

### 3. Create Cloudflare Pages Project

```bash
# First deployment creates the project
wrangler pages deploy public --project-name=landing-page-filter
```

Or create via the Cloudflare dashboard and connect to the monorepo.

## Development

```bash
# Start local dev server
pnpm dev

# The server runs at http://localhost:8788
```

## Deployment

```bash
pnpm deploy
```

## Migrating from Vercel

### 1. Pull Environment Variables from Vercel

```bash
cd /path/to/vercel/project
npx vercel env pull .env.local
```

Then copy the values to Cloudflare.

### 2. Update Webflow Integration Scripts

Replace the Vercel URLs with your Cloudflare Pages URL:

**Before (Vercel):**
```html
<script src="https://landing-page-category-filter.vercel.app/category-filter-analytics.min.js"></script>
<script src="https://landing-page-category-filter.vercel.app/custom-nest.min.js"></script>
<script src="https://landing-page-category-filter.vercel.app/category-filter-free.min.js"></script>
<script src="https://landing-page-category-filter.vercel.app/seo-enhancements.min.js"></script>
```

**After (Cloudflare):**
```html
<script src="https://landing-page-filter.pages.dev/category-filter-analytics.min.js"></script>
<script src="https://landing-page-filter.pages.dev/custom-nest.min.js"></script>
<script src="https://landing-page-filter.pages.dev/category-filter-free.min.js"></script>
<script src="https://landing-page-filter.pages.dev/seo-enhancements.min.js"></script>
```

### 3. Custom Domain (Optional)

Add a custom domain in Cloudflare Pages dashboard or via:

```bash
wrangler pages project add-domain landing-page-filter your-domain.com
```

## API Reference

### GET /api/categories

Fetch template categories from Airtable.

**Query Parameters:**
- `type` - Template type: `onepage` (default), `free`, `featured`
- `hierarchical` - Include subcategories: `true` or `false`

**Example:**
```bash
curl "https://landing-page-filter.pages.dev/api/categories?type=free&hierarchical=true"
```

### GET /api/subcategories

Get static subcategory data.

**Example:**
```bash
curl "https://landing-page-filter.pages.dev/api/subcategories"
```

### POST /api/analytics

Submit analytics events.

**Body:**
```json
{
  "events": [
    {
      "event": "category_selected",
      "sessionId": "abc123",
      "url": "https://example.com",
      "timestamp": 1706000000000,
      "data": { "category": "Business" }
    }
  ]
}
```

### GET /api/template-proxy

Proxy Webflow template content.

**Query Parameters:**
- `path` - Template path (must start with `/templates/`)

**Example:**
```bash
curl "https://landing-page-filter.pages.dev/api/template-proxy?path=/templates/category/business-websites"
```

## Architecture

```
packages/landing-page-filter/
├── public/                 # Static files (JS, CSS, HTML)
├── functions/
│   └── api/               # Cloudflare Functions (API routes)
│       ├── categories.ts
│       ├── subcategories.ts
│       ├── analytics.ts
│       └── template-proxy.ts
├── lib/                   # Shared library code
│   ├── airtable.ts       # Airtable API client
│   ├── categories.ts     # Category fetching logic
│   ├── schemas.ts        # Zod validation schemas
│   ├── subcategory-data.ts # Static subcategory data
│   └── utils.ts          # URL utilities
├── wrangler.toml         # Cloudflare config
└── package.json
```

## Caching

All API responses include appropriate cache headers:
- Categories: 24h edge cache, 7d stale-while-revalidate
- Subcategories: 24h edge cache, 7d stale-while-revalidate
- Analytics: No cache
- Template proxy: 24h edge cache, 7d stale-while-revalidate

Static files are cached at the edge by default with Cloudflare Pages.
