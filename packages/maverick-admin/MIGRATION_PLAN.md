# Maverick X: Vercel to Cloudflare Migration Plan

## Overview

Migrate the Maverick X React site from Vercel to Cloudflare, adding:
1. Admin app for content management
2. D1 database for content storage
3. Contact form API endpoint
4. R2 integration for media (already in use)

## Current State

| Component | Current | Notes |
|-----------|---------|-------|
| **Framework** | Next.js 14 (App Router) | Static/SSG pages |
| **Hosting** | Vercel | vercel.json configured |
| **Database** | None | Hardcoded mocks in `/mocks/*.tsx` |
| **Media** | Cloudflare R2 | Already using `pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev` |
| **Forms** | Not functional | ContactModal has TODO comment |
| **Auth** | None | No admin panel |

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐         ┌─────────────────┐           │
│  │  maverickx.com  │         │  admin.mavx.com │           │
│  │  (Next.js/SSR)  │         │   (SvelteKit)   │           │
│  │                 │         │                 │           │
│  │  Cloudflare     │         │  Cloudflare     │           │
│  │  Pages          │         │  Pages          │           │
│  └────────┬────────┘         └────────┬────────┘           │
│           │                           │                     │
│           │    Service Binding        │                     │
│           └───────────┬───────────────┘                     │
│                       │                                     │
│           ┌───────────▼───────────┐                        │
│           │      D1 Database      │                        │
│           │     maverick-db       │                        │
│           └───────────────────────┘                        │
│                                                             │
│           ┌───────────────────────┐                        │
│           │      R2 Bucket        │                        │
│           │    maverick-media     │                        │
│           └───────────────────────┘                        │
│                                                             │
│           ┌───────────────────────┐                        │
│           │    KV Namespace       │                        │
│           │  maverick-sessions    │                        │
│           └───────────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Migration Phases

### Phase 1: Infrastructure Setup (WezTerm)

Create Cloudflare resources:

```bash
# 1. Create D1 database
wrangler d1 create maverick-db

# 2. Create KV namespace for sessions
wrangler kv namespace create maverick-sessions

# 3. R2 bucket already exists, or create:
wrangler r2 bucket create maverick-media
```

### Phase 2: Admin App Deployment

The admin app (`packages/maverick-admin/`) is ready. Deploy it:

```bash
cd packages/maverick-admin

# Update wrangler.toml with resource IDs from Phase 1

# Run local migrations
pnpm db:migrate:local

# Test locally
pnpm dev

# Deploy
pnpm build
wrangler pages deploy .svelte-kit/cloudflare --project-name=maverick-admin
```

Set environment variables in Cloudflare Dashboard:
- `AUTH_SECRET` - Random 32+ character string
- `ADMIN_EMAIL` - Admin login email
- `ADMIN_PASSWORD_HASH` - Admin password (use bcrypt in production)

### Phase 3: Seed Database

Migrate existing mock data to D1. Create seed script:

```bash
# From packages/maverick-admin/
wrangler d1 execute maverick-db --file=./seeds/initial-data.sql
```

Seed data includes:
- 11 PetroX solutions
- 5 LithX solutions
- 6 news articles
- 5 testimonials
- Features, applications, stats for each brand

### Phase 4: Modify Next.js Site

Update the Maverick X React site to fetch from D1:

#### Option A: API Fetch (Simpler)
```typescript
// app/mining/page.tsx
export async function generateStaticParams() {
  const res = await fetch('https://admin.mavx.com/api/solutions?brand=lithx');
  const solutions = await res.json();
  return { solutions };
}
```

#### Option B: Service Binding (Better Performance)
Add D1 binding to the Next.js site's wrangler.toml:
```toml
[[d1_databases]]
binding = "DB"
database_name = "maverick-db"
database_id = "..." # Same ID as admin app
```

Then in Next.js:
```typescript
// Using @cloudflare/next-on-pages
export const runtime = 'edge';

export async function getServerSideProps({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM solutions WHERE brand = ?'
  ).bind('lithx').all();
  return { props: { solutions: results } };
}
```

### Phase 5: Contact Form API

Create contact form endpoint on the main site:

```typescript
// app/api/contact/route.ts
export async function POST(request: Request) {
  const data = await request.json();

  // Validate
  if (!data.name || !data.email) {
    return Response.json({ error: 'Name and email required' }, { status: 400 });
  }

  // Insert into D1
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO contact_submissions (id, name, email, company, category, products, message)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, data.name, data.email, data.company, data.category,
    JSON.stringify(data.products), data.message
  ).run();

  // Optionally: Send email notification via Worker or external service

  return Response.json({ success: true, id });
}
```

### Phase 6: Deploy Main Site to Cloudflare

```bash
cd /path/to/maverick-x/React

# Create wrangler.toml for Next.js
# Install @cloudflare/next-on-pages

# Build
npx @cloudflare/next-on-pages

# Deploy
wrangler pages deploy .vercel/output/static --project-name=maverick-x
```

### Phase 7: DNS & Domain Transfer

1. Add custom domain in Cloudflare Pages:
   - `maverickx.com` → maverick-x project
   - `admin.maverickx.com` → maverick-admin project

2. Update DNS records in Cloudflare:
   ```
   CNAME  @      maverick-x.pages.dev
   CNAME  admin  maverick-admin.pages.dev
   ```

3. Disable Vercel deployment (remove from Vercel dashboard)

## Data Migration Script

Create `seeds/initial-data.sql` from existing mocks:

```sql
-- PetroX Solutions
INSERT INTO solutions (id, name, brand, headline, description, details, image, is_active) VALUES
('eor', 'EOR', 'petrox', 'Boost production rates by over 20% with next-generation EOR chemistry',
 'PetroX EOR is an advanced permeability enhancer...',
 'The proprietary industrial chemistry disrupts...',
 '/images/Production-&-EOR-LR-p-1080.png', 1),
-- ... more solutions

-- Solution Features
INSERT INTO solution_features (solution_id, feature, sort_order) VALUES
('eor', 'Boost production rates by over 20%', 0),
('eor', 'Non-hazmat chemistry', 1),
-- ... more features

-- Solution Stats
INSERT INTO solution_stats (solution_id, label, value, sort_order) VALUES
('eor', 'Production Boost', '20%+', 0),
('eor', 'Safety Rating', 'Non-Hazmat', 1),
-- ... more stats

-- News Articles
INSERT INTO news_articles (id, slug, title, excerpt, category, author, read_time, is_featured, is_published) VALUES
('1', 'maverick-metals-launches-dme-technology',
 'Maverick Metals launches Direct Metal Extraction Technology',
 'Revolutionary DME platform enables recovery of critical metals...',
 'Product Launch', 'Maverick X Communications', '3 min read', 1, 1),
-- ... more articles

-- Testimonials
INSERT INTO testimonials (id, author, content, is_active) VALUES
('0', 'Sarah Chen, VP Operations - Western Mining Co.',
 'Maverick X''s LithX technology transformed our copper extraction process...', 1),
-- ... more testimonials
```

## Rollback Plan

If migration fails:

1. Keep Vercel deployment active during transition
2. Use DNS to quickly switch back to Vercel
3. D1 data is independent - won't affect Vercel site

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Infrastructure | 1 hour | Cloudflare account access |
| Phase 2: Admin Deploy | 2 hours | Phase 1 complete |
| Phase 3: Seed Data | 2 hours | Phase 2 complete |
| Phase 4: Modify Next.js | 4-8 hours | Phase 3 complete |
| Phase 5: Contact Form | 2 hours | Phase 4 complete |
| Phase 6: Deploy Main | 2 hours | Phase 5 complete |
| Phase 7: DNS | 1 hour | Phase 6 complete, DNS propagation |

**Total: 1-2 days**

## Commands Reference (WezTerm)

```bash
# Create resources
wrangler d1 create maverick-db
wrangler kv namespace create maverick-sessions
wrangler r2 bucket create maverick-media

# Local development
cd packages/maverick-admin
pnpm install
pnpm dev

# Database operations
wrangler d1 migrations apply maverick-db --local
wrangler d1 migrations apply maverick-db
wrangler d1 execute maverick-db --file=./seeds/initial-data.sql

# Deploy admin
pnpm build
wrangler pages deploy .svelte-kit/cloudflare --project-name=maverick-admin

# Deploy main site
cd /path/to/maverick-x/React
npx @cloudflare/next-on-pages
wrangler pages deploy .vercel/output/static --project-name=maverick-x

# Tail logs
wrangler pages deployment tail --project-name=maverick-admin
wrangler pages deployment tail --project-name=maverick-x
```
