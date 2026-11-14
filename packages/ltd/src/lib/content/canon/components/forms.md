---
category: "Canon"
section: "Components"
title: "Advanced Forms"
description: "Candidate form patterns that build on the stable form controls."
lead: "Advanced form components cover higher-level input workflows. Use stable form controls first, then reach for candidates when the interaction needs more structure."
publishedAt: "2026-07-05"
published: true
---

## What Ships Today

- `FormField`
- `Combobox`
- `DatePicker`
- `FileUpload`
- `OTPInput`

## Selection Rules

1. Start with stable text, select, checkbox, radio, and switch controls.
2. Use advanced candidates when keyboard behavior, validation, and fallback states are understood.
3. Keep errors and required evidence visible.

Give `Combobox` a descriptive `ariaLabel` that matches its visible field heading,
such as "Destination". The keyboard highlight identifies the option being
explored; the checkmark identifies the committed value. Enter commits the
highlighted option, while Escape closes the menu and preserves the prior value.
The highlighted option needs a visible cue in both owning palettes and forced
colors, as well as a valid active-descendant relationship for assistive technology.

## Related

- [Form Controls](/canon/components/form)
- [Patterns](/canon/components/patterns)
- [Accessibility](/canon/guidelines/accessibility)
