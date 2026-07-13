# Understanding: CREATE SOMETHING Agents

## Boundary

This package is a retirement surface. `/agents` explains the owned runtime
boundary and `/agents/[agentId]` permanently redirects to it. It no longer owns
an executable provider-backed operator chat.

The historical server client and registry are retained only for the approved
rollback window and are unreachable from deployed route entrypoints.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/routes/agents/+page.svelte`, `src/routes/agents/[agentId]/+page.server.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm build` |
| Validation surfaces | redirect behavior, SvelteKit check, Cloudflare adapter build, dependency audit |
| Escalation rule | do not restore a provider-specific route or delete rollback secrets without the owning promotion workflow |
