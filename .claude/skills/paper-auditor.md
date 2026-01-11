# Paper Auditor

Validate paper styling against CREATE SOMETHING's standard paper template patterns.

## Philosophy

**"The infrastructure disappears; only the content remains."**

Papers should have consistent structure so readers focus on ideas, not formatting differences. This auditor ensures all papers use the standard template pattern.

## When to Use

- **Proactively**: Automatically after creating or modifying paper files
- **Manually**: `/audit-paper` or `/audit-paper path/to/paper`
- **Before publishing**: Final check before deployment

## Standard Paper Structure

Every paper in `packages/io/src/routes/papers/` must follow this structure:

### 1. SEO Meta Tags (Required)

```svelte
<svelte:head>
  <title>{Paper Title} | CREATE SOMETHING.io</title>
  <meta name="description" content="{Paper description for SEO}" />
</svelte:head>
```

**Check for**:
- Missing `<svelte:head>` block
- Missing `<title>` tag
- Missing `<meta name="description">` tag

### 2. Container Structure (Required)

```svelte
<div class="min-h-screen p-6 paper-container">
  <div class="max-w-4xl mx-auto space-y-12">
    <!-- Paper content -->
  </div>
</div>
```

**Check for**:
- Custom `max-width` values (should be `max-w-4xl` = 896px)
- Missing `paper-container` class
- Missing `min-h-screen` class
- Non-standard container nesting

### 3. Background Color (Required)

```css
.paper-container {
  background: var(--color-bg-pure);
  color: var(--color-fg-primary);
}
```

**Check for**:
- Grey backgrounds (`--color-bg-surface`, `--color-bg-subtle`, `#1a1a1a`, `#111111`)
- Custom background colors
- Missing background declaration (may inherit grey)

### 4. Standard Class Names (Required)

| Element | Required Class |
|---------|---------------|
| Main container | `paper-container` |
| Header section | `paper-header` |
| Paper ID | `paper-id` |
| Title | `paper-title` |
| Subtitle | `paper-subtitle` |
| Meta info | `paper-meta` |
| Section headings | `section-heading` |
| Subsection headings | `subsection-heading` |
| Body paragraphs | `body-text` |
| Abstract | `abstract-section` |
| Code blocks | `code-block` |
| Comparison cards | `comparison-card` |
| Metric tables | `metric-table` |

**Check for**:
- Non-standard class names for these elements
- Inline styles instead of classes
- Missing semantic class names

## Anti-Patterns to Flag

### Container Anti-Patterns

| Anti-Pattern | Correct Pattern |
|--------------|-----------------|
| `max-width: 800px` | `max-w-4xl` (896px) |
| `max-width: 65ch` | `max-w-4xl` |
| `class="container"` | `class="paper-container"` |
| `class="page-container"` | `class="paper-container"` |
| Custom wrapper divs | Standard two-div structure |

### Background Anti-Patterns

| Anti-Pattern | Correct Pattern |
|--------------|-----------------|
| `--color-bg-surface` | `--color-bg-pure` |
| `--color-bg-subtle` | `--color-bg-pure` |
| `#1a1a1a` | `var(--color-bg-pure)` |
| `#111111` | `var(--color-bg-pure)` |
| `bg-gray-900` | `paper-container` class |
| No background set | Explicit `--color-bg-pure` |

### Structure Anti-Patterns

| Anti-Pattern | Correct Pattern |
|--------------|-----------------|
| Missing `<svelte:head>` | Include with title + description |
| Inline `style` attributes | CSS classes |
| Custom CSS overrides | Standard paper classes |
| Complex nested containers | Simple two-div structure |

## Validation Workflow

### Pass 1: Structure Check

1. Does file have `<svelte:head>` with `<title>` and `<meta name="description">`?
2. Does main container use `min-h-screen p-6 paper-container`?
3. Does inner container use `max-w-4xl mx-auto space-y-12`?

### Pass 2: Background Check

1. Search for grey background tokens: `--color-bg-surface`, `--color-bg-subtle`
2. Search for hardcoded grey values: `#1a1a1a`, `#111111`, `#0a0a0a`
3. Verify `.paper-container` has `background: var(--color-bg-pure)`

### Pass 3: Class Name Check

1. Header uses `paper-header`, `paper-id`, `paper-title`
2. Sections use `section-heading`, `subsection-heading`
3. Text uses `body-text`
4. No non-standard class names for core elements

### Pass 4: Anti-Pattern Scan

Search for:
- `max-width:` with pixel values
- `max-w-` classes other than `max-w-4xl`
- Inline `style=` attributes for layout
- Custom container class names

## Audit Output Format

```
PAPER AUDIT: {paper-name}
================================================================================

STRUCTURE:
  ✅ svelte:head with title
  ✅ svelte:head with meta description
  ✅ paper-container class present
  ✅ max-w-4xl container width
  ❌ Missing paper-header class

BACKGROUND:
  ✅ Uses --color-bg-pure
  ❌ Found --color-bg-surface on line 45

CLASSES:
  ✅ section-heading used for sections
  ❌ Uses custom "page-title" instead of "paper-title"

ANTI-PATTERNS:
  ❌ Line 23: max-width: 800px (should be max-w-4xl)
  ❌ Line 67: inline style attribute

VERDICT: ❌ NEEDS FIXES (4 issues found)

SUGGESTED FIXES:
1. Add paper-header class to header section
2. Change --color-bg-surface to --color-bg-pure on line 45
3. Rename "page-title" to "paper-title"
4. Replace max-width: 800px with max-w-4xl class
```

## Reference Paper

Use `packages/io/src/routes/papers/haiku-optimization/+page.svelte` as the canonical reference for correct paper structure.

## Pre-Publish Checklist

- [ ] `<svelte:head>` with title and meta description?
- [ ] Container uses `min-h-screen p-6 paper-container`?
- [ ] Inner container uses `max-w-4xl mx-auto space-y-12`?
- [ ] Background is `--color-bg-pure` (pure black)?
- [ ] Header uses `paper-header`, `paper-id`, `paper-title`?
- [ ] Sections use `section-heading`?
- [ ] Body text uses `body-text`?
- [ ] No inline styles for layout?
- [ ] No custom max-width values?
- [ ] No grey background tokens?

## Integration

This skill connects to:
- `canon-maintenance` — CSS token compliance
- `voice-validator` — Content voice compliance
- `audit-canon` — Visual Canon compliance

## Proactive Trigger

This skill runs automatically when:
- Files in `packages/io/src/routes/papers/**/*.svelte` are created or modified
- Detected via PostToolUse hook on Write/Edit operations

To disable proactive checking, use `--no-audit` flag when creating papers.
