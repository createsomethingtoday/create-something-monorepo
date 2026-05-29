---
description: Create or edit a paper following CREATE SOMETHING standards
argument-hint: "<slug>"
---

# Paper: $1

Create or edit a paper at `packages/io/src/routes/papers/$1/+page.svelte`.

## Required Structure

### 1. SEO Meta Tags
```svelte
<svelte:head>
  <title>Paper Title | CREATE SOMETHING</title>
  <meta name="description" content="Brief description" />
</svelte:head>
```

### 2. Container Structure
```svelte
<div class="min-h-screen p-6 paper-container">
  <div class="max-w-4xl mx-auto space-y-12">
    <header class="paper-header">
      <h1 class="paper-title">Title</h1>
    </header>
    <!-- Content sections -->
  </div>
</div>

<style>
  .paper-container { background: var(--color-bg-pure); }
  .paper-header { border-bottom: 1px solid var(--color-border-subtle); }
  .paper-title { color: var(--color-fg-primary); font-size: var(--text-3xl); }
</style>
```

### 3. Required Classes
- `paper-container` — Main wrapper (pure black background)
- `paper-header` — Header section
- `paper-title` — Title element
- `max-w-4xl` — Standard content width (896px)

### 4. CSS Pattern
Tailwind for layout, Canon CSS variables for design. No hardcoded colors.

## Reference
See existing paper: `packages/io/src/routes/papers/haiku-optimization/+page.svelte`

## Steps
1. Create route at `packages/io/src/routes/papers/$1/+page.svelte`
2. Follow all structure requirements above
3. Verify it builds with `pnpm --filter=io exec tsc --noEmit`
