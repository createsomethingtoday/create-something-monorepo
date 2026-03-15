---
category: "Canon"
section: "Foundations"
title: "Elevation"
description: "Canon elevation system: shadows and layering for visual hierarchy."
lead: "Depth creates hierarchy. Three shadow levels establish visual relationships between elements."
publishedAt: "2026-01-08"
published: true
---

## Shadow Scale

Three levels of elevation for clear visual hierarchy.

| Token | Use |
|-------|-----|
| `--shadow-sm` | Buttons, inputs, subtle lift |
| `--shadow-md` | Cards, dropdowns |
| `--shadow-lg` | Modals, popovers |

## Shadow Values

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
             0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 
             0 4px 6px -2px rgba(0, 0, 0, 0.05);
```

## Usage Patterns

### Cards

```css
.card {
  box-shadow: var(--shadow-md);
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Modals

```css
.modal {
  box-shadow: var(--shadow-lg);
}
```

### Buttons

```css
.button {
  box-shadow: var(--shadow-sm);
}

.button:active {
  box-shadow: none;
}
```

## Z-Index Scale

Consistent stacking order for overlapping elements.

| Token | Value | Use |
|-------|-------|-----|
| `--z-dropdown` | 100 | Dropdowns, tooltips |
| `--z-modal` | 200 | Modal dialogs |
| `--z-toast` | 300 | Toast notifications |
| `--z-tooltip` | 400 | Tooltips on top |

## Best Practices

1. **Use sparingly** - Not every element needs elevation
2. **Maintain hierarchy** - Higher z-index = more shadow
3. **Animate transitions** - Smooth shadow changes on hover
4. **Dark mode** - Shadows less visible; use borders instead

```css
/* Elevation transition */
.card {
  transition: box-shadow var(--duration-fast) var(--ease-standard),
              transform var(--duration-fast) var(--ease-standard);
}
```
