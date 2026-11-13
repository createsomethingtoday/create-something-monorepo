# @createsomething/canon-tokens

**Framework-agnostic CSS design tokens** with a black default foundation and explicit light scopes.

Shared semantic roles, readable typography, soft-square geometry and scoped palette boundaries as CSS custom properties. Contrast evidence is specific to the tested role pairs; it is not a blanket certification for arbitrary compositions.

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

These values describe the default black scope. Explicit light boundaries rebind the same roles; do not copy only part of a palette.

| Token | Value | Use |
|-------|-------|-----|
| `--color-performance-bg-pure` | `#000000` | Page background |
| `--color-performance-bg-elevated` | `#111111` | Slightly raised surfaces |
| `--color-performance-bg-surface` | `#111111` | Cards, modals |
| `--color-performance-bg-subtle` | `#1a1a1a` | Subtle backgrounds |
| `--color-performance-fg-primary` | `#f2f2f2` | Main content |
| `--color-performance-fg-secondary` | `#c7c7c7` | Supporting content |
| `--color-performance-fg-tertiary` | `#aaaaaa` | De-emphasized |
| `--color-performance-fg-muted` | `#aaaaaa` | Muted supporting text |

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
| `--text-performance-caption` | `0.875rem` | Captions |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-performance-scale-sm` | `8px` | Small elements |
| `--radius-performance-scale-md` | `12px` | Buttons, badges |
| `--radius-performance-scale-lg` | `20px` | Cards, modals |
| `--radius-performance-scale-xl` | `24px` | Large containers |
| `--radius-performance-scale-full` | `9999px` | Pills, avatars |

### Animation

| Token | Value | Use |
|-------|-------|-----|
| `--ease-performance-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Most transitions |
| `--duration-performance-micro` | `150ms` | Hover states |
| `--duration-performance-standard` | `220ms` | Page transitions |
| `--duration-performance-complex` | `350ms` | Multi-step |

### Optional glass compatibility

Ordinary interface surfaces are solid. These retained tokens support explicitly chosen glass effects; they do not define the default material:

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

- Verify contrast for actual foreground/background pairs, states and owning palettes. A semantic token name does not establish conformance.
- Preserve readable text, visible focus and meaningful control boundaries. Subtle colors and separator borders are not general-purpose control or text roles.
- Inspect `prefers-contrast: more` and forced-colors in the consuming surface.
- Honor `prefers-reduced-motion: reduce` while retaining meaning and available actions.

## Philosophy

> "Weniger, aber besser" — Dieter Rams

Canon tokens encode design decisions, not just values:

- **Golden ratio** creates natural visual harmony
- **Semantic naming** tells you what tokens are for
- **Accessible composition** requires correct roles, interactions and review of the actual output
- **Black foundation** preserves CREATE SOMETHING's measured identity, with explicit light work surfaces

## Full Token Reference

See [tokens.css](./tokens.css) for the complete source, scoped palettes and compatibility aliases.

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

## Approachable canonical foundation

The canonical default is black: black canvas, neutral raised surfaces and clear light actions. Existing CSS variable names remain public. Use `data-theme="light"` or `.theme-light` for an explicit light work surface, and `data-theme="dark"`/`.theme-dark` to restore the black foundation inside it. `.cs-workspace` retains its explicit dark contract. Theme boundaries rebind derived state and legacy aliases, so nested scopes resolve against their own palette.

CSS is generated byte-for-byte from Canon `src/lib/styles/tokens.css`. SCSS keeps named variables and emits the same complete CSS boundary contract. JSON retains existing shapes plus `performanceContract` and `foundationThemes`; the latter include complete light/dark declarations. Generate with `node packages/canon/scripts/generate-foundation-artifacts.mjs` from the monorepo root. That command writes only Canon and this portable package, never consumer source.
