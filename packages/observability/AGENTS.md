# Agents: @create-something/observability

## Agent Entry

- Start with `README.md` for the package contract.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoints: `src/index.ts`, `src/mcp.ts`, `src/atlas.ts`.

## Validation

- Boot: `pnpm dev`
- Smoke: `pnpm typecheck && pnpm build`
- Use Infisical or runtime environment for live observability keys.
