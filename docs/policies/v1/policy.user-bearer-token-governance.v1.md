# policy.user-bearer-token-governance.v1

- Status: `draft`
- Owner: `CREATE SOMETHING legal + identity + partner operations`
- Effective date: `TBD`

## Purpose

Define the production policy for user-facing bearer tokens issued through `.agency` for use in third-party hosts, local tools, and background agents.

## Scope

- One active bearer token per authenticated user
- Long-lived token issuance and regeneration through `.agency`
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
6. Bearer tokens MUST be issued by `.agency`; Auth0 remains the identity provider and MUST NOT be exposed as the external bearer-token artifact for host portability.
7. Bearer tokens MUST be opaque, high-entropy secrets stored only in protected form server-side; plaintext tokens MUST be shown only at issuance or regeneration time.
8. Every authenticated bearer-token request MUST produce auditable metadata sufficient to attribute activity to a user and organization context.
9. `.agency` MUST provide immediate revocation and immediate regeneration paths.
10. Regeneration and revocation MUST remain available regardless of billing, sunset, or host state so that compromised tokens can always be terminated.
11. Bearer-token access MUST fail closed when legal or commercial prerequisites are no longer satisfied.
12. Customer-facing legal terms, security language, and operational documentation MUST disclose that bearer tokens are high-trust credentials, long-lived, revocable, continuously governed, and unsuitable for sharing.

## Required Legal Alignment

The following artifacts MUST remain aligned with this policy before production launch:

- `.agency` Terms of Service or Master Services Agreement
- Security policy / trust documentation
- Acceptable use language for hosted agents and third-party hosts
- Customer onboarding disclosures for bearer-token issuance
- Incident response language covering token compromise and revocation

## Enforcement Surfaces

- Identity worker:
  - `POST /v1/mcp/long-lived-tokens/admin-issue`
  - `POST /v1/mcp/long-lived-tokens/admin-get`
  - `POST /v1/mcp/long-lived-tokens/:id/revoke`
  - token resolve/introspection path used by MCP hub
- `.agency` app:
  - `GET|POST /api/me/mcp-token`
  - `POST /api/me/mcp-token/regenerate`
  - `POST /api/me/mcp-token/revoke`
  - `GET|POST /api/admin/mcp-entitlements`
  - `GET /api/internal/mcp-entitlements/check`
  - `Account > MCP Bearer Token`
  - `Admin > Security > Bearer Tokens`
  - legal acceptance and consent capture
  - org membership and entitlement display
- MCP hub / gateway:
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
- Legal acceptance records linked to the user and organization
- Billing and contract state checks linked to allow/deny decisions
- Admin-visible last-used and incident-response metadata

## Source Anchors

- `packages/identity-worker/src/index.ts`
- `packages/identity-worker/README.md`
- `packages/agency/src/lib/server/mcp-entitlements.ts`
- `packages/agency/src/routes/api/admin/mcp-entitlements/+server.ts`
- `packages/agency/src/routes/api/internal/mcp-entitlements/check/+server.ts`
- `docs/policies/v1/policy.mcp-session-self-service.v1.md`
- `docs/policies/v1/policy.mcp-credential-delivery.v1.md`
- `docs/policies/v1/policy.partner-auth-governance.v1.md`
