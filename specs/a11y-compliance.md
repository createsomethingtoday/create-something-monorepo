# CREATE SOMETHING A11y Compliance

## Philosophy

Accessibility is not accommodation—it's Zuhandenheit for all users. When tools work for everyone, they truly recede into transparent use. A keyboard user shouldn't notice they're using a keyboard. A screen reader user shouldn't notice they're using a screen reader. The tool disappears; only the work remains.

**Principle**: Accessibility enables dwelling. Inaccessibility creates breakdown.

## Current State

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
- Skip-to-content links
- Heading hierarchy
- Form labels and error states
- Image alt text

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

- P2: Audit error state announcements
  - Errors should be announced to screen readers
  - Use aria-live or aria-describedby

- P3: Audit required field indicators
  - Use aria-required
  - Visual indicator should not be color-only

### dry-consolidation (4)

Consolidate repeated a11y patterns into shared utilities. Subtractive Triad: DRY level.

- P1: Create keyboardClick Svelte action
  - Location: packages/components/src/lib/actions/a11y.ts
  - Handle Enter/Space key events for click-equivalent
  - Handle Escape for dismissal
  - Export as `use:keyboardClick`
  - Refactor Terminal, DailyRhythm, Circulation to use it

- P1: Create shared focus styles in canon.css
  - Add `.a11y-focus` utility class
  - Add `.a11y-focus-within` for container focus
  - Use var(--color-focus) token consistently
  - Remove duplicated focus styles from individual components

- ~~P2: Create SkipLink component~~ ✓ DONE (as CSS utility instead)
  - ~~Location: packages/components/src/lib/components/SkipLink.svelte~~ → CSS class in canon.css
  - ~~Visually hidden until focused~~ → .skip-to-content class
  - ~~Configurable target (default: #main-content)~~ → Simple anchor links in layouts
  - ~~Use across all property layouts~~ → Added to io, ltd, space, agency

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

- [ ] Zero svelte-ignore a11y comments
- [ ] Zero a11y build warnings
- [ ] All interactive elements keyboard accessible
- [ ] All interactive elements have accessible names
- [ ] Visible focus indicators throughout
- [x] Skip-to-content links on all properties
- [ ] WCAG 2.1 AA color contrast compliance
- [ ] Proper heading hierarchy on all routes
- [ ] Shared keyboardClick action in packages/components
- [ ] Shared focus styles in canon.css (no per-component duplication)
- [x] Skip-to-content utility class used across all properties
- [x] Toggle button pattern documented and applied consistently

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
