# Template Deployment Patterns

## Heideggerian Framing

When infrastructure fails, it becomes *present-at-hand* (Vorhandenheit)—we notice the hammer instead of the nail. These patterns ensure the deployment process remains *ready-to-hand* (Zuhandenheit)—transparent, receding use.

**Canon Principle**: The infrastructure disappears; only the work remains.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    *.createsomething.space                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Router Worker                                 │
│  • Tenant lookup (D1 → KV cache)                                │
│  • Config injection (window.__SITE_CONFIG__)                    │
│  • Asset serving (R2)                                           │
└─────────────────────────────────────────────────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
     ┌─────────┐         ┌─────────┐         ┌─────────┐
     │   D1    │         │   KV    │         │   R2    │
     │ Tenants │         │ Cache   │         │ Assets  │
     └─────────┘         └─────────┘         └─────────┘
```

---

## Critical Patterns

### 1. Workers Route Pattern Must Include Path Wildcard

**Failure**: `*.createsomething.space` only matches root `/`, all other paths bypass the worker.

**Fix**: Include `/*` to match all paths.

```toml
# wrangler.toml
routes = [
  { pattern = "*.createsomething.space/*", zone_name = "createsomething.space" }
]
```

**Why**: Cloudflare route patterns are literal. Without `/*`, CSS, JS, and subpages hit DNS directly → 403 errors.

---

### 2. SPA Fallback Must Not Overwrite Pre-rendered Index

**Failure**: `fallback: 'index.html'` overwrites the pre-rendered homepage with an empty SPA shell.

**Fix**: Use a non-index filename.

```javascript
// svelte.config.js
adapter: adapter({
  pages: 'build',
  assets: 'build',
  fallback: '200.html',  // NOT 'index.html'
  precompress: false,
  strict: false
})
```

**Why**: The build warns "Overwriting build/index.html with fallback page"—easy to miss, destroys pre-rendered content.

---

### 3. Client Hydration Requires Svelte Stores, Not Context

**Failure**: Svelte context set at initialization doesn't react to `window.__SITE_CONFIG__` (browser is false during SSR).

**Fix**: Writable stores that check `window.__SITE_CONFIG__` at module load.

```typescript
// context.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createSiteConfigStore() {
  const store = writable<SiteConfig>(defaultConfig);

  if (browser && window.__SITE_CONFIG__) {
    store.set(mergeWithDefaults(window.__SITE_CONFIG__));
  }

  return store;
}

export const siteConfig = createSiteConfigStore();
```

**Usage**: Components use `$siteConfig.name` (store syntax) for reactivity.

---

### 4. DNS Records Can Conflict with Workers Routes

**Failure**: Wildcard A record `*.createsomething.space` → Cloudflare IP causes "DNS points to prohibited IP" (error 1000).

**Fix**: Workers routes work WITHOUT DNS records for subdomains. Either:
- Remove wildcard DNS records entirely (preferred)
- Or use proxied AAAA record pointing to `100::` (dummy target)

**Why**: When DNS record exists, Cloudflare routes to origin. But the worker IS the origin—no external server.

---

## R2 Asset Structure

```
templates-site-assets/
└── {template_id}/
    └── {version}/          # "latest" or semver "1.2.3"
        ├── index.html      # Pre-rendered homepage
        ├── 200.html        # SPA fallback for client routing
        ├── favicon.svg     # CREATE SOMETHING cube logo
        ├── _app/
        │   └── immutable/  # Hashed assets (cache forever)
        └── [pages].html    # Pre-rendered routes
```

---

## Deployment Checklist

Before deploying a new template version:

- [ ] Route pattern includes `/*` for all paths
- [ ] `svelte.config.js` uses `fallback: '200.html'` (not index.html)
- [ ] Config store uses writable store pattern (not context)
- [ ] Build completes without "Overwriting" warnings
- [ ] Test paths: `/`, `/projects`, `/_app/immutable/...`

---

## Deployment Commands

```bash
# Build template
pnpm --filter=@create-something/vertical-professional-services build

# Upload to R2
cd packages/verticals/professional-services/build
find . -type f -print0 | xargs -0 -I{} sh -c \
  'wrangler r2 object put "templates-site-assets/tpl_professional_services/latest/${1#./}" --file="$1" --remote' _ {}

# Deploy router worker (if changed)
cd packages/templates-platform/workers/router
wrangler deploy

# Clear tenant cache (after config changes)
wrangler kv:key delete --namespace-id=bcb39a6258fe49b79da9dc9b09440934 "tenant:subdomain:{subdomain}"
```

---

## Config Injection

The router worker injects tenant config into HTML:

```html
<script>window.__SITE_CONFIG__={
  "name": "WORKWAY",
  "tagline": "Architects that care",
  "_tenant": {
    "id": "...",
    "subdomain": "workwayarchitects",
    "templateId": "tpl_professional_services"
  }
};</script>
```

Templates read this via the Svelte store, falling back to pre-rendered defaults.

---

## Canon Reflection

These failures share a common cause: **implicit assumptions becoming invisible**.

- Route patterns assume path matching
- Fallback files assume they won't collide
- Context assumes client-side evaluation
- DNS assumes origin servers

Each assumption was reasonable. Each broke silently. The fix is not more complexity but more *explicitness*—making the implicit visible so it can recede back into transparent use.

**Weniger, aber besser**: Less magic, better documentation.
