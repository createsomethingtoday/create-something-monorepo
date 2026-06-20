# Agents: Ona Agents

## Agent Entry

Use this package when working on the standalone Ona-styled frontend for CREATE SOMETHING Dify agents.

This package is not the Ona Core rollout environment. It is a staff-only operator shell that adapts Ona-style clarity patterns for CREATE SOMETHING-owned Dify agent workflows.

- Start with `src/routes/agents/+page.svelte` for the roster.
- Start with `src/routes/agents/[agentId]/+page.svelte` for the operator chat UI.
- Use `src/lib/server/dify/agent-registry.ts` for the checked-in agent inventory.
- Use `src/lib/server/auth/clerk-access.ts` for Clerk-only access gates.

Do not add Abundance intake, nurse-staffing persistence, Indeed writeback, Auth0, or `.agency` access shims here. This app is the standalone agent surface. Dify Service API keys must stay server-side in runtime secrets.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/routes/agents/+page.svelte`, `src/routes/agents/[agentId]/+page.svelte`, `src/lib/server/auth/clerk-access.ts`, `src/lib/server/dify/client.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | Clerk JWT verifier tests, Dify proxy tests, SvelteKit check, Cloudflare adapter build |
| UI validation path | `ALLOW_CLERK_ACCESS_PREVIEW=true pnpm dev`, then open `/agents` and `/agents/[agentId]` |
| Escalation rule | Keep Dify keys server-side; production access requires Clerk JWKS plus explicit staff allow rules |

## Validation

Run package-local checks before promotion:

```bash
pnpm --filter @create-something/ona-agents test
pnpm --filter @create-something/ona-agents check
pnpm --filter @create-something/ona-agents build
```

Production deployment requires Clerk runtime configuration and all available `DIFY_*_API_KEY` secrets in the Cloudflare Pages project.
