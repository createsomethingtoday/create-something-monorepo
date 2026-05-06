# Agents: @create-something/mcp

## Agent Entry

- Start with `README.md` for the package contract.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoints: `src/index.ts`, `worker/index.ts`.

## Validation

- Boot: `pnpm dev`
- Smoke: `pnpm typecheck && pnpm build`
- Escalate if content indexing, worker behavior, or MCP output conflicts with the source content artifacts.
