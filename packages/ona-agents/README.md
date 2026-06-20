# Ona Agents

Standalone Ona-styled operator chat frontend for CREATE SOMETHING Dify agents.

This is not the Ona Core rollout environment. It is a CREATE SOMETHING-owned app that borrows Ona's clear operator-shell pattern for staff-only Dify agent work.

This app is also separate from Abundance Concierge. It provides a staff-only roster and chat shell for the Dify agents listed in `src/lib/server/dify/agent-registry.ts`, with all Dify Service API calls proxied server-side.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/routes/agents/+page.svelte`, `src/routes/agents/[agentId]/+page.svelte`, `src/lib/server/auth/clerk-access.ts`, `src/lib/server/dify/client.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | Clerk JWT verifier tests, Dify proxy tests, SvelteKit check, Cloudflare adapter build |
| UI validation path | `ALLOW_CLERK_ACCESS_PREVIEW=true pnpm dev`, then open `/agents` and `/agents/[agentId]` |
| Escalation rule | Keep Dify keys server-side; production access requires Clerk JWKS plus explicit staff allow rules |

## Runtime

Clerk is the only identity boundary for this app.

Required Clerk configuration:

- `CLERK_JWKS_URL` or `CLERK_ISSUER`
- `CLERK_SIGN_IN_URL`
- At least one access rule:
  - `CLERK_ALLOWED_ORGANIZATION_IDS`
  - `CLERK_ALLOWED_ORGANIZATION_ROLES`
  - `CLERK_ALLOWED_EMAILS`
  - `CLERK_ALLOWED_EMAIL_DOMAINS`
  - `CLERK_ALLOW_ANY_AUTHENTICATED=true` only for a private Clerk instance

Dify API keys are runtime secrets in Cloudflare Pages, not browser data. The binding names are the `apiKeyEnv` values in `agent-registry.ts`.

## Validation

```bash
pnpm --filter @create-something/ona-agents test
pnpm --filter @create-something/ona-agents check
pnpm --filter @create-something/ona-agents build
```
