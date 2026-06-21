# Agents: @create-something/zendesk-mcp

## Agent Entry

- Start with `README.md` for the Zendesk reviewer MCP contract.
- Read `UNDERSTANDING.md` for the package model and escalation rules.
- Primary stdio entrypoint: `src/index.ts`.
- Primary Worker entrypoint: `worker/index.ts`.

## Validation

- Boot: `pnpm build && pnpm start`
- Smoke: `pnpm typecheck && pnpm build`
- Escalate if live Zendesk auth, ticket visibility, write permissions, or MCP transport auth cannot be verified without exposing credentials.
