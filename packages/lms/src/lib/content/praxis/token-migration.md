# Token Migration

## Objective

Convert Tailwind design utilities to Canon CSS variables while preserving layout structure.

## Context

You're migrating a component from Tailwind-only styling to the CREATE SOMETHING pattern: "Tailwind for structure, Canon for aesthetics."

## Starter Code

```svelte
<script lang="ts">
  interface Props {
    title: string;
    description: string;
    author: string;
    date: string;
    imageUrl?: string;
  }

  let { title, description, author, date, imageUrl }: Props = $props();
</script>

<article class="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
  {#if imageUrl}
    <img
      src={imageUrl}
      alt=""
      class="w-full h-48 object-cover rounded-lg mb-4"
    />
  {/if}

  <h2 class="text-xl font-semibold text-gray-900 mb-2">
    {title}
  </h2>

  <p class="text-gray-600 text-sm leading-relaxed mb-4">
    {description}
  </p>

  <div class="flex items-center justify-between pt-4 border-t border-gray-100">
    <span class="text-gray-500 text-xs uppercase tracking-wider">
      {author}
    </span>
    <time class="text-gray-400 text-xs">
      {date}
    </time>
  </div>
</article>
```

## Task

Migrate this component following the principle:
- **Keep**: Tailwind layout utilities (`flex`, `p-6`, `mb-4`, `items-center`, etc.)
- **Replace**: Tailwind design utilities (colors, shadows, radii, typography)

## Canon Token Reference

```css
/* Colors */
--color-bg-pure: #000000
--color-bg-elevated: #0a0a0a
--color-bg-surface: #111111
--color-fg-primary: #ffffff
--color-fg-secondary: rgba(255, 255, 255, 0.8)
--color-fg-tertiary: rgba(255, 255, 255, 0.6)
--color-fg-muted: rgba(255, 255, 255, 0.4)
--color-border-default: rgba(255, 255, 255, 0.1)

/* Radii */
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1)
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15)
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.2)

/* Typography */
--text-h2: clamp(1.5rem, 2vw + 0.75rem, 2.25rem)
--text-body: 1rem
--text-body-sm: 0.875rem
--text-caption: 0.75rem

/* Animation */
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)
--duration-micro: 200ms
--duration-standard: 300ms
```

## Migration Checklist

Replace these Tailwind utilities:

| Tailwind | Canon Token |
|----------|-------------|
| `bg-white` | `var(--color-bg-surface)` |
| `rounded-xl` | `var(--radius-xl)` |
| `rounded-lg` | `var(--radius-lg)` |
| `shadow-lg` | `var(--shadow-md)` |
| `shadow-xl` | `var(--shadow-lg)` |
| `border-gray-200` | `var(--color-border-default)` |
| `border-gray-100` | `var(--color-border-default)` |
| `text-gray-900` | `var(--color-fg-primary)` |
| `text-gray-600` | `var(--color-fg-secondary)` |
| `text-gray-500` | `var(--color-fg-tertiary)` |
| `text-gray-400` | `var(--color-fg-muted)` |
| `text-xl` | `var(--text-h2)` |
| `text-sm` | `var(--text-body-sm)` |
| `text-xs` | `var(--text-caption)` |
| `duration-300` | `var(--duration-standard)` |

## Expected Output

```svelte
<script lang="ts">
  // Same props
</script>

<article class="p-6 card">
  {#if imageUrl}
    <img
      src={imageUrl}
      alt=""
      class="w-full h-48 object-cover mb-4 card-image"
    />
  {/if}

  <h2 class="mb-2 card-title">
    {title}
  </h2>

  <p class="mb-4 card-description">
    {description}
  </p>

  <div class="flex items-center justify-between pt-4 card-footer">
    <span class="card-author">
      {author}
    </span>
    <time class="card-date">
      {date}
    </time>
  </div>
</article>

<style>
  .card {
    background: var(--color-bg-surface);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--color-border-default);
    transition: box-shadow var(--duration-standard) var(--ease-standard);
  }

  .card:hover {
    box-shadow: var(--shadow-lg);
  }

  .card-image {
    border-radius: var(--radius-lg);
  }

  .card-title {
    font-size: var(--text-h2);
    color: var(--color-fg-primary);
    font-weight: 600;
  }

  .card-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: 1.6;
  }

  .card-footer {
    border-top: 1px solid var(--color-border-default);
  }

  .card-author {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-date {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }
</style>
```

## Success Criteria

- [ ] No Tailwind design utilities remain (colors, shadows, radii, typography)
- [ ] All Tailwind layout utilities preserved (`flex`, `p-6`, `mb-4`, etc.)
- [ ] Uses Canon CSS variables for all aesthetic properties
- [ ] Component renders correctly (dark theme context)
- [ ] Hover state uses Canon tokens

## Reflection

After completing this exercise:
1. What patterns did you notice in the mapping?
2. Were there any Tailwind utilities that didn't have direct Canon equivalents?
3. How does the migrated code compare in readability?
