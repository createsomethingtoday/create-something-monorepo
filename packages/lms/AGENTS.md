# Agents: @create-something/lms

## Agent Entry

- Start with `README.md` for learning-platform scope.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoints: `src/routes/+page.svelte`, `src/routes/paths/+page.svelte`, `src/routes/progress/+page.svelte`.

## Validation

- Boot: `pnpm dev`
- Smoke: `pnpm check`
- Escalate if learner identity, D1 progress state, or curriculum semantics cannot be validated.
