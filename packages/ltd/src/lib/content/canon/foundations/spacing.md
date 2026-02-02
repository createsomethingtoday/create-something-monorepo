---
category: "Canon"
section: "Foundations"
title: "Spacing"
description: "Canon spacing system: a golden ratio scale for consistent rhythm and harmony."
lead: "Spacing that just works. Based on φ (1.618), creating natural visual rhythm at every scale."
publishedAt: "2026-01-08"
published: true
---

## Spacing Scale

Built on the golden ratio (φ = 1.618). Each step is derived from φⁿ where base = 1rem.

| Token | Value | Derivation | Recommended Use |
|-------|-------|------------|-----------------|
| `--space-xs` | 0.618rem (~10px) | φ⁻¹ | Tight gaps, inline elements |
| `--space-sm` | 1rem (16px) | φ⁰ (base) | Form element gaps, small padding |
| `--space-md` | 1.618rem (~26px) | φ¹ | Default component spacing |
| `--space-lg` | 2.618rem (~42px) | φ² | Card padding, section gaps |
| `--space-xl` | 4.236rem (~68px) | φ³ | Large component gaps |
| `--space-2xl` | 6.854rem (~110px) | φ⁴ | *See guidance below* |
| `--space-3xl` | 11.09rem (~177px) | φ⁵ | *See guidance below* |

## Tailwind for Structure, Canon for Aesthetics

**Important**: The golden ratio produces mathematically elegant values, but `--space-2xl` (110px) and `--space-3xl` (177px) are impractical for most page-level padding.

**Use Tailwind utilities for layout spacing:**
- Page padding: `py-16`, `py-24`, `px-6`
- Section gaps: `gap-8`, `space-y-12`
- Nav offset: `calc(var(--header-height) + var(--space-md))`

**Use Canon tokens for component internals:**
- `--space-xs` through `--space-xl` work well for component padding, gaps, and margins

## Usage Patterns

### Component Padding

```css
.button {
  padding: var(--space-xs) var(--space-sm);
}

.card {
  padding: var(--space-lg);
}

.modal {
  padding: var(--space-xl);
}
```

### Stack Spacing

```css
.stack > * + * {
  margin-top: var(--space-md);
}

.stack-lg > * + * {
  margin-top: var(--space-lg);
}
```

### Grid Gaps

```css
.grid {
  gap: var(--space-lg);
}

.grid-tight {
  gap: var(--space-sm);
}
```

## Why Golden Ratio?

When spacing follows φ, adjacent elements feel balanced:

- `--space-xs` × φ = `--space-sm`
- `--space-sm` × φ = `--space-md`
- `--space-md` × φ = `--space-lg`
- `--space-lg` × φ = `--space-xl`

This creates rhythm without manual calculation.

## Page Layout (Tailwind)

For page-level spacing, use Tailwind utilities which provide more practical values:

```html
<!-- Section padding -->
<section class="py-16 px-6">
  <div class="max-w-5xl mx-auto">
    <!-- content -->
  </div>
</section>

<!-- Hero section -->
<section class="pt-24 pb-16 px-6">
  <!-- content -->
</section>

<!-- Fixed nav offset -->
<main class="pt-[calc(var(--header-height)+1.618rem)]">
  <!-- content -->
</main>
```
