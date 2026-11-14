---
category: "Canon"
section: "Foundations"
title: "Colors"
description: "Canon color tokens: backgrounds, foregrounds, semantic colors, and data visualization palette."
lead: "Black is the foundation. Solid neutrals establish hierarchy; named state colors communicate what needs attention."
publishedAt: "2026-01-08"
published: true
---

## Foundation and scope

Canon websites begin on true black. Solid neutral surfaces and foreground roles establish hierarchy; tactile artwork supplies warmth. Use semantic roles instead of reconstructing a palette with opacity.

| Role | Token | Default dark value |
| --- | --- | --- |
| Canvas | `--color-performance-bg-pure` | `#000000` |
| Raised surface | `--color-performance-bg-surface` | `#111111` |
| Primary text | `--color-performance-fg-primary` | `#f2f2f2` |
| Secondary text | `--color-performance-fg-secondary` | `#c7c7c7` |
| Muted text | `--color-performance-fg-muted` | `#aaaaaa` |
| Separation | `--color-performance-border-default` | `#3b3b3b` |

These values describe the default dark scope only. `data-theme="light"` rebinds the shared roles for an explicit light work surface. Nested `data-theme="dark"` restores the black foundation. Use the built-in scopes rather than copying partial overrides. Performance `paper`, `panel`, `ink` and compatibility aliases follow their owning palette; their names do not imply a light default.

## State and action

Use `--color-performance-success`, `--color-performance-error`, `--color-performance-warning` and `--color-performance-info` with their corresponding muted surface and border roles. Pair state color with truthful text and an appropriate next action. Green is not proof of execution or approval. Neutral action roles distinguish a control from its surroundings without borrowing a status color.

Contrast depends on the actual foreground/background pair, scope and state. Check text, focus, disabled controls and error states on the rendered surface. Subtle foregrounds and separator borders are not substitutes for readable body text or identifiable control boundaries.

```css
.receipt {
  background: var(--color-performance-bg-surface);
  color: var(--color-performance-fg-primary);
  border: 1px solid var(--color-performance-border-default);
}
.receipt-meta { color: var(--color-performance-fg-muted); }
```

## Specialist operator palette

The namespaced operator palette is opt-in: import `@create-something/canon/styles/operator.css` and use `data-canon-palette="operator"` on the owning surface. Consumers explicitly bind its roles; the attribute does not replace the shared palette automatically. Follow the operator integration contract and validate its actual state pairs.

See [Theming](/canon/guidelines/theming), [Accessibility](/canon/guidelines/accessibility) and [Token Reference](/canon/resources/tokens).
