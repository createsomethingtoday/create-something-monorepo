---
category: "Canon"
section: "Patterns"
title: "Forms"
description: "Composed patterns for form structure, validation, and multi-step flows."
lead: "Form patterns reduce friction by standardizing structure before you customize field-level details. Reach for composition before inventing another bespoke flow."
publishedAt: "2026-04-14"
published: true
---

## Pattern Set

- `FormLayout`: shared structure for grouped fields and supporting copy
- `FormValidation`: validation framing for errors and recovery states
- `MultiStepForm`: step-based flows when a single screen would overwhelm the user

Canon also ships the field primitives these patterns compose with, including `TextField`, `TextArea`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Select`, and `Switch`.

## Import Surface

```svelte
<script lang="ts">
  import {
    FormLayout,
    FormValidation,
    MultiStepForm,
    TextField,
    CheckboxGroup
  } from '@create-something/canon';
</script>
```

## Pattern Selection

1. Use `FormLayout` when the fields are straightforward and the job is clarity.
2. Add `FormValidation` when users need fast recovery from mistakes.
3. Use `MultiStepForm` only when chunking reduces cognitive load more than it adds navigation cost.

## Documentation Status

Expanded usage examples are still being documented. For now, treat this page as the stable surface map for the form patterns that already ship in the package.

## Related

- [Loading](/canon/patterns/loading)
- [Accessibility](/canon/guidelines/accessibility)
- [Content](/canon/guidelines/content)
