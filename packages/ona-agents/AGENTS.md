# Agents: CREATE SOMETHING Agents

## Agent Entry

Use this package for the standalone Performance Lab frontend for CREATE SOMETHING Dify agents. It is a staff-only operator shell, not the historical Ona Core rollout environment.

- Roster: `src/routes/agents/+page.svelte`
- Operator chat: `src/routes/agents/[agentId]/+page.svelte`
- First-party access adapter: `src/lib/server/auth/identity-access.ts`
- Sign-in boundary: `src/routes/sign-in/+page.svelte`, `src/routes/api/auth/login/+server.ts`
- Dify inventory and server boundary: `src/lib/server/dify/agent-registry.ts`, `src/lib/server/dify/client.ts`

Identity Worker authenticates credentials and issues tokens. Canon verifies sessions and evaluates the normalized policy. This app owns the explicit staff allow rules. Do not add a second identity provider, an `.agency` access shim, or client-side Dify credentials.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/routes/agents/+page.svelte`, `src/routes/agents/[agentId]/+page.svelte`, `src/lib/server/auth/identity-access.ts`, `src/lib/server/dify/client.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm test && pnpm build` |
| Validation surfaces | first-party ES256/JWKS policy tests, Dify proxy tests, SvelteKit check, Cloudflare adapter build |
| UI validation path | start the controlled local identity harness and built preview; verify anonymous, allowed, blocked, persistent, and logout states |
| Escalation rule | keep Dify keys server-side; production access requires owned issuer/audience verification plus an explicit staff allow rule |

## Validation

```bash
pnpm --filter @create-something/identity-worker test
pnpm --filter @create-something/canon package
pnpm --filter @create-something/ona-agents test
pnpm --filter @create-something/ona-agents check
pnpm --filter @create-something/ona-agents build
```

Production deployment, identity-secret changes, and real-user migration require the owning promotion approval and rollback note. All `DIFY_*_API_KEY` values remain Cloudflare Pages secrets.
