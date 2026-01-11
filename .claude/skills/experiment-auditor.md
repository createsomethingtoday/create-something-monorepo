# Experiment Auditor

Validate experiment styling and structure for CREATE SOMETHING's .space property.

## Philosophy

**"Experiments explore; production delivers."**

Experiments have more flexibility than papers—they're creative explorations. But they still need consistent infrastructure: SEO tags, Canon tokens, and tracking. This auditor ensures experiments maintain baseline quality while preserving creative freedom.

## When to Use

- **Proactively**: Automatically after creating or modifying experiment files
- **Manually**: `/audit-experiment` or `/audit-experiment path/to/experiment`
- **Before publishing**: Final check before deployment

## Experiment Structure Requirements

Every experiment in `packages/space/src/routes/experiments/` must include:

### 1. SEO Meta Tags (Required)

```svelte
<svelte:head>
  <title>{Experiment Title} | CREATE SOMETHING.space</title>
  <meta name="description" content="{Experiment description for SEO}" />
</svelte:head>
```

**Check for**:
- Missing `<svelte:head>` block
- Missing `<title>` tag
- Missing `<meta name="description">` tag

### 2. Container Width (Required)

Experiments should use consistent max-width:

```svelte
<div class="max-w-4xl mx-auto">
  <!-- Experiment content -->
</div>
```

**Check for**:
- Custom `max-width` pixel values (should use `max-w-4xl` or similar)
- Missing container width constraints

### 3. Canon CSS Tokens (Required)

All styling should use Canon tokens, not Tailwind design utilities:

```css
/* Good: Canon tokens */
.element {
  color: var(--color-fg-primary);
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
}

/* Bad: Tailwind design utilities */
<div class="bg-white/10 text-white/60 rounded-lg">
```

**Check for**:
- `bg-white`, `bg-black`, `bg-gray-*`, `bg-slate-*`
- `text-white`, `text-black`, `text-gray-*`
- `rounded-*` (except `rounded-none`)
- `shadow-*` (except `shadow-none`)
- Hardcoded hex/rgb colors

### 4. Experiment Tracking (Encouraged)

Experiments should track engagement for research:

```typescript
function trackExperiment(action: string, data?: Record<string, unknown>) {
  // Analytics tracking
}
```

**Check for**:
- Missing tracking function (warning, not error)
- Track function present but unused

## Validation Workflow

### Pass 1: Structure Check

1. Does file have `<svelte:head>` with `<title>` and `<meta name="description">`?
2. Does content use `max-w-4xl` or similar container?

### Pass 2: Canon Compliance

1. Search for Tailwind design utilities that should be Canon tokens
2. Search for hardcoded color values
3. Verify CSS uses `var(--color-*)`, `var(--radius-*)`, etc.

### Pass 3: Best Practices

1. Tracking function present?
2. Accessibility considerations (alt text, aria labels)?
3. Reduced motion support for animations?

## Audit Output Format

```
EXPERIMENT AUDIT: {experiment-name}
================================================================================

STRUCTURE:
  ✅ svelte:head with title
  ✅ svelte:head with meta description
  ✅ Container uses max-w-4xl

CANON COMPLIANCE:
  ✅ Uses Canon color tokens
  ❌ Found bg-white/10 on line 45 (use --color-bg-surface)
  ❌ Found rounded-lg on line 67 (use var(--radius-lg))

BEST PRACTICES:
  ⚠️ No tracking function found (consider adding for research)
  ✅ Includes prefers-reduced-motion support

VERDICT: ⚠️ NEEDS REVIEW (2 Canon violations, 1 warning)

SUGGESTED FIXES:
1. Replace bg-white/10 with Canon token on line 45
2. Replace rounded-lg with var(--radius-lg) on line 67
3. Consider adding experiment tracking function
```

## Anti-Patterns to Flag

### Canon Violations

| Anti-Pattern | Correct Pattern |
|--------------|-----------------|
| `bg-white/10` | `var(--color-bg-surface)` |
| `bg-gray-900` | `var(--color-bg-subtle)` |
| `text-white/60` | `var(--color-fg-tertiary)` |
| `rounded-lg` | `var(--radius-lg)` |
| `shadow-md` | `var(--shadow-md)` |
| `#1a1a1a` | `var(--color-bg-subtle)` |

### Structure Violations

| Anti-Pattern | Correct Pattern |
|--------------|-----------------|
| Missing `<svelte:head>` | Include with title + description |
| `max-width: 800px` | Use `max-w-4xl` class |
| No container width | Wrap in `max-w-4xl mx-auto` |

## Flexibility vs Papers

Unlike papers, experiments:
- Don't require `paper-container`, `paper-header`, `paper-title` classes
- Can have varied layouts and structures
- May include interactive elements, animations, games
- Should still use Canon tokens for styling

**The key difference**: Papers are documentation. Experiments are exploration. Structure is flexible; styling consistency is not.

## Pre-Publish Checklist

- [ ] `<svelte:head>` with title and meta description?
- [ ] Container uses `max-w-4xl` or similar?
- [ ] Colors use Canon tokens (`--color-*`)?
- [ ] Border radius uses Canon tokens (`--radius-*`)?
- [ ] Shadows use Canon tokens (`--shadow-*`)?
- [ ] No Tailwind design utilities for colors?
- [ ] Tracking function included (optional but encouraged)?
- [ ] Animations respect `prefers-reduced-motion`?

## Integration

This skill connects to:
- `canon-maintenance` — CSS token compliance
- `check-canon.sh` — PostToolUse hook for Canon tokens
- `paper-auditor` — Similar pattern for papers

## Proactive Trigger

This skill runs automatically when:
- Files in `packages/space/src/routes/experiments/**/*.svelte` are created or modified
- Detected via PostToolUse hook on Write/Edit operations

## Reference Experiments

Good examples to reference:
- `packages/space/src/routes/experiments/subtractive-form/+page.svelte`
- `packages/space/src/routes/experiments/hermeneutic-debugging/+page.svelte`
