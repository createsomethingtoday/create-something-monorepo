# Understanding: Ona Agents

## To Understand This Package, Read

1. `src/routes/agents/+page.svelte` for the standalone roster experience.
2. `src/routes/agents/[agentId]/+page.svelte` for the three-rail operator chat.
3. `src/lib/server/auth/clerk-access.ts` for Clerk session verification and allow rules.
4. `src/lib/server/dify/client.ts` for the server-side Dify Service API boundary.
5. `src/lib/server/dify/agent-registry.ts` for agent labels, policy boundaries, and secret bindings.

## Boundary

This package is not the Ona Core rollout environment. It is a staff-only operator shell that adapts Ona-style clarity patterns for CREATE SOMETHING-owned Dify agent workflows.

This package is also not Abundance Concierge. It does not own nurse intake, D1/R2 session persistence, Indeed writeback, or Abundance-specific cookies. It exists to give CREATE SOMETHING operators an Ona-styled frontend for Dify agents while keeping Dify keys and proof events server-side.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/routes/agents/+page.svelte`, `src/routes/agents/[agentId]/+page.svelte`, `src/lib/server/auth/clerk-access.ts`, `src/lib/server/dify/client.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | Clerk JWT verifier tests, Dify proxy tests, SvelteKit check, Cloudflare adapter build |
| UI validation path | `ALLOW_CLERK_ACCESS_PREVIEW=true pnpm dev`, then open `/agents` and `/agents/[agentId]` |
| Escalation rule | Keep Dify keys server-side; production access requires Clerk JWKS plus explicit staff allow rules |
