# @createsomething/canon-tokens

**Framework-agnostic CSS design tokens** for dark-mode interfaces.

Golden ratio spacing, WCAG-compliant colors, glass effects, and more — as pure CSS custom properties.

## Installation

```bash
npm install @createsomething/canon-tokens
```

## Usage

### CSS Import

```css
@import '@createsomething/canon-tokens';

.card {
  background: var(--color-performance-bg-surface);
  border: 1px solid var(--color-performance-border-default);
  border-radius: var(--radius-performance-scale-lg);
  padding: var(--space-performance-md);
}
```

### HTML Link

```html
<link rel="stylesheet" href="node_modules/@createsomething/canon-tokens/tokens.css">
```

### PostCSS / Vite / Webpack

```js
// vite.config.js
export default {
  css: {
    preprocessorOptions: {
      css: {
        additionalData: '@import "@createsomething/canon-tokens";'
      }
    }
  }
}
```

### Tailwind Integration

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: {
          pure: 'var(--color-performance-bg-pure)',
          elevated: 'var(--color-performance-bg-elevated)',
          surface: 'var(--color-performance-bg-surface)',
          subtle: 'var(--color-performance-bg-subtle)',
        },
        fg: {
          primary: 'var(--color-performance-fg-primary)',
          secondary: 'var(--color-performance-fg-secondary)',
          tertiary: 'var(--color-performance-fg-tertiary)',
          muted: 'var(--color-performance-fg-muted)',
        }
      },
      spacing: {
        xs: 'var(--space-performance-xs)',
        sm: 'var(--space-performance-sm)',
        md: 'var(--space-performance-md)',
        lg: 'var(--space-performance-lg)',
        xl: 'var(--space-performance-xl)',
      },
      borderRadius: {
        sm: 'var(--radius-performance-scale-sm)',
        md: 'var(--radius-performance-scale-md)',
        lg: 'var(--radius-performance-scale-lg)',
        xl: 'var(--radius-performance-scale-xl)',
      }
    }
  }
}
```

## Token Categories

### Colors

| Token | Value | Use |
|-------|-------|-----|
| `--color-performance-bg-pure` | `#000000` | Page background |
| `--color-performance-bg-elevated` | `#0a0a0a` | Slightly raised surfaces |
| `--color-performance-bg-surface` | `#111111` | Cards, modals |
| `--color-performance-bg-subtle` | `#1a1a1a` | Subtle backgrounds |
| `--color-performance-fg-primary` | `#ffffff` | Main content |
| `--color-performance-fg-secondary` | `rgba(255,255,255,0.8)` | Supporting content |
| `--color-performance-fg-tertiary` | `rgba(255,255,255,0.6)` | De-emphasized |
| `--color-performance-fg-muted` | `rgba(255,255,255,0.46)` | Very subtle (WCAG AA) |

### Spacing (Golden Ratio)

Based on φ = 1.618:

| Token | Value | Formula |
|-------|-------|---------|
| `--space-performance-xs` | `0.618rem` | 1/φ |
| `--space-performance-sm` | `1rem` | base |
| `--space-performance-md` | `1.618rem` | φ |
| `--space-performance-lg` | `2.618rem` | φ² |
| `--space-performance-xl` | `4.236rem` | φ³ |
| `--space-performance-2xl` | `6.854rem` | φ⁴ |

### Typography (Golden Ratio)

| Token | Value | Use |
|-------|-------|-----|
| `--text-performance-display` | `clamp(2.618rem, 4vw + 1.5rem, 4.236rem)` | Hero text |
| `--text-performance-h1` | `clamp(1.618rem, 3vw + 1rem, 2.618rem)` | Page titles |
| `--text-performance-h2` | `clamp(1.2rem, 2vw + 0.5rem, 1.618rem)` | Section titles |
| `--text-performance-body` | `1rem` | Body text |
| `--text-performance-body-sm` | `0.913rem` | Small text |
| `--text-performance-caption` | `0.833rem` | Captions |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-performance-scale-sm` | `6px` | Small elements |
| `--radius-performance-scale-md` | `8px` | Buttons, badges |
| `--radius-performance-scale-lg` | `12px` | Cards, modals |
| `--radius-performance-scale-xl` | `16px` | Large containers |
| `--radius-performance-scale-full` | `9999px` | Pills, avatars |

### Animation

| Token | Value | Use |
|-------|-------|-----|
| `--ease-performance-standard` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Most transitions |
| `--duration-performance-micro` | `200ms` | Hover states |
| `--duration-performance-standard` | `300ms` | Page transitions |
| `--duration-performance-complex` | `500ms` | Multi-step |

### Glass Effects

For frosted glass / glassmorphism:

```css
.glass-card {
  background: var(--glass-performance-bg-medium);
  backdrop-filter: blur(var(--glass-performance-blur-md)) var(--glass-performance-saturate-md);
  border: 1px solid var(--glass-performance-border-light);
  box-shadow: var(--glass-performance-shadow-md);
}
```

## Light Theme

Apply `data-theme="light"` to enable light mode:

```html
<html data-theme="light">
```

## Accessibility

- All semantic colors are **WCAG AA compliant** (4.5:1+ contrast)
- `--color-performance-fg-muted` at 46% opacity = 4.56:1 contrast ratio
- High contrast mode support via `@media (prefers-contrast: more)`
- Reduced motion support via `@media (prefers-reduced-motion)`

## Philosophy

> "Weniger, aber besser" — Dieter Rams

Canon tokens encode design decisions, not just values:

- **Golden ratio** creates natural visual harmony
- **Semantic naming** tells you what tokens are for
- **WCAG compliance** is built-in, not bolted-on
- **Dark-first** because most developer tools are dark

## Full Token Reference

See [tokens.css](./tokens.css) for the complete 750+ line reference with mathematical derivations.

## Related

- [@create-something/canon](https://www.npmjs.com/package/@create-something/canon) — Full Svelte component library
- [Documentation](https://createsomething.io/docs) — Full design system docs

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `tokens.css`, `tokens.json` |
| Boot command | `pnpm check` |
| Smoke command | `pnpm check` |
| Validation surfaces | token files exist and `tokens.json` parses |
| UI validation path | none |
| Escalation rule | Stop before renaming tokens or changing values without checking full Canon package consumers and public docs. |

## License

MIT
