# Agents: @create-something/cs-mcp-hub

## Agent Entry

- Start with `README.md` for hub tools and operator commands.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoints: `src/index.ts`, `src/config.ts`, `src/routing.ts`.

## Validation

- Boot: `pnpm dev`
- Smoke: `pnpm test`
- Escalate if generated Codex config or tool exposure conflicts with registry, state, or routing artifacts.
