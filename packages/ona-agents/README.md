# CREATE SOMETHING Agents

Standalone Performance Lab operator chat frontend for CREATE SOMETHING Dify agents.

The app uses CREATE SOMETHING Identity instead of a project-specific identity SDK. Identity Worker authenticates credentials and issues ES256 access tokens; Canon verifies the issuer, audience, signature, and expiry; the app then evaluates its explicit staff allow rules before returning agent inventory or calling Dify.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/routes/agents/+page.svelte`, `src/routes/agents/[agentId]/+page.svelte`, `src/lib/server/auth/identity-access.ts`, `src/lib/server/dify/client.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm test && pnpm build` |
| Validation surfaces | first-party ES256/JWKS policy tests, Dify proxy tests, SvelteKit check, Cloudflare adapter build |
| UI validation path | start the controlled local identity harness and built preview; verify anonymous, allowed, blocked, persistent, and logout states |
| Escalation rule | keep Dify keys server-side; production access requires owned issuer/audience verification plus an explicit staff allow rule |

## Runtime contract

| Variable | Purpose |
| --- | --- |
| `IDENTITY_API_URL` | server-side login endpoint base |
| `CS_IDENTITY_ISSUER` | exact accepted token issuer |
| `CS_IDENTITY_JWKS_URL` | signing-key discovery URL |
| `CS_IDENTITY_AUDIENCE` | accepted application audience; `ona-agents` in production |
| `CS_AUTH_SIGN_IN_URL` | local or external sign-in route |
| `CS_AUTH_ALLOWED_SUBJECTS` | optional exact subject allow-list |
| `CS_AUTH_ALLOWED_EMAILS` | optional exact email allow-list |
| `CS_AUTH_ALLOWED_EMAIL_DOMAINS` | optional staff-domain allow-list |
| `CS_AUTH_ALLOWED_TENANT_IDS` | optional tenant or organization claim allow-list |
| `CS_AUTH_ALLOWED_ROLES` | optional role claim allow-list |
| `CS_AUTH_ALLOW_ANY_AUTHENTICATED` | explicit private-instance escape hatch; defaults false |
| `ALLOW_CS_AUTH_PREVIEW` | non-production-only UI bypass; rejected in production |

At least one allow rule is required for operator access unless `CS_AUTH_ALLOW_ANY_AUTHENTICATED=true` is explicitly approved. Dify API keys remain server-side Pages secrets.

## Local real-surface proof

Use two terminals from the repo root:

```bash
pnpm exec tsx packages/ona-agents/scripts/local-auth-harness.ts
```

```bash
ENVIRONMENT=development \
IDENTITY_API_URL=http://127.0.0.1:8788 \
CS_IDENTITY_ISSUER=http://127.0.0.1:8788 \
CS_IDENTITY_JWKS_URL=http://127.0.0.1:8788/.well-known/jwks.json \
CS_IDENTITY_AUDIENCE=ona-agents \
CS_AUTH_ALLOWED_EMAIL_DOMAINS=createsomething.io \
ALLOW_CS_AUTH_PREVIEW=false \
pnpm --filter @create-something/ona-agents exec vite preview --host 127.0.0.1 --port 4173
```

The harness password is `local-auth-proof`. Use `operator@createsomething.io` for the allowed proof and `outsider@example.com` for the valid-but-blocked proof. These are generated local identities only.

## Validation

```bash
pnpm --filter @create-something/identity-worker test
pnpm --filter @create-something/canon package
pnpm --filter @create-something/ona-agents test
pnpm --filter @create-something/ona-agents check
pnpm --filter @create-something/ona-agents build
```

See [`docs/guides/FIRST_PARTY_AUTH_PLATFORM.md`](../../docs/guides/FIRST_PARTY_AUTH_PLATFORM.md) for the reusable adoption and production-promotion contract.
