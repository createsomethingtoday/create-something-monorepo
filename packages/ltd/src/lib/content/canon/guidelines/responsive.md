---
category: "Canon"
section: "Guidelines"
title: "Responsive"
description: "Responsive design patterns for Canon: mobile-first, breakpoints, and adaptive layouts."
lead: "Design for the smallest screen first, then enhance. Every Canon component adapts gracefully across devices."
publishedAt: "2026-01-08"
published: true
---

## Mobile-First Approach

Start with mobile styles, add complexity for larger screens.

```css
/* Base: Mobile */
.card {
  padding: var(--space-md);
}

/* Enhancement: Tablet+ */
@media (min-width: 768px) {
  .card {
    padding: var(--space-lg);
  }
}

/* Enhancement: Desktop+ */
@media (min-width: 1024px) {
  .card {
    padding: var(--space-xl);
  }
}
```

## Breakpoints

| Breakpoint | Min-width | Target |
|------------|-----------|--------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

## Responsive Typography

Font sizes that adapt:

```css
.title {
  font-size: var(--text-2xl);
}

@media (min-width: 768px) {
  .title {
    font-size: var(--text-3xl);
  }
}

@media (min-width: 1024px) {
  .title {
    font-size: var(--text-4xl);
  }
}
```

Or use fluid typography:

```css
.title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
}
```

## Responsive Spacing

Scale spacing proportionally:

| Context | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Section padding | `--space-lg` | `--space-xl` | `--space-2xl` |
| Card padding | `--space-md` | `--space-lg` | `--space-lg` |
| Stack gap | `--space-sm` | `--space-md` | `--space-md` |

## Layout Patterns

### Stack → Grid

```css
.features {
  display: grid;
  gap: var(--space-lg);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .features {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .features {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Sidebar → Stack

```css
.layout {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .layout {
    flex-direction: row;
  }
  
  .sidebar {
    width: 280px;
    flex-shrink: 0;
  }
  
  .main {
    flex: 1;
  }
}
```

## Touch Targets

Minimum touch target size: 44×44px

```css
.button {
  min-height: 44px;
  min-width: 44px;
  padding: var(--space-sm) var(--space-md);
}
```

## Testing Checklist

- [ ] Works on 320px width (iPhone SE)
- [ ] Touch targets are 44px minimum
- [ ] Text is readable without zooming
- [ ] No horizontal scroll
- [ ] Forms are usable with thumb
- [ ] Modals work on small screens
