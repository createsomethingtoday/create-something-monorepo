# Agents: CREATE SOMETHING Agents

## Agent Entry

This package is the retirement surface for the legacy standalone operator-agent
application.

- Runtime notice: `src/routes/agents/+page.svelte`
- Legacy redirect: `src/routes/agents/[agentId]/+page.server.ts`
- Historical rollback source: `src/lib/server/dify/` (unreachable from routes)

Do not reconnect the historical provider client to an active route. Production
deployment, real-user migration, and secret deletion require explicit approval
and a rollback note.

## Validation

```bash
pnpm --filter @create-something/ona-agents check
pnpm --filter @create-something/ona-agents build
```
