# CSS Canon

**Principle**: Tailwind for structure, Canon for aesthetics.

## Layout Utilities (Keep)
```
flex, grid, items-*, justify-*, relative, absolute, fixed, sticky
w-*, h-*, min-*, max-*, gap-*, p-*, m-*, space-*
overflow-*, z-*, order-*, col-*, row-*
```

## Design Utilities (Avoid) → Use Canon
| Tailwind | Canon Token |
|----------|-------------|
| `rounded-sm` | `var(--radius-sm)` (6px) |
| `rounded-md` | `var(--radius-md)` (8px) |
| `rounded-lg` | `var(--radius-lg)` (12px) |
| `rounded-xl` | `var(--radius-xl)` (16px) |
| `rounded-full` | `var(--radius-full)` |
| `bg-white/10` | `var(--color-bg-surface)` |
| `bg-black` | `var(--color-bg-pure)` |
| `text-white` | `var(--color-fg-primary)` |
| `text-white/80` | `var(--color-fg-secondary)` |
| `text-white/60` | `var(--color-fg-tertiary)` |
| `text-white/40` | `var(--color-fg-muted)` |
| `shadow-sm` | `var(--shadow-sm)` |
| `shadow-md` | `var(--shadow-md)` |
| `shadow-lg` | `var(--shadow-lg)` |
| `text-sm` | `var(--text-body-sm)` |
| `text-lg` | `var(--text-body-lg)` |

## Token Reference

### Colors
```css
--color-bg-pure: #000000
--color-bg-elevated: #0a0a0a
--color-bg-surface: #111111
--color-bg-subtle: #1a1a1a
--color-fg-primary: #ffffff
--color-fg-secondary: rgba(255, 255, 255, 0.8)
--color-fg-tertiary: rgba(255, 255, 255, 0.6)
--color-fg-muted: rgba(255, 255, 255, 0.4)
--color-fg-subtle: rgba(255, 255, 255, 0.2)
--color-border-default: rgba(255, 255, 255, 0.1)
--color-border-emphasis: rgba(255, 255, 255, 0.2)
--color-border-strong: rgba(255, 255, 255, 0.3)
--color-hover: rgba(255, 255, 255, 0.05)
--color-active: rgba(255, 255, 255, 0.1)

/* Semantic Colors */
--color-success: #44aa44
--color-error: #cc4444
--color-warning: #aa8844
--color-info: #4477aa

/* Data Visualization Palette */
--color-data-1: #60a5fa  /* Blue */
--color-data-2: #22c55e  /* Green */
--color-data-3: #c084fc  /* Purple */
--color-data-4: #fbbf24  /* Amber */
--color-data-5: #f472b6  /* Pink */
--color-data-6: #facc15  /* Yellow */
```

### Spacing (Golden Ratio φ = 1.618)
```css
--space-xs: 0.5rem
--space-sm: 1rem
--space-md: 1.618rem
--space-lg: 2.618rem
--space-xl: 4.236rem
--space-2xl: 6.854rem
```

### Typography
```css
--text-display-xl: clamp(3.5rem, 5vw + 2rem, 7rem)
--text-display: clamp(2.5rem, 4vw + 1.5rem, 5rem)
--text-h1: clamp(2rem, 3vw + 1rem, 3.5rem)
--text-h2: clamp(1.5rem, 2vw + 0.75rem, 2.25rem)
--text-h3: clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem)
--text-body-lg: 1.125rem
--text-body: 1rem
--text-body-sm: 0.875rem
--text-caption: 0.75rem
```

### Animation
```css
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)
--duration-micro: 200ms
--duration-standard: 300ms
--duration-complex: 500ms
```

## Pattern

```svelte
<!-- Structure: Tailwind | Design: Canon -->
<div class="flex items-center gap-4 p-6 card">
  <span class="label">{title}</span>
</div>

<style>
  .card {
    border-radius: var(--radius-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
  }
  .label {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
  }
</style>
```

## Detection Patterns

Tailwind design utilities to flag:
- `rounded-*` (except `rounded-none`)
- `bg-white`, `bg-black`, `bg-gray-*`, `bg-slate-*`
- `text-white`, `text-black`, `text-gray-*`, `text-slate-*`
- `shadow-*` (except `shadow-none`)
- `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`
- `opacity-*` (use rgba in Canon tokens instead)
- `border-gray-*`, `border-white`, `border-black`

## Tailwind Version & Security Status

**Current**: Tailwind CSS 3.4.18 (pinned)

### Why Not Tailwind 4?

Tailwind 4 removes the JavaScript config (`tailwind.config.js`) in favor of CSS-first configuration. Our Canon architecture relies on:
1. **Safelist patterns** for dynamic class generation
2. **Content paths** spanning monorepo packages
3. **Theme extensions** for mono font family

Migration would require restructuring our build pipeline.

### Security Assessment (December 2025)

| Vulnerability | Severity | Affected | Status |
|--------------|----------|----------|--------|
| CVE-2024-4067 (micromatch) | Medium 5.3 | Transitive | Build-time only |
| CVE-2024-4068 (braces) | High 7.5 | Transitive | Build-time only |
| GHSA-5j98-mcp5-4vw2 (glob CLI) | High | 3.4.15-3.4.18 | Build-time only |

**Risk Assessment**: LOW
- All vulnerabilities are in **build-time dependencies**, not runtime
- Tailwind generates static CSS at build; no runtime exposure
- No user input reaches Tailwind processing
- Production bundles contain only generated CSS

### Migration Path

When Tailwind 4 stabilizes (mid-2025+), consider:
1. **Option A**: Migrate to Tailwind 4 CSS-first config
2. **Option B**: Replace Tailwind with pure Canon CSS (structure utilities via custom classes)
3. **Option C**: Maintain Tailwind 3 with security monitoring

**Recommendation**: Continue Tailwind 3 with quarterly security review. The "Tailwind for structure, Canon for aesthetics" split naturally reduces Tailwind surface area over time.
