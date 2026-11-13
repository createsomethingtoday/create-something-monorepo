---
category: "Canon"
section: "Guidelines"
title: "Theming"
description: "Create custom themes by extending Canon's design tokens. Dark mode, light mode, and brand customization patterns."
lead: "Keep the black foundation. Use an explicit light work surface and preserve semantic roles across every palette boundary."
publishedAt: "2026-01-08"
published: true
---

## Use the owning palette

Canon defaults to a black website foundation. Use the built-in theme boundary for an explicit light work surface; do not reconstruct it with a few local color overrides.

```html
<section data-theme="light">
  <h2>Review the evidence</h2>
  <p>This work surface uses the light semantic roles.</p>
  <aside data-theme="dark">A nested dark surface restores the black palette.</aside>
</section>
```

The shared scopes rebind backgrounds, foregrounds, action/state pairs and compatibility aliases together. A paper illustration does not change the owning website palette. `.cs-workspace` retains dark chrome. System preference alone does not silently turn a black public website into a light one; any theme selector is an application decision with accessible labeling and persistence owned by that application.

## Extend through an overlay

Client and property differences belong in a reviewed Canon overlay with ownership, scope and surface policy. Preserve shared primitives and semantic meaning. Verify contrast in every state and nested palette, including focus, errors, selected items and disabled controls.

The specialist operator palette remains separate and opt-in. Import `@create-something/canon/styles/operator.css`, place `data-canon-palette="operator"` on the owning surface and explicitly bind the namespaced operator roles. The attribute alone does not retheme every component.

Use the full `canon.css` import for shared base styles and local fonts. Token-only consumers own font loading and resets.

See [Colors](/canon/foundations/colors), [Accessibility](/canon/guidelines/accessibility) and [Overlays](/canon/resources/overlays).
