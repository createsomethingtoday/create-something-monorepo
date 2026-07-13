---
category: "Canon"
section: "Guidelines"
title: "Theming"
description: "Create custom themes by extending Canon's design tokens. Dark mode, light mode, and brand customization patterns."
lead: "Canon's token architecture enables systematic theming. Override tokens at the root level to create consistent custom themes."
publishedAt: "2026-01-08"
published: true
---

## Philosophy

Themes should extend, not replace. Canon provides a complete token system that establishes relationships between colors, spacing, and typography. Custom themes override specific tokens while maintaining these relationships.

> "A system is not the sum of its parts but the product of their interactions."
> — Russell Ackoff

## Token Categories

These tokens form the theming surface. Override them to create custom themes.

### Background Tokens
- `--color-performance-bg-pure`
- `--color-bg-base`
- `--color-performance-bg-surface`
- `--color-performance-bg-elevated`

### Foreground Tokens
- `--color-performance-fg-primary`
- `--color-performance-fg-secondary`
- `--color-performance-fg-tertiary`
- `--color-performance-fg-muted`

### Border Tokens
- `--color-performance-border-default`
- `--color-performance-border-emphasis`
- `--color-performance-border-strong`

### Semantic Tokens
- `--color-performance-success`
- `--color-performance-error`
- `--color-performance-warning`
- `--color-performance-info`

## Creating a Custom Theme

Override Canon's tokens at the root level:

```css
:root {
  /* Brand color as accent */
  --color-accent: #6366f1;
  --color-accent-muted: rgba(99, 102, 241, 0.1);
  
  /* Custom backgrounds */
  --color-performance-bg-pure: #0f0f23;
  --color-bg-base: #1a1a2e;
  --color-performance-bg-surface: #252538;
  --color-performance-bg-elevated: #2f2f45;
}
```

## Dark & Light Modes

Canon defaults to dark mode. Add light mode with a theme attribute:

```css
/* Dark mode (default) */
:root {
  --color-performance-bg-pure: #000000;
  --color-bg-base: #0a0a0a;
  --color-performance-fg-primary: rgba(255, 255, 255, 1);
  --color-performance-fg-secondary: rgba(255, 255, 255, 0.8);
}

/* Light mode override */
[data-theme="light"] {
  --color-performance-bg-pure: #ffffff;
  --color-bg-base: #fafafa;
  --color-performance-fg-primary: rgba(0, 0, 0, 0.9);
  --color-performance-fg-secondary: rgba(0, 0, 0, 0.7);
}
```

### Theme Toggle

```html
<button onclick="toggleTheme()">Toggle Theme</button>

<script>
function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  document.documentElement.dataset.theme = 
    current === 'light' ? 'dark' : 'light';
}
</script>
```

## System Preference Detection

Respect user's system preference:

```css
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --color-performance-bg-pure: #ffffff;
    --color-bg-base: #fafafa;
    /* ... light mode tokens ... */
  }
}
```

## Theme Best Practices

1. **Override, don't replace** - Maintain token relationships
2. **Test contrast** - Ensure AA compliance in all themes
3. **Preserve semantics** - Success should still feel "green"
4. **Respect preferences** - Honor `prefers-color-scheme`
5. **Provide toggle** - Let users choose their preference

## Complete Light Theme Example

```css
[data-theme="light"] {
  /* Backgrounds - inverted */
  --color-performance-bg-pure: #ffffff;
  --color-bg-base: #fafafa;
  --color-performance-bg-surface: #f5f5f5;
  --color-performance-bg-elevated: #ffffff;
  
  /* Foregrounds - dark text */
  --color-performance-fg-primary: rgba(0, 0, 0, 0.9);
  --color-performance-fg-secondary: rgba(0, 0, 0, 0.7);
  --color-performance-fg-tertiary: rgba(0, 0, 0, 0.5);
  --color-performance-fg-muted: rgba(0, 0, 0, 0.4);
  
  /* Borders - adjusted for light bg */
  --color-performance-border-default: rgba(0, 0, 0, 0.1);
  --color-performance-border-emphasis: rgba(0, 0, 0, 0.2);
  --color-performance-border-strong: rgba(0, 0, 0, 0.3);
  
  /* Interactive - adjusted */
  --color-performance-hover: rgba(0, 0, 0, 0.05);
  --color-performance-active: rgba(0, 0, 0, 0.1);
}
```
