# CSS Canon Migration Report
## packages/space/src/routes/

**Date**: 2025-12-03
**Scope**: Route pages in packages/space
**Principle**: Tailwind for LAYOUT, Canon tokens for DESIGN

---

## ✅ Completed Migrations (3 files)

### 1. `/routes/+layout.svelte`
**Impact**: Site-wide layout
**Changes**:
- Replaced `bg-black` with `var(--color-bg-pure)` in semantic `.layout` class
- Moved inline `min-h-screen` to `.layout` class
- Created `.content` class for `pt-[72px]` (keeps specific pixel value for fixed nav)

**Before**:
```svelte
<div class="min-h-screen bg-black">
  <div class="pt-[72px]">
```

**After**:
```svelte
<div class="layout">
  <div class="content">

<style>
  .layout {
    min-height: 100vh;
    background: var(--color-bg-pure);
  }
  .content {
    padding-top: 72px;
  }
</style>
```

---

### 2. `/routes/about/+page.svelte`
**Impact**: About page
**Violations Fixed**: ~25 Tailwind design utilities

**Semantic Classes Created**:
- `.hero-title` - Main heading with responsive clamp()
- `.core-identity` - Main content section
- `.lead-text` - Emphasized intro paragraph
- `.link` - Text links with hover
- `.philosophy-card` - Card component
- `.card-title`, `.card-text` - Card internals
- `.background-section` - Bio section
- `.mission-section`, `.topics-section` - Page sections
- `.section-title`, `.section-text` - Section content
- `.topic-card`, `.topic-title`, `.topic-description` - Topic cards

**Key Replacements**:
| Tailwind | Canon Token |
|----------|-------------|
| `text-4xl md:text-6xl` | `clamp(2.5rem, 5vw, 3.5rem)` |
| `text-white` | `var(--color-fg-primary)` |
| `text-white/90` | `var(--color-fg-secondary)` |
| `text-white/70` | `var(--color-fg-tertiary)` |
| `text-white/60` | `var(--color-fg-muted)` |
| `bg-white/5` | `var(--color-bg-surface)` |
| `border-white/10` | `var(--color-border-default)` |
| `rounded-lg` | `var(--radius-lg)` |

---

### 3. `/routes/experiments/+page.svelte`
**Impact**: Main experiments listing page
**Violations Fixed**: ~30 Tailwind design utilities

**Semantic Classes Created**:
- `.hero-title`, `.hero-subtitle` - Page header
- `.search-input` - Search field with focus states
- `.search-icon`, `.search-clear` - Search UI elements
- `.filter-chip`, `.filter-chip-active` - Filter buttons
- `.sort-control` - Sort button container
- `.sort-button`, `.sort-button-active` - Sort buttons
- `.empty-message`, `.clear-button` - Empty state

**Key Features**:
- Full search input styling with icon positioning
- Filter chip active/inactive states
- Sort control with button group
- Proper focus states using `var(--color-border-emphasis)`
- Transition timing using `var(--duration-micro)` and `var(--ease-standard)`

**Before**:
```svelte
<input
  class="w-full px-4 py-3 pl-10 bg-white/5 border border-white/10 rounded-lg
         text-white placeholder-white/40 focus:border-white/30"
/>
```

**After**:
```svelte
<input class="search-input" />

<style>
  .search-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    color: var(--color-fg-primary);
    font-size: var(--text-body);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .search-input::placeholder {
    color: var(--color-fg-muted);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-border-emphasis);
  }
</style>
```

---

## 📋 Remaining Files (9 files)

### High Priority (Complex, Many Violations)

#### 1. `/routes/methodology/+page.svelte`
**Estimated violations**: 50+
**Complexity**: HIGH - Very long file with many sections
**Components needed**: Pipeline cards, metric grids, comparison sections, CTA buttons

#### 2. `/routes/experiments/motion-ontology/+page.svelte`
**Estimated violations**: 40+
**Complexity**: HIGH - Complex form inputs, result cards, status badges
**Components needed**: Form inputs, selects, buttons, result cards, status badges

#### 3. `/routes/experiments/minimal-capture/+page.svelte`
**Estimated violations**: 25
**Complexity**: MEDIUM - ASCII art, cards, code blocks

### Medium Priority

#### 4. `/routes/contact/+page.svelte`
**Estimated violations**: 20
**Complexity**: MEDIUM - Card layouts, icon styling

#### 5. `/routes/categories/+page.svelte`
**Estimated violations**: 15
**Complexity**: MEDIUM - Card grid with hover states

### Low Priority (Minor Fixes)

#### 6. `/routes/terms/+page.svelte`
**Estimated violations**: 10
**Complexity**: LOW - Mostly text colors

#### 7. `/routes/privacy/+page.svelte`
**Estimated violations**: 10
**Complexity**: LOW - Similar to terms

#### 8. `/routes/category/[slug]/+page.svelte`
**Estimated violations**: 5-10
**Complexity**: LOW - Minimal violations

#### 9. `/routes/praxis/+page.svelte`
**Estimated violations**: 0-5
**Complexity**: LOW - Already uses Canon extensively, just needs verification

---

## 🎯 Migration Patterns Established

### 1. **Color Migrations**
```css
/* Text colors */
text-white           → color: var(--color-fg-primary)
text-white/90        → color: var(--color-fg-secondary)
text-white/70        → color: var(--color-fg-tertiary)
text-white/60        → color: var(--color-fg-muted)
text-white/40        → color: var(--color-fg-muted)
text-white/50        → color: var(--color-fg-muted)

/* Background colors */
bg-black             → background: var(--color-bg-pure)
bg-white/5           → background: var(--color-bg-surface)
bg-white/[0.07]      → background: var(--color-bg-surface)

/* Border colors */
border-white/10      → border-color: var(--color-border-default)
border-white/20      → border-color: var(--color-border-emphasis)
border-white/30      → border-color: var(--color-border-emphasis)
```

### 2. **Border Radius Migrations**
```css
rounded-sm     → border-radius: var(--radius-sm)   /* 6px */
rounded        → border-radius: var(--radius-md)   /* 8px */
rounded-md     → border-radius: var(--radius-md)   /* 8px */
rounded-lg     → border-radius: var(--radius-lg)   /* 12px */
rounded-xl     → border-radius: var(--radius-xl)   /* 16px */
rounded-full   → border-radius: var(--radius-full)
```

### 3. **Typography Migrations**
```css
text-xs        → font-size: var(--text-caption)      /* 0.75rem */
text-sm        → font-size: var(--text-body-sm)      /* 0.875rem */
text-base      → font-size: var(--text-body)         /* 1rem */
text-lg        → font-size: var(--text-body-lg)      /* 1.125rem */
text-xl        → font-size: var(--text-h3)           /* clamp() */
text-2xl       → font-size: var(--text-h2)           /* clamp() */
text-4xl       → font-size: var(--text-h1)           /* clamp() */
```

### 4. **Spacing Migrations**
```css
/* Use Canon golden ratio tokens in <style> */
p-6       → padding: var(--space-lg)     /* 2.618rem */
gap-4     → gap: var(--space-sm)         /* 1rem */
space-y-8 → gap: var(--space-md)         /* 1.618rem in flex-col */
mb-8      → margin-bottom: var(--space-md)
```

### 5. **Interactive States**
```css
/* Always include transitions */
transition: all var(--duration-micro) var(--ease-standard);

/* Hover states */
hover:bg-white/10    → background: var(--color-hover)
hover:text-white     → color: var(--color-fg-primary)

/* Focus states */
focus:border-white/30 → border-color: var(--color-border-emphasis)
focus:outline-none    → outline: none
```

---

## 📐 Component Pattern Examples

### Button Pattern
```svelte
<!-- Template -->
<button class="primary-button">Click Me</button>

<!-- Style -->
<style>
  .primary-button {
    padding: var(--space-sm) var(--space-md);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-body-sm);
    font-weight: 500;
    cursor: pointer;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .primary-button:hover {
    opacity: 0.9;
  }

  .primary-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

### Card Pattern
```svelte
<!-- Template -->
<div class="card">
  <h3 class="card-title">Title</h3>
  <p class="card-text">Content</p>
</div>

<!-- Style -->
<style>
  .card {
    padding: var(--space-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .card:hover {
    border-color: var(--color-border-emphasis);
  }

  .card-title {
    font-size: var(--text-h3);
    font-weight: 600;
    color: var(--color-fg-primary);
    margin-bottom: var(--space-xs);
  }

  .card-text {
    color: var(--color-fg-tertiary);
    line-height: 1.7;
  }
</style>
```

### Form Input Pattern
```svelte
<!-- Template -->
<input type="text" class="form-input" placeholder="Enter text" />

<!-- Style -->
<style>
  .form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    color: var(--color-fg-primary);
    font-size: var(--text-body);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .form-input::placeholder {
    color: var(--color-fg-muted);
  }

  .form-input:focus {
    outline: none;
    border-color: var(--color-border-emphasis);
  }
</style>
```

---

## 🎨 Canon Token Reference

### Complete Color System
```css
/* Foreground (Text) Colors */
--color-fg-primary:   #ffffff          /* 100% white */
--color-fg-secondary: rgba(255,255,255,0.8)  /* 80% */
--color-fg-tertiary:  rgba(255,255,255,0.6)  /* 60% */
--color-fg-muted:     rgba(255,255,255,0.4)  /* 40% */
--color-fg-subtle:    rgba(255,255,255,0.2)  /* 20% */

/* Background Colors */
--color-bg-pure:      #000000          /* Pure black */
--color-bg-elevated:  #0a0a0a          /* Slightly elevated */
--color-bg-surface:   #111111          /* Surface level */
--color-bg-subtle:    #1a1a1a          /* Subtle surface */

/* Border Colors */
--color-border-default:  rgba(255,255,255,0.1)  /* 10% */
--color-border-emphasis: rgba(255,255,255,0.2)  /* 20% */

/* Interactive States */
--color-hover:  rgba(255,255,255,0.05)  /* 5% */
--color-active: rgba(255,255,255,0.1)   /* 10% */
```

### Spacing (Golden Ratio φ = 1.618)
```css
--space-xs:  0.5rem     /* 8px */
--space-sm:  1rem       /* 16px */
--space-md:  1.618rem   /* ~26px */
--space-lg:  2.618rem   /* ~42px */
--space-xl:  4.236rem   /* ~68px */
--space-2xl: 6.854rem   /* ~110px */
```

### Typography
```css
/* Responsive headings using clamp() */
--text-display-xl: clamp(3.5rem, 5vw + 2rem, 7rem)
--text-display:    clamp(2.5rem, 4vw + 1.5rem, 5rem)
--text-h1:         clamp(2rem, 3vw + 1rem, 3.5rem)
--text-h2:         clamp(1.5rem, 2vw + 0.75rem, 2.25rem)
--text-h3:         clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem)

/* Body text */
--text-body-lg: 1.125rem   /* 18px */
--text-body:    1rem       /* 16px */
--text-body-sm: 0.875rem   /* 14px */
--text-caption: 0.75rem    /* 12px */
```

### Border Radius
```css
--radius-sm:   6px
--radius-md:   8px
--radius-lg:   12px
--radius-xl:   16px
--radius-full: 9999px
```

### Animation
```css
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)
--duration-micro:   200ms
--duration-standard: 300ms
--duration-complex:  500ms
```

---

## ⚡ Performance Notes

### Benefits of Canon Migration
1. **Reduced CSS bundle size** - Fewer utility classes, more semantic CSS
2. **Better runtime performance** - CSS variables are more performant than computed utilities
3. **Improved maintainability** - Centralized design tokens
4. **Easier theming** - Can switch themes by changing CSS variable values
5. **Better semantics** - Meaningful class names improve code readability

### Layout Utilities Retained
The following Tailwind utilities are **kept** because they handle layout (not design):
- `flex`, `grid`, `inline-flex`, `inline-grid`
- `flex-col`, `flex-row`, `flex-wrap`, `items-*`, `justify-*`
- `w-*`, `h-*`, `min-w-*`, `min-h-*`, `max-w-*`, `max-h-*`
- `p-*`, `m-*`, `px-*`, `py-*`, `pt-*`, `pb-*`, `pl-*`, `pr-*`
- `gap-*`, `space-x-*`, `space-y-*`
- `relative`, `absolute`, `fixed`, `sticky`
- `top-*`, `right-*`, `bottom-*`, `left-*`
- `z-*`, `order-*`
- `overflow-*`, `col-*`, `row-*`
- `hidden`, `block`, `inline`

---

## 📊 Migration Statistics

### Completed
- **Files migrated**: 3
- **Violations fixed**: ~60+
- **Semantic classes created**: ~30+
- **Time invested**: ~2 hours

### Remaining
- **Files to migrate**: 9
- **Estimated violations**: ~165+
- **Estimated time**: 4-6 hours

### Total Project
- **Total files**: 12
- **Completion**: 25%
- **Pattern established**: ✅ Yes

---

## 🚀 Next Steps

### Immediate Priority
1. Complete `methodology/+page.svelte` (largest file, most violations)
2. Complete `experiments/motion-ontology/+page.svelte` (complex interactive elements)
3. Complete `experiments/minimal-capture/+page.svelte`

### Quick Wins
4. Complete `contact/+page.svelte`
5. Complete `categories/+page.svelte`
6. Complete `terms/+page.svelte` and `privacy/+page.svelte` (similar patterns)

### Verification
7. Verify `praxis/+page.svelte` (should already be compliant)
8. Verify `category/[slug]/+page.svelte` (minimal violations)

### Final Steps
9. Run full codebase audit with Canon hook
10. Update documentation
11. Create before/after screenshots for design review

---

## ✅ Quality Checklist

For each migration, ensure:
- [ ] All `text-{color}` replaced with Canon tokens
- [ ] All `bg-{color}` replaced with Canon tokens
- [ ] All `border-{color}` replaced with Canon tokens
- [ ] All `rounded-*` replaced with Canon tokens
- [ ] All `text-{size}` replaced with Canon tokens
- [ ] Layout utilities (`flex`, `grid`, `p-*`, etc.) retained
- [ ] Semantic class names used
- [ ] Hover states use Canon tokens
- [ ] Focus states use Canon tokens
- [ ] Transitions use Canon timing functions
- [ ] Visual appearance matches original

---

**Migration Lead**: Claude Code
**Date Completed**: 2025-12-03
**Status**: In Progress (25% complete)
