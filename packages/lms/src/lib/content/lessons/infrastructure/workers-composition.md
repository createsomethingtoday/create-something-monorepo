# Workers Composition

## The Principle

**Building services that compose cleanly.**

A well-designed Worker is like a well-designed component: it does one thing, does it well, and connects naturally with others.

## The Monolith vs. Microservices False Dichotomy

The industry debates monolith vs. microservices as if they're the only options. Workers offer a third path:

**Composable services** that share infrastructure but maintain boundaries.

```
Traditional Microservices:
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Auth    │────│ API     │────│ Storage │
│ Service │    │ Gateway │    │ Service │
└─────────┘    └─────────┘    └─────────┘
(3 deployments, 3 databases, network calls between each)

Workers Composition:
┌─────────────────────────────────────────┐
│              Edge Network                │
│  ┌──────┐  ┌──────┐  ┌──────┐           │
│  │ Auth │  │ API  │  │Router│           │
│  │Worker│──│Worker│──│Worker│           │
│  └──────┘  └──────┘  └──────┘           │
│       ↓        ↓        ↓               │
│  [D1/KV shared infrastructure]          │
└─────────────────────────────────────────┘
(Same edge, shared resources, internal calls)
```

## Service Bindings

Workers can call other Workers directly, without HTTP overhead:

```typescript
// auth-worker/src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return Response.json({ valid: false, error: 'No token' }, { status: 401 });
    }

    const user = await validateToken(token, env);
    return Response.json({ valid: true, user });
  }
};
```

```typescript
// api-worker/src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Call auth worker via service binding
    const authResponse = await env.AUTH.fetch(request.clone());
    const auth = await authResponse.json();

    if (!auth.valid) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Proceed with authenticated request
    return handleApiRequest(request, auth.user, env);
  }
};
```

Configure bindings in `wrangler.toml`:

```toml
# api-worker/wrangler.toml
name = "api-worker"

[[services]]
binding = "AUTH"
service = "auth-worker"
```

**No network hop, no cold start, same edge location.**

## Composition Patterns

### Gateway Pattern

One Worker routes to specialized Workers:

```typescript
// router-worker/src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Route by path
    if (url.pathname.startsWith('/api/auth')) {
      return env.AUTH.fetch(request);
    }

    if (url.pathname.startsWith('/api/users')) {
      return env.USERS.fetch(request);
    }

    if (url.pathname.startsWith('/api/content')) {
      return env.CONTENT.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

### Middleware Pattern

Workers can wrap other Workers:

```typescript
// logging-middleware/src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const start = Date.now();

    // Pass through to main API
    const response = await env.API.fetch(request);

    // Log after response
    const duration = Date.now() - start;
    console.log(`${request.method} ${request.url} - ${response.status} (${duration}ms)`);

    // Could also write to analytics
    await env.ANALYTICS.put(`log:${Date.now()}`, JSON.stringify({
      method: request.method,
      url: request.url,
      status: response.status,
      duration
    }));

    return response;
  }
};
```

### Feature Flag Pattern

Control behavior without redeployment:

```typescript
// feature-flags-worker/src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const feature = url.searchParams.get('feature');

    if (!feature) {
      // Return all flags
      const flags = await env.FLAGS.get('all-flags', { type: 'json' }) || {};
      return Response.json(flags);
    }

    const enabled = await env.FLAGS.get(`flag:${feature}`);
    return Response.json({ feature, enabled: enabled === 'true' });
  }
};
```

Use in other Workers:

```typescript
async function isFeatureEnabled(feature: string, env: Env): Promise<boolean> {
  const response = await env.FLAGS.fetch(
    new Request(`https://flags/?feature=${feature}`)
  );
  const { enabled } = await response.json();
  return enabled;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (await isFeatureEnabled('new-algorithm', env)) {
      return handleWithNewAlgorithm(request, env);
    }
    return handleWithOldAlgorithm(request, env);
  }
};
```

## Shared Resources

Workers can share D1, KV, and R2:

```toml
# worker-a/wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "shared-db"
database_id = "xxx"

[[kv_namespaces]]
binding = "CACHE"
id = "yyy"

# worker-b/wrangler.toml (same bindings)
[[d1_databases]]
binding = "DB"
database_name = "shared-db"
database_id = "xxx"

[[kv_namespaces]]
binding = "CACHE"
id = "yyy"
```

**Same data, different access patterns, no synchronization needed.**

## Worker Organization

### Directory Structure

```
workers/
├── auth/
│   ├── src/
│   │   └── index.ts
│   ├── wrangler.toml
│   └── package.json
├── api/
│   ├── src/
│   │   └── index.ts
│   ├── wrangler.toml
│   └── package.json
├── router/
│   ├── src/
│   │   └── index.ts
│   ├── wrangler.toml
│   └── package.json
└── shared/
    └── types.ts
```

### Shared Types

```typescript
// workers/shared/types.ts
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

export interface AuthResult {
  valid: boolean;
  user?: User;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## Error Handling Across Services

When Workers compose, errors should propagate meaningfully:

```typescript
// api-worker/src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Call auth service
      const authResponse = await env.AUTH.fetch(request.clone());

      if (!authResponse.ok) {
        // Forward auth errors
        return authResponse;
      }

      const auth = await authResponse.json();

      // Handle business logic
      const result = await processRequest(request, auth.user, env);
      return Response.json({ success: true, data: result });

    } catch (err) {
      console.error('API error:', err);

      return Response.json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal error'
      }, { status: 500 });
    }
  }
};
```

## Testing Composed Workers

Test Workers in isolation, then integration:

```typescript
// auth-worker/src/index.test.ts
import { unstable_dev } from 'wrangler';

describe('Auth Worker', () => {
  let worker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts');
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('rejects requests without token', async () => {
    const response = await worker.fetch('/');
    expect(response.status).toBe(401);
  });

  it('validates valid tokens', async () => {
    const response = await worker.fetch('/', {
      headers: { Authorization: 'Bearer valid-token' }
    });
    expect(response.status).toBe(200);
  });
});
```

## Deployment Strategies

### Independent Deployment

Each Worker deploys independently:

```bash
# Deploy auth changes
cd workers/auth && wrangler deploy

# Deploy API changes (uses latest auth)
cd workers/api && wrangler deploy
```

### Coordinated Rollout

For breaking changes, use versions:

```typescript
// New auth worker with v2 response format
// Keep v1 for backwards compatibility during transition

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const version = request.headers.get('X-API-Version') || 'v1';

    if (version === 'v2') {
      return handleV2(request, env);
    }

    return handleV1(request, env);
  }
};
```

## When to Split vs. Combine

### Split When:
- Different scaling requirements
- Different deployment cadences
- Clear domain boundaries
- Different teams own different parts

### Combine When:
- Tightly coupled logic
- Shared state/transactions
- Latency-sensitive paths
- Simple applications

**The subtractive approach: Start combined, split only when complexity demands it.**

---

## Reflection

Before the praxis:

1. What logical boundaries exist in your current application?
2. Which parts could be independent Workers?
3. What resources should be shared vs. isolated?

**Praxis**: Design a Worker composition for a real feature, identifying boundaries and bindings.
