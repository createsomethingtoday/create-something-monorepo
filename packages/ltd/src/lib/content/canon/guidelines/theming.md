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
- `--color-bg-pure`
- `--color-bg-base`
- `--color-bg-surface`
- `--color-bg-elevated`

### Foreground Tokens
- `--color-fg-primary`
- `--color-fg-secondary`
- `--color-fg-tertiary`
- `--color-fg-muted`

### Border Tokens
- `--color-border-default`
- `--color-border-emphasis`
- `--color-border-strong`

### Semantic Tokens
- `--color-success`
- `--color-error`
- `--color-warning`
- `--color-info`

## Creating a Custom Theme

Override Canon's tokens at the root level:

```css
:root {
  /* Brand color as accent */
  --color-accent: #6366f1;
  --color-accent-muted: rgba(99, 102, 241, 0.1);
  
  /* Custom backgrounds */
  --color-bg-pure: #0f0f23;
  --color-bg-base: #1a1a2e;
  --color-bg-surface: #252538;
  --color-bg-elevated: #2f2f45;
}
```

## Dark & Light Modes

Canon defaults to dark mode. Add light mode with a theme attribute:

```css
/* Dark mode (default) */
:root {
  --color-bg-pure: #000000;
  --color-bg-base: #0a0a0a;
  --color-fg-primary: rgba(255, 255, 255, 1);
  --color-fg-secondary: rgba(255, 255, 255, 0.8);
}

/* Light mode override */
[data-theme="light"] {
  --color-bg-pure: #ffffff;
  --color-bg-base: #fafafa;
  --color-fg-primary: rgba(0, 0, 0, 0.9);
  --color-fg-secondary: rgba(0, 0, 0, 0.7);
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
    --color-bg-pure: #ffffff;
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
  --color-bg-pure: #ffffff;
  --color-bg-base: #fafafa;
  --color-bg-surface: #f5f5f5;
  --color-bg-elevated: #ffffff;
  
  /* Foregrounds - dark text */
  --color-fg-primary: rgba(0, 0, 0, 0.9);
  --color-fg-secondary: rgba(0, 0, 0, 0.7);
  --color-fg-tertiary: rgba(0, 0, 0, 0.5);
  --color-fg-muted: rgba(0, 0, 0, 0.4);
  
  /* Borders - adjusted for light bg */
  --color-border-default: rgba(0, 0, 0, 0.1);
  --color-border-emphasis: rgba(0, 0, 0, 0.2);
  --color-border-strong: rgba(0, 0, 0, 0.3);
  
  /* Interactive - adjusted */
  --color-hover: rgba(0, 0, 0, 0.05);
  --color-active: rgba(0, 0, 0, 0.1);
}
```
