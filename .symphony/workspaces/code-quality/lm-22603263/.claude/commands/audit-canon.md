---
description: Run Canon compliance check on current file or directory
allowed-tools: Read, Grep, Glob
---

# Audit Canon Command

Run CSS Canon compliance check.

## Usage

```
/audit-canon [path]
```

## What It Checks

Violations of "Tailwind for structure, Canon for aesthetics":

### Should Use Canon Tokens (Violations)

- `rounded-*` → `var(--radius-sm/md/lg/xl/full)`
- `bg-white`, `bg-black`, `bg-gray-*` → `var(--color-bg-*)`
- `text-white`, `text-gray-*` → `var(--color-fg-*)`
- `shadow-*` → `var(--shadow-sm/md/lg)`
- `text-xs`, `text-sm`, `text-lg` → `var(--text-body-sm)`, `var(--text-caption)`, etc.
- `border-white/*` → `var(--color-border-default/emphasis)`

### Acceptable (Layout Utilities)

- `flex`, `grid`, `items-*`, `justify-*`
- `p-*`, `m-*`, `gap-*`, `space-*`
- `w-*`, `h-*`, `min-*`, `max-*`
- `relative`, `absolute`, `fixed`

## Output Format

```markdown
## Canon Audit: [path]

### Violations (N)

1. **[file:line]**: `bg-white` → Use `var(--color-fg-primary)`
2. **[file:line]**: `rounded-lg` → Use `var(--radius-lg)`

### Suggested Fix

Move design utilities to `<style>` block:

```css
.element {
  background: var(--color-fg-primary);
  border-radius: var(--radius-lg);
}
```

### Reference

See `.claude/memory/css-canon.md` for full token reference.
```

## Scope

- No argument: Current file or directory
- File path: Specific file
- Directory: All `.svelte`, `.css`, `.tsx` files
