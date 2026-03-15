---
category: "Canon"
section: "Foundations"
title: "Typography"
description: "Canon typography system: scale, weights, and responsive type built on the golden ratio."
lead: "Type that works. A modular scale based on φ (1.618) creates natural rhythm. Five weights for hierarchy. Fluid sizing for any screen."
publishedAt: "2026-01-08"
published: true
---

## Type Scale

Built on the golden ratio (φ = 1.618). Each step multiplies by φ for natural visual rhythm.

| Token | Size | Use |
|-------|------|-----|
| `--text-xs` | 0.75rem | Fine print, labels |
| `--text-sm` | 0.875rem | Captions, metadata |
| `--text-base` | 1rem | Body text |
| `--text-lg` | 1.125rem | Lead paragraphs |
| `--text-xl` | 1.25rem | Section intros |
| `--text-2xl` | 1.5rem | H4 headings |
| `--text-3xl` | 1.875rem | H3 headings |
| `--text-4xl` | 2.25rem | H2 headings |
| `--text-5xl` | 3rem | H1 headings |
| `--text-display` | 4rem | Hero text |

## Font Weights

| Token | Weight | Use |
|-------|--------|-----|
| `--font-light` | 300 | Display text |
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Emphasis |
| `--font-semibold` | 600 | Subheadings |
| `--font-bold` | 700 | Headings |

## Line Height

| Token | Value | Use |
|-------|-------|-----|
| `--leading-none` | 1 | Single-line text |
| `--leading-tight` | 1.25 | Headings |
| `--leading-normal` | 1.5 | Body text |
| `--leading-relaxed` | 1.75 | Long-form reading |

## Letter Spacing

| Token | Value | Use |
|-------|-------|-----|
| `--tracking-tight` | -0.025em | Large headings |
| `--tracking-normal` | 0 | Body text |
| `--tracking-wide` | 0.025em | Buttons |
| `--tracking-widest` | 0.1em | Labels, caps |

## Font Stack

```css
--font-sans: 'Stack Sans Notch', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

## Fluid Typography

Display text scales with viewport:

```css
--text-display: clamp(2.5rem, 4vw + 1.5rem, 4.5rem);
```

## Usage Example

```css
.article-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}

.article-body {
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-relaxed);
}

.article-meta {
  font-size: var(--text-sm);
  color: var(--color-fg-muted);
  letter-spacing: var(--tracking-wide);
}
```
