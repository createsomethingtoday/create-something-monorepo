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
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
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
          pure: 'var(--color-bg-pure)',
          elevated: 'var(--color-bg-elevated)',
          surface: 'var(--color-bg-surface)',
          subtle: 'var(--color-bg-subtle)',
        },
        fg: {
          primary: 'var(--color-fg-primary)',
          secondary: 'var(--color-fg-secondary)',
          tertiary: 'var(--color-fg-tertiary)',
          muted: 'var(--color-fg-muted)',
        }
      },
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      }
    }
  }
}
```

## Token Categories

### Colors

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg-pure` | `#000000` | Page background |
| `--color-bg-elevated` | `#0a0a0a` | Slightly raised surfaces |
| `--color-bg-surface` | `#111111` | Cards, modals |
| `--color-bg-subtle` | `#1a1a1a` | Subtle backgrounds |
| `--color-fg-primary` | `#ffffff` | Main content |
| `--color-fg-secondary` | `rgba(255,255,255,0.8)` | Supporting content |
| `--color-fg-tertiary` | `rgba(255,255,255,0.6)` | De-emphasized |
| `--color-fg-muted` | `rgba(255,255,255,0.46)` | Very subtle (WCAG AA) |

### Spacing (Golden Ratio)

Based on φ = 1.618:

| Token | Value | Formula |
|-------|-------|---------|
| `--space-xs` | `0.618rem` | 1/φ |
| `--space-sm` | `1rem` | base |
| `--space-md` | `1.618rem` | φ |
| `--space-lg` | `2.618rem` | φ² |
| `--space-xl` | `4.236rem` | φ³ |
| `--space-2xl` | `6.854rem` | φ⁴ |

### Typography (Golden Ratio)

| Token | Value | Use |
|-------|-------|-----|
| `--text-display` | `clamp(2.618rem, 4vw + 1.5rem, 4.236rem)` | Hero text |
| `--text-h1` | `clamp(1.618rem, 3vw + 1rem, 2.618rem)` | Page titles |
| `--text-h2` | `clamp(1.2rem, 2vw + 0.5rem, 1.618rem)` | Section titles |
| `--text-body` | `1rem` | Body text |
| `--text-body-sm` | `0.913rem` | Small text |
| `--text-caption` | `0.833rem` | Captions |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `6px` | Small elements |
| `--radius-md` | `8px` | Buttons, badges |
| `--radius-lg` | `12px` | Cards, modals |
| `--radius-xl` | `16px` | Large containers |
| `--radius-full` | `9999px` | Pills, avatars |

### Animation

| Token | Value | Use |
|-------|-------|-----|
| `--ease-standard` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Most transitions |
| `--duration-micro` | `200ms` | Hover states |
| `--duration-standard` | `300ms` | Page transitions |
| `--duration-complex` | `500ms` | Multi-step |

### Glass Effects

For frosted glass / glassmorphism:

```css
.glass-card {
  background: var(--glass-bg-medium);
  backdrop-filter: blur(var(--glass-blur-md)) var(--glass-saturate-md);
  border: 1px solid var(--glass-border-light);
  box-shadow: var(--glass-shadow-md);
}
```

## Light Theme

Apply `data-theme="light"` to enable light mode:

```html
<html data-theme="light">
```

## Accessibility

- All semantic colors are **WCAG AA compliant** (4.5:1+ contrast)
- `--color-fg-muted` at 46% opacity = 4.56:1 contrast ratio
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
