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
| `text-white/46` | `var(--color-fg-muted)` | rgba(255,255,255,0.46) - WCAG AA compliant |
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
| focus | `var(--color-focus)` | rgba(255,255,255,0.5) - WCAG AA compliant 5.28:1 |

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
--color-fg-muted: rgba(255, 255, 255, 0.46)  /* WCAG AA: 4.56:1 */
--color-fg-subtle: rgba(255, 255, 255, 0.2)
--color-border-default: rgba(255, 255, 255, 0.1)
--color-border-emphasis: rgba(255, 255, 255, 0.2)
--color-border-strong: rgba(255, 255, 255, 0.3)
--color-hover: rgba(255, 255, 255, 0.05)
--color-active: rgba(255, 255, 255, 0.1)

/* Semantic Colors - All WCAG AA compliant (4.5:1+ on pure black) */
--color-success: #44aa44              /* 7.08:1 */
--color-success-muted: rgba(68, 170, 68, 0.2)
--color-success-border: rgba(68, 170, 68, 0.3)
--color-error: #d44d4d                /* 4.97:1 */
--color-error-muted: rgba(212, 77, 77, 0.2)
--color-error-border: rgba(212, 77, 77, 0.3)
--color-warning: #aa8844              /* 6.31:1 */
--color-warning-muted: rgba(170, 136, 68, 0.2)
--color-warning-border: rgba(170, 136, 68, 0.3)
--color-info: #5082b9                 /* 5.23:1 */
--color-info-muted: rgba(80, 130, 185, 0.2)
--color-info-border: rgba(80, 130, 185, 0.3)

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

#### High Contrast Mode

Respect users who need increased contrast via `prefers-contrast: more`:

```css
@media (prefers-contrast: more) {
  :root {
    /* Foreground colors - brighter (WCAG AAA 7:1+) */
    --color-fg-secondary: rgba(255, 255, 255, 0.95);
    --color-fg-tertiary: rgba(255, 255, 255, 0.85);
    --color-fg-muted: rgba(255, 255, 255, 0.75);
    --color-fg-subtle: rgba(255, 255, 255, 0.5);

    /* Border colors - more visible */
    --color-border-default: rgba(255, 255, 255, 0.3);
    --color-border-emphasis: rgba(255, 255, 255, 0.5);
    --color-border-strong: rgba(255, 255, 255, 0.7);

    /* Interactive states - more prominent */
    --color-hover: rgba(255, 255, 255, 0.15);
    --color-active: rgba(255, 255, 255, 0.25);
    --color-focus: rgba(255, 255, 255, 0.9);

    /* Enhanced focus ring */
    *:focus-visible {
      outline: 3px solid var(--color-focus);
      outline-offset: 3px;
    }
  }
}
```

| Token | Standard | High Contrast | Ratio Change |
|-------|----------|---------------|--------------|
| `--color-fg-muted` | 0.46 | 0.75 | +63% |
| `--color-fg-subtle` | 0.2 | 0.5 | +150% |
| `--color-border-default` | 0.1 | 0.3 | +200% |
| `--color-focus` | 0.5 | 0.9 | +80% |

**Philosophy**: Same design language, increased visibility. Structure unchanged, only contrast enhanced.

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

## Utility Class vs Inline Style Decision

**Principle**: Utility classes for composition, inline styles for truly dynamic values.

### When to Use Utility Classes (Tailwind)

| Scenario | Example | Why |
|----------|---------|-----|
| Layout composition | `flex items-center gap-4` | Reusable, predictable |
| Responsive variants | `md:grid-cols-2 lg:grid-cols-3` | Tailwind handles breakpoints |
| State variants | `hover:opacity-80 focus:ring-2` | Pseudo-class handling |
| Spacing | `p-4 m-2 gap-6` | Consistent rhythm |

### When to Use Inline Styles

| Scenario | Example | Why |
|----------|---------|-----|
| Truly dynamic values | `style="--progress: {percent}%"` | Runtime calculation |
| User-controlled data | `style="background-image: url({userAvatar})"` | Can't predefine |
| Animation keyframe values | `style="transform: translateX({offset}px)"` | JS-driven animation |
| CSS custom property injection | `style="--delay: {index * 100}ms"` | Per-instance variation |

### When to Use Component Styles (Canon)

| Scenario | Example | Why |
|----------|---------|-----|
| Design tokens | `color: var(--color-fg-primary)` | Semantic meaning |
| Border radius | `border-radius: var(--radius-lg)` | Visual consistency |
| Typography | `font-size: var(--text-body-sm)` | Scale adherence |
| Colors | `background: var(--color-bg-surface)` | Theme coherence |

### Common Violations & Fixes

#### Violation 1: Hardcoded colors in utility classes
```svelte
<!-- ❌ Violation -->
<div class="bg-white/10 text-white/60 border-white/20">

<!-- ✅ Fixed -->
<div class="card">
<style>
  .card {
    background: var(--color-bg-surface);
    color: var(--color-fg-tertiary);
    border: 1px solid var(--color-border-emphasis);
  }
</style>
```

#### Violation 2: Inline styles for static values
```svelte
<!-- ❌ Violation -->
<div style="border-radius: 12px; background: #1a1a1a;">

<!-- ✅ Fixed -->
<div class="panel">
<style>
  .panel {
    border-radius: var(--radius-lg);
    background: var(--color-bg-subtle);
  }
</style>
```

#### Violation 3: Utility classes for typography scale
```svelte
<!-- ❌ Violation -->
<h1 class="text-4xl font-bold">
<p class="text-sm text-gray-400">

<!-- ✅ Fixed -->
<h1 class="heading">
<p class="caption">
<style>
  .heading {
    font-size: var(--text-h1);
    font-weight: 700;
  }
  .caption {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }
</style>
```

#### Violation 4: Missing semantic class names
```svelte
<!-- ❌ Violation: All styling via utilities -->
<button class="px-4 py-2 bg-white/10 rounded-lg border border-white/20 hover:bg-white/20">

<!-- ✅ Fixed: Semantic class with Canon tokens -->
<button class="px-4 py-2 btn-secondary">
<style>
  .btn-secondary {
    background: var(--color-bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-default);
    transition: background var(--duration-micro) var(--ease-standard);
  }
  .btn-secondary:hover {
    background: var(--color-hover);
  }
</style>
```

#### Violation 5: Inline styles for animation
```svelte
<!-- ❌ Violation -->
<div style="transition: all 0.2s ease-in-out;">

<!-- ✅ Fixed -->
<div class="animated">
<style>
  .animated {
    transition: all var(--duration-micro) var(--ease-standard);
  }
</style>
```

### Decision Flowchart

```
Is the value dynamic/computed at runtime?
├── Yes → Use inline style with CSS custom property
│         style="--value: {computed}"
└── No → Is it a layout/structure concern?
         ├── Yes → Use Tailwind utility
         │         class="flex items-center gap-4"
         └── No → Is it a design/aesthetic concern?
                  ├── Yes → Use Canon token in <style>
                  │         color: var(--color-fg-primary)
                  └── No → Reconsider if needed at all
```

### The Hybrid Pattern

Most components combine all three approaches:

```svelte
<!-- Structure: Tailwind | Design: Canon | Dynamic: Inline -->
<article
  class="flex flex-col gap-4 p-6 card"
  style="--delay: {index * 100}ms"
>
  <h2 class="title">{heading}</h2>
  <p class="body">{content}</p>
</article>

<style>
  .card {
    background: var(--color-bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-default);
    animation: fadeIn var(--duration-standard) var(--ease-standard);
    animation-delay: var(--delay);
  }
  .title {
    font-size: var(--text-h3);
    color: var(--color-fg-primary);
  }
  .body {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
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
