---
category: "Canon"
section: "Foundations"
title: "Elevation"
description: "Canon layering: solid surfaces and borders, with optional shadows for real depth relationships."
lead: "Solid surfaces and borders establish grouping. Use the shadow scale when an overlay needs a clear depth relationship."
publishedAt: "2026-01-08"
published: true
---

## Shadow Scale

Three levels of elevation for clear visual hierarchy.

| Token | Use |
|-------|-----|
| `--shadow-performance-scale-sm` | Buttons, inputs, subtle lift |
| `--shadow-performance-scale-md` | Cards, dropdowns |
| `--shadow-performance-scale-lg` | Modals, popovers |

## Solid surfaces first

Shared Card surfaces use solid fills and fine borders, with no default elevated shadow. Use the shadow scale only when a real overlay or depth relationship needs it. Exact values are owned by the canonical token files, not copied into a route.

## Layering

A modal needs focus containment, Escape behavior and focus restoration in addition to visual separation. Z-index does not establish modal semantics or permission to act.

## Z-Index Scale

Consistent stacking order for overlapping elements.

| Token | Use |
| --- | --- |
| `--z-performance-dropdown` | Dropdowns |
| `--z-performance-modal` | Modal layer |
| `--z-performance-popover` | Popovers |
| `--z-performance-tooltip` | Tooltips |

## Best practices

Use the lightest treatment that makes a relationship clear. Preserve readable borders on black and explicit light surfaces. Avoid automatic lift or glow as decoration. Controls use soft-square geometry; artwork frames remain square. Verify stacking contexts and keyboard access on the actual page.
