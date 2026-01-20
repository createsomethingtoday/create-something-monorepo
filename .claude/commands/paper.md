---
hooks:
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/hooks/check-paper.sh"
          timeout: 10
---

# Paper Creation & Editing

Create or edit papers following CREATE SOMETHING paper structure standards.

## Paper Location

All papers live in: `packages/io/src/routes/papers/[slug]/+page.svelte`

## Required Structure

Every paper must include:

### 1. SEO Meta Tags
```svelte
<svelte:head>
  <title>Paper Title | CREATE SOMETHING</title>
  <meta name="description" content="Brief description of the paper's content" />
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
  .paper-container {
    background: var(--color-bg-pure);
  }
</style>
```

### 3. Required Classes
- `paper-container` - Main wrapper (pure black background)
- `paper-header` - Header section
- `paper-title` - Title element
- `max-w-4xl` - Standard content width (896px)

## CSS Pattern

Use Canon pattern: Tailwind for layout, CSS variables for design.

```svelte
<style>
  .paper-container {
    background: var(--color-bg-pure);
  }
  
  .paper-header {
    border-bottom: 1px solid var(--color-border-subtle);
  }
  
  .paper-title {
    color: var(--color-fg-primary);
    font-size: var(--text-3xl);
  }
</style>
```

## Reference

See existing paper: `packages/io/src/routes/papers/haiku-optimization/+page.svelte`

## Execute

1. Ask for paper topic and slug
2. Create route at `packages/io/src/routes/papers/[slug]/+page.svelte`
3. Follow all structure requirements above
4. Verify it builds with `pnpm check`
