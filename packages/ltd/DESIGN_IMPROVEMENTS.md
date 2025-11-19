# Design Improvements for createsomething.ltd
## "Less, But Better" - Refined

### Current Score: 62/100 → Target: 88/100

---

## Critical Changes

### 1. Typography Scale (PRIORITY 1)

**Problem**: H1 too small, weak hierarchy
**Solution**: Rams-caliber sizing with optical precision

```css
/* src/app.css - Replace existing typography */

h1 {
  font-size: clamp(3.5rem, 9vw, 7rem); /* 56px → 112px */
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.025em;
  max-width: 20ch;
}

h2 {
  font-size: clamp(2rem, 5vw, 3.5rem); /* 32px → 56px */
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

h3 {
  font-size: clamp(1.5rem, 3vw, 2.25rem); /* 24px → 36px */
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.015em;
}

h4 {
  font-size: clamp(1.25rem, 2.5vw, 1.75rem); /* 20px → 28px */
  font-weight: 600;
  line-height: 1.3;
}

p {
  font-size: clamp(1rem, 1.5vw, 1.25rem); /* 16px → 20px */
  line-height: 1.6;
  letter-spacing: -0.01em;
}

/* Small text refinement */
.text-sm {
  letter-spacing: 0.005em;
}
```

---

### 2. Remove Grey Sections (PRIORITY 1)

**Problem**: Arbitrary backgrounds break visual flow
**Solution**: Pure black with border separation

**Files to Update**:
- `src/routes/+page.svelte`
- `src/routes/ethos/+page.svelte`
- `src/routes/masters/[slug]/+page.svelte`

**Find & Replace**:
```
REMOVE: bg-grey-100
REPLACE WITH: (nothing - pure black)
```

**Adjust borders**:
```
REPLACE: border-grey-200
WITH: border-white/10
```

---

### 3. Spacing System (PRIORITY 2)

**Problem**: Even spacing feels mechanical
**Solution**: Golden ratio spacing

```css
/* src/app.css - Add spacing system */

:root {
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 1.618rem;
  --space-lg: 2.618rem;
  --space-xl: 4.236rem;
  --space-2xl: 6.854rem;
  --space-3xl: 11.089rem;
}

/* Section spacing */
section {
  padding-top: var(--space-2xl);
  padding-bottom: var(--space-2xl);
}

.hero {
  padding-top: var(--space-3xl);
  padding-bottom: var(--space-2xl);
}

/* Content spacing */
h2 + p {
  margin-top: var(--space-lg);
}

p + p {
  margin-top: var(--space-md);
}
```

---

### 4. Micro-interactions (PRIORITY 2)

**Problem**: Static, lacks polish
**Solution**: Subtle, purposeful transitions

```css
/* src/app.css - Add refined interactions */

/* Links */
a {
  transition: opacity 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
}

a:hover {
  opacity: 0.7;
}

/* Buttons */
.button-primary {
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.button-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15);
}

.button-secondary {
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.button-secondary:hover {
  background: white;
  color: black;
  border-color: white;
}

/* Cards */
.card {
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.card:hover {
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateX(2px);
}
```

---

### 5. Typography Rendering (PRIORITY 3)

**Problem**: Not optically optimized
**Solution**: Premium font rendering

```css
/* src/app.css - Enhance font rendering */

body {
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
}

h1, h2, h3, h4 {
  font-feature-settings: "kern" 1, "liga" 1, "calt" 1, "ss01" 1;
}
```

---

## Component Updates

### MasterCard.svelte

```svelte
<a
  href="/masters/{master.slug}"
  class="block border border-white/10 hover:border-white/40 transition-all duration-300 ease-out group"
>
  <div class="p-8 transition-transform duration-300 group-hover:translate-x-1">
    {#if master.discipline}
      <p class="text-xs uppercase tracking-widest opacity-40 mb-2">
        {master.discipline}
      </p>
    {/if}
    <h3 class="text-2xl font-bold mb-2 transition-opacity duration-300 group-hover:opacity-70">
      {master.name}
    </h3>
    {#if master.birth_year}
      <p class="text-sm opacity-40 mt-1">
        {master.birth_year}{#if master.death_year} — {master.death_year}{:else} — Present{/if}
      </p>
    {/if}
    {#if master.tagline}
      <p class="text-sm opacity-60 mt-4">{master.tagline}</p>
    {/if}
  </div>
</a>
```

### Button Styles

```svelte
<!-- Primary CTA -->
<a
  href="/masters"
  class="inline-block px-10 py-4 bg-white text-black font-medium tracking-tight hover:bg-white/90 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 hover:-translate-y-0.5"
>
  Explore Masters
</a>

<!-- Secondary CTA -->
<a
  href="/ethos"
  class="inline-block px-10 py-4 border border-white/20 text-white font-medium tracking-tight hover:bg-white hover:text-black hover:border-white transition-all duration-300"
>
  Read Our Ethos
</a>
```

---

## Implementation Order

### Day 1 Morning (2 hours)
1. ✅ Update typography scale in `app.css`
2. ✅ Remove all `bg-grey-100` instances
3. ✅ Update border colors to `border-white/10`

### Day 1 Afternoon (2 hours)
4. ✅ Implement spacing system
5. ✅ Update CTA button styles
6. ✅ Test responsive behavior

### Day 2 Morning (3 hours)
7. ✅ Add micro-interactions to all components
8. ✅ Refine typography rendering
9. ✅ Polish hover states

### Day 2 Afternoon (1 hour)
10. ✅ Final QA across all pages
11. ✅ Deploy to Pages

---

## Expected Outcome

**Before**: 62/100 (Competent)
- Small typography
- Arbitrary grey sections
- Static, unpolished

**After**: 88/100 (Award-Worthy)
- Commanding typography
- Pure, focused black canvas
- Refined micro-interactions
- Premium feel, true to "less, but better"

---

## Rams Principles Addressed

1. ✅ **Good design is aesthetic** - Premium typography and spacing
2. ✅ **Good design is unobtrusive** - Removed arbitrary backgrounds
3. ✅ **Good design is thorough** - Micro-interaction polish
4. ✅ **As little design as possible** - Pure black, no decoration

**Total effort**: 2 days
**Impact**: Transforms from "nice" to "iconic"
