---
name: code-quality-workflow
description: Follow the CREATE SOMETHING code-quality workflow in Pi. Use for implementation, bug fixing, refactors, test repair, typecheck cleanup, and narrow code-quality tasks.
---

# Code-Quality Workflow

Use this skill when the task is primarily about changing code safely and validating the result with the narrowest trustworthy evidence.

## Start Here

1. Read `AGENTS.md`.
2. Read `docs/guides/PI_WORKFLOW.md`.
3. Read `automation/pi/code-quality/README.md`.
4. If the task is tracked in Loom, fetch the task details before editing.

## Working Rules

- Identify the primary tier before changing code:
  - Database
  - Automation
  - Judgment
- Verify exports, symbols, and import paths before using them.
- Prefer the smallest safe patch over speculative cleanup.
- Preserve unrelated changes in the worktree.
- Use repo tasks and existing scripts before inventing custom command chains.

## Validation Order

Prefer the narrowest trustworthy surface:

1. targeted package or file validation
2. `pnpm check` or the smallest relevant lane check
3. `pnpm lint`
4. `pnpm test`

When code touches agent legibility, harness, or workflow surfaces, include the most specific supporting check available.

## Review Standard

- Confirm the change actually satisfies the task, not just the compiler.
- Look for behavioral regressions, missing tests, and workflow breakage.
- If the task is a review, findings come first.

## Anti-Patterns

- Do not widen scope because a nearby cleanup is tempting.
- Do not replace a repo task with an improvised shell sequence when the task already exists.
- Do not mark work done without explicit validation evidence.

## Finish

End with a concise operator summary:

- changed files
- commands run
- remaining risks or follow-ups
