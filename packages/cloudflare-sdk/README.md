# @create-something/cloudflare-sdk

Code Mode wrapper for Cloudflare operations.

## Philosophy

Tools recede into transparent use. Instead of direct MCP tool calls, compose Cloudflare operations in TypeScript where the SDK disappears into the work.

## Installation

```bash
pnpm add @create-something/cloudflare-sdk
```

## Usage

```typescript
import { cf } from '@create-something/cloudflare-sdk';

// KV operations
const namespaces = await cf.kv.listNamespaces();
const value = await cf.kv.get('namespace-id', 'key');
await cf.kv.put('namespace-id', 'key', 'value');

// D1 queries
const users = await cf.d1.query('my-db', 'SELECT * FROM users');

// Pages deployment
const url = await cf.pages.deploy('project', './dist');
```

## When to Use

Use the SDK when:
- Composing multiple operations
- Filtering or processing results
- Familiar patterns exist in code

Use direct MCP tools when:
- Single operations
- Visibility needed in UI

## API Reference

### `cf.kv`

- `listNamespaces()` - List all KV namespaces
- `get(namespaceId, key)` - Get value
- `put(namespaceId, key, value)` - Set value
- `delete(namespaceId, key)` - Delete key
- `list(namespaceId, options?)` - List keys

### `cf.d1`

- `listDatabases()` - List all D1 databases
- `query(database, sql, params?)` - Execute query

### `cf.pages`

- `deploy(project, directory)` - Deploy to Pages

## Related

- `CLAUDE.md` - Code Mode philosophy
- `.claude/rules/cloudflare-patterns.md` - Cloudflare conventions
