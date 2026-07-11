# Understanding: CREATE SOMETHING Agents

## To Understand This Package, Read

1. `src/lib/server/auth/identity-access.ts` for runtime identity and app-policy mapping.
2. `src/routes/sign-in/+page.svelte` and `src/routes/api/auth/login/+server.ts` for the first-party session entry.
3. `src/routes/agents/+page.svelte` for the protected roster.
4. `src/routes/agents/[agentId]/+page.server.ts` for the protected Dify action boundary.
5. `src/lib/server/dify/agent-registry.ts` for checked-in lanes and secret binding names.

## Boundary

Identity Worker owns user credentials, signing keys, access tokens, and refresh tokens. Canon owns session cookies, signature verification, normalized identity, and reusable policy evaluation. This app owns its staff allow rules and never returns agent inventory or calls Dify unless the resulting access state is `allowed`.

The package does not own user storage, signing keys, organization administration, Abundance intake, or Dify credentials in the browser.

## Runtime proof

The controlled local harness at `scripts/local-auth-harness.ts` exists only to exercise the built app with short-lived test tokens. It is not imported by application code or deployed. Required browser states are anonymous denial, allow-listed login and reload, valid-but-blocked denial with no registry, and logout back to denial.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/routes/agents/+page.svelte`, `src/routes/agents/[agentId]/+page.svelte`, `src/lib/server/auth/identity-access.ts`, `src/lib/server/dify/client.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm test && pnpm build` |
| Validation surfaces | first-party ES256/JWKS policy tests, Dify proxy tests, SvelteKit check, Cloudflare adapter build |
| UI validation path | start the controlled local identity harness and built preview; verify anonymous, allowed, blocked, persistent, and logout states |
| Escalation rule | keep Dify keys server-side; production access requires owned issuer/audience verification plus an explicit staff allow rule |
