# Layout Architecture

## The Principle

**Routes serve content. Layouts serve routes.**

In SvelteKit, the filesystem is your architecture. Understanding how to structure it determines how naturally your application flows.

## The Layout Hierarchy

Every route inherits from its parent layouts:

```
src/routes/
├── +layout.svelte          # Root layout (applies to everything)
├── +page.svelte            # Home page
├── about/
│   └── +page.svelte        # Uses root layout
├── blog/
│   ├── +layout.svelte      # Blog-specific layout
│   ├── +page.svelte        # Blog index
│   └── [slug]/
│       └── +page.svelte    # Individual posts
└── admin/
    ├── +layout.svelte      # Admin-specific layout
    ├── +page.svelte        # Admin dashboard
    └── settings/
        └── +page.svelte    # Admin settings
```

The inheritance is automatic:
- `/about` → Root layout only
- `/blog/my-post` → Root layout + Blog layout
- `/admin/settings` → Root layout + Admin layout

**Structure creates behavior without configuration.**

## Root Layout Pattern

The root layout establishes the consistent shell:

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { Navigation, Footer, ModeIndicator } from '@create-something/components';
  import { page } from '$app/stores';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  const navLinks = [
    { label: 'Experiments', href: '/experiments' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' }
  ];
</script>

<div class="layout">
  <Navigation
    logo="CREATE SOMETHING"
    logoSuffix=".space"
    links={navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
  />

  <main class="content">
    {@render children()}
  </main>

  <Footer mode="space" />
  <ModeIndicator current="space" />
</div>

<style>
  .layout {
    min-height: 100vh;
    background: var(--color-bg-pure);
  }

  .content {
    padding-top: 72px; /* Nav height */
  }
</style>
```

**Every page gets navigation, footer, and mode indicator automatically.**

## Nested Layouts

Child layouts extend parents without replacing them:

```svelte
<!-- admin/+layout.svelte -->
<script lang="ts">
  import { AdminSidebar, AdminHeader } from '$lib/components';
  import { page } from '$app/stores';

  interface Props {
    children: import('svelte').Snippet;
    data: { user: User };
  }

  let { children, data }: Props = $props();
</script>

<!-- This renders inside the root layout's {@render children()} -->
<div class="admin-layout">
  <AdminSidebar currentPath={$page.url.pathname} />

  <div class="admin-main">
    <AdminHeader user={data.user} />
    <div class="admin-content">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .admin-layout {
    display: grid;
    grid-template-columns: 250px 1fr;
    min-height: calc(100vh - 72px);
  }

  .admin-main {
    display: flex;
    flex-direction: column;
  }

  .admin-content {
    flex: 1;
    padding: var(--space-lg);
  }
</style>
```

**Admin routes get the root shell plus admin-specific UI.**

## Layout Groups

When you need shared layouts without URL segments, use groups:

```
src/routes/
├── (marketing)/
│   ├── +layout.svelte      # Marketing layout
│   ├── +page.svelte        # / (home)
│   ├── pricing/
│   │   └── +page.svelte    # /pricing
│   └── about/
│       └── +page.svelte    # /about
└── (app)/
    ├── +layout.svelte      # App layout
    ├── dashboard/
    │   └── +page.svelte    # /dashboard
    └── settings/
        └── +page.svelte    # /settings
```

Parentheses create logical groups without affecting URLs:
- `(marketing)/pricing/+page.svelte` → `/pricing`
- `(app)/dashboard/+page.svelte` → `/dashboard`

**Group by layout needs, not URL structure.**

## Layout Data

Layouts can load data that's available to all child routes:

```typescript
// admin/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
  // Auth check for all admin routes
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  if (locals.user.role !== 'admin') {
    throw redirect(302, '/');
  }

  return {
    user: locals.user
  };
};
```

```svelte
<!-- admin/settings/+page.svelte -->
<script lang="ts">
  // data.user comes from the layout, not this page
  let { data } = $props();
</script>

<h1>Settings for {data.user.name}</h1>
```

**Layouts provide context. Pages consume it.**

## Breaking Out

Sometimes a page needs to escape its layout. Use `+page@.svelte`:

```
src/routes/
├── +layout.svelte          # Root layout with nav
├── login/
│   └── +page@.svelte       # No layout - just the login page
└── dashboard/
    └── +page.svelte        # Uses root layout
```

The `@` syntax resets to a specific layout:
- `+page@.svelte` → No layout (root reset)
- `+page@(app).svelte` → Reset to (app) group layout

**Use sparingly. Breaking layout usually means reconsidering structure.**

## Page vs Layout Server

Both pages and layouts can have server files:

```
route/
├── +layout.server.ts    # Runs for this route and all children
├── +layout.svelte       # Layout component
├── +page.server.ts      # Runs only for this exact page
└── +page.svelte         # Page component
```

Data flows: Layout server → Page server → Page component

```typescript
// +layout.server.ts
export const load = async () => {
  return { shared: 'Available to all children' };
};

// +page.server.ts
export const load = async ({ parent }) => {
  const layoutData = await parent(); // Get layout data
  return {
    ...layoutData,
    pageSpecific: 'Only for this page'
  };
};
```

## The Pattern for CREATE SOMETHING

Our properties follow this structure:

```
src/routes/
├── +layout.svelte           # Shell: Nav, Footer, ModeIndicator
├── +page.svelte             # Home
├── about/
│   └── +page.svelte
├── experiments/
│   ├── +page.svelte         # List
│   └── [slug]/
│       └── +page.svelte     # Detail
├── admin/
│   ├── +layout.svelte       # Admin shell
│   ├── +layout.server.ts    # Auth guard
│   ├── +page.svelte         # Dashboard
│   └── [section]/
│       └── +page.svelte     # Admin sections
└── api/
    └── [endpoint]/
        └── +server.ts       # API routes (no layout)
```

**Simple hierarchy. Predictable behavior.**

## Anti-Patterns

### Over-nesting

```
# Bad: Too many layout levels
src/routes/
├── +layout.svelte
├── (main)/
│   ├── +layout.svelte
│   └── (content)/
│       ├── +layout.svelte
│       └── (articles)/
│           ├── +layout.svelte
│           └── blog/
│               └── +page.svelte
```

Each layout adds complexity. Aim for 2-3 levels maximum.

### Layout as Logic

```svelte
<!-- Bad: Business logic in layout -->
<script>
  import { processData, validateUser, sendAnalytics } from '$lib/services';

  // Layouts should be UI shells, not logic containers
  const processed = processData(data);
  const isValid = validateUser(data.user);
  sendAnalytics('layout_rendered');
</script>
```

Keep layouts focused on structure. Put logic in server files or page components.

### Conditional Layouts

```svelte
<!-- Bad: Layout that changes dramatically -->
<script>
  let { data, children } = $props();
</script>

{#if data.isFullscreen}
  {@render children()}
{:else if data.isMinimal}
  <MinimalShell>{@render children()}</MinimalShell>
{:else}
  <FullShell>{@render children()}</FullShell>
{/if}
```

If layouts change conditionally, they should be different routes.

---

## Reflection

Before moving on:

1. Draw your current route structure. Where do layouts naturally group?
2. What data is shared across many pages? Should it load in a layout?
3. Are there pages that break out of layouts? Should they be restructured instead?

**Good layout architecture makes the right thing automatic.**

---

## Cross-Property References

> **Canon Reference**: See [Principled Defaults](https://createsomething.ltd/patterns/principled-defaults) for how architecture can embed correct behavior by default.
>
> **Canon Reference**: Layout architecture embodies [Constraint as Liberation](https://createsomething.ltd/patterns/constraint-as-liberation)—structure that frees rather than limits.
>
> **Practice**: Study the route structure in any CREATE SOMETHING property (e.g., `packages/space/src/routes/`) to see these patterns in practice.
