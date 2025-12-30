# Understanding: @create-something/cloudflare-sdk

> **The Code Mode wrapper—Being-as-SDK where Cloudflare operations recede into familiar patterns.**

## Ontological Position

**Mode of Being**: Cloudflare SDK — Being-as-SDK

This is where infrastructure becomes code. Instead of invoking MCP tools with XML-like syntax, you write TypeScript that feels like any other API. The SDK achieves Zuhandenheit (ready-to-hand)—when working well, you don't think about Cloudflare's API; you just use it. The hammer disappears when hammering.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| **Wrangler CLI** | Executes Cloudflare commands (KV, D1, Pages, etc.) |
| `execa` | Node.js process execution wrapper |
| **TypeScript** | Type-safe API surface |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| **Developers** | How to compose Cloudflare operations in code |
| **Claude Code** | When to use SDK vs direct MCP tools |
| **The field** | Code Mode philosophy in action |

## Internal Structure

```
packages/cloudflare-sdk/
├── src/
│   └── index.ts              → Single-file SDK
├── package.json
├── tsconfig.json
└── README.md
```

**Single-file design**: All operations in one file for maximum transparency. No abstraction layers, no framework magic—just wrangler CLI invocations wrapped in TypeScript.

## Core Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| **Zuhandenheit** | Ready-to-hand; tools recede into use | Philosophy |
| **Code Mode** | Prefer code-based operations over direct tool calls | CLAUDE.md |
| **Composed Operations** | Chaining multiple API calls in code | All SDK methods |
| **Type Safety** | TypeScript interfaces for Cloudflare resources | `index.ts` types |

## To Understand This Package, Read

1. **`src/index.ts`** — Complete SDK implementation (single file)
2. **`CLAUDE.md`** — Code Mode philosophy
3. **`.claude/rules/cloudflare-patterns.md`** — Cloudflare conventions
4. **[Paper: Code Mode Hermeneutic Analysis](https://createsomething.io/papers/code-mode-hermeneutic-analysis)** — Philosophical grounding

## API Reference

### KV Storage (`cf.kv`)

```typescript
import { cf } from '@create-something/cloudflare-sdk';

// List namespaces
const namespaces = await cf.kv.listNamespaces();
// Returns: KVNamespace[] = [{ id: '...', title: '...' }]

// Get value
const value = await cf.kv.get('namespace-id', 'key');
// Returns: string | null

// Put value
await cf.kv.put('namespace-id', 'key', 'value');

// Delete key
await cf.kv.delete('namespace-id', 'key');

// List keys
const keys = await cf.kv.list('namespace-id', 'user:');
// Returns: string[] (keys with prefix)
```

### D1 Database (`cf.d1`)

```typescript
// List databases
const databases = await cf.d1.listDatabases();
// Returns: D1Database[] = [{ uuid: '...', name: '...' }]

// Execute query
const users = await cf.d1.query('my-db', 'SELECT * FROM users WHERE id = ?', [123]);
// Returns: any[] (query results)

// Execute statement (no results)
await cf.d1.execute('my-db', 'DELETE FROM logs WHERE created_at < ?', [cutoff]);
```

### Pages Deployment (`cf.pages`)

```typescript
// Deploy directory
const url = await cf.pages.deploy('project-name', './dist');
// Returns: string (deployment URL)
```

### R2 Storage (`cf.r2`)

```typescript
// List buckets
const buckets = await cf.r2.listBuckets();
// Returns: R2Bucket[] = [{ name: '...', creation_date: '...' }]

// Put object
await cf.r2.put('bucket-name', 'path/to/file.txt', 'content');

// Get object
const content = await cf.r2.get('bucket-name', 'path/to/file.txt');
// Returns: string | null

// Delete object
await cf.r2.delete('bucket-name', 'path/to/file.txt');

// List objects
const objects = await cf.r2.list('bucket-name', 'prefix/');
// Returns: string[] (object keys)
```

### Workers (`cf.workers`)

```typescript
// List workers
const workers = await cf.workers.list();
// Returns: Worker[] = [{ id: '...', name: '...' }]

// Deploy worker
await cf.workers.deploy('worker-name', './dist/worker.js');
```

## Code Mode Philosophy

**Principle**: Prefer code-based operations when composing multiple steps.

### When to Use SDK (Code Mode)

```typescript
// ✓ Composing operations
const namespaces = await cf.kv.listNamespaces();
const sessionData = await Promise.all(
  namespaces.map(ns => cf.kv.get(ns.id, 'session:active'))
);

// ✓ Filtering results
const databases = await cf.d1.listDatabases();
const prodDbs = databases.filter(db => db.name.includes('prod'));

// ✓ Familiar patterns
const user = await cf.d1.query('users-db',
  'SELECT * FROM users WHERE email = ?',
  [email]
);
```

### When to Use Direct MCP Tools

```typescript
// ✓ Single operations (visibility in UI)
<invoke name="mcp__cloudflare__kv_get">
  <parameter name="namespaceId">abc123</parameter>
  <parameter name="key">single-key</parameter>
</invoke>

// ✓ When SDK isn't available yet
// (Not all Cloudflare APIs are wrapped)
```

## Implementation Pattern

All SDK methods follow the same pattern:

```typescript
export const kv = {
  async get(namespaceId: string, key: string): Promise<string | null> {
    try {
      // 1. Build wrangler command args
      const args = ['kv:key', 'get', key, '--namespace-id', namespaceId];

      // 2. Execute via execa
      const { stdout } = await execa('wrangler', args);

      // 3. Return parsed result
      return stdout;
    } catch {
      // 4. Handle errors gracefully
      return null;
    }
  }
};
```

**No abstraction**: Direct wrangler CLI invocation. What you see is what runs.

## Type Definitions

```typescript
export interface KVNamespace {
  id: string;
  title: string;
}

export interface D1Database {
  uuid: string;
  name: string;
}

export interface Worker {
  id: string;
  name: string;
}

export interface R2Bucket {
  name: string;
  creation_date: string;
}
```

**Minimal types**: Only what's needed for type safety. No complex abstractions.

## Critical Paths

### Path 1: KV Cache Pattern
```typescript
// Check cache first
let tenant = await cf.kv.get('cache-namespace', `tenant:${subdomain}`);

// Cache miss → query D1
if (!tenant) {
  const result = await cf.d1.query('tenants-db',
    'SELECT * FROM tenants WHERE subdomain = ?',
    [subdomain]
  );

  if (result.length > 0) {
    tenant = result[0];

    // Populate cache
    await cf.kv.put('cache-namespace', `tenant:${subdomain}`,
      JSON.stringify(tenant), { expirationTtl: 3600 }
    );
  }
}
```

### Path 2: Multi-Database Query
```typescript
// Get all databases
const databases = await cf.d1.listDatabases();

// Query each for user data
const allUsers = await Promise.all(
  databases.map(async db => {
    try {
      return await cf.d1.query(db.name, 'SELECT * FROM users');
    } catch {
      return [];
    }
  })
);

// Flatten and deduplicate
const uniqueUsers = [...new Map(
  allUsers.flat().map(u => [u.id, u])
).values()];
```

### Path 3: R2 Batch Upload
```typescript
import fs from 'fs/promises';
import path from 'path';

// Read directory
const files = await fs.readdir('./dist');

// Upload all to R2
await Promise.all(
  files.map(async file => {
    const content = await fs.readFile(`./dist/${file}`, 'utf-8');
    await cf.r2.put('assets-bucket', `deploy/latest/${file}`, content);
  })
);
```

## Error Handling

All methods handle errors gracefully:

```typescript
async get(namespaceId: string, key: string): Promise<string | null> {
  try {
    const { stdout } = await execa('wrangler', [...]);
    return stdout;
  } catch {
    // Return null on error (key doesn't exist, network issue, etc.)
    return null;
  }
}
```

**Philosophy**: Errors are expected (missing keys, network issues). Return `null` instead of throwing—let callers decide how to handle.

## Hermeneutic Function

```
.ltd (Canon) ──────────────────────────────────────┐
    │                                               │
    ▼                                               │
cloudflare-sdk (Code Mode) ◄── "Do tools recede?"   │
    │                                               │
    ├──► Enables io research workflows              │
    ├──► Enables agency deployment automation       │
    ├──► Enables templates-platform infrastructure  │
    │                                               │
    └──► Discovers API friction → returns to .ltd ──┘
```

**The loop**:
1. `.ltd` defines tools should recede (Zuhandenheit)
2. `cloudflare-sdk` wraps Cloudflare in familiar code
3. Friction reveals where APIs become present-at-hand
4. Friction feeds back to `.ltd` for pattern documentation
5. Documented patterns improve SDK design

## Common Tasks

| Task | Code |
|------|------|
| List KV namespaces | `await cf.kv.listNamespaces()` |
| Get cached value | `await cf.kv.get('ns-id', 'key')` |
| Query D1 database | `await cf.d1.query('db', 'SELECT ...')` |
| Deploy to Pages | `await cf.pages.deploy('project', './dist')` |
| Upload to R2 | `await cf.r2.put('bucket', 'path', content)` |
| List R2 objects | `await cf.r2.list('bucket', 'prefix/')` |

## Subtractive Triad Application

| Level | Question | Answer |
|-------|----------|--------|
| **DRY** | Have I wrapped this before? | Single SDK for all Cloudflare ops |
| **Rams** | Does this wrapper earn existence? | Yes—eliminates XML tool invocation noise |
| **Heidegger** | Do tools recede? | `await kv.get()` vs `<invoke name="mcp__cloudflare__kv_get">` |

**Goal**: Cloudflare operations feel like any other TypeScript API. No special syntax, no ceremony—just code.

## Why Not Use Cloudflare's Official SDKs?

Cloudflare provides official SDKs, but:

1. **Not designed for Claude Code**: Require API tokens, complex auth flows
2. **Too heavyweight**: Full REST client vs simple wrangler CLI wrapping
3. **Not Code Mode aligned**: SDK abstractions add layers instead of removing them

This SDK is **purpose-built for Claude Code workflows**: minimal, transparent, type-safe.

## Future Expansion

Additional Cloudflare services can be wrapped following the same pattern:

| Service | Methods Needed |
|---------|----------------|
| **Durable Objects** | `list()`, `get()`, `delete()` |
| **Queues** | `send()`, `receive()`, `ack()` |
| **Workers Analytics** | `query()`, `metrics()` |
| **Images** | `upload()`, `list()`, `delete()` |

**Guideline**: Only add if frequently composed in code. Single-use operations can stay as direct MCP calls.

## References

- **[CLAUDE.md Code Mode](../../CLAUDE.md)** — Code Mode philosophy
- **[Cloudflare Patterns](../../.claude/rules/cloudflare-patterns.md)** — Cloudflare conventions
- **[Paper: Code Mode Hermeneutic Analysis](https://createsomething.io/papers/code-mode-hermeneutic-analysis)** — Philosophical grounding

---

*Last validated: 2025-12-29*

**This UNDERSTANDING.md follows the "Less, but better" principle—document what's critical to understand, not every detail. When you need deeper knowledge, follow the references to source files.**
