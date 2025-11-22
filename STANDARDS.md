# CREATE SOMETHING: Design & Implementation Standards

> **"Weniger, aber besser"** - Dieter Rams
> *Less, but better*

**Version:** 1.0
**Date:** November 21, 2025
**Status:** Canonical

---

## Philosophy

This document defines the **philosophical constraints** that govern all CREATE SOMETHING properties. These are not rigid specifications, but **generative constraints** that allow for interpretive freedom while maintaining ecosystem coherence.

### Hermeneutic Approach

Standards are applied through the hermeneutic circle:
1. **Pre-understanding**: Rams' "Less, but better" philosophy
2. **Whole**: Four modes of being (.ltd, .io, .space, .agency)
3. **Part**: Each standard as interpreted by properties
4. **Interpretation**: Practical implementation that embodies principles
5. **New Understanding**: Feedback refines both standards and implementations

### The Four Modes of Being

Each property represents a distinct mode of existence:

- **`.ltd`** - **Being-as-Canon** (philosophical foundation)
- **`.io`** - **Being-as-Document** (research and theory)
- **`.space`** - **Being-as-Experience** (interactive practice)
- **`.agency`** - **Being-as-Service** (commercial application)

---

## 1. Design System

### 1.1 Typography

**Primary Font:**
```css
font-family: 'Stack Sans Notch', -apple-system, BlinkMacSystemFont,
             'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
```

**Monospace Font:**
```css
font-family: 'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code',
             'Roboto Mono', Menlo, 'Courier New', monospace;
```

**Fluid Typography Scale:**

Use `clamp()` for fluid scaling to eliminate jarring breakpoint transitions:

```css
h1 { font-size: clamp(3.5rem, 9vw, 7rem); }    /* 56px → 112px */
h2 { font-size: clamp(2rem, 5vw, 3.5rem); }    /* 32px → 56px */
h3 { font-size: clamp(1.5rem, 3vw, 2.25rem); } /* 24px → 36px */
h4 { font-size: clamp(1.25rem, 2.5vw, 1.75rem); } /* 20px → 28px */
h5 { font-size: clamp(1.125rem, 2vw, 1.5rem); } /* 18px → 24px */
h6 { font-size: clamp(1rem, 1.5vw, 1.25rem); }  /* 16px → 20px */
p  { font-size: clamp(1rem, 1.5vw, 1.25rem); }  /* 16px → 20px */
```

**Optical Sizing & Spacing:**

```css
font-optical-sizing: auto;
letter-spacing: -0.025em; /* Headings */
letter-spacing: -0.01em;  /* Body text */
line-height: 1.2;         /* Headings */
line-height: 1.6;         /* Body text */
```

**Given:** Rams "Good design is unobtrusive"
**Context:** Multi-device, variable viewport widths
**Constraint:** Use fluid typography with `clamp()` to eliminate jarring breakpoint transitions
**Rationale:** Smooth scaling maintains visual harmony across all screen sizes

---

### 1.2 Color System

**Foundation:**
- Pure Black: `#000000`
- Pure White: `#FFFFFF`

**Hierarchy through Opacity:**

```css
/* Use opacity modifiers for hierarchy, not named gray values */
background: #000000;              /* Base black */
border: rgba(255, 255, 255, 0.1); /* Subtle divide */
text: rgba(255, 255, 255, 0.6);   /* Secondary text */
text: rgba(255, 255, 255, 0.8);   /* Primary text */
```

**Pragmatic Interpretation (Acceptable):**

For developer ergonomics, CSS variables may alias opacity values:

```css
:root {
  --bg-secondary: #0a0a0a;    /* rgba(255, 255, 255, 0.04) on black */
  --bg-tertiary: #111111;      /* rgba(255, 255, 255, 0.07) on black */
  --text-tertiary: #a0a0a0;    /* rgba(255, 255, 255, 0.63) on black */
}
```

**Given:** Rams "Good design is as little design as possible"
**Context:** Visual hierarchy and UI depth
**Constraint:** Only #000 and #FFF, hierarchy through opacity
**Rationale:** Minimal palette forces clarity, prevents decoration

---

### 1.3 Spacing System

**Golden Ratio (φ = 1.618):**

All spatial rhythm follows the golden ratio for mathematical elegance:

```css
:root {
  --space-xs: 0.5rem;      /* 8px - Base unit */
  --space-sm: 1rem;        /* 16px - 2x base */
  --space-md: 1.618rem;    /* ~26px - φ¹ */
  --space-lg: 2.618rem;    /* ~42px - φ² */
  --space-xl: 4.236rem;    /* ~68px - φ³ */
  --space-2xl: 6.854rem;   /* ~110px - φ⁴ */
  --space-3xl: 11.089rem;  /* ~177px - φ⁵ */
}
```

**Usage:**

```css
section {
  padding-top: var(--space-2xl);    /* Major sections */
  padding-bottom: var(--space-2xl);
}

.hero {
  padding-top: var(--space-3xl);    /* Hero sections */
}

.card {
  padding: var(--space-lg);          /* Card interiors */
  gap: var(--space-md);               /* Internal spacing */
}
```

**Given:** Golden ratio appears throughout nature and classical design
**Context:** Spatial relationships and visual rhythm
**Constraint:** Use φ-based scale for all spacing
**Rationale:** Creates harmonious, mathematically elegant proportions

---

### 1.4 Border Radius

**Scale:**

```css
:root {
  --radius-sm: 6px;      /* Subtle rounding */
  --radius-md: 8px;      /* Standard cards */
  --radius-lg: 12px;     /* Prominent cards */
  --radius-xl: 16px;     /* Large elements */
  --radius-full: 9999px; /* Pills, badges, circular buttons */
}
```

**Usage:**

```css
.card { border-radius: var(--radius-md); }
.button { border-radius: var(--radius-lg); }
.badge { border-radius: var(--radius-full); }
```

**Given:** Rams "Good design is thorough down to the last detail"
**Context:** Consistent visual softness
**Constraint:** Use defined radius scale, avoid arbitrary values
**Rationale:** Systematic rounding creates visual consistency

---

### 1.5 Z-Index System

**Layering Hierarchy:**

```css
:root {
  --z-base: 0;        /* Default layer */
  --z-dropdown: 10;   /* Dropdown menus */
  --z-sticky: 20;     /* Sticky headers */
  --z-fixed: 50;      /* Fixed navigation */
  --z-modal: 100;     /* Modal overlays */
  --z-popover: 200;   /* Popovers, tooltips */
  --z-tooltip: 300;   /* Always-on-top tooltips */
}
```

**Usage:**

```css
nav.fixed { z-index: var(--z-fixed); }
.modal { z-index: var(--z-modal); }
```

**Given:** Mies van der Rohe "God is in the details"
**Context:** Layering of UI elements
**Constraint:** Use semantic z-index scale, prevent z-index chaos
**Rationale:** Systematic layering maintains visual order

---

## 2. Interaction Design

### 2.1 Animation & Transitions

**Easing:**

```css
:root {
  --ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1); /* Material Design curve */
}
```

**Duration:**

```css
:root {
  --duration-micro: 200ms;     /* Micro-interactions (hover, focus) */
  --duration-standard: 300ms;  /* Standard transitions (color, opacity) */
  --duration-complex: 500ms;   /* Complex transitions (layout, slide) */
}
```

**Common Patterns:**

```css
/* Links */
a {
  transition: opacity var(--duration-micro) var(--ease-standard);
}
a:hover {
  opacity: 0.7;
}

/* Buttons */
button {
  transition: all var(--duration-standard) var(--ease-standard);
}

/* Slides */
.slide-transition {
  transition: transform var(--duration-complex) var(--ease-standard);
}
```

**Given:** Rams "Good design is unobtrusive"
**Context:** User interactions and state changes
**Constraint:** Animations must be perceptible but not distracting (≤500ms)
**Rationale:** Subtle motion provides feedback without breaking focus

---

### 2.2 Touch Targets & Accessibility

**Minimum Interactive Size:**

```css
/* WCAG 2.1 Level AA Requirement (2.5.5) */
button, a, input {
  min-width: 44px;
  min-height: 44px;
}
```

**Mobile Menu Buttons:**

```svelte
<!-- CORRECT: 44px touch target -->
<button class="md:hidden w-11 h-11 flex items-center justify-center">
  <svg class="w-6 h-6">...</svg>
</button>

<!-- INCORRECT: Too small -->
<button class="md:hidden p-2">
  <svg class="w-6 h-6">...</svg>  <!-- Only 26px total -->
</button>
```

**Focus States:**

```css
:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 2px;
}
```

**Given:** Rams "Good design is thorough down to the last detail"
**Context:** Mobile touch interfaces, diverse motor abilities
**Constraint:** All interactive elements must be 44px × 44px minimum
**Rationale:** Accessibility, usability across diverse abilities

---

### 2.3 Responsive Breakpoints

**Primary Breakpoint:**

```css
/* Tailwind default: md = 768px */
.hidden.md\:flex { /* ... */ }
```

**Usage Pattern:**

```svelte
<!-- Mobile-first approach -->
<div class="flex-col md:flex-row">  <!-- Column on mobile, row on desktop -->
<nav class="hidden md:flex">        <!-- Hidden on mobile, visible on desktop -->
<button class="md:hidden">          <!-- Visible on mobile, hidden on desktop -->
```

**Rationale:**
- Single breakpoint creates binary but clear experience
- 768px (tablet portrait) is natural divide between mobile/desktop paradigms
- Mobile-first approach ensures baseline accessibility

---

## 3. Technology Stack

### 3.1 Framework

**SvelteKit over React:**

**Given:** Rams "Good design is as little design as possible"
**Context:** Frontend framework selection
**Constraint:** Use SvelteKit, not React
**Rationale:** Less boilerplate, more declarative, better performance, smaller bundle sizes

### 3.2 Infrastructure

**Cloudflare Workers & Pages:**

**Given:** Modern serverless architecture
**Context:** Global distribution, edge computing
**Constraint:** Deploy to Cloudflare Workers/Pages, not traditional servers
**Rationale:** Serverless scales, edge reduces latency, aligns with research focus

### 3.3 Database

**Notion as Canonical Source:**

**Given:** Need for accessible, version-controlled content
**Context:** Research papers, documentation, structured content
**Constraint:** Use Notion API as canonical database
**Rationale:** Non-technical editing, version history, flexible schemas

---

## 4. Code Quality

### 4.1 Abstraction

**No Premature Abstraction:**

**Given:** Rams "Good design makes a product understandable"
**Context:** Codebase maintainability
**Constraint:** Only abstract when pattern appears 3+ times
**Rationale:** Three similar lines beats premature abstraction

**Example:**

```typescript
// GOOD: Direct implementation
<h1 class="text-6xl font-bold">Title 1</h1>
<h1 class="text-6xl font-bold">Title 2</h1>
<h1 class="text-6xl font-bold">Title 3</h1>
// Three instances → NOW create <Heading> component

// BAD: Premature abstraction
<Heading level={1} size="large" weight="bold" />
// Created after 1 use, over-engineered API
```

### 4.2 Clarity

**Clarity over Brevity:**

**Given:** Rams "Good design makes a product understandable"
**Context:** Code readability
**Constraint:** Prefer verbose clarity over terse cleverness
**Rationale:** Code is read 10x more than written

**Example:**

```typescript
// GOOD: Clear intent
const isUserAuthenticated = user !== null && user.token !== undefined;

// BAD: Clever but unclear
const isAuth = !!user?.token;
```

### 4.3 Dependencies

**Justify Every Dependency:**

**Given:** Rams "Good design is environmentally friendly"
**Context:** Bundle size, supply chain security
**Constraint:** Every dependency must be explicitly justified
**Rationale:** Each dependency adds weight, attack surface, and maintenance burden

**Process:**
1. Can we implement this ourselves in <100 lines?
2. Does this dependency have minimal sub-dependencies?
3. Is this dependency actively maintained?
4. Does the value justify the cost?

---

## 5. API Design (Arc Pattern)

### 5.1 OAuth Authorization

**Given:** User control and data sovereignty
**Context:** Third-party API integrations
**Constraint:** Always use OAuth, never API keys
**Rationale:** Users control their data, we're just the pipe

### 5.2 Single-Direction Sync

**Given:** Arc's "Flow State" pattern
**Context:** Data synchronization between services
**Constraint:** A→B sync only, never bidirectional
**Rationale:** Simplicity, predictability, prevents sync conflicts

### 5.3 Minimal Transformation

**Given:** Rams "Good design is honest"
**Context:** Data processing in sync pipelines
**Constraint:** Minimal transformation, preserve original structure
**Rationale:** Transparency, debuggability, respect for source data

---

## 6. Validation Process

### 6.1 Hermeneutic Circle

All changes must pass through the hermeneutic circle:

```
1. PRE-UNDERSTANDING
   ↓ What standard does this change embody?
2. EXAMINE WHOLE
   ↓ How does this affect all four properties?
3. EXAMINE PART
   ↓ Does this implementation honor the standard?
4. INTERPRET
   ↓ Is this interpretation valid?
5. NEW UNDERSTANDING
   ↓ Does this refine our understanding of the standard?
   ↓ Does this reveal gaps in the standard?
6. UPDATE STANDARDS (if needed)
```

### 6.2 Migration Testing

When migrating implementations:

1. **Verify visual parity** (screenshot comparison)
2. **Test accessibility** (WCAG 2.1 AA compliance)
3. **Measure performance** (Lighthouse scores)
4. **Validate across devices** (mobile, tablet, desktop)
5. **Check touch targets** (44px minimum)

---

## 7. Ecosystem Identity

### 7.1 Branding

**Primary Identity:**

```
CREATE SOMETHING
```

**Property-Specific:**

```
CREATE SOMETHING.ltd
CREATE SOMETHING.io
CREATE SOMETHING.space
CREATE SOMETHING AGENCY
```

**Given:** Rams "Good design makes a product understandable"
**Context:** Multi-property ecosystem
**Constraint:** Always lead with "CREATE SOMETHING", property as suffix
**Rationale:** Unified ecosystem identity, clear navigation

### 7.2 Modes of Being (Required)

**Every property MUST include a footer section linking all modes:**

```svelte
<footer>
  <div>
    <h4>Modes of Being</h4>
    <a href="https://createsomething.ltd">.ltd — Canon</a>
    <a href="https://createsomething.io">.io — Learn</a>
    <a href="https://createsomething.space">.space — Explore</a>
    <a href="https://createsomething.agency">.agency — Build</a>
    <a href="https://github.com/createsomethingtoday">GitHub — Source</a>
  </div>
</footer>
```

**Rationale:**
- Ecosystem visibility
- Cross-property navigation
- User education
- Reinforces unified identity

---

## 8. Acceptable Interpretations

### 8.1 Pragmatic Deviations

Standards are **constraints**, not **prescriptions**. Valid interpretations include:

**Color Variables:**
- Standard: `rgba(255, 255, 255, 0.1)`
- Interpretation: `var(--text-tertiary)` aliasing to `#a0a0a0`
- **Valid if:** Visual result matches standard

**Spacing Adjustments:**
- Standard: `var(--space-2xl)` (6.854rem)
- Interpretation: `7.5rem` (closer to round number)
- **Valid if:** Difference is minor (<10%) and justified

**Animation Richness:**
- .ltd: Minimal (opacity only)
- .io/.space: Rich (slide transitions, transforms)
- **Valid if:** Honors "unobtrusive" principle (≤500ms, no distraction)

### 8.2 Interpretation Process

When deviating from standards:

1. **Document the deviation** (in code comments or documentation)
2. **Justify the reasoning** (developer ergonomics, pragmatic constraints)
3. **Ensure visual parity** (must achieve same user-facing result)
4. **Consider feedback to standards** (should this become canonical?)

---

## 9. Missing Specifications

This document will evolve. Currently missing specifications:

- [ ] Form input styling standards
- [ ] Table styling patterns
- [ ] List styling patterns
- [ ] Code block presentation
- [ ] Error page design
- [ ] Loading states
- [ ] SEO meta tag patterns
- [ ] Open Graph specifications
- [ ] Structured data (JSON-LD) requirements

These will be added as implementations emerge and patterns stabilize.

---

## Appendix A: Dieter Rams' 10 Principles

All standards derive from Rams' principles:

1. **Good design is innovative** - Push boundaries, don't copy
2. **Good design makes a product useful** - Function over form
3. **Good design is aesthetic** - Beauty in simplicity
4. **Good design makes a product understandable** - Self-explanatory interfaces
5. **Good design is unobtrusive** - Neutral, restrained, leaves room for user
6. **Good design is honest** - No false promises, transparency
7. **Good design is long-lasting** - Timeless, not trendy
8. **Good design is thorough down to the last detail** - Precision, care
9. **Good design is environmentally friendly** - Minimal resources, maximum value
10. **Good design is as little design as possible** - Less, but better

---

## Appendix B: Standards Lineage

**Version History:**

- **1.0** (November 21, 2025) - Initial comprehensive standards document
  - Added typography specifications
  - Added color system with opacity guidelines
  - Added golden ratio spacing system
  - Added border radius scale
  - Added z-index system
  - Added animation specifications
  - Added touch target accessibility requirements
  - Documented acceptable interpretations
  - Established hermeneutic validation process

---

**"Understanding is never a presuppositionless apprehending of something presented to us."**
— Martin Heidegger, *Being and Time*

These standards are interpretations, shaped by Rams' principles, our implementations, and our evolving understanding of "less, but better."
