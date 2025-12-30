# Understanding: @create-something/templates-platform

> **The multi-tenant infrastructure—Being-as-Platform that routes subdomains to templates.**

## Ontological Position

**Mode of Being**: Templates Platform — Being-as-Platform

This is where infrastructure recedes into service. When working correctly, you don't think about tenant routing, config injection, or asset serving—you just visit a subdomain and the right template appears. The platform exists to make multi-tenancy invisible.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| **Cloudflare Workers** | Subdomain routing and config injection |
| **Cloudflare R2** | Template asset storage |
| **Cloudflare D1** | Tenant database |
| **Cloudflare KV** | Tenant config cache |
| **Stripe** | Subscription management |
| `@create-something/components` | Shared UI components |
| `packages/verticals/*` | Template implementations |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| **Tenants** | How their subdomain maps to their site |
| **Template developers** | How templates are deployed and served |
| **Agency** | Multi-tenant SaaS infrastructure patterns |
| **The field** | Cloudflare Workers-based multi-tenancy |

## Internal Structure

```
packages/templates-platform/
├── src/
│   ├── routes/              → Platform admin UI
│   └── lib/                 → Shared utilities
├── workers/
│   └── router/              → Subdomain routing worker
│       └── src/
│           └── index.ts     → Main router logic
├── migrations/              → D1 schema migrations
├── scripts/
│   ├── verify-deployment.ts → Deployment verification
│   └── upload-to-r2.sh      → R2 asset upload
└── wrangler.toml            → Cloudflare configuration
```

## Core Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| **Tenant** | Customer with subdomain and config | D1 `tenants` table |
| **Template** | Vertical-specific site implementation | `packages/verticals/*` |
| **Router Worker** | Routes `*.createsomething.space/*` → R2 assets | `workers/router/` |
| **Config Injection** | Injects `window.__SITE_CONFIG__` into HTML | Router worker |
| **Asset Serving** | Serves template files from R2 | Router worker |

## To Understand This Package, Read

**For Routing Architecture**:
1. **`workers/router/src/index.ts`** — Main routing logic
2. **`.claude/rules/template-deployment-patterns.md`** — Critical patterns
3. **`migrations/0001_create_tenants.sql`** — Database schema

**For Template Deployment**:
1. **`scripts/upload-to-r2.sh`** — Asset upload process
2. **`scripts/verify-deployment.ts`** — Deployment verification
3. **`STRIPE_SETUP.md`** — Payment integration

## Critical Paths

### Path 1: Request Flow
```
User visits: workwayarchitects.createsomething.space
  ↓
1. DNS → Cloudflare (no A record needed, Workers route handles)
  ↓
2. Router Worker receives request
   ├─ Parse subdomain: "workwayarchitects"
   ├─ Check KV cache for tenant config
   └─ If miss → Query D1, cache result
  ↓
3. Load tenant config
   ├─ template_id: "tpl_professional_services"
   ├─ Custom fields: name, tagline, colors, etc.
   └─ Stripe subscription status
  ↓
4. Inject config into HTML
   ├─ Fetch index.html from R2
   ├─ Insert <script>window.__SITE_CONFIG__={...}</script>
   └─ Return modified HTML
  ↓
5. Client hydration
   ├─ SvelteKit reads window.__SITE_CONFIG__
   ├─ Merges with template defaults
   └─ Renders personalized site
```

### Path 2: Template Deployment
```
Build template:
  pnpm --filter=@create-something/vertical-professional-services build
  ↓
Upload to R2:
  cd packages/verticals/professional-services/build
  find . -type f | xargs -I{} sh -c 'wrangler r2 object put \
    "templates-site-assets/tpl_professional_services/latest/${1#./}" \
    --file="$1"' _ {}
  ↓
Deploy router worker (if changed):
  cd packages/templates-platform/workers/router
  wrangler deploy
  ↓
Clear tenant cache (after config changes):
  wrangler kv:key delete \
    --namespace-id=bcb39a6258fe49b79da9dc9b09440934 \
    "tenant:subdomain:{subdomain}"
```

### Path 3: New Tenant Onboarding
```
1. Create Stripe subscription
   ├─ Customer signs up
   ├─ Selects template
   └─ Subscribes to plan
  ↓
2. Webhook creates tenant
   POST /api/stripe/webhook
   ├─ stripe.checkout.session.completed event
   ├─ Extract customer + template metadata
   └─ INSERT INTO tenants (...)
  ↓
3. Tenant customizes config
   ├─ Onboarding flow collects: name, tagline, colors
   ├─ UPDATE tenants SET config = {...}
   └─ Clear KV cache for subdomain
  ↓
4. Site is live
   subdomain.createsomething.space → template with custom config
```

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

**Key insight**: `200.html` is the SPA fallback, NOT `index.html` (to preserve pre-rendered homepage).

## Database Schema (D1)

### tenants
```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL,
  template_id TEXT NOT NULL,
  config TEXT NOT NULL,              -- JSON config
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active',      -- active, suspended, cancelled
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Config JSON Structure
```typescript
interface TenantConfig {
  name: string;                      // Site name
  tagline?: string;                  // Tagline
  colors?: {
    primary?: string;
    secondary?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
  };
  // Template-specific fields
  [key: string]: unknown;
}
```

## Router Worker Logic

The router worker (`workers/router/src/index.ts`) handles:

### 1. Tenant Lookup
```typescript
// KV cache first
let tenant = await env.KV.get(`tenant:subdomain:${subdomain}`, 'json');

// Fallback to D1
if (!tenant) {
  const result = await env.DB.prepare(
    'SELECT * FROM tenants WHERE subdomain = ? AND status = "active"'
  ).bind(subdomain).first();

  if (result) {
    tenant = result;
    // Cache for 1 hour
    await env.KV.put(`tenant:subdomain:${subdomain}`, JSON.stringify(tenant), {
      expirationTtl: 3600
    });
  }
}
```

### 2. Config Injection
```typescript
// Fetch HTML from R2
const assetPath = `${tenant.template_id}/latest${pathname}`;
const asset = await env.R2.get(assetPath);

if (pathname === '/' || pathname.endsWith('.html')) {
  let html = await asset.text();

  // Inject config before </head>
  const config = JSON.parse(tenant.config);
  const configScript = `<script>window.__SITE_CONFIG__=${JSON.stringify({
    ...config,
    _tenant: {
      id: tenant.id,
      subdomain: tenant.subdomain,
      templateId: tenant.template_id
    }
  })};</script>`;

  html = html.replace('</head>', `${configScript}</head>`);

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
```

### 3. Asset Serving
```typescript
// Serve static assets (CSS, JS, images)
return new Response(asset.body, {
  headers: {
    'Content-Type': guessContentType(pathname),
    'Cache-Control': pathname.includes('immutable')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600'
  }
});
```

## Critical Deployment Patterns

### Pattern 1: Workers Route Must Include Path Wildcard
```toml
# wrangler.toml
routes = [
  { pattern = "*.createsomething.space/*", zone_name = "createsomething.space" }
]
```

**Without `/*`**: Only `/` matches, CSS/JS requests bypass worker → 403 errors

### Pattern 2: SPA Fallback Must Not Overwrite Pre-rendered Index
```javascript
// svelte.config.js
adapter: adapter({
  fallback: '200.html',  // NOT 'index.html'
})
```

**Why**: Preserves pre-rendered homepage while enabling client-side routing

### Pattern 3: DNS Records Can Conflict with Workers Routes
**Fix**: Workers routes work WITHOUT DNS records for subdomains. Remove wildcard A records or use proxied AAAA `100::` (dummy target).

## Stripe Integration

### Webhook Flow
```
Stripe → /api/stripe/webhook
  ↓
Verify signature
  ↓
Handle event:
  ├─ checkout.session.completed → Create tenant
  ├─ customer.subscription.updated → Update status
  ├─ customer.subscription.deleted → Mark cancelled
  └─ invoice.payment_failed → Suspend tenant
```

### Subscription Plans
| Plan | Price | Features |
|------|-------|----------|
| Starter | $29/mo | 1 template, basic customization |
| Professional | $99/mo | All templates, full customization, custom domain |
| Agency | $299/mo | Unlimited sites, white-label, API access |

## Verification

Run deployment verification:
```bash
# Check single tenant
pnpm --filter=templates-platform verify

# Check all tenants
pnpm --filter=templates-platform verify:all
```

**Checks**:
- Subdomain resolves
- Assets load (HTML, CSS, JS)
- Config injection works
- No 404s for expected paths
- SPA routing works (200.html fallback)

## Hermeneutic Function

```
.ltd (Canon) ──────────────────────────────────────┐
    │                                               │
    ▼                                               │
templates-platform (Infrastructure) ◄──             │
    │                                  │            │
    ├──► Serves verticals/*            │            │
    ├──► Enables agency client sites   │            │
    ├──► Tests multi-tenancy patterns  │            │
    │                                  │            │
    └──► Discovers infra gaps ─────────┴─ returns ─┘
```

**The loop**:
1. `.ltd` defines infrastructure should recede
2. `templates-platform` implements routing/tenancy
3. Breakdowns (404s, config errors) reveal where infra becomes present-at-hand
4. Breakdowns feed back to `.ltd` for pattern documentation
5. Documented patterns become reusable infrastructure

## Common Tasks

| Task | Command |
|------|---------|
| Start dev server | `pnpm dev --filter=templates-platform` |
| Build platform | `pnpm --filter=templates-platform build` |
| Deploy platform | `wrangler pages deploy packages/templates-platform/.svelte-kit/cloudflare --project-name=templates-platform` |
| Deploy router worker | `cd packages/templates-platform/workers/router && wrangler deploy` |
| Apply migrations | `pnpm --filter=templates-platform db:migrate:prod` |
| Upload template to R2 | `cd packages/verticals/{name}/build && <upload script>` |
| Clear tenant cache | `wrangler kv:key delete --namespace-id=... "tenant:subdomain:{subdomain}"` |
| Verify deployment | `pnpm --filter=templates-platform verify` |

## Breakdown → Repair Examples

### Breakdown 1: 404 on CSS Files
**Symptom**: Homepage loads, but CSS 404s
**Diagnosis**: Workers route missing `/*` wildcard
**Repair**: Add `/*` to route pattern in `wrangler.toml`
**Documentation**: `.claude/rules/template-deployment-patterns.md` Pattern 1

### Breakdown 2: Empty Homepage
**Symptom**: Site loads but shows blank page
**Diagnosis**: `fallback: 'index.html'` overwrote pre-rendered content
**Repair**: Change to `fallback: '200.html'`
**Documentation**: `.claude/rules/template-deployment-patterns.md` Pattern 2

### Breakdown 3: Config Not Applied
**Symptom**: Site shows default content, not tenant customization
**Diagnosis**: `window.__SITE_CONFIG__` not injected or not read
**Repair**: Check router worker injection, verify client hydration uses Svelte stores
**Documentation**: `.claude/rules/template-deployment-patterns.md` Pattern 3

## Project Names

**Cloudflare Pages**: `templates-platform` (standalone name, no prefix)
**Domain**: `templates.createsomething.space`

See `.claude/rules/PROJECT_NAME_REFERENCE.md` for full mapping.

## References

- **[Template Deployment Patterns](../../.claude/rules/template-deployment-patterns.md)** — Critical deployment patterns
- **[Cloudflare Patterns](../../.claude/rules/cloudflare-patterns.md)** — D1, KV, R2, Workers usage
- **[Project Name Reference](../../.claude/rules/PROJECT_NAME_REFERENCE.md)** — Deployment project names

---

*Last validated: 2025-12-29*

**This UNDERSTANDING.md follows the "Less, but better" principle—document what's critical to understand, not every detail. When you need deeper knowledge, follow the references to source files.**
