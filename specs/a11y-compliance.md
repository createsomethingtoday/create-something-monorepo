# CREATE SOMETHING A11y Compliance

## Philosophy

Accessibility is not accommodation—it's Zuhandenheit for all users. When tools work for everyone, they truly recede into transparent use. A keyboard user shouldn't notice they're using a keyboard. A screen reader user shouldn't notice they're using a screen reader. The tool disappears; only the work remains.

**Principle**: Accessibility enables dwelling. Inaccessibility creates breakdown.

## Current State

### Audit Date: 2025-12-18

### Known Suppressed Warnings (2 files)
- `packages/agency/src/lib/components/AssessmentStep.svelte` — click without keyboard
- `packages/space/src/lib/components/LightStudy.svelte` — click without keyboard

### Build Warnings (from latest build)
- Missing aria-labels on buttons (experiments search clear button)
- Non-interactive elements with click handlers (Terminal, LightStudy, Circulation, DailyRhythm)
- SVG `<g>` elements with mouse handlers lacking ARIA roles
- Non-interactive elements with tabIndex (HermeneuticCircle)

### Not Yet Audited
- Color contrast compliance (WCAG AA: 4.5:1 for text, 3:1 for large text)
- Focus indicators across all interactive elements
- Heading hierarchy
- Form labels and error states
- Image alt text

---

## Skip-to-Content Audit (2025-12-18)

### Pattern Overview

The codebase has two implementations of skip links:

| Class | Location | Used By |
|-------|----------|---------|
| `.skip-to-content` | `packages/components/src/lib/styles/canon.css` | Main properties (io, ltd, space, agency, lms, templates-platform) |
| `.skip-link` | Per-vertical `app.css` files | All verticals (8 templates) |

### Main Properties ✓ CONSISTENT
All main CREATE SOMETHING properties use the canonical `.skip-to-content` class:

- ✓ `packages/io/src/routes/+layout.svelte` — `.skip-to-content`
- ✓ `packages/ltd/src/routes/+layout.svelte` — `.skip-to-content`
- ✓ `packages/space/src/routes/+layout.svelte` — `.skip-to-content`
- ✓ `packages/agency/src/routes/+layout.svelte` — `.skip-to-content`
- ✓ `packages/lms/src/routes/+layout.svelte` — `.skip-to-content`
- ✓ `packages/templates-platform/src/routes/+layout.svelte` — `.skip-to-content`

### Verticals ⚠️ DIVERGENT NAMING
All verticals use `.skip-link` instead of `.skip-to-content`:

- ⚠️ `packages/verticals/professional-services` — `.skip-link`
- ⚠️ `packages/verticals/law-firm` — `.skip-link`
- ⚠️ `packages/verticals/personal-injury` — `.skip-link`
- ⚠️ `packages/verticals/medical-practice` — `.skip-link`
- ⚠️ `packages/verticals/restaurant` — `.skip-link`
- ⚠️ `packages/verticals/creative-agency` — `.skip-link`
- ⚠️ `packages/verticals/creative-portfolio` — `.skip-link`
- ⚠️ `packages/verticals/architecture-studio` — `.skip-link`

### Functional Equivalence
Both implementations are WCAG 2.1 AA compliant:
- Hidden off-screen (`top: -100%` or similar)
- Visible when focused (`top: var(--space-sm)`)
- Links to `#main-content`
- Proper z-index for visibility
- Canon token usage for colors

### DRY Violation Analysis

The verticals each define their own `.skip-link` class in their `app.css` files rather than:
1. Using the canonical `.skip-to-content` class from `canon.css`
2. Importing the shared `SkipToContent` component from `@create-something/components`

**Impact**: Low (functional), Medium (maintenance burden)
- All implementations work correctly for accessibility
- Each vertical has ~15 lines of duplicated CSS
- Naming inconsistency could cause confusion during audits

### Recommended Action (P3)
Standardize on `.skip-to-content` for consistency:
1. Update all vertical layouts to use `class="skip-to-content"`
2. Import `canon.css` tokens or extend from shared styles
3. Remove duplicated `.skip-link` definitions from vertical `app.css` files

This is a refactoring task, not a functional fix—all skip links work correctly.

---

## Shared A11y Utilities

### Keyboard Actions (`packages/components/src/lib/actions/a11y.ts`)

Three Svelte actions for keyboard accessibility:

| Action | Purpose | Options |
|--------|---------|---------|
| `use:keyboardClick` | Makes non-button elements keyboard accessible | `onclick`, `onEscape`, `preventDefault`, `stopPropagation` |
| `use:keyboardToggle` | Toggle button pattern with aria-pressed | `pressed`, `onToggle`, `onEscape` |
| `use:focusTrap` | Modal focus trapping for WCAG 2.4.3 | `active`, `initialFocus`, `returnFocusTo`, `onEscape` |

**Usage Pattern**:
```svelte
<div
  use:keyboardClick={{ onclick: handleClick }}
  role="button"
  tabindex="0"
>
  Interactive content
</div>
```

### SkipToContent Component (`packages/components/src/lib/components/SkipToContent.svelte`)

Exported from `@create-something/components` but **not currently used** by any property.
All properties use inline `<a>` tags with the `.skip-to-content` class instead.

**Status**: Available but underutilized. Consider deprecating in favor of the CSS-only approach.

### Focus Utilities (`packages/components/src/lib/styles/canon.css`)

| Class | Purpose |
|-------|---------|
| `.a11y-focus` | Standard focus ring (`outline: 2px solid var(--color-focus)`) |
| `.a11y-focus-within` | Container focus state |
| `.a11y-focus-tight` | No outline offset |
| `.a11y-focus-inset` | Inward offset (`-2px`) |
| `.skip-to-content` | Canonical skip link styling |

---

## Target: WCAG 2.1 AA

All four CREATE SOMETHING properties should meet WCAG 2.1 Level AA.

---

## Features (26 total)

### keyboard-navigation (6)

Interactive elements must be keyboard accessible.

- P1: Fix AssessmentStep.svelte click-only interactions
  - Add keydown handler for Enter/Space
  - Remove svelte-ignore comment
  - Verify keyboard navigation works

- P1: Fix LightStudy.svelte click-only interactions
  - Add keyboard handlers for season/time controls
  - Remove svelte-ignore comment
  - Test with keyboard-only navigation

- ~~P1: Fix threshold-dwelling non-interactive element interactions~~ ✓ DONE
  - ~~Convert to button or add proper ARIA role~~ → Moved keydown to svelte:window
  - ~~Remove svelte-ignore comment~~ → Removed

- P1: Fix Terminal.svelte click handler
  - Add keyboard event handler
  - Ensure focus management works

- P1: Fix DailyRhythm.svelte SVG interactions
  - Add ARIA roles to interactive `<g>` elements
  - Add keyboard handlers

- P1: Fix Circulation.svelte SVG interactions
  - Add ARIA roles to interactive `<g>` elements
  - Add keyboard handlers

### aria-labels (4)

All interactive elements need accessible names.

- P1: Add aria-label to experiments search clear button
  - Location: packages/space/src/routes/experiments/+page.svelte
  - Add aria-label="Clear search"

- P2: Audit all icon-only buttons across properties
  - Find buttons with only SVG/icon content
  - Add aria-label to each

- P2: Audit all link elements for accessible names
  - Ensure links have descriptive text or aria-label
  - Fix any "click here" or icon-only links

- P2: Fix HermeneuticCircle tabIndex on non-interactive element
  - Either make it interactive with proper role
  - Or remove tabIndex and handle differently

### focus-management (3)

Focus should be visible and logical.

- P2: Audit focus indicators across all properties
  - Ensure all focusable elements have visible focus rings
  - Use Canon focus token: var(--color-focus)

- ~~P2: Add skip-to-content links~~ ✓ DONE
  - ~~Add to all property layouts~~ → Added to io, ltd, space, agency
  - ~~Visually hidden until focused~~ → CSS class in canon.css
  - ~~Link to main content area~~ → Links to #main-content

- P2: Verify focus trap in modals/dialogs
  - If any modals exist, ensure focus is trapped
  - Return focus to trigger on close

### color-contrast (3)

Text must be readable.

- P2: Audit text contrast against backgrounds
  - var(--color-fg-muted) on var(--color-bg-pure): verify 4.5:1
  - var(--color-fg-tertiary) on var(--color-bg-surface): verify 4.5:1
  - Check all data visualization colors

- P2: Audit interactive element contrast
  - Buttons, links, form controls: 3:1 minimum
  - Focus indicators: 3:1 against background

- P3: Add high-contrast mode support
  - Respect prefers-contrast media query
  - Increase contrast for users who need it

### semantic-html (3)

Structure should be meaningful.

- P2: Audit heading hierarchy across all routes
  - Ensure single h1 per page
  - No skipped heading levels (h1 → h3)
  - Headings reflect content structure

- P2: Audit landmark regions
  - Ensure main, nav, header, footer are present
  - Add aria-label to distinguish multiple navs if needed

- P3: Audit list usage
  - Navigation items should be in lists
  - Related items should be grouped in lists

### forms-and-errors (3)

Forms must be usable by everyone.

- P2: Audit form labels
  - All inputs must have associated labels
  - Labels must be visible (not placeholder-only)

- ~~P2: Audit error state announcements~~ ✓ DONE
  - ~~Errors should be announced to screen readers~~ → role="alert" aria-live="polite" added
  - ~~Use aria-live or aria-describedby~~ → aria-describedby links inputs to error messages

- ~~P3: Audit required field indicators~~ ✓ DONE
  - ~~Use aria-required~~ → aria-required="true" added to required inputs
  - ~~Visual indicator should not be color-only~~ → Asterisk (*) with aria-hidden for visual cue

### dry-consolidation (4)

Consolidate repeated a11y patterns into shared utilities. Subtractive Triad: DRY level.

- ~~P1: Create keyboardClick Svelte action~~ ✓ DONE
  - ~~Location: packages/components/src/lib/actions/a11y.ts~~ → Implemented
  - ~~Handle Enter/Space key events for click-equivalent~~ → Handles Enter, Space, Escape
  - ~~Handle Escape for dismissal~~ → `onEscape` callback option
  - ~~Export as `use:keyboardClick`~~ → Exported from a11y.ts
  - Refactor Terminal, DailyRhythm, Circulation to use it → PENDING

- ~~P1: Create shared focus styles in canon.css~~ ✓ DONE
  - ~~Add `.a11y-focus` utility class~~ → Added with `outline: 2px solid var(--color-focus)`
  - ~~Add `.a11y-focus-within` for container focus~~ → Added
  - ~~Use var(--color-focus) token consistently~~ → All focus states use Canon token
  - Remove duplicated focus styles from individual components → PARTIAL (some components still have custom)

- ~~P2: Create SkipLink component~~ ✓ DONE (as CSS utility instead)
  - ~~Location: packages/components/src/lib/components/SkipLink.svelte~~ → CSS class in canon.css
  - ~~Visually hidden until focused~~ → .skip-to-content class
  - ~~Configurable target (default: #main-content)~~ → Simple anchor links in layouts
  - ~~Use across all property layouts~~ → Added to io, ltd, space, agency, lms
  - Note: Verticals use `.skip-link` instead (see Skip-to-Content Audit above)

- ~~P2: Create accessible toggle button pattern~~ ✓ DONE
  - ~~Document aria-pressed usage~~ → `keyboardToggle` action in packages/components/src/lib/actions/a11y.ts
  - ~~Create example in components package~~ → JSDoc example in keyboardToggle action
  - ~~Refactor LightStudy control buttons to use pattern~~ → Already uses native buttons with aria-pressed

---

## Dependencies

```
keyboard-navigation (all items can run in parallel)
  └── No dependencies - start immediately

aria-labels
  └── keyboard-navigation (some fixes may need aria-labels too)

focus-management
  └── keyboard-navigation (focus indicators for new interactive elements)

color-contrast
  └── No dependencies - can run in parallel with keyboard fixes

semantic-html
  └── No dependencies - can run in parallel

forms-and-errors
  └── aria-labels (form labels are a subset)

dry-consolidation
  └── keyboard-navigation (patterns to consolidate must exist first)
  └── focus-management (focus styles to unify)
```

## Verification

After each fix:
1. Remove any svelte-ignore comments
2. Build passes without a11y warnings
3. Element is keyboard accessible (Tab, Enter, Space, Escape)
4. Screen reader announces element correctly

Final verification:
1. Run axe-core audit on all routes
2. Keyboard-only navigation test
3. Screen reader test (VoiceOver on macOS)

---

## Success Criteria

- [ ] Zero svelte-ignore a11y comments (2 remaining)
- [ ] Zero a11y build warnings
- [ ] All interactive elements keyboard accessible
- [ ] All interactive elements have accessible names
- [ ] Visible focus indicators throughout
- [x] Skip-to-content links on all properties (main properties + verticals have functional skip links)
- [ ] WCAG 2.1 AA color contrast compliance
- [ ] Proper heading hierarchy on all routes
- [x] Shared keyboardClick action in packages/components (`use:keyboardClick`, `use:keyboardToggle`, `use:focusTrap`)
- [x] Shared focus styles in canon.css (`.a11y-focus`, `.a11y-focus-within`, etc.)
- [x] Skip-to-content utility class used across all properties (`.skip-to-content` in main, `.skip-link` in verticals)
- [x] Toggle button pattern documented and applied consistently

### Naming Standardization (P3 - Refactoring)
- [ ] Verticals use `.skip-to-content` instead of `.skip-link` (functional, but violates DRY)

## Canon Alignment

This spec follows the Subtractive Triad:

1. **DRY**: Shared a11y utilities in packages/components (keyboardClick action, focus styles, SkipLink component, toggle pattern)
2. **Rams**: Only fixes that earn their existence—no over-engineering
3. **Heidegger**: Accessibility enables tool transparency for all users

## DRY Principle

A11y patterns must be centralized, not scattered:

| Pattern | Location | Used By |
|---------|----------|---------|
| `use:keyboardClick` | packages/components/src/lib/actions/a11y.ts | Terminal, DailyRhythm, Circulation, etc. |
| `.a11y-focus` | packages/components/styles/canon.css | All focusable elements |
| `.skip-to-content` | packages/components/styles/canon.css | All property layouts |
| Toggle button | Documented pattern | LightStudy, any toggle UI |

When adding a11y to a new component, import from shared utilities—don't duplicate.

---

## Personal Injury Vertical Audit (2025-12-18)

### Summary

The `packages/verticals/personal-injury` vertical demonstrates strong accessibility patterns with minor improvements possible.

### ✓ Compliant Patterns

| Component | Pattern | Status |
|-----------|---------|--------|
| `+layout.svelte` | Skip link (`#main-content`) | ✓ Present |
| `+layout.svelte` | Main landmark with `tabindex="-1"` | ✓ Keyboard navigation ready |
| `Navigation.svelte` | `aria-label`, `aria-expanded` on mobile menu | ✓ Screen reader friendly |
| `FAQSection.svelte` | `aria-expanded`, `aria-controls`, `role="region"` | ✓ WCAG compliant accordion |
| `TestimonialsSection.svelte` | `role="tablist"`, `aria-selected`, `aria-label` on dots | ✓ Carousel accessible |
| `HeroSection.svelte` | Decorative elements hidden with `aria-hidden="true"` | ✓ Correct |
| `ProcessSection.svelte` | Decorative connectors hidden with `aria-hidden="true"` | ✓ Correct |
| `PIIntakeForm.svelte` | Form labels associated with inputs via `id`/`for` | ✓ Screen reader friendly |
| `ProgressiveForm.svelte` | Progress indicator hidden with `aria-hidden="true"` | ✓ Correct |
| `app.css` | `.sr-only` utility, `.skip-link`, focus states | ✓ A11y utilities present |

### ⚠️ Minor Improvements (P3)

1. **Form Error Announcements**: `PIIntakeForm.svelte` error message lacks `role="alert"` or `aria-live`
   - Current: `<div class="error-message">{error}</div>`
   - Recommended: `<div class="error-message" role="alert">{error}</div>`

2. **ProgressiveForm.svelte**: Missing `aria-required="true"` on required email field
   - Current: `required` HTML attribute only
   - Recommended: Add `aria-required="true"` for screen reader clarity

3. **StickyCTA.svelte**: Lacks `role="complementary"` or similar landmark
   - Minor issue—fixed CTAs may benefit from landmark identification

4. **TestimonialsSection.svelte**: Auto-playing carousel without pause button
   - Current: Pauses on hover (mouse only)
   - Recommended: Add visible pause/play control for keyboard users (WCAG 2.2.2)

### Accessibility Features Present

| Feature | Implementation |
|---------|----------------|
| Skip-to-content link | `.skip-link` in `app.css` + `<a href="#main-content">` in layout |
| Reduced motion support | `@media (prefers-reduced-motion: reduce)` in all components |
| Focus states | `:focus-visible` with `var(--color-focus)` ring |
| Touch targets | `min-height: 44px; min-width: 44px;` on buttons/links |
| Screen reader utilities | `.sr-only` class available |
| Heading hierarchy | Single `h1` per page, proper nesting observed |
| Form accessibility | Labels associated via `id`/`for`, required fields marked |

### Canon Alignment

The vertical follows Canon accessibility philosophy:
- **Zuhandenheit**: Accessibility features recede into transparent use
- **Reduced motion**: Respects user preferences absolutely
- **Focus management**: Clear focus indicators without decorative excess
- **Semantic HTML**: Proper landmarks, headings, and ARIA where needed

### Recommended Actions

No critical fixes required. Minor improvements listed above are P3 priority (nice-to-have).
