---
category: "Canon"
section: "Foundations"
title: "Layout"
description: "Canon layout system: containers, grids, and responsive patterns."
lead: "Structure that scales. A flexible container system with responsive grids built on CSS Grid and Flexbox."
publishedAt: "2026-01-08"
published: true
---

## Container Widths

Consistent max-widths for content containment.

| Token | Value | Use |
|-------|-------|-----|
| `--container-performance-sm` | 640px | Narrow content |
| `--container-performance-md` | 768px | Articles, forms |
| `--container-performance-lg` | 1024px | Standard pages |
| `--container-performance-xl` | 1280px | Wide layouts |
| `--container-performance-2xl` | 1536px | Full-width |

## Container Usage

```css
.container {
  width: 100%;
  max-width: var(--container-performance-lg);
  margin: 0 auto;
  padding: 0 var(--space-performance-lg);
}

.container-narrow {
  max-width: var(--container-performance-md);
}

.container-wide {
  max-width: var(--container-performance-xl);
}
```

## Grid System

A 12-column grid for flexible layouts.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-performance-lg);
}

.col-span-4 { grid-column: span 4; }
.col-span-6 { grid-column: span 6; }
.col-span-8 { grid-column: span 8; }
.col-span-12 { grid-column: span 12; }
```

## Responsive Patterns

### Stack to Grid

```css
.responsive-grid {
  display: grid;
  gap: var(--space-performance-lg);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Auto-fit Grid

```css
.auto-grid {
  display: grid;
  gap: var(--space-performance-lg);
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
```

## Breakpoints

| Token | Value | Target |
|-------|-------|--------|
| `--breakpoint-performance-sm` | 640px | Mobile landscape |
| `--breakpoint-performance-md` | 768px | Tablet |
| `--breakpoint-performance-lg` | 1024px | Desktop |
| `--breakpoint-performance-xl` | 1280px | Large desktop |
| `--breakpoint-performance-2xl` | 1536px | Ultra-wide |

## Flexbox Utilities

```css
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-md { gap: var(--space-performance-md); }
```
