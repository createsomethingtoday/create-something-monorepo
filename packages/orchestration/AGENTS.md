# Agents: @create-something/orchestration

## Agent Entry

- Start with `README.md` for CLI workflows and package scope.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoints: `src/bin/orch.ts`, `src/session/lifecycle.ts`, `src/coordinator/convoy.ts`.

## Validation

- Boot: `pnpm dev`
- Smoke: `pnpm test`
- Escalate if checkpoint, convoy, worker, cost, or postmortem state lacks a durable source of truth.
