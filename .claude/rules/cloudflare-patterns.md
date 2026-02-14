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

**Pattern Notes**:
- `space`, `io`, `agency` use `create-something-*` (with hyphen between words)
- `ltd`, `lms` use `createsomething*` (no hyphen between words)

**DO NOT** rename these projects in Cloudflare as it would break production deployments.

## MCP Server Domains

MCP servers use a two-tier subdomain convention: `{service}.mcp.{property-domain}`.

### Naming Convention

- **Subdomain**: `{service}.mcp.{domain}` — the `mcp.` prefix groups all MCP servers and reserves the namespace for a future gateway/discovery endpoint
- **Custom domain**: Configured via `[[routes]]` in `wrangler.toml` with `custom_domain = true`

### CREATE SOMETHING Account (`9645bd52e640b8a4f40a3a55ff1dd75a`)

| Worker Name | Production URL | Package |
|---|---|---|
| `schedule-mcp` | `schedule.mcp.createsomething.agency` | `packages/schedule-mcp/` |
| `substrate-mcp` | `substrate.mcp.createsomething.agency` | `packages/substrate-mcp/` |
| `three-tier-framework-mcp` | `framework.mcp.createsomething.agency` | `packages/three-tier-framework-mcp/` |
| `outerfields-pcn-mcp` | `outerfields.mcp.createsomething.agency` | `packages/agency/clients/outerfields/mcp-remote/` |
| `notion-sync-mcp-worker` | `notion-sync.mcp.createsomething.agency` *(pending)* | `packages/notion-sync-mcp/` |

### WORKWAY Account (`5c3e9cf4d55ce171b844fad0931607f9`)

| Worker Name | Production URL | Package |
|---|---|---|
| `halfdozen-gmail-sync-mcp` | `gmail.mcp.workway.co` | `packages/halfdozen-gmail-sync/` |
| `halfdozen-youtube-sync-mcp` | `youtube.mcp.workway.co` | `packages/half-dozen-youtube-sync/` |
| `quickbooks-notion-mcp` | `quickbooks.mcp.workway.co` | `packages/quickbooks-notion-mcp/` |
| `halfdozen-notion-mcp` | `createsomething-notion.mcp.workway.co` | `packages/halfdozen-notion-mcp/` — Half Dozen ↔ CREATE SOMETHING client Notion |
| `system-studio-notion-mcp` | `system-studio-notion.mcp.workway.co` | same package, `wrangler.system-studio.toml` — System Studio ↔ HD Client Notion |

**Half Dozen MCP URL pattern** (use for new Half Dozen MCPs):

- **Base URL:** `https://{service}.mcp.workway.co`
- **Service subdomain:** Short, lowercase name (e.g. `notion`, `gmail`, `youtube`, `zoom`, `quickbooks`). Omit the `halfdozen-` prefix.
- **MCP endpoint:** `https://{service}.mcp.workway.co/mcp` (Streamable HTTP). Optional: `/sse` (SSE), `/` (health JSON).
- In `wrangler.toml`: `pattern = "{service}.mcp.workway.co"` with `custom_domain = true`.

### Adding a New MCP Server

1. Add a `[[routes]]` block to your `wrangler.toml`:
   ```toml
   [[routes]]
   pattern = "{service}.mcp.{domain}"
   custom_domain = true
   ```
2. The domain zone (e.g., `createsomething.agency`) must be active in the same Cloudflare account
3. Cloudflare auto-creates DNS records on `wrangler deploy`
4. All MCP workers support both `/mcp` (Streamable HTTP) and `/sse` (SSE) transports

### Client-Facing Aliases

Some MCP servers have secondary client-facing domains managed via the Cloudflare Dashboard:
- `mcp.outerfields.io` → `agency-outerfields-mcp` (alias for `outerfields.mcp.createsomething.agency`)

### DNS Prerequisites

Custom domains require the zone to be active in the same Cloudflare account as the worker. Verify before deploying:
- `createsomething.agency` — CREATE SOMETHING account
- `workway.co` — WORKWAY account
