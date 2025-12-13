# Canon Design Tokens

## The Principle

**Tailwind for structure, Canon for aesthetics.**

This division isn't arbitrary. It's the Subtractive Triad applied to CSS.

## The Problem with Utility-First

Tailwind is powerful. It's also dangerous.

```html
<!-- Tailwind everywhere -->
<div class="bg-slate-900 rounded-xl shadow-lg border border-slate-700 p-6">
  <h2 class="text-white text-xl font-semibold mb-4">Card Title</h2>
  <p class="text-slate-400 text-sm leading-relaxed">
    Some content that goes here with lots of utility classes.
  </p>
</div>
```

What color is `slate-900`? What's the semantic meaning of `rounded-xl`? When should you use `shadow-lg` vs `shadow-md`?

**The design decisions are scattered across every class.**

Change the design system and you change every component. The truth (what the design should be) is fragmented across thousands of class applications.

## Canon: Semantic Tokens

Canon provides design tokens with semantic meaning:

```css
:root {
  /* Background hierarchy */
  --color-bg-pure: #000000;
  --color-bg-elevated: #0a0a0a;
  --color-bg-surface: #111111;
  --color-bg-subtle: #1a1a1a;

  /* Foreground hierarchy */
  --color-fg-primary: #ffffff;
  --color-fg-secondary: rgba(255, 255, 255, 0.8);
  --color-fg-tertiary: rgba(255, 255, 255, 0.6);
  --color-fg-muted: rgba(255, 255, 255, 0.4);
}
```

The token name tells you what it's for:
- `--color-bg-surface` → Background for card-like surfaces
- `--color-fg-secondary` → Text that's slightly de-emphasized
- `--color-border-default` → Standard border color

**The design decision is in one place. Usage is everywhere.**

## The Division

### Structure: Tailwind

Layout, spacing, flexbox, grid—these are structural decisions:

```html
<div class="flex items-center gap-4 p-6">
  <div class="flex-1">
    <span class="block mb-2">Title</span>
    <span class="block">Subtitle</span>
  </div>
</div>
```

Tailwind's utility classes are perfect here. The structure is explicit in the markup.

### Aesthetics: Canon

Colors, radii, shadows, typography—these are design decisions:

```svelte
<div class="flex items-center gap-4 p-6 card">
  <div class="flex-1">
    <span class="block mb-2 card-title">Title</span>
    <span class="block card-subtitle">Subtitle</span>
  </div>
</div>

<style>
  .card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .card-title {
    color: var(--color-fg-primary);
    font-size: var(--text-body-lg);
  }

  .card-subtitle {
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }
</style>
```

**Structure in the class, design in the style block.**

## The Token Categories

### Colors

Hierarchical naming for visual weight:

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg-pure` | `#000000` | Page background |
| `--color-bg-elevated` | `#0a0a0a` | Slightly raised surfaces |
| `--color-bg-surface` | `#111111` | Cards, modals |
| `--color-bg-subtle` | `#1a1a1a` | Subtle backgrounds |
| `--color-fg-primary` | `#ffffff` | Main content |
| `--color-fg-secondary` | `rgba(255,255,255,0.8)` | Supporting content |
| `--color-fg-tertiary` | `rgba(255,255,255,0.6)` | De-emphasized |
| `--color-fg-muted` | `rgba(255,255,255,0.4)` | Very subtle |

**The hierarchy is the design system.** You don't need to remember hex codes.

### Spacing

Golden ratio (φ = 1.618) creates natural proportions:

| Token | Value | Ratio |
|-------|-------|-------|
| `--space-xs` | `0.5rem` | 8px |
| `--space-sm` | `1rem` | 16px |
| `--space-md` | `1.618rem` | ~26px |
| `--space-lg` | `2.618rem` | ~42px |
| `--space-xl` | `4.236rem` | ~68px |

```svelte
<style>
  .section {
    padding: var(--space-lg);
    margin-bottom: var(--space-xl);
  }

  .card-content {
    padding: var(--space-md);
    gap: var(--space-sm);
  }
</style>
```

**The spacing feels right because it follows natural proportions.**

### Typography

Fluid scales that respond to viewport:

```css
:root {
  --text-display: clamp(2.5rem, 4vw + 1.5rem, 5rem);
  --text-h1: clamp(2rem, 3vw + 1rem, 3.5rem);
  --text-h2: clamp(1.5rem, 2vw + 0.75rem, 2.25rem);
  --text-h3: clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem);
  --text-body-lg: 1.125rem;
  --text-body: 1rem;
  --text-body-sm: 0.875rem;
  --text-caption: 0.75rem;
}
```

No media queries for font sizes. The `clamp()` function handles responsive scaling.

### Radii

Consistent roundness across the system:

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `6px` | Small elements, inputs |
| `--radius-md` | `8px` | Buttons, badges |
| `--radius-lg` | `12px` | Cards, modals |
| `--radius-xl` | `16px` | Large containers |
| `--radius-full` | `9999px` | Pills, avatars |

```svelte
<style>
  .button {
    border-radius: var(--radius-md);
  }

  .card {
    border-radius: var(--radius-lg);
  }

  .avatar {
    border-radius: var(--radius-full);
  }
</style>
```

### Animation

Consistent motion:

```css
:root {
  --ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
  --duration-micro: 200ms;
  --duration-standard: 300ms;
  --duration-complex: 500ms;
}
```

```svelte
<style>
  .button {
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .modal {
    transition: all var(--duration-standard) var(--ease-standard);
  }
</style>
```

## Migration Pattern

When you encounter Tailwind design classes, migrate them:

### Before (Tailwind design)

```html
<div class="bg-slate-900 rounded-xl shadow-lg border border-slate-700 p-6">
  <h2 class="text-white text-xl font-semibold">Title</h2>
  <p class="text-slate-400 text-sm">Content</p>
</div>
```

### After (Canon design)

```svelte
<div class="p-6 card">
  <h2 class="card-title">Title</h2>
  <p class="card-body">Content</p>
</div>

<style>
  .card {
    background: var(--color-bg-surface);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--color-border-default);
  }

  .card-title {
    color: var(--color-fg-primary);
    font-size: var(--text-h3);
    font-weight: var(--font-semibold);
  }

  .card-body {
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }
</style>
```

**Tailwind `p-6` stays (structure). Design tokens replace color/radius/shadow.**

## Detection Patterns

These Tailwind classes signal design decisions that should be Canon:

| Pattern | Issue | Canon Replacement |
|---------|-------|-------------------|
| `rounded-*` | Visual roundness | `var(--radius-*)` |
| `bg-slate-*` | Background color | `var(--color-bg-*)` |
| `text-white/80` | Text opacity | `var(--color-fg-secondary)` |
| `shadow-*` | Elevation | `var(--shadow-*)` |
| `text-xl` | Type scale | `var(--text-h3)` |

## The Single Source

All tokens live in `app.css`:

```css
/* app.css */
:root {
  /* All Canon tokens defined here */
  --color-bg-pure: #000000;
  --color-bg-surface: #111111;
  /* ... */
}
```

Change the design system in one file. Every component updates automatically.

**This is DRY at the design level.**

## Why It Works

The division works because:

1. **Structure rarely changes** → Flexbox stays flexbox
2. **Aesthetics evolve** → Colors, radii, typography get refined
3. **Tailwind excels at structure** → Explicit, composable layout
4. **CSS variables excel at theming** → One source, many uses

**Each tool does what it does best.**

---

## Reflection

Before the praxis:

1. Open a component in your project. Which classes are structural (layout)? Which are aesthetic (design)?
2. How many places would you need to change if you wanted to adjust your primary color?
3. What would it take to support dark/light themes with your current approach?

**Praxis**: You'll migrate a component from pure Tailwind to the Canon pattern.
