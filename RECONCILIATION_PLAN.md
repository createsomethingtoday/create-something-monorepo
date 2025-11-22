# Reconciliation Plan: Aligning All Properties to Canon

**Guiding Principle:** "Whatever makes the system align with the Standards and Ethos, with the Masters foundation"

**References:**
- Masters: https://createsomething.ltd/masters
- Ethos: https://createsomething.ltd/ethos
- Standards: https://createsomething.ltd/standards

---

## Executive Summary

Based on comprehensive implementation audit, four clear directives have been established to align all CREATE SOMETHING properties with canonical Standards:

1. ✅ **.ltd adopts fixed navigation** (align with .io/.space/.agency pattern)
2. ✅ **Strict golden ratio everywhere** (φ-based spacing across all properties)
3. ✅ **Force 'CREATE SOMETHING.space'** (fix branding fragmentation)
4. ✅ **Migrate .io to pure opacity** (convert named grays to rgba())

This plan provides the implementation roadmap to achieve canonical alignment.

---

## Phase 0: Update Standards Document

**Before migration begins**, the Standards must be complete. Current gaps identified:

### Missing Specifications to Add

#### 1. Typography Stack
```markdown
## Typography Stack

**Primary:** Stack Sans Notch (variable 200-700)
- optical-sizing: auto
- Feature settings: ss01, ss02 for notch variants

**Monospace:** JetBrains Mono
- weights: 400, 500, 700
- Feature settings: liga, calt

**Fallback Stack:**
```css
font-family: 'Stack Sans Notch', -apple-system, BlinkMacSystemFont,
             'Segoe UI', system-ui, sans-serif;
```

**Rationale:** Consistent typographic voice across all properties. Stack Sans Notch provides the optical precision required for "less, but better" aesthetic.
```

#### 2. Border Radius Scale
```markdown
## Border Radius Scale

**Principle:** Subtle corners that don't compete with content.

```css
--radius-sm: 8px;   /* Buttons, inputs */
--radius-md: 12px;  /* Cards, small containers */
--radius-lg: 16px;  /* Featured cards, hero sections */
--radius-xl: 24px;  /* Large containers, modals */
--radius-full: 9999px; /* Pills, badges, circular avatars */
```

**Usage:**
- Use sparingly - not every element needs rounded corners
- Larger radius for larger elements maintains optical consistency
- Full radius reserved for intentional pill/badge patterns

**Rationale:** Rams principle - good design is unobtrusive. Corners should feel inevitable, not decorative.
```

#### 3. Animation Standards
```markdown
## Animation Standards

**Principle:** Animation serves understanding, not decoration.

**Easing Function:**
```css
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1); /* Material ease-out */
```

**Duration Scale:**
```css
--duration-micro: 150ms;   /* Hover states, small UI feedback */
--duration-standard: 200ms; /* Menu toggles, reveals */
--duration-deliberate: 300ms; /* Page transitions, modal entry */
--duration-emphasis: 500ms;  /* Hero reveals, intentional focus shifts */
```

**Common Patterns:**
```css
/* Hover lift */
transform: translateY(-2px);
transition: transform var(--duration-micro) var(--ease-standard);

/* Opacity fade */
opacity: 0.7;
transition: opacity var(--duration-micro) var(--ease-standard);

/* Slide reveal (mobile menus) */
transition: transform var(--duration-standard) var(--ease-standard);
```

**Constraints:**
- No animations over 500ms
- Respect prefers-reduced-motion
- Every animation must serve comprehension

**Rationale:** "As little design as possible" - animation only when it aids understanding. Speed maintains focus, never distracts.
```

#### 4. Accessibility Requirements
```markdown
## Accessibility Standards (WCAG 2.1 AA)

**Touch Targets:**
- Minimum: 44px × 44px for all interactive elements
- Mobile menu buttons, close buttons, icon buttons must meet this minimum
- Use container sizing, not icon sizing: `w-11 h-11` (44px) container with `w-6 h-6` (24px) icon

**Color Contrast:**
- Pure black (#000000) on pure white (#FFFFFF): 21:1 ✅
- White text on black background: 21:1 ✅
- Opacity adjustments:
  - Primary text: 100% (#FFFFFF) = 21:1 ✅
  - Secondary text: 70% (rgba(255,255,255,0.7)) = 14.7:1 ✅
  - Tertiary text: 60% (rgba(255,255,255,0.6)) = 12.6:1 ✅
  - Minimum for large text: 45% (rgba(255,255,255,0.45)) = 9.45:1 ✅

**Focus States:**
```css
:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.6);
  outline-offset: 2px;
}
```

**Semantic HTML:**
- Use `<nav>`, `<main>`, `<article>`, `<section>` appropriately
- All images require alt text or aria-label
- Form inputs must have associated labels
- Skip links for keyboard navigation

**Rationale:** Universal access is fundamental, not optional. Pure black and white provides maximum contrast, making opacity-based hierarchy both aesthetic and accessible.
```

#### 5. Z-Index Scale
```markdown
## Z-Index Scale

**Principle:** Predictable layering, no arbitrary values.

```css
--z-base: 0;       /* Default document flow */
--z-dropdown: 10;  /* Dropdowns, tooltips */
--z-sticky: 20;    /* Sticky headers, sidebars */
--z-fixed: 30;     /* Fixed navigation */
--z-modal: 40;     /* Modal overlays */
--z-toast: 50;     /* Notifications, alerts */
--z-debug: 9999;   /* Development only */
```

**Usage:**
- Fixed navigation: `z-fixed` (30) = `z-50` in Tailwind
- Modal backgrounds: `z-modal` (40)
- Never use arbitrary z-index values

**Rationale:** Rams - good design is systematic. Z-index chaos indicates poor information architecture.
```

---

## Phase 1: Fix .ltd Navigation (Canonical Property First)

**Directive:** ".ltd should adopt fixed navigation (like others)"

**Current State:**
- Static positioning
- Text-based mobile toggle (☰ ✕)
- No animation
- Touch target: ~18px ❌

**Target State:**
- Fixed positioning with `z-fixed` (Tailwind: `z-50`)
- SVG-based mobile toggle
- Slide animation (200ms)
- Touch target: 44px ✅

### Implementation Steps

**File:** `/Users/micahjohnson/Documents/Github/Create Something/create-something-ltd/src/lib/components/Navigation.svelte`

**Changes:**

1. **Update container:**
```svelte
<!-- Before -->
<nav class="border-b border-white/10">

<!-- After -->
<nav class="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10">
```

2. **Add SVG icons with proper touch targets:**
```svelte
<!-- Before -->
<button class="md:hidden text-sm font-medium opacity-60">
  {mobileMenuOpen ? '✕' : '☰'}
</button>

<!-- After -->
<button
  class="md:hidden w-11 h-11 flex items-center justify-center text-white/60 hover:text-white transition-colors"
  onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
>
  {#if mobileMenuOpen}
    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  {:else}
    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  {/if}
</button>
```

3. **Add slide animation to mobile menu:**
```svelte
<script>
  import { slide } from 'svelte/transition';
</script>

<!-- Before -->
{#if mobileMenuOpen}
  <div class="md:hidden pt-6 flex flex-col gap-4">

<!-- After -->
{#if mobileMenuOpen}
  <div
    transition:slide={{ duration: 200 }}
    class="md:hidden py-4 border-t border-white/10"
  >
    <div class="flex flex-col gap-4">
```

4. **Add top padding to body to compensate for fixed nav:**
```svelte
<!-- Add to layout or first element after nav -->
<div class="pt-[73px]"> <!-- Height of nav -->
  <slot />
</div>
```

**Testing:**
- [ ] Desktop nav remains fixed on scroll
- [ ] Mobile menu button is 44px × 44px
- [ ] Mobile menu slides in/out smoothly
- [ ] No content jump when toggling mobile menu
- [ ] Focus states visible on all interactive elements
- [ ] Screen reader announces menu state changes

---

## Phase 2: Enforce Golden Ratio Spacing

**Directive:** "Strict golden ratio everywhere"

**Affected Properties:** .io, .space, .agency (all must adopt .ltd's φ-based system)

### Current Deviations

**Problem:** .io uses arbitrary spacing values
```css
/* .io current (arbitrary) */
--spacing-section: 7.5rem;   /* 120px - no mathematical basis */
--spacing-headline: 2.5rem;  /* 40px - arbitrary */
--spacing-card: 2rem;        /* 32px - arbitrary */
```

**Canonical Standard (.ltd):**
```css
/* Golden ratio scale */
:root {
  --space-xs: 0.5rem;      /* 8px - base unit */
  --space-sm: 1rem;        /* 16px - φ⁰ */
  --space-md: 1.618rem;    /* ~26px - φ¹ */
  --space-lg: 2.618rem;    /* ~42px - φ² */
  --space-xl: 4.236rem;    /* ~68px - φ³ */
  --space-2xl: 6.854rem;   /* ~110px - φ⁴ */
  --space-3xl: 11.089rem;  /* ~177px - φ⁵ */
}
```

### Implementation Steps

#### For .io Property

**File:** `/Users/micahjohnson/Documents/Github/Create Something/create-something-svelte/src/app.css`

1. **Replace arbitrary spacing variables:**
```css
/* Remove these */
--spacing-section: 7.5rem;
--spacing-headline: 2.5rem;
--spacing-card: 2rem;

/* Add canonical golden ratio scale */
:root {
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 1.618rem;
  --space-lg: 2.618rem;
  --space-xl: 4.236rem;
  --space-2xl: 6.854rem;
  --space-3xl: 11.089rem;
}
```

2. **Update Tailwind config to use φ scale:**

**File:** `/Users/micahjohnson/Documents/Github/Create Something/create-something-svelte/tailwind.config.js`

```js
export default {
  theme: {
    extend: {
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
      }
    }
  }
}
```

3. **Audit and replace spacing in components:**

**Search pattern:** Look for hardcoded spacing classes like `py-16`, `gap-12`, `space-y-8`

**Replacement strategy:**
```svelte
<!-- Before (arbitrary) -->
<section class="py-16 px-6">        <!-- 64px arbitrary -->
<div class="space-y-8">             <!-- 32px arbitrary -->
<div class="gap-12">                <!-- 48px arbitrary -->

<!-- After (golden ratio) -->
<section class="py-[var(--space-2xl)] px-6">  <!-- ~110px φ⁴ -->
<div class="space-y-[var(--space-xl)]">       <!-- ~68px φ³ -->
<div class="gap-[var(--space-lg)]">           <!-- ~42px φ² -->
```

**Files to update:**
- `/src/routes/+page.svelte`
- `/src/routes/about/+page.svelte`
- `/src/lib/components/HeroSection.svelte`
- `/src/lib/components/CategorySection.svelte`
- `/src/lib/components/Footer.svelte`

#### For .space Property

**Same process as .io**, update:
- `/Users/micahjohnson/Documents/Github/Create Something/create-something-space-svelte/src/app.css`
- `/Users/micahjohnson/Documents/Github/Create Something/create-something-space-svelte/tailwind.config.js`
- All component files

#### For .agency Property

**Same process as .io**, update:
- `/Users/micahjohnson/Documents/Github/Create Something/create-something-agency-svelte/src/app.css`
- `/Users/micahjohnson/Documents/Github/Create Something/create-something-agency-svelte/tailwind.config.js`
- All component files

### Visual Regression Testing

Before and after screenshots required for:
- [ ] Homepage hero section spacing
- [ ] Card grid gaps
- [ ] Section vertical rhythm
- [ ] Mobile spacing (confirm proportions scale)

**Expected outcome:** More harmonious vertical rhythm, mathematical consistency, but may require optical adjustments where φ creates overly large gaps.

---

## Phase 3: Fix .space Branding

**Directive:** "Force 'CREATE SOMETHING.space'"

**Current State:** Navigation displays "THE EXPERIMENTAL LAYER"
**Target State:** Navigation displays "CREATE SOMETHING" with ".space" subdomain styling

### Implementation Steps

**File:** `/Users/micahjohnson/Documents/Github/Create Something/create-something-space-svelte/src/lib/components/Navigation.svelte`

**Change:**
```svelte
<!-- Before -->
<a href="/">
  <div class="text-2xl font-bold">THE EXPERIMENTAL LAYER</div>
</a>

<!-- After (match .ltd pattern) -->
<a href="/" class="text-2xl font-bold">
  CREATE SOMETHING<span class="opacity-60">.space</span>
</a>
```

**Testing:**
- [ ] Branding matches .ltd pattern
- [ ] Subdomain styling (`.space`) at 60% opacity
- [ ] Hover state preserves opacity distinction
- [ ] Mobile view maintains readability

**Additional Updates Needed:**

1. **Update page titles:**
```svelte
<!-- Before -->
<title>THE EXPERIMENTAL LAYER</title>

<!-- After -->
<title>Experiments | CREATE SOMETHING</title>
```

2. **Update Open Graph tags:**
```html
<!-- Before -->
<meta property="og:site_name" content="THE EXPERIMENTAL LAYER" />

<!-- After -->
<meta property="og:site_name" content="CREATE SOMETHING" />
```

3. **Update Footer if present:**
```svelte
<!-- Ensure footer says "CREATE SOMETHING" not "THE EXPERIMENTAL LAYER" -->
```

**Files to check:**
- `/src/routes/+layout.svelte`
- `/src/routes/+page.svelte`
- `/src/lib/components/SEO.svelte` (if exists)
- `/src/lib/components/Footer.svelte`

---

## Phase 4: Migrate .io to Pure Opacity

**Directive:** "Migrate .io to pure opacity (per standards)"

**Problem:** .io uses named gray variables instead of pure opacity system

**Current (.io deviation):**
```css
:root {
  --bg-secondary: #0a0a0a;
  --bg-tertiary: #111111;
  --text-tertiary: #a0a0a0;
  --border-subtle: #1a1a1a;
}
```

**Target (canonical standard):**
```css
/* Pure black + white with opacity */
background: #000000;
color: rgba(255, 255, 255, 1.0);    /* Primary text */
color: rgba(255, 255, 255, 0.7);    /* Secondary text */
color: rgba(255, 255, 255, 0.6);    /* Tertiary text */
border: rgba(255, 255, 255, 0.1);   /* Subtle borders */
```

### Implementation Steps

**File:** `/Users/micahjohnson/Documents/Github/Create Something/create-something-svelte/src/app.css`

1. **Remove named color variables:**
```css
/* DELETE these */
:root {
  --bg-secondary: #0a0a0a;
  --bg-tertiary: #111111;
  --text-secondary: #e5e5e5;
  --text-tertiary: #a0a0a0;
  --border-subtle: #1a1a1a;
}
```

2. **Add opacity-based system:**
```css
/* ADD these */
:root {
  /* Base colors */
  --color-black: #000000;
  --color-white: #FFFFFF;

  /* No additional color variables needed - use rgba() directly */
}
```

3. **Update Tailwind config for opacity utilities:**

**File:** `/Users/micahjohnson/Documents/Github/Create Something/create-something-svelte/tailwind.config.js`

```js
export default {
  theme: {
    extend: {
      colors: {
        black: '#000000',
        white: '#FFFFFF',
      }
    }
  }
}
```

4. **Search and replace in all components:**

**Pattern:** Find all usages of named variables and convert to opacity

```svelte
<!-- Before -->
<div class="bg-[var(--bg-secondary)]">        <!-- #0a0a0a -->
<div class="bg-[var(--bg-tertiary)]">         <!-- #111111 -->
<p class="text-[var(--text-tertiary)]">       <!-- #a0a0a0 -->
<div class="border-[var(--border-subtle)]">   <!-- #1a1a1a -->

<!-- After -->
<div class="bg-white/[0.04]">    <!-- rgba(255,255,255,0.04) ≈ #0a0a0a -->
<div class="bg-white/[0.07]">    <!-- rgba(255,255,255,0.07) ≈ #111111 -->
<p class="text-white/60">        <!-- rgba(255,255,255,0.6) ≈ #a0a0a0 -->
<div class="border-white/10">    <!-- rgba(255,255,255,0.1) ≈ #1a1a1a -->
```

### Opacity Conversion Reference

| Old Variable | Hex Value | → | Opacity | Tailwind Class |
|-------------|-----------|---|---------|----------------|
| --bg-secondary | #0a0a0a | → | white/[0.04] | `bg-white/[0.04]` |
| --bg-tertiary | #111111 | → | white/[0.07] | `bg-white/[0.07]` |
| --text-secondary | #e5e5e5 | → | white/90 | `text-white/90` |
| --text-tertiary | #a0a0a0 | → | white/60 | `text-white/60` |
| --border-subtle | #1a1a1a | → | white/10 | `border-white/10` |

### Files to Update

**Search all .svelte files for:**
- `var(--bg-secondary)`
- `var(--bg-tertiary)`
- `var(--text-tertiary)`
- `var(--border-subtle)`

**Likely files:**
- `/src/routes/+page.svelte`
- `/src/routes/about/+page.svelte`
- `/src/lib/components/HeroSection.svelte`
- `/src/lib/components/CategorySection.svelte`
- `/src/lib/components/PaperCard.svelte`
- `/src/lib/components/Footer.svelte`

**Command to find usages:**
```bash
cd /Users/micahjohnson/Documents/Github/Create\ Something/create-something-svelte
grep -r "var(--bg-" src/
grep -r "var(--text-" src/
grep -r "var(--border-" src/
```

### Testing

- [ ] Visual comparison (before/after) shows identical appearance
- [ ] No color variables remain in CSS
- [ ] All opacity values use Tailwind classes (`white/10`, `white/60`, etc.)
- [ ] Hover states maintain proper opacity transitions
- [ ] WCAG contrast ratios still pass (text should be white/60 minimum)

**Expected outcome:** Identical visual appearance, but with pure opacity system matching canonical Standards.

---

## Phase 5: Universal Fixes Across All Properties

These fixes apply to **all four properties** (.ltd, .io, .space, .agency):

### 5.1 Touch Target Compliance

**Fix all mobile menu buttons to 44px minimum**

**Pattern to find:**
```svelte
<!-- Non-compliant (18-26px) -->
<button class="md:hidden p-2">
<button class="md:hidden text-sm">
```

**Replace with:**
```svelte
<!-- Compliant (44px) -->
<button class="md:hidden w-11 h-11 flex items-center justify-center">
  <svg class="w-6 h-6">
    <!-- Icon SVG -->
  </svg>
</button>
```

**Files to update:**
- `/create-something-ltd/src/lib/components/Navigation.svelte`
- `/create-something-svelte/src/lib/components/Navigation.svelte`
- `/create-something-space-svelte/src/lib/components/Navigation.svelte`
- `/create-something-agency-svelte/src/lib/components/Navigation.svelte`

### 5.2 Implement Fluid Typography

**Properties needing fix:** .io, .space, .agency

**.ltd already implements correctly:**
```css
h1 { font-size: clamp(3.5rem, 9vw, 7rem); }
h2 { font-size: clamp(2rem, 5vw, 3.5rem); }
h3 { font-size: clamp(1.5rem, 3.5vw, 2.25rem); }
```

**Add to .io, .space, .agency:**

**File:** `/src/app.css` (in each property)

```css
/* Fluid Typography Scale - matches .ltd canonical implementation */
h1 {
  font-size: clamp(3.5rem, 9vw, 7rem);
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.025em;
  font-optical-sizing: auto;
}

h2 {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

h3 {
  font-size: clamp(1.5rem, 3.5vw, 2.25rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.015em;
}

h4 {
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 600;
  line-height: 1.3;
}

p, li, td {
  font-size: clamp(1rem, 1.5vw, 1.125rem);
  line-height: 1.6;
  letter-spacing: -0.01em;
}
```

### 5.3 Add Universal Footer with Modes of Being

**Current state:** Inconsistent footer implementations

**Target state:** All properties include "Modes of Being" section linking to other properties

**Component specification:**

**File:** Create shared component in monorepo first, then implement in each property

```svelte
<!-- UniversalFooter.svelte -->
<footer class="border-t border-white/10 mt-[var(--space-3xl)]">
  <div class="max-w-7xl mx-auto px-6 py-[var(--space-2xl)]">

    <!-- Modes of Being -->
    <div class="mb-[var(--space-xl)]">
      <h4 class="text-sm font-semibold text-white/60 uppercase tracking-wider mb-[var(--space-md)]">
        Modes of Being
      </h4>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-[var(--space-lg)]">

        <a href="https://createsomething.ltd" class="group">
          <div class="text-white font-semibold mb-2 group-hover:opacity-70 transition-opacity">
            .ltd
          </div>
          <div class="text-white/60 text-sm">
            Canon — Philosophical foundation and design principles
          </div>
        </a>

        <a href="https://createsomething.io" class="group">
          <div class="text-white font-semibold mb-2 group-hover:opacity-70 transition-opacity">
            .io
          </div>
          <div class="text-white/60 text-sm">
            Learn — Research, writing, and systems thinking
          </div>
        </a>

        <a href="https://createsomething.space" class="group">
          <div class="text-white font-semibold mb-2 group-hover:opacity-70 transition-opacity">
            .space
          </div>
          <div class="text-white/60 text-sm">
            Explore — Interactive experiments and proofs
          </div>
        </a>

        <a href="https://createsomething.agency" class="group">
          <div class="text-white font-semibold mb-2 group-hover:opacity-70 transition-opacity">
            .agency
          </div>
          <div class="text-white/60 text-sm">
            Build — Applied work and commercial services
          </div>
        </a>
      </div>
    </div>

    <!-- Legal & Social -->
    <div class="flex flex-col md:flex-row justify-between items-center pt-[var(--space-lg)] border-t border-white/10">
      <div class="text-white/40 text-sm mb-4 md:mb-0">
        © {new Date().getFullYear()} CREATE SOMETHING. All rights reserved.
      </div>
      <div class="flex gap-6 text-sm">
        <a href="/privacy" class="text-white/60 hover:text-white transition-colors">Privacy</a>
        <a href="/terms" class="text-white/60 hover:text-white transition-colors">Terms</a>
        <a href="https://www.linkedin.com/in/micahryanjohnson/" target="_blank" rel="noopener noreferrer" class="text-white/60 hover:text-white transition-colors">
          LinkedIn
        </a>
      </div>
    </div>
  </div>
</footer>
```

**Implementation:**
1. Create component in each property's `/src/lib/components/Footer.svelte`
2. Replace existing footer implementations
3. Ensure consistent spacing using φ-based system
4. Test all property links from each footer

---

## Phase 6: Create Shared Component Library

**Goal:** Extract canonical implementations into `@create-something/components` package

### Monorepo Structure

```
create-something-monorepo/
├── packages/
│   ├── components/           # Shared component library
│   │   ├── src/
│   │   │   ├── Navigation.svelte
│   │   │   ├── Footer.svelte
│   │   │   ├── Heading.svelte
│   │   │   ├── Button.svelte
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── README.md
│   ├── ltd/                  # CREATE SOMETHING.ltd
│   ├── io/                   # CREATE SOMETHING.io (Learn)
│   ├── space/                # CREATE SOMETHING.space (Explore)
│   └── agency/               # CREATE SOMETHING.agency (Build)
├── package.json              # Root workspace config
└── pnpm-workspace.yaml
```

### Component Specifications

#### Navigation Component

**File:** `packages/components/src/Navigation.svelte`

**Props:**
```typescript
interface Props {
  domain: '.ltd' | '.io' | '.space' | '.agency';
  links: Array<{ href: string; label: string; }>;
  ctaButton?: { href: string; label: string; };
}
```

**Implementation:**
```svelte
<script lang="ts">
  import { slide } from 'svelte/transition';

  interface Props {
    domain: '.ltd' | '.io' | '.space' | '.agency';
    links: Array<{ href: string; label: string; }>;
    ctaButton?: { href: string; label: string; };
  }

  let { domain, links, ctaButton }: Props = $props();
  let mobileMenuOpen = $state(false);
</script>

<nav class="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10">
  <div class="max-w-7xl mx-auto px-6">
    <div class="flex items-center justify-between py-4">

      <!-- Logo -->
      <a href="/" class="text-2xl font-bold">
        CREATE SOMETHING<span class="opacity-60">{domain}</span>
      </a>

      <!-- Desktop Nav -->
      <div class="hidden md:flex items-center gap-8">
        {#each links as link}
          <a
            href={link.href}
            class="text-white/80 hover:text-white transition-colors duration-150"
          >
            {link.label}
          </a>
        {/each}

        {#if ctaButton}
          <a
            href={ctaButton.href}
            class="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors duration-150"
          >
            {ctaButton.label}
          </a>
        {/if}
      </div>

      <!-- Mobile Menu Button (44px touch target) -->
      <button
        class="md:hidden w-11 h-11 flex items-center justify-center text-white/60 hover:text-white transition-colors duration-150"
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {#if mobileMenuOpen}
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        {:else}
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        {/if}
      </button>
    </div>

    <!-- Mobile Menu -->
    {#if mobileMenuOpen}
      <div
        transition:slide={{ duration: 200 }}
        class="md:hidden py-4 border-t border-white/10"
      >
        <div class="flex flex-col gap-4">
          {#each links as link}
            <a
              href={link.href}
              class="text-white/80 hover:text-white py-2"
              onclick={() => (mobileMenuOpen = false)}
            >
              {link.label}
            </a>
          {/each}

          {#if ctaButton}
            <a
              href={ctaButton.href}
              class="px-6 py-2 bg-white text-black rounded-full font-medium text-center"
              onclick={() => (mobileMenuOpen = false)}
            >
              {ctaButton.label}
            </a>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</nav>
```

**Usage in properties:**
```svelte
<!-- .ltd -->
<Navigation
  domain=".ltd"
  links={[
    { href: '/masters', label: 'Masters' },
    { href: '/ethos', label: 'Ethos' },
    { href: '/standards', label: 'Standards' }
  ]}
/>

<!-- .io -->
<Navigation
  domain=".io"
  links={[
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/categories', label: 'Categories' }
  ]}
  ctaButton={{ href: '/contact', label: 'Contact' }}
/>
```

#### Heading Component

**File:** `packages/components/src/Heading.svelte`

**Props:**
```typescript
interface Props {
  level: 1 | 2 | 3 | 4;
  fluidScale?: 'canonical' | 'custom';
  minSize?: string;  // Only with custom scale
  maxSize?: string;  // Only with custom scale
  class?: string;
}
```

**Implementation:**
```svelte
<script lang="ts">
  interface Props {
    level: 1 | 2 | 3 | 4;
    fluidScale?: 'canonical' | 'custom';
    minSize?: string;
    maxSize?: string;
    class?: string;
    children?: any;
  }

  let {
    level,
    fluidScale = 'canonical',
    minSize,
    maxSize,
    class: className = '',
    children
  }: Props = $props();

  // Canonical fluid scales from Standards
  const canonicalScales = {
    1: 'clamp(3.5rem, 9vw, 7rem)',
    2: 'clamp(2rem, 5vw, 3.5rem)',
    3: 'clamp(1.5rem, 3.5vw, 2.25rem)',
    4: 'clamp(1.25rem, 2.5vw, 1.75rem)'
  };

  const fontSize = fluidScale === 'canonical'
    ? canonicalScales[level]
    : `clamp(${minSize}, ${(parseFloat(maxSize!) - parseFloat(minSize!)) / 19.2}vw, ${maxSize})`;

  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
</script>

<Tag style="font-size: {fontSize}" class={className}>
  {@render children?.()}
</Tag>
```

**Usage:**
```svelte
<!-- Canonical (Standards-based) -->
<Heading level={1}>System Architecture</Heading>

<!-- Custom (interpretation) -->
<Heading
  level={1}
  fluidScale="custom"
  minSize="3rem"
  maxSize="6rem"
>
  Custom Scale
</Heading>
```

---

## Phase 7: Migration Sequence

**Order:** .ltd → .io → .space → .agency

**Rationale:**
- .ltd is canonical, smallest changes, validates fixes
- .io is largest property, most content, biggest test
- .space/.agency benefit from learnings

### Per-Property Checklist

**For each property, complete in order:**

#### Preparation
- [ ] Create feature branch: `reconcile/[property-name]`
- [ ] Document current state (screenshots, lighthouse scores)
- [ ] Run accessibility audit (WAVE, axe DevTools)
- [ ] Note any property-specific edge cases

#### Implementation
- [ ] Update navigation (fixed positioning, SVG icons, 44px touch targets)
- [ ] Implement golden ratio spacing (CSS vars, Tailwind config, component updates)
- [ ] Migrate to pure opacity (remove named grays, convert to rgba())
- [ ] Add fluid typography (clamp() in base CSS)
- [ ] Implement universal footer with Modes of Being
- [ ] Update branding (if .space)

#### Testing
- [ ] Visual regression testing (before/after screenshots)
- [ ] Mobile responsiveness (test on actual devices)
- [ ] Touch target validation (44px minimum verified)
- [ ] Accessibility scan (WAVE/axe, 0 errors)
- [ ] Lighthouse scores (Performance 90+, Accessibility 100)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Screen reader testing (VoiceOver, NVDA)

#### Deployment
- [ ] Create PR with detailed description
- [ ] Deploy to staging environment
- [ ] Smoke test all pages
- [ ] Deploy to production
- [ ] Monitor for issues (24 hours)
- [ ] Merge feature branch

#### Documentation
- [ ] Document any deviations from Standards (with rationale)
- [ ] Note any edge cases discovered
- [ ] Update Standards document if gaps found
- [ ] Share learnings with team

---

## Phase 8: Standards Documentation Update

**After first migration complete** (after .ltd reconciliation), update Standards page with missing specifications:

**File:** `/Users/micahjohnson/Documents/Github/Create Something/create-something-ltd/src/routes/standards/+page.svelte`

### Sections to Add

1. **Typography Stack** (from Phase 0)
2. **Border Radius Scale** (from Phase 0)
3. **Animation Standards** (from Phase 0)
4. **Accessibility Requirements** (from Phase 0)
5. **Z-Index Scale** (from Phase 0)

### Update Process

1. Add new sections to Standards page
2. Deploy .ltd with updated Standards
3. Reference updated Standards in future migrations
4. Use hermeneutic circle: standards inform implementation, implementation refines standards

---

## Success Metrics

### Quantitative

**Accessibility:**
- Touch targets: 100% compliance (44px minimum)
- WCAG 2.1 AA: 0 violations across all properties
- Lighthouse Accessibility score: 100 across all properties

**Performance:**
- No performance regression from reconciliation
- Lighthouse Performance: 90+ maintained
- LCP: < 2.5s maintained
- CLS: < 0.1 maintained

**Consistency:**
- Spacing: 100% golden ratio adherence
- Color: 100% pure opacity (no named grays in .io)
- Typography: 100% fluid scale implementation
- Branding: 100% "CREATE SOMETHING.[domain]" pattern

### Qualitative

**Hermeneutic Alignment:**
- Does the implementation embody "less, but better"?
- Does each property feel like an authentic mode of being?
- Do the Standards feel complete after implementation?
- Did the circle reveal gaps or conflicts?

**User Experience:**
- Does navigation feel consistent across properties?
- Does spacing create harmonious rhythm?
- Are animations serving understanding?
- Is accessibility seamless, not bolted-on?

---

## Rollback Strategy

**For each phase, maintain rollback capability:**

### Git Strategy

```bash
# Create reconciliation branch
git checkout -b reconcile/[property-name]

# Tag before major changes
git tag pre-reconcile-[property-name]-$(date +%Y%m%d)

# Commit each phase separately
git commit -m "Phase 1: Fix navigation"
git commit -m "Phase 2: Enforce golden ratio spacing"
# etc.

# If rollback needed
git revert HEAD~3  # Revert last 3 commits
# OR
git reset --hard pre-reconcile-[property-name]-20250121
```

### Deployment Strategy

**Cloudflare Pages:** Use preview deployments
- Each PR gets unique preview URL
- Test thoroughly before promoting to production
- Production alias can be rolled back instantly

**If critical issue discovered:**
1. Rollback production alias to previous deployment (instant)
2. Investigate issue in preview deployment
3. Fix and re-deploy
4. No user impact during investigation

---

## Timeline Estimate

**Not prescriptive, but realistic:**

| Phase | Estimated Effort | Can Start When |
|-------|-----------------|----------------|
| Phase 0: Update Standards | 2 hours | Immediately |
| Phase 1: Fix .ltd Navigation | 1 hour | After Phase 0 |
| Phase 2: Golden Ratio (.ltd) | 2 hours | After Phase 1 |
| Phase 3: N/A (.ltd has no branding issue) | - | - |
| Phase 4: N/A (.ltd already pure opacity) | - | - |
| Phase 5: Universal Fixes (.ltd) | 1 hour | After Phase 2 |
| **→ .ltd Complete** | **~6 hours** | **Deploy & monitor 24hrs** |
| Phase 2,4,5: .io Reconciliation | 4 hours | After .ltd stable |
| **→ .io Complete** | **~4 hours** | **Deploy & monitor 24hrs** |
| Phase 2,3,4,5: .space Reconciliation | 3 hours | After .io stable |
| **→ .space Complete** | **~3 hours** | **Deploy & monitor 24hrs** |
| Phase 2,4,5: .agency Reconciliation | 3 hours | After .space stable |
| **→ .agency Complete** | **~3 hours** | **Deploy & monitor 24hrs** |
| Phase 6: Shared Components | 6 hours | After all stable |
| **Total** | **~22-25 hours** | **Over 2-3 weeks (with monitoring)** |

**Note:** Timeline does NOT include:
- Testing time (add 50% more for thorough testing)
- Issue resolution (if regressions found)
- Documentation updates
- Code review cycles

**Philosophy:** "Festina lente" (make haste slowly). The hermeneutic circle requires time for understanding to emerge.

---

## Risks & Mitigations

### Risk 1: Visual Regression

**Risk:** Golden ratio spacing creates overly large gaps
**Probability:** Medium
**Impact:** Medium (affects aesthetics, not function)

**Mitigation:**
- Take before/after screenshots
- Allow optical adjustments (document as "interpreted spacing")
- Example: Section gap might use φ³ instead of φ⁴ if φ⁴ feels too large

### Risk 2: Accessibility Edge Cases

**Risk:** 44px touch targets create layout issues on small viewports
**Probability:** Low
**Impact:** High (cannot ship non-compliant)

**Mitigation:**
- Test on actual devices (iPhone SE, small Android)
- If layout breaks, use `min-w-11 min-h-11` instead of fixed `w-11 h-11`
- Icon can shrink slightly if container maintains 44px

### Risk 3: Performance Regression

**Risk:** Fixed navigation causes repaint issues
**Probability:** Low
**Impact:** Medium (affects performance scores)

**Mitigation:**
- Use `will-change: transform` if needed
- Monitor Lighthouse Performance scores
- Test on throttled network/CPU

### Risk 4: Standards Gaps Discovered

**Risk:** Implementation reveals conflicts in Standards
**Probability:** High (expected in hermeneutic circle)
**Impact:** Low (this is growth, not failure)

**Mitigation:**
- Document conflicts immediately
- Pause implementation to resolve
- Update Standards before continuing
- This is the circle working correctly

### Risk 5: Property-Specific Needs

**Risk:** .agency has commercial needs that conflict with Standards
**Probability:** Medium
**Impact:** Medium

**Mitigation:**
- Standards should allow interpretation
- Document deviations with rationale
- Ensure deviations embody same philosophy
- Example: .agency might need colored CTA buttons (not in Standards), but they should still follow "less, but better" principle

---

## Hermeneutic Checkpoints

Throughout migration, pause and ask:

### After Each Phase
1. **Does this implementation embody "less, but better"?**
2. **Did I discover gaps in the Standards?**
3. **Does this feel like growth of understanding, or forced compliance?**
4. **What did this property teach me about the whole?**

### After Each Property
1. **Do all properties still feel distinct?**
2. **Is consistency creating harmony or monotony?**
3. **Did the part (property) refine my understanding of the whole (CREATE SOMETHING)?**
4. **What conflicts arose between properties?**

### After Full Migration
1. **Do the Standards now feel complete?**
2. **Can new properties be built purely from Standards?**
3. **Has the circle closed, or revealed new gaps?**
4. **Is the system "less, but better" than before?**

---

## Appendix: Command Reference

### Useful Commands During Migration

**Search for spacing patterns:**
```bash
# Find hardcoded spacing
grep -r "py-\[0-9\]" src/
grep -r "gap-\[0-9\]" src/
grep -r "space-y-\[0-9\]" src/

# Find color variables
grep -r "var(--" src/

# Find touch target violations
grep -r "p-2" src/ | grep button
grep -r "w-6 h-6" src/ | grep button
```

**Test accessibility:**
```bash
# Install axe-core CLI
npm install -g @axe-core/cli

# Run accessibility audit
axe https://createsomething.ltd --tags wcag2a,wcag2aa
```

**Visual regression testing:**
```bash
# Install Percy CLI (optional)
npm install -g @percy/cli

# Take snapshots
percy snapshot src/routes
```

**Lighthouse CI:**
```bash
# Install
npm install -g @lhci/cli

# Run
lhci autorun --collect.url=https://createsomething.ltd
```

---

## Conclusion

This reconciliation plan aligns all CREATE SOMETHING properties with canonical Standards through:

1. **Clear directives** from architectural decisions
2. **Phased approach** that learns through implementation
3. **Hermeneutic validation** at each checkpoint
4. **Quantitative metrics** for success
5. **Rollback strategies** for safety

**Guiding principle throughout:**
> "Whatever makes the system align with the Standards and Ethos, with the Masters foundation"

**Expected outcome:**
- All properties embody "less, but better"
- Consistency serves understanding, not conformity
- Standards are complete and generative
- Hermeneutic circle closes with new understanding

**The reconciliation is not about forcing properties into a mold, but revealing their shared essence.**

---

*"Understanding is never a presuppositionless apprehending of something presented to us."* — Heidegger, Being and Time

The reconciliation itself is an interpretive act that refines both the Standards and our understanding of what CREATE SOMETHING truly is.
