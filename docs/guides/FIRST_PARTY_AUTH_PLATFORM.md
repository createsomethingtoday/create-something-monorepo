# First-Party Auth Platform

CREATE SOMETHING projects use an AI-native, API-first identity architecture. An agent starts with the versioned HTTP or MCP contract; framework adapters come last.

| Tier | Owner | Responsibility |
| --- | --- | --- |
| Database | `@create-something/identity-worker` | users, password hashes, signing keys, access and refresh tokens, JWKS, revocation |
| Automation | Identity API + CREATE SOMETHING MCP | discovery, OpenAPI, agent-readable resources, and deterministic read-only configuration validation |
| Automation adapter | `@create-something/canon/auth/*` | reference login handlers, secure cookies, signature verification, normalized identity, reusable policy evaluation |
| Judgment | adopting application | allowed identities, preview policy, redirects, rollout, and production approval |

The platform is an internal paved road, not a public identity SaaS. Existing Auth0 integrations remain compatible; new projects do not need a third-party identity SDK.

## Agent and API adoption

Fetch the public discovery document first:

```text
GET https://id.createsomething.space/.well-known/create-something-auth
GET https://id.createsomething.space/v1/auth/openapi.json
```

The discovery response declares the exact issuer, JWKS, supported JWT algorithm, auth endpoints, policy dimensions, reference adapters, MCP capabilities, and safety boundary. It contains no secret values.

An MCP client can instead read:

- `auth://platform/contract`
- `auth://platform/openapi`

Then call `auth_config_validate` with a proposed environment, issuer, audiences, and allow rules. The tool is pure and offline: it returns `ready` or `blocked`, errors, warnings, normalized non-secret configuration, and `mutationPerformed: false`. Never pass passwords, tokens, API keys, or private keys; accidental secret fields are rejected and never reflected.

MCP deliberately has no credential issuance, access-grant, secret-rotation, or production-mutation tool. Those actions stay in the owning Identity Worker/application workflow and require the approval boundary below.

For approved OAuth MCP resources, authorization-code plus PKCE exchange mints a short-lived ES256 access token whose audience is the exact protected-resource URL. `/oauth/userinfo` validates signature, issuer, expiration, resource policy, and active user state before returning identity, resource, and granted scope. The adopting resource must require its own audience and intersect token scope with its application allow policy. These application tokens do not require or imply a commercial `.agency` entitlement. They expire after one hour; soft-deleting the Identity user revokes userinfo immediately, while ordinary token retirement relies on that bounded expiration rather than a long-lived credential record.

## Security invariants

- Verify the JWT signature, exact issuer, accepted audience, and expiration before evaluating access policy.
- Never trust client-supplied user, tenant, organization, or role headers.
- A valid identity is not automatically an authorized application user. Configure at least one explicit allow rule or intentionally approve `allowAnyAuthenticated` for a private application.
- Production cookies are `httpOnly`, `secure`, `sameSite=lax`, and scoped to the smallest useful domain.
- Cross-domain session exchange runs only in the receiving property's server adapter. Identity requires the intermediary's exact target, rejects requests with a browser `Origin`, and omits CORS from every credential-bearing response. The adapter writes host-only `HttpOnly` cookies; it does not expose access or refresh credentials to page data or browser JavaScript.
- Refresh rotation is a single D1 batch: claim one active predecessor, insert at most one successor, and revoke active descendants when the predecessor is replayed. Revoked predecessors remain stored until normal cleanup so replay detection cannot be bypassed.
- Preview bypass is explicit, non-production only, and rejected when `ENVIRONMENT=production`.
- Keep identity credentials, refresh tokens, signing keys, and application secrets out of browser data and repository files.

First-party access tokens expire after 15 minutes. Identity-owned endpoints and
the permission-gated `/v1/validate` deputy re-read active, verified user state;
offline application verification does not. A soft-deleted or newly unverified
identity can therefore remain accepted by an offline consumer only until its
current access token expires. Consumers that require immediate revocation must
use the online deputy with one exact expected audience and account for its
availability explicitly.

## Reference SvelteKit adapter

Add Canon as a workspace dependency and expose the login handler:

```ts
// src/routes/api/auth/login/+server.ts
import { createLoginHandler } from '@create-something/canon/auth/handlers';

export const POST = createLoginHandler();
```

Resolve application access in a server layout or hook:

```ts
import { resolveApplicationAccess } from '@create-something/canon/auth/access';

const access = await resolveApplicationAccess({
  request,
  signInUrl: '/sign-in',
  verification: {
    issuer: env.CS_IDENTITY_ISSUER,
    jwksUrl: env.CS_IDENTITY_JWKS_URL,
    audience: env.CS_IDENTITY_AUDIENCE,
    fetch
  },
  policy: {
    allowedEmailDomains: ['createsomething.io']
  }
});
```

Use `@create-something/canon/auth/components` for the sign-in UI, `@create-something/canon/auth/cookies` for session cleanup, and `@create-something/canon/auth/server` when direct token verification is required. Keep environment lookup in a thin app adapter so Canon remains independent of an application's deployment runtime.

## Runtime configuration

| Variable | Required | Meaning |
| --- | --- | --- |
| `IDENTITY_API_URL` | yes | server-side Identity Worker base URL |
| `CS_IDENTITY_ISSUER` | yes | exact expected access-token issuer |
| `CS_IDENTITY_JWKS_URL` | yes | public signing-key set |
| `CS_IDENTITY_AUDIENCE` | yes | accepted application audience or comma-separated audiences |
| `CS_AUTH_SIGN_IN_URL` | recommended | local or external sign-in destination |
| `CS_AUTH_ALLOWED_SUBJECTS` | policy | exact subject allow-list |
| `CS_AUTH_ALLOWED_EMAILS` | policy | exact email allow-list |
| `CS_AUTH_ALLOWED_EMAIL_DOMAINS` | policy | email-domain allow-list |
| `CS_AUTH_ALLOWED_TENANT_IDS` | policy | tenant or organization claim allow-list |
| `CS_AUTH_ALLOWED_ROLES` | policy | role claim allow-list |
| `CS_AUTH_ALLOW_ANY_AUTHENTICATED` | exceptional | explicit private-app policy |
| `ALLOW_CS_AUTH_PREVIEW` | local only | non-production preview bypass |

The application adapter may use different variable names, but it must map to the same verification and policy contract explicitly.

## Verification

Minimum package checks:

```bash
pnpm --filter @create-something/identity-worker test
pnpm --filter @create-something/mcp test
pnpm --filter @create-something/mcp typecheck
pnpm --filter @create-something/mcp build
pnpm --filter @create-something/canon test
pnpm --filter <adopting-package> test
pnpm --filter <adopting-package> check
pnpm --filter <adopting-package> build
```

The primary machine verifier must exercise discovery, OpenAPI, both MCP resources, and complete/incomplete/unsafe-preview/secret-bearing validator inputs. The real-app verifier must then exercise:

1. anonymous denial with protected data absent;
2. allow-listed sign-in and session persistence after reload;
3. a valid but non-allow-listed identity remaining blocked;
4. logout restoring denial;
5. invalid issuer, audience, signature, and expiry through contract tests.

Preview access proves UI layout only and cannot replace the authenticated workflow.

## Migration and promotion

1. Inventory current issuer, audience or authorized-party, cookie, redirect, and allow-rule configuration names without reading secret values unnecessarily.
2. Add the application's audience to Identity Worker and deploy that change only through the owning promotion path.
3. Configure owned identity variables alongside the existing provider. Translate the existing allow policy exactly.
4. Run contract checks and the real browser verifier against a preview environment.
5. Record the deploy target, evidence, rollback artifact, and credential-removal plan in Linear.
6. Cut over application auth only after explicit production approval. Remove or rotate old provider credentials in a separate approved step after rollback confidence exists.

Rollback keeps the last known-good deployment and prior identity configuration available until the owned path has passed production readback. Never remove the prior provider merely because local tests pass.

For an intermediary-credential cutover, use this order:

1. Deploy receiving-property server adapters that send the exact target and write host-only cookies. The additional target is backward-compatible with the prior Worker.
2. Apply the additive Identity D1 migration. The migration must invalidate all active `refresh_tokens` and all unused `cross_domain_tokens`; future session-contract cutovers must do both again.
3. Read back the new schema and confirm both intermediary tables have zero active pre-cutover credentials.
4. Deploy the Identity Worker, then verify browser-origin exchange denial, no credential CORS, exact-target denial, anonymous property denial, and healthy discovery.

Rollback restores the previous Worker and property deployments. Keep the
additive column and index in place; do not reactivate invalidated refresh or
cross-domain credentials. Affected users sign in again.
