# Agents: @create-something/policy-os-engine

## Agent Entry

- Start with `README.md` for compiler and evaluator scope.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoints: `src/index.ts`, `src/compile.ts`, `src/hybrid.ts`.

## Validation

- Boot: `pnpm build`
- Smoke: `pnpm check && pnpm test`
- Escalate if local and primary decisions diverge without rollout, mismatch, or fallback evidence.
