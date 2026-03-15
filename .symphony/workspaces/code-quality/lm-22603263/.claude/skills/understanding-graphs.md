---
name: understanding-graphs
description: Create and maintain UNDERSTANDING.md files—minimal, human-readable dependency graphs that capture understanding-critical relationships
category: knowledge-management
triggers:
  - "onboarding"
  - "create UNDERSTANDING.md"
  - "document package"
  - "knowledge transfer"
related:
  - graph-relationship-audit
composable: false
priority: P2
---

# Understanding Graphs

Create minimal, human-readable dependency documentation.

## Philosophy

**"Less, but better"** — applied to documentation.

Not every dependency matters. Not every file needs explanation. **Document only what's understanding-critical.**

## Format

```markdown
# UNDERSTANDING.md

## Core Concepts

[3-5 sentences explaining the system's purpose]

## Critical Paths

### Path 1: [User Action → Result]
file-a.ts → file-b.ts → file-c.ts
Why: [Why this path matters]

## Key Files

### [file-name.ts]
**Purpose**: [One sentence]
**Depends on**: [Critical deps only]
**Used by**: [Critical consumers only]

## Traps

### [Common Mistake 1]
**Problem**: [What goes wrong]
**Solution**: [How to avoid]
```

## What to Include

### Include (Understanding-Critical)

✅ Files that orchestrate multiple modules
✅ Non-obvious relationships
✅ Counter-intuitive patterns
✅ Common mistakes
✅ Onboarding bottlenecks

### Exclude (Noise)

❌ Standard library imports
❌ Self-explanatory utilities
❌ Complete dependency trees
❌ Implementation details

## Example: Monorepo

```markdown
# UNDERSTANDING.md: CREATE SOMETHING Monorepo

## Core Concepts

This is a pnpm monorepo with 4 properties:
- **space** → Practice (experiments)
- **io** → Research (papers, tools)
- **agency** → Services (client work)
- **ltd** → Philosophy (canon, ethos)

Shared code in **components** package. All SvelteKit on Cloudflare Pages.

## Critical Paths

### Path 1: User visits .space experiment
src/routes/experiments/[slug]/+page.svelte
→ src/lib/config/fileBasedExperiments.ts
→ packages/components (shared UI)

### Path 2: Deploy a property
packages/[property]/
→ `pnpm build` → .svelte-kit/cloudflare/
→ wrangler pages deploy (WezTerm)

## Traps

### Trap 1: Tailwind design utilities
**Problem**: PostToolUse hook fails with Canon violation
**Solution**: Use var(--color-*), var(--radius-*) in <style> blocks
```

## When to Use

- **Onboarding** — Generate for unfamiliar codebases
- **Complex packages** — Clarify non-obvious relationships
- **Post-refactor** — Update after structure changes
- **Knowledge transfer** — Before team transitions
