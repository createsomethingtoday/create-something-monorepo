# Webflow Metadata Manager

Cloudflare Worker that hosts one external script for path-scoped runtime metadata overrides on Webflow template pages.

## What it does

- Serves a single hosted script you can add to Webflow template pages
- Applies overrides only when `window.location.pathname` matches one of the configured paths exactly
- Updates `document.title`, `meta[name="description"]`, `meta[property="og:title"]`, `meta[property="og:description"]`, and matching Twitter tags at runtime
- Lets you keep the requested page list in code or override it with `DEFAULT_OVERRIDES_JSON`

## Routes

- `GET /` lightweight docs page with the install snippet
- `GET /health`
- `GET /metadata-overrides.js`
- `GET /metadata-overrides.json`

## Configuration

Defaults live in [src/default-overrides.ts](/Users/micahjohnson/Code/worktrees/metadata-script-6dw/packages/webflow-metadata-manager/src/default-overrides.ts).

If you want to supply overrides at deploy time instead, set `DEFAULT_OVERRIDES_JSON` to a JSON array of:

```json
[
  {
    "path": "/templates/category/real-estate-websites",
    "seoTitle": "Real Estate Website Templates: Listings, Agents & Brokers | Webflow",
    "seoDescription": "Professional real estate website templates for agents, brokers, and listing sites. IDX-ready designs, property showcase layouts - customizable in Webflow."
  }
]
```

## Development

```bash
pnpm --filter @create-something/webflow-metadata-manager typecheck
pnpm --filter @create-something/webflow-metadata-manager test
pnpm --filter @create-something/webflow-metadata-manager dev
```

## Deploy

```bash
pnpm --filter @create-something/webflow-metadata-manager deploy
```

## Install snippet

Add this once in the Webflow head where these template pages load:

```html
<script src="https://YOUR-WORKER-DOMAIN/metadata-overrides.js" defer></script>
```

## Notes

- This is a runtime override, not a server-side Webflow metadata rewrite.
- It is intentionally exact-path scoped so only the listed pages change.
- To add or remove pages, edit [src/default-overrides.ts](/Users/micahjohnson/Code/worktrees/metadata-script-6dw/packages/webflow-metadata-manager/src/default-overrides.ts) or change `DEFAULT_OVERRIDES_JSON`, then redeploy.
