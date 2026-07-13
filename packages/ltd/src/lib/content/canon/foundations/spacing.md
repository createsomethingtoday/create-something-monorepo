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
| `--space-performance-xs` | 0.618rem (~10px) | φ⁻¹ | Tight gaps, inline elements |
| `--space-performance-sm` | 1rem (16px) | φ⁰ (base) | Form element gaps, small padding |
| `--space-performance-md` | 1.618rem (~26px) | φ¹ | Default component spacing |
| `--space-performance-lg` | 2.618rem (~42px) | φ² | Card padding, section gaps |
| `--space-performance-xl` | 4.236rem (~68px) | φ³ | Large component gaps |
| `--space-performance-2xl` | 6.854rem (~110px) | φ⁴ | *See guidance below* |
| `--space-performance-3xl` | 11.09rem (~177px) | φ⁵ | *See guidance below* |

## Tailwind for Structure, Canon for Aesthetics

**Important**: The golden ratio produces mathematically elegant values, but `--space-performance-2xl` (110px) and `--space-performance-3xl` (177px) are impractical for most page-level padding.

**Use Tailwind utilities for layout spacing:**
- Page padding: `py-16`, `py-24`, `px-6`
- Section gaps: `gap-8`, `space-y-12`
- Nav offset: `calc(var(--height-performance-header) + var(--space-performance-md))`

**Use Canon tokens for component internals:**
- `--space-performance-xs` through `--space-performance-xl` work well for component padding, gaps, and margins

## Usage Patterns

### Component Padding

```css
.button {
  padding: var(--space-performance-xs) var(--space-performance-sm);
}

.card {
  padding: var(--space-performance-lg);
}

.modal {
  padding: var(--space-performance-xl);
}
```

### Stack Spacing

```css
.stack > * + * {
  margin-top: var(--space-performance-md);
}

.stack-lg > * + * {
  margin-top: var(--space-performance-lg);
}
```

### Grid Gaps

```css
.grid {
  gap: var(--space-performance-lg);
}

.grid-tight {
  gap: var(--space-performance-sm);
}
```

## Why Golden Ratio?

When spacing follows φ, adjacent elements feel balanced:

- `--space-performance-xs` × φ = `--space-performance-sm`
- `--space-performance-sm` × φ = `--space-performance-md`
- `--space-performance-md` × φ = `--space-performance-lg`
- `--space-performance-lg` × φ = `--space-performance-xl`

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
<main class="pt-[calc(var(--height-performance-header)+1.618rem)]">
  <!-- content -->
</main>
```
