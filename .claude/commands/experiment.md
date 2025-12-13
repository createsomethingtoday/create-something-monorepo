# Experiment Scaffold

Generate a new experiment following CREATE SOMETHING methodology.

## Required Information

Before scaffolding, gather:
1. **Experiment name** (slug format, e.g., "motion-ontology")
2. **Property** (.space or .io)
3. **Hypothesis** (testable claim)
4. **Key metric** (one number that captures value)

## Structure to Generate

Every experiment must include these sections in order:

### 1. ASCII Art Header
```
╔══════════════════════════════════════════╗
║  EXPERIMENT: [Name]                      ║
║  [Key Metric]: [Value]                   ║
║  createsomething.[property]              ║
╚══════════════════════════════════════════╝
```

### 2. Hypothesis
- Testable claim
- Success criteria with checkboxes (3-5 measurable criteria)

### 3. Methodology
- What was built
- How it was measured
- Time boundaries

### 4. Results
- Metrics table (Target | Actual | Status)
- Success criteria outcomes (✓/△/✗)

### 5. Honest Assessment
- What This Proves (bounded claims)
- What This Doesn't Prove (limitations)
- Where Intervention Was Needed (failures, manual work)

### 6. Reproducibility
- Prerequisites checklist
- Starting prompt (exact)
- Expected challenges with mitigations

### 7. Canonical Connection
- Master cited (Rams/Heidegger/Tufte/Eames/Mies)
- Principle quoted
- Link to .ltd pattern

### 8. Outcome Declaration
- ✓ VALIDATED or ✗ INVALIDATED
- Evidence summary
- What's next

## Files to Create

For property `[prop]` with slug `[slug]`:

1. **Route**: `packages/[prop]/src/routes/experiments/[slug]/+page.svelte`
2. **Server** (if needed): `packages/[prop]/src/routes/experiments/[slug]/+page.server.ts`
3. **Config**: Add entry to `packages/[prop]/src/lib/config/fileBasedExperiments.ts`

## CSS Pattern

Use Canon pattern: Tailwind for layout, CSS variables for design.

```svelte
<div class="flex flex-col gap-8 p-8">
  <header class="experiment-header">...</header>
</div>

<style>
  .experiment-header {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }
</style>
```

## Voice Requirements

- **No marketing language** — "Not interesting. Not novel. Useful."
- **Honest failures** — Document what didn't work
- **Reproducible** — Someone else can run this
- **Connected** — Link to .ltd patterns and masters

## Execute

Read the `experiment-scaffold` skill at `.claude/skills/experiment-scaffold.md` for full reference, then:

1. Ask for experiment name, property, hypothesis, and key metric
2. Create the route structure
3. Generate the page following all sections
4. Add entry to fileBasedExperiments.ts
5. Verify it builds
