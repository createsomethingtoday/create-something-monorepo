---
description: Run Canon compliance check on current file or directory
argument-hint: "[path]"
---

# Canon Compliance Audit

Audit `$@` for Canon design system compliance.

## Rule: Tailwind for Structure, Canon for Aesthetics

**Tailwind is allowed for**: `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `w-*`, `h-*`, `items-*`, `justify-*`, `space-y-*`, `max-w-*`, `mx-auto`

**Canon tokens required for**: colors, radius, shadows, typography, borders

## Violations to Detect

### Background Colors
- `bg-white`, `bg-black`, `bg-gray-*`, `bg-slate-*`, `bg-zinc-*` → Use `var(--color-bg-*)`

### Text Colors
- `text-white`, `text-black`, `text-gray-*`, `text-slate-*` → Use `var(--color-fg-*)`

### Border Radius
- `rounded-sm`, `rounded-md`, `rounded-lg`, etc. → Use `var(--radius-*)`

### Shadows
- `shadow-sm`, `shadow-md`, `shadow-lg`, etc. → Use `var(--shadow-*)`

### Typography Sizes
- `text-xs`, `text-sm`, `text-base`, `text-lg`, etc. → Use `var(--text-*)`

### Border Colors
- `border-white`, `border-gray-*`, etc. → Use `var(--color-border-*)`

### Hardcoded Colors
- Any `#hex` values in `<style>` blocks → Use `var(--color-*)`

## Token Reference

Source of truth: `packages/components/src/lib/styles/tokens.css`

## Output Format

```
## Canon Audit: [path]

### Violations (N)
1. **[file:line]**: `bg-gray-800` → Use `var(--color-bg-surface)`
2. **[file:line]**: `rounded-lg` → Use `var(--radius-lg)` in `<style>` block

### Passing (N files clean)
```

Scan all `.svelte`, `.css`, `.html`, `.tsx`, `.jsx` files. Skip `node_modules`, `.svelte-kit`, `dist`, `build`.
