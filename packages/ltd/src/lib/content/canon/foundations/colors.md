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
| `--color-performance-bg-pure` | `#000000` | Pure black, the canvas |
| `--color-bg-base` | `#0a0a0a` | Slight lift for main surfaces |
| `--color-performance-bg-surface` | `#111111` | Cards and elevated elements |
| `--color-performance-bg-elevated` | `#1a1a1a` | Modals and popovers |

## Foregrounds

Five text colors, all white at different opacities. Use brighter for headlines, dimmer for captions.

| Token | Value | Contrast | Description |
|-------|-------|----------|-------------|
| `--color-performance-fg-primary` | `rgba(255,255,255,1)` | 21:1 | Headlines, emphasis |
| `--color-performance-fg-secondary` | `rgba(255,255,255,0.8)` | 13.7:1 | Body text |
| `--color-performance-fg-tertiary` | `rgba(255,255,255,0.6)` | 9.7:1 | Secondary information |
| `--color-performance-fg-muted` | `rgba(255,255,255,0.46)` | 4.56:1 | Captions, hints |
| `--color-performance-fg-subtle` | `rgba(255,255,255,0.2)` | 2.1:1 | Decorative only |

**WCAG Compliance:** `--color-performance-fg-muted` (4.56:1) meets AA for normal text. `--color-performance-fg-subtle` should only be used for decorative elements.

## Borders

Three border levels for separation and emphasis.

| Token | Value | Description |
|-------|-------|-------------|
| `--color-performance-border-default` | `rgba(255,255,255,0.1)` | Subtle separation |
| `--color-performance-border-emphasis` | `rgba(255,255,255,0.2)` | Hover states |
| `--color-performance-border-strong` | `rgba(255,255,255,0.3)` | Active states |

## Performance Lab Readability Palette

The CREATE SOMETHING Performance Lab communication layer uses a light operational palette. Use
these tokens for buyer-facing and operator-facing surfaces that need immediate comprehension.

This is now a stable Canon layer, not a one-off property treatment. Use the palette when the
interface must show workflow maps, trust boundaries, approval states, receipts, validation gates,
or handoff evidence.

| Token | Value | Use |
|-------|-------|-----|
| `--color-performance-paper` | `#f3f3f0` | Page canvas |
| `--color-performance-court` | `#e6e6e0` | Secondary bands and inactive states |
| `--color-performance-panel` | `#ffffff` | Cards, panels, receipts |
| `--color-performance-ink` | `#090909` | Primary text and dark CTAs |
| `--color-performance-muted` | `#5e6268` | Secondary copy |
| `--color-performance-muted` | `#5e6268` | Low-emphasis labels |
| `--color-performance-line` | `#d7d7d2` | Hairline panel borders |
| `--color-performance-line-strong` | `#9c9c96` | Focused panel borders |
| `--color-performance-signal` | `#0057b8` | System/action accent |
| `--color-performance-growth` | `#007a4d` | Governed run/wait states |
| `--color-performance-risk` | `#c62026` | Stop/block states |

Do not use the clear palette as generic decoration. A clear surface should answer at least one
operational question: what is mapped, what can run, what needs review, what is blocked, or what
evidence proves the handoff.

## Semantic Colors

Four colors that mean something: success, error, warning, info. Each comes with `-muted` and `-border` variants.

| Token | Value | Use |
|-------|-------|-----|
| `--color-performance-success` | `#22c55e` | Positive feedback |
| `--color-performance-error` | `#ef4444` | Errors, destructive actions |
| `--color-performance-warning` | `#f59e0b` | Caution states |
| `--color-performance-info` | `#3b82f6` | Informational |

### Variants

Each semantic color has muted and border variants:

```css
/* Success variants */
--color-performance-success: #22c55e;
--color-performance-success-muted: rgba(34, 197, 94, 0.1);
--color-performance-success-border: rgba(34, 197, 94, 0.3);

/* Error variants */
--color-performance-error: #ef4444;
--color-performance-error-muted: rgba(239, 68, 68, 0.1);
--color-performance-error-border: rgba(239, 68, 68, 0.3);
```

## Interactive States

| Token | Value | Use |
|-------|-------|-----|
| `--color-performance-hover` | `rgba(255,255,255,0.05)` | Hover backgrounds |
| `--color-performance-active` | `rgba(255,255,255,0.1)` | Active/pressed states |
| `--color-performance-focus` | `rgba(255,255,255,0.5)` | Focus rings |

## Usage Example

```css
.card {
  background: var(--color-performance-bg-surface);
  border: 1px solid var(--color-performance-border-default);
  color: var(--color-performance-fg-secondary);
}

.card:hover {
  border-color: var(--color-performance-border-emphasis);
  background: var(--color-performance-hover);
}

.card-title {
  color: var(--color-performance-fg-primary);
}

.card-meta {
  color: var(--color-performance-fg-muted);
}
```
