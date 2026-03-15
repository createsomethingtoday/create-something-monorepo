---
category: "Canon"
section: "Foundations"
title: "Motion"
description: "Canon motion system: timing, easing, and animation principles for purposeful motion."
lead: "Motion should be purposeful, not decorative. Animation reveals state changes and guides attention. When in doubt, don't animate."
publishedAt: "2026-01-08"
published: true
---

## Motion Philosophy

Every animation must answer: what does this communicate that stillness cannot? Motion exists to reduce cognitive load, not increase visual complexity.

<div class="principles-grid">
<div class="principle-card">
<h4>Purposeful</h4>
<p>Motion communicates state change. No decorative animation.</p>
</div>
<div class="principle-card">
<h4>Subtle</h4>
<p>Users should feel the effect, not notice the animation.</p>
</div>
<div class="principle-card">
<h4>Consistent</h4>
<p>One easing curve for coherent motion language.</p>
</div>
<div class="principle-card">
<h4>Reducible</h4>
<p>Always respect <code>prefers-reduced-motion</code>.</p>
</div>
</div>

## Duration Tokens

Five duration levels from instant feedback to deliberate reveals.

| Token | Value | Use Case |
|-------|-------|----------|
| `--duration-instant` | 0ms | Immediate state changes |
| `--duration-micro` | 100ms | Hover states, button feedback |
| `--duration-fast` | 200ms | Tooltips, dropdowns |
| `--duration-normal` | 300ms | Modal transitions, page elements |
| `--duration-slow` | 500ms | Complex reveals, hero animations |

## Easing

Canon uses a single easing curve for consistency:

```css
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
```

This is Material Design's standard easing—quick acceleration, gradual deceleration. It feels natural because it mimics physical motion.

## Accessibility

Always respect user preferences:

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

## Usage Examples

### Button Hover

```css
.button {
  transition: all var(--duration-micro) var(--ease-standard);
}

.button:hover {
  transform: translateY(-1px);
}
```

### Modal Entrance

```css
.modal {
  animation: fadeIn var(--duration-normal) var(--ease-standard);
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

### Dropdown

```css
.dropdown {
  transition: opacity var(--duration-fast) var(--ease-standard),
              transform var(--duration-fast) var(--ease-standard);
}

.dropdown[data-state="closed"] {
  opacity: 0;
  transform: translateY(-4px);
}
```
