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
| `--text-performance-display` | 4rem | Hero text |

## Font Weights

| Token | Weight | Use |
|-------|--------|-----|
| `--font-performance-light` | 300 | Display text |
| `--font-normal` | 400 | Body text |
| `--font-performance-medium` | 500 | Emphasis |
| `--font-performance-semibold` | 600 | Subheadings |
| `--font-performance-bold` | 700 | Headings |

## Line Height

| Token | Value | Use |
|-------|-------|-----|
| `--leading-none` | 1 | Single-line text |
| `--leading-performance-tight` | 1.25 | Headings |
| `--leading-performance-normal` | 1.5 | Body text |
| `--leading-performance-relaxed` | 1.75 | Long-form reading |

## Letter Spacing

| Token | Value | Use |
|-------|-------|-----|
| `--tracking-performance-tight` | -0.025em | Large headings |
| `--tracking-performance-normal` | 0 | Body text |
| `--tracking-performance-wide` | 0.025em | Buttons |
| `--tracking-performance-widest` | 0.1em | Labels, caps |

## Font Stack

```css
--font-performance-sans: Arial, 'Helvetica Neue', Helvetica, system-ui, sans-serif;
--font-performance-display: var(--font-performance-sans);
--font-performance-mono: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace;
--font-performance-serif: Georgia, 'Times New Roman', serif;
```

The Performance Lab layer uses the local/system sans stack for interface and body text, the platform
mono stack for compact system labels, and Georgia only when an editorial serif voice is useful. No
CREATE SOMETHING surface should depend on another company's font host.
CREATE SOMETHING keeps local fallbacks so surfaces remain stable if external font loading fails.

The type rule is operational comprehension first. Headlines name the workflow or offer plainly;
supporting copy explains the object, action, policy, owner, receipt, or next step. Use mono for
short state labels and identifiers, not long explanatory paragraphs.

## Fluid Typography

Display text scales with viewport:

```css
--text-performance-display: clamp(2.5rem, 4vw + 1.5rem, 4.5rem);
```

## Usage Example

```css
.article-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-performance-bold);
  line-height: var(--leading-performance-tight);
  letter-spacing: var(--tracking-performance-tight);
}

.article-body {
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-performance-relaxed);
}

.article-meta {
  font-size: var(--text-sm);
  color: var(--color-performance-fg-muted);
  letter-spacing: var(--tracking-performance-wide);
}
```
