# D1 Database Patterns

## The Principle

**SQLite at the edge—simplicity as feature.**

D1 is Cloudflare's distributed SQLite database. It's not a compromise; it's a choice. The same database model that powers millions of applications, running globally.

## Why SQLite?

SQLite is the most deployed database in the world. It runs on every phone, in every browser, in countless applications. This ubiquity isn't accidental.

SQLite embodies "less, but better":
- **No server to manage** → The database is a file
- **No connection pooling** → Direct embedded access
- **No network hops** → Same-process execution
- **No configuration** → Sensible defaults

**D1 takes this simplicity and distributes it globally.**

## D1 Architecture

```
Your Code (Worker)
      ↓
D1 Database (Edge)
      ↓
Primary (for writes)
      ↓
Replicas (for reads, everywhere)
```

Reads are local. Writes propagate from primary. The complexity of distribution is hidden.

## Basic Patterns

### Query Execution

```typescript
// +page.server.ts
export const load: PageServerLoad = async ({ platform }) => {
  const db = platform?.env.DB;

  // Simple query
  const { results } = await db
    .prepare('SELECT * FROM posts WHERE published = ?')
    .bind(true)
    .all();

  return { posts: results };
};
```

### Single Row

```typescript
// Get one result
const user = await db
  .prepare('SELECT * FROM users WHERE id = ?')
  .bind(userId)
  .first();

if (!user) {
  throw error(404, 'User not found');
}
```

### Insert/Update

```typescript
// Insert and get the new ID
const result = await db
  .prepare('INSERT INTO posts (title, content, published) VALUES (?, ?, ?)')
  .bind(title, content, false)
  .run();

const newId = result.meta.last_row_id;
```

### Batch Operations

When you need multiple operations atomically:

```typescript
const batch = await db.batch([
  db.prepare('INSERT INTO audit_log (action) VALUES (?)').bind('user_created'),
  db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').bind(name, email),
  db.prepare('UPDATE stats SET user_count = user_count + 1')
]);

// All succeed or all fail
```

## Schema Design for Edge

### Denormalize Thoughtfully

Traditional normalization creates joins. Joins at the edge cost latency. Denormalize where it reduces queries:

```sql
-- Instead of separate author query
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_name TEXT,        -- Denormalized
  author_avatar TEXT,      -- Denormalized
  published_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Use Indexes Strategically

SQLite indexes are powerful but have overhead. Index what you query:

```sql
-- Index frequently filtered columns
CREATE INDEX idx_posts_published ON posts(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_posts_author ON posts(author_name);

-- Compound index for common query patterns
CREATE INDEX idx_posts_author_published ON posts(author_name, published_at DESC);
```

### Soft Deletes for Audit

```sql
CREATE TABLE content (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  deleted_at TEXT,  -- NULL = active, timestamp = soft deleted
  -- ...
);

-- Query active content
SELECT * FROM content WHERE deleted_at IS NULL;
```

## Migrations

D1 uses Wrangler migrations. Keep them simple and forward-only.

### Create Migration

```bash
wrangler d1 migrations create DB_NAME add_users_table
```

This creates: `migrations/0001_add_users_table.sql`

### Write Migration

```sql
-- migrations/0001_add_users_table.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

### Apply Migrations

```bash
# Local development
wrangler d1 migrations apply DB_NAME --local

# Production
wrangler d1 migrations apply DB_NAME
```

**Migrations are additive. Never delete migration files.**

## Query Patterns

### Pagination

Offset pagination is simple but slow for large offsets. Use cursor-based pagination:

```typescript
// Cursor-based (fast)
const posts = await db
  .prepare(`
    SELECT * FROM posts
    WHERE published_at < ?
    ORDER BY published_at DESC
    LIMIT 10
  `)
  .bind(cursor || new Date().toISOString())
  .all();

// Return next cursor
const nextCursor = posts.results.at(-1)?.published_at;
```

### Search

SQLite FTS5 provides full-text search:

```sql
-- Create FTS table
CREATE VIRTUAL TABLE posts_fts USING fts5(
  title,
  content,
  content='posts',
  content_rowid='id'
);

-- Populate from main table
INSERT INTO posts_fts(rowid, title, content)
SELECT id, title, content FROM posts;
```

```typescript
// Search query
const results = await db
  .prepare(`
    SELECT posts.* FROM posts_fts
    JOIN posts ON posts.id = posts_fts.rowid
    WHERE posts_fts MATCH ?
    ORDER BY rank
    LIMIT 20
  `)
  .bind(searchQuery)
  .all();
```

### Aggregations

```typescript
// Stats query
const stats = await db
  .prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN published_at IS NOT NULL THEN 1 ELSE 0 END) as published,
      MAX(published_at) as last_published
    FROM posts
  `)
  .first();
```

## Error Handling

D1 errors should be handled gracefully:

```typescript
export const load: PageServerLoad = async ({ platform }) => {
  try {
    const { results } = await platform.env.DB
      .prepare('SELECT * FROM posts')
      .all();

    return { posts: results };
  } catch (err) {
    console.error('D1 error:', err);

    // Return empty state, don't crash
    return { posts: [], error: 'Unable to load posts' };
  }
};
```

## Type Safety

Generate types from your schema:

```typescript
// types/database.ts
export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface Post {
  id: number;
  title: string;
  content: string | null;
  author_name: string;
  published_at: string | null;
  created_at: string;
}
```

Use with queries:

```typescript
const user = await db
  .prepare('SELECT * FROM users WHERE id = ?')
  .bind(userId)
  .first<User>();
```

## Performance Patterns

### Minimize Round Trips

Bad (multiple queries):
```typescript
const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
const posts = await db.prepare('SELECT * FROM posts WHERE author_id = ?').bind(id).all();
const comments = await db.prepare('SELECT COUNT(*) FROM comments WHERE author_id = ?').bind(id).first();
```

Good (single query with joins):
```typescript
const result = await db.prepare(`
  SELECT
    u.*,
    (SELECT COUNT(*) FROM posts WHERE author_id = u.id) as post_count,
    (SELECT COUNT(*) FROM comments WHERE author_id = u.id) as comment_count
  FROM users u
  WHERE u.id = ?
`).bind(id).first();
```

### Cache Hot Queries

Combine D1 with KV for frequently accessed data:

```typescript
async function getPopularPosts(db: D1Database, kv: KVNamespace) {
  // Check cache first
  const cached = await kv.get('popular-posts', { type: 'json' });
  if (cached) return cached;

  // Query database
  const { results } = await db
    .prepare('SELECT * FROM posts ORDER BY view_count DESC LIMIT 10')
    .all();

  // Cache for 5 minutes
  await kv.put('popular-posts', JSON.stringify(results), { expirationTtl: 300 });

  return results;
}
```

## Anti-Patterns

### Over-Normalizing

```sql
-- Too normalized for edge
CREATE TABLE users (id, name);
CREATE TABLE profiles (id, user_id, bio);
CREATE TABLE avatars (id, user_id, url);
CREATE TABLE settings (id, user_id, theme);

-- Requires 4 queries or complex join
```

Better:
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  settings TEXT  -- JSON for flexibility
);
```

### Ignoring Indexes

```typescript
// Slow: full table scan
const posts = await db
  .prepare('SELECT * FROM posts WHERE author_name = ?')
  .bind(name)
  .all();

// Fast: uses index (if created)
// CREATE INDEX idx_posts_author ON posts(author_name);
```

### Not Using Prepared Statements

```typescript
// WRONG: SQL injection vulnerability
const query = `SELECT * FROM users WHERE name = '${name}'`;

// RIGHT: parameterized query
const result = await db
  .prepare('SELECT * FROM users WHERE name = ?')
  .bind(name)
  .first();
```

---

## Reflection

Before the praxis:

1. What data in your current project would benefit from edge distribution?
2. Are you over-normalizing? Could denormalization reduce query complexity?
3. Which queries are hot paths that should be cached?

**Praxis**: Create a D1 migration for a real feature in your project.
