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

Built on the golden ratio (φ = 1.618). Each step creates proportional harmony.

| Token | Value | Use |
|-------|-------|-----|
| `--space-xs` | 0.25rem (4px) | Tight gaps, inline spacing |
| `--space-sm` | 0.5rem (8px) | Form element gaps |
| `--space-md` | 1rem (16px) | Default spacing |
| `--space-lg` | 1.5rem (24px) | Section padding |
| `--space-xl` | 2rem (32px) | Card padding |
| `--space-2xl` | 3rem (48px) | Component gaps |
| `--space-3xl` | 4rem (64px) | Section gaps |
| `--space-4xl` | 6rem (96px) | Major sections |

## Usage Patterns

### Component Padding

```css
.button {
  padding: var(--space-sm) var(--space-md);
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

- `--space-sm` × 1.618 ≈ `--space-md`
- `--space-md` × 1.618 ≈ `--space-lg`
- `--space-lg` × 1.618 ≈ `--space-xl`

This creates rhythm without manual calculation.

## Responsive Spacing

For larger viewports, scale proportionally:

```css
@media (min-width: 768px) {
  .section {
    padding: var(--space-3xl) var(--space-xl);
  }
}

@media (min-width: 1024px) {
  .section {
    padding: var(--space-4xl) var(--space-2xl);
  }
}
```
