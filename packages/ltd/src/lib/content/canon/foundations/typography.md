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
--font-sans: Arial, 'Helvetica Neue', Helvetica, system-ui, sans-serif;
--font-display: var(--font-sans);
--font-mono: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, monospace;
--font-serif: Georgia, 'Times New Roman', serif;
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
