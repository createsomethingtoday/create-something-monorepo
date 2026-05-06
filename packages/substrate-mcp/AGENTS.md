# Agents: @create-something/substrate-mcp

## Agent Entry

- Start with `README.md` for the package contract.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoint: `src/index.ts`.

## Validation

- Boot: `pnpm dev`
- Smoke: `pnpm typecheck && pnpm build`
- Escalate if workspace data semantics or MCP-managed state are unclear.
