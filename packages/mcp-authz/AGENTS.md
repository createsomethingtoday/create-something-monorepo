# Agents: @create-something/mcp-authz

## Agent Entry

- Start with `README.md` for authorization scope.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoints: `src/index.ts`, `src/evaluate.ts`, `src/policies.ts`.

## Validation

- Boot: `pnpm build`
- Smoke: `pnpm check && pnpm test`
- Escalate if an authorization decision cannot be traced to request, manifest, rollout mode, and event evidence.
