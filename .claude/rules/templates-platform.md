# Templates Platform

Multi-tenant site hosting for CREATE SOMETHING vertical templates. The infrastructure recedes; client sites appear.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Request Flow                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  client.createsomething.space/about                                         │
│              │                                                              │
│              ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Router Worker                                    │   │
│  │  1. Extract subdomain ("client")                                     │   │
│  │  2. Check reserved list → pass through if reserved                   │   │
│  │  3. Lookup tenant (KV cache → D1 fallback)                          │   │
│  │  4. Check status → render status page if not active                  │   │
│  │  5. Resolve asset path in R2                                         │   │
│  │  6. Inject config into HTML                                          │   │
│  │  7. Return response with appropriate caching                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│              │                                                              │
│              ▼                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │     D1 (DB)      │  │   KV (Cache)     │  │   R2 (Assets)    │         │
│  │                  │  │                  │  │                  │         │
│  │ • tenants        │  │ • tenant:sub:X   │  │ • tpl_xxx/latest │         │
│  │ • templates      │  │ • tenant:domain:Y│  │ • tpl_xxx/1.0.0  │         │
│  │ • users          │  │   (5 min TTL)    │  │ • index.html     │         │
│  │ • deployments    │  │                  │  │ • _app/immutable │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Router Worker

Location: `packages/templates-platform/workers/router/src/index.ts`

### Request Flow

```typescript
// 1. Extract routing info
const subdomain = extractSubdomain(hostname);  // "client" from client.createsomething.space
const isCustomDomain = !subdomain && !isPlatformRoot(hostname);

// 2. Reserved subdomain check
if (RESERVED_SUBDOMAINS.has(subdomain)) {
  return fetch(request);  // Pass to Cloudflare Pages
}

// 3. Tenant lookup (cached)
const tenant = subdomain
  ? await lookupTenantBySubdomain(env, subdomain)
  : await lookupTenantByCustomDomain(env, hostname);

// 4. Status check
if (tenant.status !== 'active') {
  return renderStatusPage(tenant.status);  // Shows spinner, auto-refreshes
}

// 5. Serve from R2 with config injection
return serveFromR2(request, env, tenant);
```

### Reserved Subdomains

Protected from user registration:

| Category | Subdomains |
|----------|------------|
| Platform | `www`, `api`, `app`, `admin`, `dashboard` |
| Auth | `auth`, `login`, `signup`, `sso` |
| Infrastructure | `mail`, `smtp`, `cdn`, `assets`, `static` |
| Environments | `dev`, `staging`, `test`, `beta`, `preview` |
| Support | `help`, `support`, `docs`, `status` |
| Financial | `billing`, `payment`, `checkout` |
| CREATE SOMETHING | `space`, `io`, `agency`, `ltd`, `templates`, `id`, `learn` |

### Asset Resolution

```
Request: /about
  → Try: {templateId}/{version}/about.html
  → Try: {templateId}/{version}/about/index.html
  → Fallback: {templateId}/{version}/200.html (SPA)
  → Fallback: {templateId}/{version}/index.html

Request: /_app/immutable/xyz.js
  → Exact: {templateId}/{version}/_app/immutable/xyz.js
  → Cache: immutable (31536000s)
```

### Config Injection

For HTML responses, tenant config is injected before `</head>`:

```html
<script>window.__SITE_CONFIG__={
  "name": "Client Name",
  "tagline": "Client tagline",
  "_tenant": {
    "id": "tnt_xxx",
    "subdomain": "client",
    "templateId": "tpl_professional_services"
  }
};</script>
```

Security: JSON is sanitized to prevent XSS (`<`, `>`, `&` escaped).

## Tenant Configuration System

### Database Schema

**users** - Account holders
```sql
id TEXT PRIMARY KEY
email TEXT UNIQUE NOT NULL
plan TEXT ('free', 'pro', 'agency')
site_limit INTEGER DEFAULT 1
```

**templates** - Template metadata (actual templates in `packages/verticals/`)
```sql
id TEXT PRIMARY KEY              -- e.g., "tpl_professional_services"
slug TEXT UNIQUE                 -- e.g., "professional-services"
config_schema TEXT               -- JSON schema for required config
```

**tenants** - Deployed sites
```sql
id TEXT PRIMARY KEY
user_id TEXT → users(id)
template_id TEXT → templates(id)
subdomain TEXT UNIQUE            -- e.g., "workwayarchitects"
status TEXT                      -- lifecycle state
config TEXT                      -- JSON configuration
template_version TEXT            -- null = "latest", or semver "1.2.3"
```

**deployments** - Version history
```sql
tenant_id TEXT → tenants(id)
version INTEGER                  -- auto-increment per tenant
status TEXT                      -- 'pending', 'building', 'deployed', 'failed'
config_snapshot TEXT             -- config at deploy time
```

**custom_domains** - Custom domain mappings
```sql
tenant_id TEXT → tenants(id)
domain TEXT UNIQUE               -- e.g., "www.clientsite.com"
status TEXT                      -- 'pending', 'verifying', 'active', 'failed'
verification_token TEXT
ssl_status TEXT
```

### Status Lifecycle

```
configuring → queued → building → deploying → active
                                      ↓
                                   error
                                      ↓
                                 suspended
```

| Status | Meaning | Router Behavior |
|--------|---------|-----------------|
| `configuring` | User editing config | Status page (spinner) |
| `queued` | Awaiting build | Status page |
| `building` | Template compiling | Status page |
| `deploying` | Assets uploading | Status page |
| `active` | Live site | Serve from R2 |
| `error` | Build/deploy failed | Status page (error message) |
| `suspended` | Account issue | 404 (not found) |

Status pages auto-refresh every 5 seconds.

### Config Structure

Template-specific configuration stored as JSON:

```json
{
  "name": "WORKWAY",
  "tagline": "Architects that care",
  "contact": {
    "email": "hello@workway.com",
    "phone": "+1 555 0123"
  },
  "social": {
    "linkedin": "https://linkedin.com/company/workway"
  },
  "branding": {
    "primaryColor": "#1a1a1a",
    "logo": "https://..."
  }
}
```

Config schema is defined per-template in `templates.config_schema`.

## Cloudflare Bindings

```toml
# wrangler.toml
name = "templates-platform-router"
routes = [
  { pattern = "*.createsomething.space/*", zone_name = "createsomething.space" }
]

[[d1_databases]]
binding = "DB"
database_id = "a06516a5-6c4b-472f-8826-d730e3a74926"

[[kv_namespaces]]
binding = "CONFIG_CACHE"
id = "bcb39a6258fe49b79da9dc9b09440934"

[[r2_buckets]]
binding = "SITE_BUCKET"
bucket_name = "templates-site-assets"
```

## Operations

### Deploy Router Worker

```bash
cd packages/templates-platform/workers/router
wrangler deploy
```

### Apply Migrations

```bash
# Local
wrangler d1 execute templates-platform-db --local --file=migrations/0001_initial.sql

# Production
wrangler d1 execute templates-platform-db --file=migrations/0001_initial.sql
```

### Clear Tenant Cache

```bash
# After config changes
wrangler kv:key delete --namespace-id=bcb39a6258fe49b79da9dc9b09440934 "tenant:subdomain:{subdomain}"
```

### Upload Template Assets

```bash
cd packages/verticals/professional-services/build
find . -type f -print0 | xargs -0 -I{} sh -c \
  'wrangler r2 object put "templates-site-assets/tpl_professional_services/latest/${1#./}" --file="$1" --remote' _ {}
```

### Query Tenants

```bash
wrangler d1 execute templates-platform-db --command "SELECT subdomain, status FROM tenants"
```

## Hermeneutic Position

Templates Platform occupies a unique position in the CREATE SOMETHING hermeneutic circle:

```
.ltd (Philosophy)  → defines what Canon-compliant sites look like
         ↓
.io (Research)     → documents patterns, validates approaches
         ↓
.space (Practice)  → templates-platform enables client sites at scale
         ↓
.agency (Services) → sells and customizes template implementations
         ↓
.ltd (Philosophy)  → client feedback evolves the Canon
```

**Key insight**: Templates Platform is infrastructure for `.space` (practice), but serves `.agency` (services). It's where philosophy becomes commerce—Canon principles embodied in deployable products.

The router worker embodies Zuhandenheit: it completely recedes. Clients see their site, not our infrastructure. When it works perfectly, no one knows it exists.

## Related Documentation

- [Template Deployment Patterns](./template-deployment-patterns.md) - Troubleshooting gotchas
- [Cloudflare Patterns](./cloudflare-patterns.md) - D1, KV, R2 usage
- [SvelteKit Conventions](./sveltekit-conventions.md) - Template development
