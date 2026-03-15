# SvelteKit Conventions

## File Structure

```
packages/[pkg]/src/
├── routes/
│   ├── +page.svelte          # Page component
│   ├── +page.server.ts       # Server load function
│   ├── +layout.svelte        # Layout component
│   ├── +layout.server.ts     # Layout server data
│   ├── +error.svelte         # Error page
│   └── api/
│       └── [endpoint]/
│           └── +server.ts    # API route
├── lib/
│   ├── components/           # Reusable components
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript types
│   └── server/               # Server-only code
├── app.html                  # HTML template
├── app.css                   # Global styles
└── app.d.ts                  # App-level types
```

## Route Patterns

### Page Routes
```typescript
// +page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
  return { data: 'value' };
};
```

### API Routes
```typescript
// +server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, platform }) => {
  return json({ result: 'data' });
};

export const POST: RequestHandler = async ({ request, platform }) => {
  const body = await request.json();
  return json({ success: true });
};
```

### Dynamic Routes
```
routes/
├── posts/
│   └── [slug]/
│       └── +page.svelte      # /posts/my-post
├── users/
│   └── [...rest]/
│       └── +page.svelte      # /users/a/b/c (catch-all)
└── [[optional]]/
    └── +page.svelte          # / or /optional
```

## Component Patterns

### Props with TypeScript
```svelte
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
  }

  let { title, count = 0 }: Props = $props();
</script>
```

### Events
```svelte
<script lang="ts">
  interface Props {
    onclick?: () => void;
  }

  let { onclick }: Props = $props();
</script>

<button {onclick}>Click</button>
```

### Slots
```svelte
<!-- Parent.svelte -->
<div class="wrapper">
  {@render children?.()}
</div>

<!-- Usage -->
<Parent>
  <p>Content goes here</p>
</Parent>
```

## Load Function Patterns

### Parallel Data Loading
```typescript
export const load: PageServerLoad = async ({ platform }) => {
  const [users, posts] = await Promise.all([
    platform?.env.DB.prepare('SELECT * FROM users').all(),
    platform?.env.DB.prepare('SELECT * FROM posts').all()
  ]);

  return { users: users?.results, posts: posts?.results };
};
```

### Error Handling
```typescript
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const item = await fetchItem(params.id);

  if (!item) {
    throw error(404, 'Not found');
  }

  return { item };
};
```

## Type Generation

```bash
# Generate route types
pnpm --filter=space exec svelte-kit sync

# Generate Cloudflare types
pnpm --filter=space exec wrangler types
```

## Common Imports

```typescript
// Kit utilities
import { json, error, redirect } from '@sveltejs/kit';

// Types
import type { PageServerLoad, Actions, RequestHandler } from './$types';

// Stores
import { page } from '$app/stores';
import { goto, invalidate } from '$app/navigation';
```
