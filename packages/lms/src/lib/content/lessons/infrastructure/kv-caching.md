# KV Caching Strategies

## The Principle

**Cache what changes slowly. Compute what changes often.**

Cloudflare KV is a global key-value store with eventual consistency. It's not a database replacement—it's a caching layer that makes the right things instant.

## Understanding KV

KV optimizes for reads:
- **Reads**: Fast, globally replicated
- **Writes**: Eventually consistent, propagate globally

This asymmetry is a feature. Most applications read far more than they write. KV makes reads nearly instant, everywhere.

```
Write to KV (any location)
        ↓
Propagation (seconds to minutes)
        ↓
Available everywhere
```

## When to Use KV

### Good for KV
- Configuration and feature flags
- Cached API responses
- Session data (with caveats)
- Pre-computed aggregations
- Static content that rarely changes

### Not for KV
- Frequently updated data
- Data requiring strong consistency
- Transactional operations
- Primary data storage

**KV is a cache, not a database.**

## Basic Operations

### Read

```typescript
// Simple get
const value = await env.KV.get('key');

// With type parsing
const config = await env.KV.get('site-config', { type: 'json' });

// With metadata
const { value, metadata } = await env.KV.getWithMetadata('key');
```

### Write

```typescript
// Simple put
await env.KV.put('key', 'value');

// With expiration (TTL in seconds)
await env.KV.put('session:123', sessionData, { expirationTtl: 3600 });

// With metadata
await env.KV.put('user:profile:123', profileJson, {
  metadata: { cached_at: Date.now() }
});
```

### Delete

```typescript
await env.KV.delete('key');
```

### List

```typescript
// List keys with prefix
const { keys } = await env.KV.list({ prefix: 'user:' });

// Paginate through keys
let cursor = undefined;
do {
  const result = await env.KV.list({ prefix: 'log:', cursor });
  // Process result.keys
  cursor = result.list_complete ? undefined : result.cursor;
} while (cursor);
```

## Caching Patterns

### Cache-Aside (Lazy Loading)

The most common pattern. Check cache first, fall back to source:

```typescript
async function getPost(postId: string, env: Env) {
  const cacheKey = `post:${postId}`;

  // Try cache first
  const cached = await env.KV.get(cacheKey, { type: 'json' });
  if (cached) return cached;

  // Cache miss: fetch from database
  const post = await env.DB
    .prepare('SELECT * FROM posts WHERE id = ?')
    .bind(postId)
    .first();

  if (!post) return null;

  // Populate cache for next time
  await env.KV.put(cacheKey, JSON.stringify(post), {
    expirationTtl: 3600 // 1 hour
  });

  return post;
}
```

### Write-Through

Update cache when writing to source:

```typescript
async function updatePost(postId: string, data: PostUpdate, env: Env) {
  // Update database
  await env.DB
    .prepare('UPDATE posts SET title = ?, content = ? WHERE id = ?')
    .bind(data.title, data.content, postId)
    .run();

  // Fetch updated record
  const updated = await env.DB
    .prepare('SELECT * FROM posts WHERE id = ?')
    .bind(postId)
    .first();

  // Update cache
  await env.KV.put(`post:${postId}`, JSON.stringify(updated), {
    expirationTtl: 3600
  });

  return updated;
}
```

### Cache Invalidation

When data changes, invalidate relevant caches:

```typescript
async function deletePost(postId: string, env: Env) {
  // Delete from database
  await env.DB
    .prepare('DELETE FROM posts WHERE id = ?')
    .bind(postId)
    .run();

  // Invalidate caches
  await Promise.all([
    env.KV.delete(`post:${postId}`),
    env.KV.delete('posts:recent'),  // Invalidate lists too
    env.KV.delete('posts:count')
  ]);
}
```

### Stale-While-Revalidate

Serve stale content while refreshing in background:

```typescript
async function getPosts(env: Env) {
  const cacheKey = 'posts:recent';
  const result = await env.KV.getWithMetadata(cacheKey, { type: 'json' });

  if (result.value) {
    const cachedAt = result.metadata?.cached_at || 0;
    const staleAfter = 5 * 60 * 1000; // 5 minutes

    if (Date.now() - cachedAt > staleAfter) {
      // Refresh in background (don't await)
      refreshPostsCache(env);
    }

    return result.value;
  }

  // No cache, fetch and populate
  return refreshPostsCache(env);
}

async function refreshPostsCache(env: Env) {
  const { results } = await env.DB
    .prepare('SELECT * FROM posts ORDER BY published_at DESC LIMIT 20')
    .all();

  await env.KV.put('posts:recent', JSON.stringify(results), {
    expirationTtl: 3600,
    metadata: { cached_at: Date.now() }
  });

  return results;
}
```

## Key Design

### Hierarchical Keys

```typescript
// Good: Hierarchical, easy to reason about
'user:123:profile'
'user:123:settings'
'user:123:posts'
'post:456:content'
'post:456:comments'

// Enables prefix-based operations
const userKeys = await env.KV.list({ prefix: 'user:123:' });
```

### Include Version/Timestamp

```typescript
// Cache key includes version for invalidation
const version = await getSchemaVersion();
const key = `v${version}:posts:recent`;
```

### Avoid Key Collisions

```typescript
// Bad: Could collide
'config'

// Good: Namespaced
'app:config'
'tenant:123:config'
```

## TTL Strategies

### Static Content

Long TTLs for rarely-changing data:

```typescript
// Site config: cache for 24 hours
await env.KV.put('site:config', configJson, {
  expirationTtl: 86400
});

// Static pages: cache for 1 hour
await env.KV.put(`page:${slug}`, pageHtml, {
  expirationTtl: 3600
});
```

### Dynamic Content

Shorter TTLs for frequently-changing data:

```typescript
// Recent posts: cache for 5 minutes
await env.KV.put('posts:recent', postsJson, {
  expirationTtl: 300
});

// User session: cache for 30 minutes
await env.KV.put(`session:${sessionId}`, sessionJson, {
  expirationTtl: 1800
});
```

### Computed Aggregations

Balance freshness with computation cost:

```typescript
// Daily stats: cache until midnight
const secondsUntilMidnight = getSecondsUntilMidnight();
await env.KV.put('stats:daily', statsJson, {
  expirationTtl: secondsUntilMidnight
});
```

## Error Handling

KV operations can fail. Handle gracefully:

```typescript
async function getCachedOrFresh(key: string, fetcher: () => Promise<any>, env: Env) {
  try {
    const cached = await env.KV.get(key, { type: 'json' });
    if (cached) return { data: cached, source: 'cache' };
  } catch (err) {
    console.error('KV read error:', err);
    // Continue to fetch fresh data
  }

  const fresh = await fetcher();

  try {
    await env.KV.put(key, JSON.stringify(fresh), { expirationTtl: 3600 });
  } catch (err) {
    console.error('KV write error:', err);
    // Data still returned even if cache write fails
  }

  return { data: fresh, source: 'fresh' };
}
```

## Monitoring Cache Performance

Track cache hits and misses:

```typescript
async function getCachedData(key: string, fetcher: () => Promise<any>, env: Env) {
  const cached = await env.KV.get(key, { type: 'json' });

  if (cached) {
    // Log hit for analytics
    console.log(`Cache HIT: ${key}`);
    return cached;
  }

  console.log(`Cache MISS: ${key}`);
  const fresh = await fetcher();

  await env.KV.put(key, JSON.stringify(fresh), { expirationTtl: 3600 });
  return fresh;
}
```

## Anti-Patterns

### Caching Too Aggressively

```typescript
// Bad: Caching user-specific data globally
await env.KV.put('current-user', userData);

// Good: Include user identifier
await env.KV.put(`user:${userId}:profile`, userData);
```

### Ignoring Eventual Consistency

```typescript
// Bad: Expecting immediate consistency
await env.KV.put('counter', newValue);
const value = await env.KV.get('counter'); // Might return old value!

// Good: Design for eventual consistency
// Use D1 for data requiring strong consistency
```

### Giant Cache Values

```typescript
// Bad: Caching entire database
await env.KV.put('all-posts', allPostsJson); // Could be megabytes

// Good: Cache specific, bounded queries
await env.KV.put('posts:recent:20', recentPostsJson);
```

### Forgetting Expiration

```typescript
// Bad: No expiration = cache forever
await env.KV.put('data', dataJson);

// Good: Always set TTL
await env.KV.put('data', dataJson, { expirationTtl: 3600 });
```

---

## Reflection

Before moving on:

1. What data in your application is read frequently but written rarely?
2. How much latency could you save by caching hot paths?
3. What's the acceptable staleness for different types of data?

**The best cache is the one you don't notice.**

---

## Cross-Property References

> **Canon Reference**: KV caching embodies [Dwelling in Tools](https://createsomething.ltd/patterns/dwelling-in-tools)—infrastructure that recedes into transparent use.
>
> **Canon Reference**: Cache key design reflects [Principled Defaults](https://createsomething.ltd/patterns/principled-defaults)—hierarchical keys guide correct usage patterns.
>
> **Practice**: Study the KV patterns in the templates-platform router worker for real caching implementations.
