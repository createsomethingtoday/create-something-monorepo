---
category: "Canon"
section: "Guidelines"
title: "Accessibility"
description: "WCAG 2.1 AA accessibility guidelines for the Canon Design System"
lead: "Accessibility is not a feature—it's a foundation. Use the shared controls and verify WCAG AA requirements in the consuming surface."
publishedAt: "2026-01-08"
published: true
---

## Color Contrast

Use a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text. Verify actual foreground/background pairs in each owning palette and interaction state; a token name alone does not establish conformance. Subtle roles and separator borders are not general-purpose informational text or control boundaries.

### Clear Proof and Status Surfaces

Performance Lab clear surfaces often show workflow state, receipts, validation gates, and approval
boundaries. Do not communicate those states with color alone.

Every proof or status surface must include:

- a visible text label such as `Review`, `Blocked`, `Ready`, or `Validated`
- a semantic region or heading when the proof object is a major page section
- keyboard-reachable actions for any approval, review, receipt, or handoff link
- live-region behavior only for meaningful state changes, not decorative rotation

## Focus Management

All interactive elements must have visible focus indicators. Canon uses a consistent focus ring system.

```css
/* Standard focus pattern */
.interactive:focus-visible {
  outline: 2px solid var(--color-performance-focus);
  outline-offset: 2px;
}

/* High contrast mode enhancement */
@media (prefers-contrast: more) {
  .interactive:focus-visible {
    outline: 3px solid var(--color-performance-focus);
    outline-offset: 3px;
  }
}
```

### Focus Order

- Focus order must follow visual reading order
- Never use `tabindex` greater than 0
- Modal dialogs must trap focus within the modal
- Skip links should be provided for complex layouts

## Semantic HTML

Use the correct HTML elements for their intended purpose. Semantic markup provides meaning to assistive technologies.

| Do | Don't |
|----|-------|
| `<button>Submit</button>` | `<div onclick="...">Submit</div>` |
| `<nav aria-label="Main">` | `<div class="nav">` |

### Landmark Regions

- `<header>` or `role="banner"` for page header
- `<nav>` or `role="navigation"` for navigation
- `<main>` or `role="main"` for main content
- `<footer>` or `role="contentinfo"` for page footer

## ARIA Patterns

Use ARIA attributes to enhance accessibility, but remember: **no ARIA is better than bad ARIA**.

### Live Regions

Use live regions to announce dynamic content changes to screen readers.

```html
<!-- For important updates -->
<div aria-live="polite" role="status">
  Status message here
</div>

<!-- For urgent alerts -->
<div aria-live="assertive" role="alert">
  Error message here
</div>
```

### Common ARIA Patterns

| Pattern | Attributes | Use Case |
|---------|------------|----------|
| Disclosure | `aria-expanded`, `aria-controls` | Accordion, dropdown |
| Modal | `role="dialog"`, `aria-modal` | Dialog boxes |
| Tabs | `role="tablist"`, `aria-selected` | Tab interfaces |
| Loading | `aria-busy`, `aria-describedby` | Loading states |

## Reduced Motion

Respect users who prefer reduced motion. Verify that the consuming surface retains meaning and available actions with reduced motion.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Tip:** Use `transition` instead of `animation` when possible—transitions are easier to disable and more performant.

## High Contrast Mode

Test `prefers-contrast: more` and forced-colors on the consuming surface. Preserve visible focus, control boundaries and textual state labels. Do not infer support from a static token table.

## Checklist

Use this checklist when building with Canon components.

### Perceivable
- Meaningful images have concise descriptions; decorative images have empty alt text or no redundant accessible name
- Color is not the only way to convey information
- Text contrast meets 4.5:1 minimum
- Content is readable at 200% zoom

### Operable
- All functionality available via keyboard
- Focus indicators are visible
- No keyboard traps exist
- Users can pause/stop animations

### Understandable
- Language is declared on the page
- Navigation is consistent
- Error messages are descriptive
- Labels are associated with inputs

### Robust
- Valid HTML structure
- ARIA attributes used correctly
- Works with assistive technologies
- Tested with screen readers
