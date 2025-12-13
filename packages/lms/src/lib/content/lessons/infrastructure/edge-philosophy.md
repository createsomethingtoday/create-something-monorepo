# Edge Philosophy

## The Principle

**The infrastructure disappears; only the work remains.**

Edge computing is not a technical optimization. It's a philosophical commitment to making infrastructure invisible.

## The Conventional Model

Traditional architecture adds layers between users and their work:

```
User Request
    ↓
DNS Lookup
    ↓
Load Balancer (Virginia)
    ↓
Application Server (Virginia)
    ↓
Database (Virginia)
    ↓
Response travels back
    ↓
User (Tokyo)
```

Each layer exists to solve a problem the previous layer created. The stack grows because we keep adding solutions to symptoms.

**This is additive architecture.**

## The Edge Model

Edge computing inverts the assumption:

```
User Request (Tokyo)
    ↓
Edge Worker (Tokyo)
    ↓
D1 Database (Tokyo)
    ↓
Response
```

The work happens where the user is. Distance disappears. Latency becomes negligible.

**This is subtractive architecture.**

## Why Edge Aligns with CREATE SOMETHING

### DRY: Implementation

Traditional multi-region architecture requires:
- Load balancer configuration per region
- Database replication setup
- Failover logic
- Health checks

Edge architecture requires:
- Deploy once, runs everywhere

**The duplication is removed at the infrastructure level.**

### Rams: Artifact

Ask of every infrastructure component: does it earn its existence?

| Component | Traditional | Edge |
|-----------|-------------|------|
| CDN | Separate service | Built-in |
| Load balancer | Managed service | Automatic |
| Auto-scaling | Configuration | Inherent |
| Multi-region | Complex setup | Default |

The edge model doesn't add these features. It starts with them as defaults and removes what you don't need.

### Heidegger: System

The best infrastructure is invisible. When infrastructure demands attention—monitoring, scaling, debugging cold starts—it has become present-at-hand (Vorhandenheit) instead of ready-to-hand (Zuhandenheit).

Edge infrastructure recedes because:
- **No cold starts** → Workers are always warm
- **No scaling decisions** → Automatic to demand
- **No region selection** → Everywhere by default

**The system serves by disappearing.**

## The Cloudflare Stack

CREATE SOMETHING uses Cloudflare because it embodies edge philosophy:

### Workers
JavaScript/TypeScript that runs everywhere. No containers, no VMs, no servers to manage.

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // This code runs at the edge closest to the user
    const result = await env.DB.prepare('SELECT * FROM data').all();
    return Response.json(result);
  }
};
```

### D1
SQLite at the edge. The database model everyone knows, running globally.

```typescript
// Familiar SQL, global distribution
const users = await env.DB
  .prepare('SELECT * FROM users WHERE active = ?')
  .bind(true)
  .all();
```

### KV
Key-value storage with eventual consistency. Perfect for caching, configuration, feature flags.

```typescript
// Read from the nearest edge location
const config = await env.KV.get('site-config', { type: 'json' });
```

### R2
Object storage without egress fees. The cost model that makes sense.

```typescript
// Store and serve assets globally
await env.BUCKET.put('file.pdf', fileBuffer);
```

## The Zuhandenheit Test

Apply the Heidegger test to your infrastructure:

**If you're thinking about the infrastructure, it's failed.**

Signs of infrastructure becoming visible:
- Debugging region-specific issues
- Managing scaling thresholds
- Worrying about cold start times
- Coordinating multi-region deployments

Signs of infrastructure receding:
- Deploying without thinking about regions
- Scaling happens automatically
- Response times are consistently fast
- The code is the configuration

## The Trade-offs (Honest Assessment)

Edge isn't perfect for everything:

### When Edge Excels
- Read-heavy workloads
- Global user distribution
- Static content with dynamic edges
- Request/response APIs

### When Edge Struggles
- Heavy computation (limited CPU time)
- Large data processing
- Long-running connections
- Complex transaction patterns

**The subtractive approach**: Use edge for what it does well. Don't force it where it doesn't fit.

## SvelteKit + Cloudflare

SvelteKit's adapter system makes edge deployment transparent:

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter()
  }
};
```

One configuration change. Your entire application runs at the edge.

```typescript
// +page.server.ts
export const load: PageServerLoad = async ({ platform }) => {
  // platform.env contains your Cloudflare bindings
  const data = await platform.env.DB.prepare('SELECT * FROM posts').all();
  return { posts: data.results };
};
```

**The framework disappears into the platform.**

## The Pattern

Edge architecture follows a simple pattern:

1. **Compute at the edge** → Workers handle logic
2. **Store at the edge** → D1/KV/R2 for data
3. **Cache aggressively** → KV for hot paths
4. **Stream when possible** → Reduce time-to-first-byte

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Try cache first (KV)
    const cached = await env.CACHE.get(url.pathname);
    if (cached) return new Response(cached);

    // 2. Compute if needed (Workers)
    const data = await env.DB.prepare('SELECT * FROM content WHERE path = ?')
      .bind(url.pathname)
      .first();

    if (!data) return new Response('Not Found', { status: 404 });

    // 3. Cache for next time
    await env.CACHE.put(url.pathname, JSON.stringify(data), {
      expirationTtl: 3600
    });

    return Response.json(data);
  }
};
```

## The Deeper Principle

Edge computing is not about speed. Speed is the symptom.

The principle is: **proximity creates simplicity**.

When compute is close to users:
- Network complexity disappears
- Scaling becomes automatic
- Global distribution is default

**Subtractive architecture at the infrastructure level.**

---

## Reflection

Before moving on:

1. Diagram your current infrastructure. How many layers exist between users and their data?
2. Which components could be eliminated if compute was at the edge?
3. When do you think about infrastructure? Those are the friction points.

**Good infrastructure is infrastructure you forget exists.**
