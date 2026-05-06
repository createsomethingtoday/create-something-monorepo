# CREATE SOMETHING: Design & Implementation Standards

> **"Weniger, aber besser"** - Dieter Rams
> *Less, but better*

**Version:** 1.1
**Date:** March 6, 2026
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

### 3.4 Languages

**The Language Triad:**

Languages map to the Subtractive Triad. Each serves a distinct layer where its characteristics align with the work's demands:

| Layer | Language | Domain | Triad Alignment |
|-------|----------|--------|-----------------|
| **Frontend/Edge** | TypeScript | UI, API routes, Workers | Heidegger: Serves the whole system |
| **Orchestration** | Python | LLM coordination, agents | Rams: Minimal code for maximum effect |
| **Infrastructure** | Rust | Verification, analysis, tooling | DRY: Correctness without repetition |

**TypeScript (Primary):**

**Given:** Rams "Good design is as little design as possible"
**Context:** Full-stack web development, edge computing
**Constraint:** TypeScript for all frontend, API, and Cloudflare Workers code
**Rationale:** Single language across client/server, SvelteKit integration, Workers runtime (V8)

**Python (Orchestration):**

**Given:** Heidegger's Zeug—equipment appropriate to its domain
**Context:** LLM provider integration, agent workflows, rapid iteration
**Constraint:** Python for AI orchestration where the bottleneck is network latency, not compute
**Rationale:** Mature AI ecosystem, async patterns, provider SDK availability. The work is *coordination*, not *computation*.

**Rust (Infrastructure):**

**Given:** Grounded claims require grounded tooling
**Context:** Code analysis, verification systems, performance-critical computation
**Constraint:** Rust for tooling where correctness and performance are non-negotiable
**Rationale:** Ownership model forces explicit confrontation with what other languages let you ignore. This is Heideggerian: the tool demands engagement before it recedes into transparent use.

**Why Rust over Go/Zig:**

| Language | Consideration | Assessment |
|----------|---------------|------------|
| **Go** | Simplicity, fast compilation | Garbage collection introduces non-determinism; less expressive type system |
| **Zig** | Manual memory, C interop | Immature ecosystem; appropriate for systems programming, not analysis tooling |
| **Rust** | Ownership, zero-cost abstractions | Tree-sitter (AST parsing) is native Rust; algebraic types model code structure naturally; compiler-enforced correctness aligns with "grounded claims" philosophy |

**WebAssembly Bridge:**

When computation must reach the edge, Rust compiles to WebAssembly for Cloudflare Workers:

```rust
// Rust library compiled to WASM
#[wasm_bindgen]
pub fn compute_similarity(a: &str, b: &str) -> f64 {
    // Performance-critical computation at the edge
}
```

**Given:** Cloudflare Workers runs V8, not native code
**Context:** Need for edge-deployed computation (similarity, hashing, validation)
**Constraint:** Compile Rust to WASM when performance-critical logic must run in Workers
**Rationale:** Best of both worlds—Rust's correctness, Workers' global distribution

**Anti-Pattern: Language as Identity**

Do not choose languages for tribal affiliation. The question is always: "Does this language serve *this* work?" Framework imprisonment applies to languages too.

```
BAD:  "We're a Rust shop"
GOOD: "Rust serves our verification tooling because ownership models correctness"

BAD:  "Python is slow, rewrite everything"
GOOD: "Python orchestrates LLM calls where network latency dominates"
```

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

### 6.3 Paper / Experiment / Policy Lifecycle

**Artifact Classes:**

- `paper` — Research-first publication for `.io`
- `experiment` — `.io` experiment write-up or interactive route published from `.io`
- `policy` — Governance artifact under `docs/policies/v1`

**Given:** The work must remain connected
**Context:** Paper, experiment, and policy development/review/deployment
**Constraint:** Use a state-based promotion model, never a commit-count trigger
**Rationale:** Commits measure activity, not readiness. Publication must follow explicit evidence and approval.

**IO-First Publication Rule:**

- `.io` is the first publication surface for papers and experiments
- `.space` may link executable experiments later, but does not own the initial approval cycle
- Policy artifacts are reviewed in-repo and remain `draft` until explicitly promoted under `policy.policy-lifecycle-governance.v1`

**Required Lifecycle:**

```
Linear issue
→ Draft PR
→ Review 1
→ Improvement pass
→ Review 2
→ Human applies publish-approved
→ Merge to main
→ Deploy
→ Post-deploy verification
```

**Source of Truth:**

- Linear is the canonical work tracker
- One Linear issue maps to one branch and one PR
- Review state lives in Linear/PR labels, not in a separate policy state machine

**Required Labels:**

- `paper-cycle`
- `experiment-cycle`
- `policy-cycle`
- `ready-review-1`
- `ready-review-2`
- `publish-approved`
- `deployed`

**Review Rule:**

- All `.io` publication work requires two review passes before human approval
- Review 1 may generate findings and required fixes
- Review 2 confirms fixes, evidence, and release readiness
- A PR without `publish-approved` MUST NOT be treated as production-ready

**Evidence Rule:**

Each publication candidate must keep these artifacts connected to the task:

1. Linear issue ID
2. Draft PR URL
3. Review 1 report
4. Review 2 release summary
5. Post-deploy verification summary (after merge)

**Deployment Rule:**

- Preview deployment is allowed for `.io` papers and experiments after draft PR creation and quality checks
- Production publication happens only from merge to `main`
- Policy-only changes do not trigger production publication while the policy remains `draft`
- Commit count MUST NOT be used as a deploy trigger, review trigger, or promotion trigger

**Rollback Rule:**

- Rollback authority remains human-controlled
- Use the last known-good deployed state or revert commit
- Record rollback rationale and incident reference in Linear and in the relevant policy artifact when policy enforcement is involved

### 6.4 Git-Light Agent Delivery

**Given:** AI agents can validate work directly in provisioned environments with runtime deploy access
**Context:** Daily development, DEV verification, and preview iteration in the shared monorepo
**Constraint:** Git is the default production promotion boundary, not a mandatory inner-loop checkpoint
**Rationale:** Direct validation plus Linear evidence is a better signal than commit volume for non-production iteration

**Rule:**

- DEV and preview deploys MAY run directly from the current workspace after the narrow relevant checks pass
- Each direct DEV or preview deploy MUST attach Linear evidence: issue ID, target environment, commands run, deploy URL or ID, and rollback reference
- Non-terminal DEV checkpoints SHOULD be recorded as Linear comments when they affect handoff, review, rollback, or promotion
- Commit or push MUST NOT be required solely to checkpoint agent progress in DEV
- Shared release and production promotion SHOULD still flow through branch and PR review unless an approved immutable release-artifact path exists
- Production deploys from unreviewed local state are prohibited except under explicit human-directed incident response
- Commit count, push count, or agent-completion status MUST NOT be treated as deploy or promotion signals

**Source Anchor:**

- `docs/policies/v1/policy.git-light-agent-delivery.v1.md`

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
- **1.1** (March 6, 2026) - Added IO-first paper / experiment / policy lifecycle
  - Added artifact classes for `paper`, `experiment`, and `policy`
  - Standardized issue-to-PR mapping and double-review requirement
  - Defined evidence, publication, and rollback rules
  - Explicitly prohibited commit-count deployment triggers

---

**"Understanding is never a presuppositionless apprehending of something presented to us."**
— Martin Heidegger, *Being and Time*

These standards are interpretations, shaped by Rams' principles, our implementations, and our evolving understanding of "less, but better."
