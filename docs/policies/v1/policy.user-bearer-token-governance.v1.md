# policy.user-bearer-token-governance.v1

- Status: `draft`
- Owner: `CREATE SOMETHING legal + identity + partner operations`
- Effective date: `TBD`

## Purpose

Define the production policy for user-facing bearer tokens issued through `.agency` for use in third-party hosts, local tools, and background agents.

## Scope

- One active bearer token per authenticated user
- Long-lived token issuance and regeneration through `.agency`
- OAuth-based onboarding for hosts that require OAuth while still using the same long-lived managed bearer token
- Live entitlement enforcement across organization, contract, policy, and billing state
- Audit, revocation, regeneration, and incident response controls
- Legal and product disclosure requirements for customer-facing use

## Policy Statements

1. `.agency` MAY issue one active bearer token per authenticated user for external MCP access.
2. Bearer tokens issued under this policy MUST be bound to an authenticated user identity and MUST NOT be anonymous or shared across users.
3. Issuing or regenerating a bearer token MUST immediately invalidate the user's prior bearer token.
4. Bearer tokens governed by this policy MAY be long-lived, including use in background agents, but MUST remain subject to live authorization checks on every request.
5. Live authorization checks MUST evaluate, at minimum:
   - token status
   - user status
   - organization membership
   - requested organization context
   - service entitlement
   - required policy acceptance
   - required contract status
   - billing status
   - where applicable, partner client lifecycle state and active consent state
6. Service-tier gating for free `MCP-only` versus paid `Policy OS` access MUST follow [`policy.service-tier-entitlement.v1`](./policy.service-tier-entitlement.v1.md) when bearer-backed requests reach paid or governed product surfaces.
7. Bearer tokens MUST be issued by `.agency`; Clerk is the portal identity provider and MUST NOT be exposed as the external bearer-token artifact for host portability.
8. Bearer tokens MUST be opaque, high-entropy secrets stored only in protected form server-side; plaintext tokens MUST be shown only at issuance or regeneration time.
9. Every authenticated bearer-token request MUST produce auditable metadata sufficient to attribute activity to a user and organization context.
10. `.agency` MUST provide immediate revocation and immediate regeneration paths.
11. Regeneration and revocation MUST remain available regardless of billing, sunset, or host state so that compromised tokens can always be terminated.
12. Bearer-token access MUST fail closed when legal or commercial prerequisites are no longer satisfied.
13. Customer-facing legal terms, security language, and operational documentation MUST disclose that bearer tokens are high-trust credentials, long-lived, revocable, continuously governed, and unsuitable for sharing.
14. Existing active bearer tokens SHOULD be retained by default. Create or issue flows MUST NOT silently rotate an already-active managed bearer token.
15. Bearer-token rotation or regeneration MUST be an explicit lifecycle action by the user or operator, or a response to suspected or confirmed compromise, misuse, or subject-remediation work. A formal incident ticket is not required to perform that explicit rotation.
16. For hosts that require OAuth, CREATE SOMETHING MAY deliver the managed bearer token through an OAuth facade; in that case the OAuth `access_token` MAY itself be long-lived because it is the governed managed bearer artifact.
17. OAuth delivery MUST preserve current hub bearer semantics so that existing bearer-token clients continue to function without OAuth migration.
18. OAuth delivery for third-party hosts MUST NOT depend on custom headers such as `X-MCP-Session-Token`; bearer authorization remains the portable host contract.
19. Shared runtime guardrail tokens such as `HUB_API_TOKEN` MUST NOT be exposed as user-facing OAuth artifacts.
20. The password a user enters on the OAuth authorize page is a separate `identity-worker` login secret and MUST NOT be treated as the bearer token itself.
21. `.agency` SHOULD expose that MCP OAuth password as a managed self-service control linked to the same entitled email, account, and tenant context used for bearer-token governance.
22. The OAuth authorization code MAY be implemented as a signed self-contained token minted by `identity-worker` rather than as a database-stored opaque code, provided it remains bound to the OAuth request context required for exchange.
23. When signed authorization codes are used, the signed claims MUST at minimum bind `client_id`, `redirect_uri`, issuer, expiry, and any PKCE challenge material required for token exchange.
24. Existing vault-backed compat bearer tokens MAY be adopted into the managed-token system without rotating the plaintext token, but only after the user is reconciled to one canonical portal identity subject and one canonical `.agency` entitlement row.
25. After adoption, `identity-worker.mcp_long_lived_tokens` becomes the authoritative registry for bearer-token status, last use, revoke, and regenerate behavior; vault storage is runtime support only and MUST NOT be treated as the governance source of truth.
26. Duplicate entitlement rows or duplicate token rows for the same user email under different subjects MUST be removed or deactivated during migration so bearer resolution remains canonical.
27. Identity-provider delete/recreate incidents for the same normalized email MUST follow the active provider-specific rebind process. Legacy Auth0 incidents may use archived [`policy.auth0-subject-rebind-governance.v1`](./policy.auth0-subject-rebind-governance.v1.md); bearer access continuity should preserve MCP account context while revoking stale old-subject credentials.
28. Managed bearer issuance and regeneration MUST support explicit `allowed_tool_prefixes` for non-Composio or reviewer-specific lanes whose visible tool surface cannot be derived from `toolkit_profile` alone.
29. When explicit `allowed_tool_prefixes` are used, the issued token record MUST persist them as first-class governed scope data and the resolver MUST return the same effective prefix set transparently at request time.
30. Managed bearer delivery UIs and APIs SHOULD surface the effective `allowed_tool_prefixes` alongside `toolkit_profile` so operators can verify the actor-visible lane without relying on inferred behavior.
31. For third-party hosts that do not reliably send `X-MCP-Session-Token` but do reliably forward `Authorization: Bearer <managed bearer>`, CREATE SOMETHING MAY expose the Hub in `compat` identity mode as a host-compatibility measure.
32. In host-compatibility `compat` mode, bearer authorization MUST still resolve through `identity-worker`, and the resulting actor context MUST preserve `bound_host` rejection and effective `allowed_tool_prefixes`.
33. Host-compatibility `compat` mode MUST NOT rely on client-supplied account headers and MUST keep `HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS=false` by default.

## Required Legal Alignment

The following artifacts MUST remain aligned with this policy before production launch:

- `.agency` Terms of Service or Master Services Agreement
- Security policy / trust documentation
- Acceptable use language for hosted agents and third-party hosts
- Customer onboarding disclosures for bearer-token issuance
- Incident response language covering token compromise and revocation

## Enforcement Surfaces

- Identity worker:
  - `/.well-known/oauth-authorization-server`
  - `/.well-known/openid-configuration`
  - `/oauth/authorize`
  - `/oauth/token`
  - `/oauth/register`
  - `/oauth/userinfo`
  - `POST /v1/mcp/long-lived-tokens/admin-issue`
  - `POST /v1/mcp/long-lived-tokens/admin-get`
  - `POST /v1/mcp/long-lived-tokens/:id/revoke`
  - token resolve/introspection path used by MCP hub
- `.agency` app:
  - `GET|POST /api/me/mcp-token`
  - `POST /api/me/mcp-token/regenerate`
  - `POST /api/me/mcp-token/revoke`
  - `MCP Access > MCP OAuth Password` set or rotate controls
  - `GET|POST /api/admin/mcp-entitlements`
  - `GET|POST /api/admin/contracts`
  - `GET /api/internal/mcp-entitlements/check`
  - `Account > MCP Bearer Token`
  - `Admin > Security > Bearer Tokens`
  - OAuth app onboarding and disclosure surfaces for third-party hosts
  - legal acceptance and consent capture
  - org membership and entitlement display
- MCP hub / gateway:
  - `GET /.well-known/oauth-authorization-server`
  - `GET /mcp/.well-known/oauth-authorization-server`
  - request-time org resolution
  - request-time entitlement enforcement
  - audit/event emission
- Commercial systems:
  - contract-state verification
  - billing-state verification

## Evidence

- Token issuance/regeneration/revocation audit events
- Request-time authorization decision logs
- Org membership and entitlement checks in access telemetry
- Operator-reviewed entitlement registry updates
- Partner client status and consent records reconciled into allow/deny state
- Explicit contract ledger records linked to user/account/tenant context
- Legal acceptance records linked to the user and organization
- Billing and contract state checks linked to allow/deny decisions
- Admin-visible last-used and incident-response metadata
- managed bearer metadata showing the effective `allowed_tool_prefixes`
- OAuth app setup traces showing the delivered access token resolves through the same managed bearer path
- OAuth authorization traces showing the authorization code is a signed `identity-worker` artifact bound to client and redirect context
- Revoke/regenerate actions immediately invalidating OAuth-delivered host access
- Password set or rotate actions for the OAuth login remaining auditable and distinct from bearer-token lifecycle events
- Migration records showing canonical portal identity subject binding for users adopted from compat vault tokens
- Verification output confirming one active managed token row and no stale legacy token row for each migrated user

## Source Anchors

- `packages/identity-worker/src/index.ts`
- `packages/identity-worker/README.md`
- `packages/agency/src/lib/server/mcp-entitlements.ts`
- `packages/agency/src/routes/api/admin/mcp-entitlements/+server.ts`
- `packages/agency/src/routes/api/internal/mcp-entitlements/check/+server.ts`
- `docs/policies/v1/policy.mcp-session-self-service.v1.md`
- `docs/policies/v1/policy.mcp-credential-delivery.v1.md`
- `docs/policies/v1/policy.partner-auth-governance.v1.md`
- `docs/policies/v1/policy.service-tier-entitlement.v1.md`
- `docs/guides/CHATGPT_MCP_OAUTH_MANAGED_BEARER.md`
- `docs/policies/v1/policy.mcp-oauth-password-governance.v1.md`
- `docs/policies/v1/policy.auth0-subject-rebind-governance.v1.md`
