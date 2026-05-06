# Agents: @create-something/mcp-core

## Agent Entry

- Start with `README.md` for the package contract.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoints: `src/index.ts`, `src/server.ts`, `src/context.ts`.

## Validation

- Boot: `pnpm dev`
- Smoke: `pnpm typecheck && pnpm build`
- Escalate if account scoping, token persistence, or policy semantics become ambiguous across transports.
