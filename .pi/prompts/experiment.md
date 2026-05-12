---
description: Scaffold a new experiment following CREATE SOMETHING methodology
argument-hint: "<slug>"
---

# Experiment: $1

Scaffold a new experiment at `packages/space/src/routes/experiments/$1/+page.svelte`.

## Required Information

Before scaffolding, gather:
1. **Experiment name**: `$1`
2. **Property**: .space or .io
3. **Hypothesis**: testable claim
4. **Key metric**: one number that captures value

## Required Sections

### 1. ASCII Art Header
```
╔══════════════════════════════════════════╗
║  EXPERIMENT: [Name]                      ║
║  [Key Metric]: [Value]                   ║
║  createsomething.[property]              ║
╚══════════════════════════════════════════╝
```

### 2. Hypothesis — Testable claim with 3-5 measurable success criteria
### 3. Methodology — What was built, how measured, time boundaries
### 4. Results — Metrics table (Target | Actual | Status)
### 5. Honest Assessment — What This Proves / What This Doesn't Prove / Where Intervention Was Needed
### 6. Reproducibility — Prerequisites, starting prompt, expected challenges
### 7. Canonical Connection — Master cited, principle quoted, link to .ltd
### 8. Outcome Declaration — VALIDATED or INVALIDATED with evidence

## CSS Pattern

Tailwind for layout, Canon CSS variables for design:
```svelte
<style>
  .experiment-header {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }
</style>
```

## Voice Requirements

- No marketing language
- Honest failures documented
- Reproducible by others
- Connected to .ltd patterns and masters

## Steps

1. Create route structure
2. Generate page following all sections
3. Add entry to `packages/space/src/lib/config/fileBasedExperiments.ts`
4. Verify it builds
