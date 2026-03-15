---
category: "Canon"
section: "Foundations"
title: "Colors"
description: "Canon color tokens: backgrounds, foregrounds, semantic colors, and data visualization palette."
lead: "Every color you need, ready to copy. Black and white for structure. Opacity for hierarchy. Semantic colors when something needs attention."
publishedAt: "2026-01-08"
published: true
---

## Why so few colors?

More colors mean more decisions. We use black and white as the foundation, then adjust opacity to create hierarchy—no need to pick new shades. When you need to show success, error, or a warning, semantic colors do the work.

> "Color communicates. Decoration distracts."

## Backgrounds

Four levels from pure black to subtle grey. Stack them to create depth—like layers of paper.

| Token | Value | Description |
|-------|-------|-------------|
| `--color-bg-pure` | `#000000` | Pure black, the canvas |
| `--color-bg-base` | `#0a0a0a` | Slight lift for main surfaces |
| `--color-bg-surface` | `#111111` | Cards and elevated elements |
| `--color-bg-elevated` | `#1a1a1a` | Modals and popovers |

## Foregrounds

Five text colors, all white at different opacities. Use brighter for headlines, dimmer for captions.

| Token | Value | Contrast | Description |
|-------|-------|----------|-------------|
| `--color-fg-primary` | `rgba(255,255,255,1)` | 21:1 | Headlines, emphasis |
| `--color-fg-secondary` | `rgba(255,255,255,0.8)` | 13.7:1 | Body text |
| `--color-fg-tertiary` | `rgba(255,255,255,0.6)` | 9.7:1 | Secondary information |
| `--color-fg-muted` | `rgba(255,255,255,0.46)` | 4.56:1 | Captions, hints |
| `--color-fg-subtle` | `rgba(255,255,255,0.2)` | 2.1:1 | Decorative only |

**WCAG Compliance:** `--color-fg-muted` (4.56:1) meets AA for normal text. `--color-fg-subtle` should only be used for decorative elements.

## Borders

Three border levels for separation and emphasis.

| Token | Value | Description |
|-------|-------|-------------|
| `--color-border-default` | `rgba(255,255,255,0.1)` | Subtle separation |
| `--color-border-emphasis` | `rgba(255,255,255,0.2)` | Hover states |
| `--color-border-strong` | `rgba(255,255,255,0.3)` | Active states |

## Semantic Colors

Four colors that mean something: success, error, warning, info. Each comes with `-muted` and `-border` variants.

| Token | Value | Use |
|-------|-------|-----|
| `--color-success` | `#22c55e` | Positive feedback |
| `--color-error` | `#ef4444` | Errors, destructive actions |
| `--color-warning` | `#f59e0b` | Caution states |
| `--color-info` | `#3b82f6` | Informational |

### Variants

Each semantic color has muted and border variants:

```css
/* Success variants */
--color-success: #22c55e;
--color-success-muted: rgba(34, 197, 94, 0.1);
--color-success-border: rgba(34, 197, 94, 0.3);

/* Error variants */
--color-error: #ef4444;
--color-error-muted: rgba(239, 68, 68, 0.1);
--color-error-border: rgba(239, 68, 68, 0.3);
```

## Interactive States

| Token | Value | Use |
|-------|-------|-----|
| `--color-hover` | `rgba(255,255,255,0.05)` | Hover backgrounds |
| `--color-active` | `rgba(255,255,255,0.1)` | Active/pressed states |
| `--color-focus` | `rgba(255,255,255,0.5)` | Focus rings |

## Usage Example

```css
.card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  color: var(--color-fg-secondary);
}

.card:hover {
  border-color: var(--color-border-emphasis);
  background: var(--color-hover);
}

.card-title {
  color: var(--color-fg-primary);
}

.card-meta {
  color: var(--color-fg-muted);
}
```
