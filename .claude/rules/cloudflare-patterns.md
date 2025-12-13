# Cloudflare Patterns

## Architecture

Each package has its own Cloudflare resources:
- **D1 Database**: Per-package SQLite
- **KV Namespace**: Per-package key-value store
- **Pages**: Deployment target
- **Workers**: Standalone compute (optional)

## SvelteKit + Cloudflare

### Platform Access
```typescript
// +page.server.ts or +server.ts
export const load: PageServerLoad = async ({ platform }) => {
  const db = platform?.env.DB;
  const kv = platform?.env.KV;
  // ...
};
```

### D1 Queries
```typescript
// Simple query
const result = await db.prepare('SELECT * FROM users WHERE id = ?')
  .bind(userId)
  .first();

// Multiple results
const { results } = await db.prepare('SELECT * FROM posts')
  .all();

// Batch operations
const batch = await db.batch([
  db.prepare('INSERT INTO logs (message) VALUES (?)').bind('start'),
  db.prepare('UPDATE status SET running = 1'),
]);
```

### KV Operations
```typescript
// Get with metadata
const { value, metadata } = await kv.getWithMetadata(key, { type: 'json' });

// Put with expiration
await kv.put(key, JSON.stringify(data), {
  expirationTtl: 3600, // 1 hour
  metadata: { created: Date.now() }
});

// List with prefix
const { keys } = await kv.list({ prefix: 'user:' });
```

## Wrangler Types

Generate types before development:
```bash
pnpm --filter=space exec wrangler types
```

This creates `worker-configuration.d.ts` with:
```typescript
interface Env {
  DB: D1Database;
  KV: KVNamespace;
  // ... other bindings
}
```

## Deployment

**Handoff to WezTerm** (not Claude Code's domain):
```bash
# Deploy Pages (use exact project name from table above)
wrangler pages deploy .svelte-kit/cloudflare --project-name=create-something-space

# Apply migrations
wrangler d1 migrations apply DB_NAME

# Tail logs
wrangler pages deployment tail --project-name=create-something-space
```

## Workers

Standalone Workers for compute-intensive tasks:
```
packages/[pkg]/workers/[name]/
├── src/
│   └── index.ts
├── wrangler.toml
└── package.json
```

Example: `packages/space/workers/motion-extractor/` for Puppeteer animation extraction.

## SDK Pattern

For composed operations, use the Cloudflare SDK:
```typescript
import { cf } from '@create-something/cloudflare-sdk';

// Composed KV operations
const namespaces = await cf.kv.listNamespaces();
const value = await cf.kv.get('namespace-id', 'key');

// D1 queries
const users = await cf.d1.query('my-db', 'SELECT * FROM users');
```

## Project Names

**Important**: Cloudflare Pages project names are inconsistent due to historical naming. Always use the exact names below.

| Package | Cloudflare Pages Project | Domain | Naming Pattern |
|---------|--------------------------|--------|----------------|
| space | `create-something-space` | createsomething.space | `create-something-*` |
| io | `create-something-io` | createsomething.io | `create-something-*` |
| agency | `create-something-agency` | createsomething.agency | `create-something-*` |
| ltd | `createsomething-ltd` | createsomething.ltd | `createsomething-*` |
| lms | `createsomething-lms` | learn.createsomething.space | `createsomething-*` |
| templates-platform | `templates-platform` | templates.createsomething.space | standalone |

**Pattern Notes**:
- `space`, `io`, `agency` use `create-something-*` (with hyphen between words)
- `ltd`, `lms` use `createsomething*` (no hyphen between words)
- `templates-platform` is standalone (no prefix)

**DO NOT** rename these projects in Cloudflare as it would break production deployments.
