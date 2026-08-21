# Agents: @create-something/symphony

## Agent Entry

- Start with `README.md` for the runtime overview.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoints: `src/cli.js`, `src/orchestrator.js`, `src/tracker/linear.js`, `src/canonical-harness-gate.js`, `src/executor-routing-contract.js`.

## Validation

- Boot: `node src/cli.js ../../automation/symphony/code-quality/WORKFLOW.md --once`
- Smoke: `pnpm check && pnpm test`
- Use Infisical for `LINEAR_API_KEY` when running against live Linear work.
