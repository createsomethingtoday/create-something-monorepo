# CSS Canon

**Principle**: Tailwind for structure, Canon for aesthetics.

## Layout Utilities (Keep)
```
flex, grid, items-*, justify-*, relative, absolute, fixed, sticky
w-*, h-*, min-*, max-*, gap-*, p-*, m-*, space-*
overflow-*, z-*, order-*, col-*, row-*
```

## Design Utilities (Avoid) → Use Canon
| Tailwind | Canon Token | Notes |
|----------|-------------|-------|
| `rounded-sm` | `var(--radius-sm)` | 6px |
| `rounded-md` | `var(--radius-md)` | 8px |
| `rounded-lg` | `var(--radius-lg)` | 12px |
| `rounded-xl` | `var(--radius-xl)` | 16px |
| `rounded-full` | `var(--radius-full)` | |
| `bg-white/5` | `var(--color-bg-subtle)` | #1a1a1a - card backgrounds |
| `bg-white/10` | `var(--color-bg-surface)` | #111111 - elevated surfaces |
| `bg-black` | `var(--color-bg-pure)` | #000000 |
| `text-white` | `var(--color-fg-primary)` | #ffffff |
| `text-white/80` | `var(--color-fg-secondary)` | rgba(255,255,255,0.8) |
| `text-white/60` | `var(--color-fg-tertiary)` | rgba(255,255,255,0.6) |
| `text-white/40` | `var(--color-fg-muted)` | rgba(255,255,255,0.4) |
| `text-white/20` | `var(--color-fg-subtle)` | rgba(255,255,255,0.2) |
| `border-white/10` | `var(--color-border-default)` | rgba(255,255,255,0.1) |
| `border-white/20` | `var(--color-border-emphasis)` | rgba(255,255,255,0.2) |
| `border-white/30` | `var(--color-border-strong)` | rgba(255,255,255,0.3) |
| `shadow-sm` | `var(--shadow-sm)` | |
| `shadow-md` | `var(--shadow-md)` | |
| `shadow-lg` | `var(--shadow-lg)` | |
| `text-sm` | `var(--text-body-sm)` | 0.875rem |
| `text-lg` | `var(--text-body-lg)` | 1.125rem |

### Interactive State Tokens
For hover/active states, use transparent overlays:
| State | Canon Token | Value |
|-------|-------------|-------|
| hover | `var(--color-hover)` | rgba(255,255,255,0.05) |
| active | `var(--color-active)` | rgba(255,255,255,0.1) |
| focus | `var(--color-focus)` | rgba(255,255,255,0.2) |

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
--color-success-muted: rgba(68, 170, 68, 0.2)
--color-success-border: rgba(68, 170, 68, 0.3)
--color-error: #cc4444
--color-error-muted: rgba(204, 68, 68, 0.2)
--color-error-border: rgba(204, 68, 68, 0.3)
--color-warning: #aa8844
--color-warning-muted: rgba(170, 136, 68, 0.2)
--color-warning-border: rgba(170, 136, 68, 0.3)
--color-info: #4477aa
--color-info-muted: rgba(68, 119, 170, 0.2)
--color-info-border: rgba(68, 119, 170, 0.3)

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

### Animation & Motion

**Philosophy**: Motion should be purposeful, not decorative. Animation reveals state changes and guides attention. When in doubt, don't animate.

#### Timing Tokens
```css
--duration-micro: 200ms    /* Hover states, toggles, micro-interactions */
--duration-standard: 300ms /* Page transitions, modal open/close */
--duration-complex: 500ms  /* Multi-step animations, orchestrated sequences */
```

#### Easing
```css
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)  /* Material Design standard */
```
Use `--ease-standard` for all animations. Consistent easing creates coherent motion language.

#### When to Use Each Duration

| Duration | Use Case | Examples |
|----------|----------|----------|
| `--duration-micro` | Immediate feedback | Button hover, link underline, icon color |
| `--duration-standard` | State changes | Modal open, drawer slide, tab switch |
| `--duration-complex` | Orchestrated motion | Page enter, multi-element sequences |

#### Standard Patterns

**Hover States** (micro):
```css
.element {
  transition: all var(--duration-micro) var(--ease-standard);
}
.element:hover {
  border-color: var(--color-border-emphasis);
}
```

**Fade In** (entrance):
```css
.fade-in {
  animation: fadeIn var(--duration-complex) var(--ease-standard);
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Card Lift** (hover emphasis):
```css
.card-lift {
  transition: all var(--duration-standard) var(--ease-standard);
}
.card-lift:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-2xl);
}
```

#### View Transitions

Per-property transition speeds reflect their character:

| Property | Duration | Character |
|----------|----------|-----------|
| `.space` | 200ms | Experimental, responsive |
| `.io` | 250ms | Research, measured |
| `.agency` | 250ms | Professional, efficient |
| `.ltd` | 500ms | Contemplative, deliberate |
| `.learn` | 300ms | Educational, patient |

```css
/* Property-specific override in app.css */
:root {
  --view-transition-duration: 300ms;
}
```

#### Reduced Motion

Always respect user preferences:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### Anti-Patterns

Avoid:
- Animation for decoration (bouncing icons, pulsing elements)
- Duration > 500ms (feels sluggish)
- Custom easing curves (breaks motion coherence)
- Animating layout properties (`width`, `height`) — use `transform` instead
- Auto-playing animations without user trigger

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

## Experimental Routes Policy

**Principle**: Experiments explore; production delivers.

### Development Phase

During active development, experiments **may drift** from Canon:

| Allowed During Development | Reason |
|---------------------------|--------|
| Hardcoded colors | Rapid visual iteration |
| Non-standard spacing | Testing proportions |
| Custom animations | Motion exploration |
| Direct Tailwind design utilities | Speed over consistency |

The purpose of experiments is discovery. Premature standardization constrains exploration.

### Pre-Merge Requirements

Before an experiment merges to production, it **must align**:

| Requirement | Validation |
|-------------|------------|
| Colors use Canon tokens | No hardcoded hex/rgb values |
| Typography uses Canon scale | No arbitrary `text-*` sizes |
| Spacing uses Canon tokens | Golden ratio (`--space-*`) |
| Borders use semantic tokens | `--color-border-*` |
| Motion uses Canon timing | `--duration-*`, `--ease-standard` |

### Migration Checklist

Before promoting an experiment:

```bash
# Run Canon audit on the experiment
/audit-canon packages/io/src/routes/experiments/[name]
```

Or manually check:
- [ ] No `bg-white`, `bg-black`, `bg-gray-*` → use `--color-bg-*`
- [ ] No `text-white`, `text-gray-*` → use `--color-fg-*`
- [ ] No `border-white`, `border-gray-*` → use `--color-border-*`
- [ ] No hardcoded `#hex` or `rgb()` values
- [ ] No `rounded-*` → use `--radius-*`
- [ ] No `shadow-*` → use `--shadow-*`
- [ ] Motion uses `--duration-*` and `--ease-standard`

### Route Classification

| Route Type | Canon Requirement | Example |
|------------|-------------------|---------|
| `/experiments/*` | Relaxed during dev, strict before merge | `/experiments/text-revelation` |
| `/papers/*` | Strict (public-facing) | `/papers/subtractive-form-design` |
| `/admin/*` | Moderate (internal tools) | `/admin/tufte-dashboard` |
| All other routes | Strict | `/`, `/about`, `/contact` |

### Rationale

This policy balances two needs:

1. **Creative Freedom**: Experiments need room to explore visual ideas without the friction of token lookup
2. **System Coherence**: Production code must maintain the unified Canon aesthetic

The hermeneutic circle applies: experiments inform the Canon (discovering what works), while the Canon constrains production (enforcing what's proven).

**Subtractive Triad Application**:
- **DRY**: Don't duplicate design decisions—eventually canonize them
- **Rams**: Only experiments that earn production status get promoted
- **Heidegger**: Each experiment must eventually serve the whole system or be archived

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
