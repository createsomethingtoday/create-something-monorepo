# Agents: @create-something/judgment-layer

## Agent Entry

- Start with `README.md` for the CLI and policy workflow.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoints: `src/cli.ts`, `src/policy/load.ts`, `src/checks/eval.ts`.

## Validation

- Boot: `pnpm dev`
- Smoke: `pnpm check && pnpm test`
- Escalate if policy, approval, or Andon behavior cannot be traced to artifacts or operator choice.
