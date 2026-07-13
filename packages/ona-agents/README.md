# CREATE SOMETHING Agents

Retirement surface for the legacy standalone operator-agent application.

The public route now states the owned runtime boundary and legacy agent detail
URLs redirect to it. CREATE SOMETHING owns agent policy, tools, state, and
receipts; Cloudflare provides infrastructure and OpenAI provides intelligence.

The former provider client and registry remain temporarily under
`src/lib/server/dify/` as rollback evidence. No active route imports them. Delete
that rollback source and the corresponding encrypted Pages secrets only after
the approved production observation window.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/routes/agents/+page.svelte`, `src/routes/agents/[agentId]/+page.server.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm test && pnpm build` |
| Validation surfaces | redirect behavior, SvelteKit check, Cloudflare adapter build, dependency audit |
| UI validation path | `/agents` and one legacy `/agents/[agentId]` URL |
| Escalation rule | production deployment, real-user migration, and secret deletion require explicit approval and a rollback note |

## Validation

```bash
pnpm --filter @create-something/ona-agents check
pnpm --filter @create-something/ona-agents build
```
