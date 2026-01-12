---
category: "Canon"
section: "Guidelines"
title: "Accessibility"
description: "WCAG 2.1 AA accessibility guidelines for the Canon Design System"
lead: "Accessibility is not a feature—it's a foundation. Every component in Canon is built to WCAG 2.1 AA standards, ensuring all users can interact with your interfaces."
publishedAt: "2026-01-08"
published: true
---

## Color Contrast

All text in the Canon system meets WCAG AA contrast requirements. The minimum ratio is 4.5:1 for normal text and 3:1 for large text.

| Text Type | Ratio | Token |
|-----------|-------|-------|
| Primary Text | 21:1 | `--color-fg-primary` |
| Secondary Text | 13.7:1 | `--color-fg-secondary` |
| Muted Text | 4.56:1 | `--color-fg-muted` |

**Note:** `--color-fg-subtle` (0.2 opacity) does not meet AA contrast and should only be used for decorative elements, never for informational content.

## Focus Management

All interactive elements must have visible focus indicators. Canon uses a consistent focus ring system.

```css
/* Standard focus pattern */
.interactive:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* High contrast mode enhancement */
@media (prefers-contrast: more) {
  .interactive:focus-visible {
    outline: 3px solid var(--color-focus);
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

Respect users who prefer reduced motion. All animations in Canon include reduced motion alternatives.

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

Canon supports `prefers-contrast: more` with enhanced visibility tokens.

| Token | Standard | High Contrast |
|-------|----------|---------------|
| `--color-fg-muted` | 0.46 opacity | 0.75 opacity |
| `--color-border-default` | 0.1 opacity | 0.3 opacity |
| `--color-focus` | 0.5 opacity | 0.9 opacity |

## Checklist

Use this checklist when building with Canon components.

### Perceivable
- All images have descriptive alt text
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
