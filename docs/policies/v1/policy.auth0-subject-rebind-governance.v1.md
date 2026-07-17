# policy.auth0-subject-rebind-governance.v1

- Status: `deprecated`
- Owner: `CREATE SOMETHING identity + support + partner operations`
- Effective date: `TBD`

> Historical migration artifact only. Current incidents are governed by
> [`policy.identity-subject-rebind-governance.v1`](./policy.identity-subject-rebind-governance.v1.md).

## Purpose

Define the governance path for incidents where an Auth0 user is deleted or recreated and returns with the same email but a different Auth0 subject.

## Scope

- `.agency` self-service MCP bearer-token access
- `.agency` MCP OAuth password governance where host onboarding depends on `identity-worker`
- Partner-admin and Half Dozen client mappings that persist `identity_user_id`
- Subject-bound cleanup for managed bearer tokens, stale entitlement rows, and stale legacy aliases
- Operator evidence and closeout requirements for manual remediation

## Policy Statements

1. An Auth0 delete-and-return event with the same normalized email MUST be treated as a `subject rebind` incident, not as an MCP account reset.
2. Automatic or operator-assisted subject rebind is permitted only when normalized email matches and the intended `.agency` account mapping is unambiguous.
3. Subject rebind MUST preserve the canonical MCP account context:
   - `account_id`
   - `tenant_id`
   - `workspace_account_id`
   - provider-connected account bindings such as `composio_user_id`
   - active partner consent records
4. Subject rebind MUST NOT disconnect provider-linked toolkit or Notion accounts unless the business relationship, consent state, or security posture independently requires revocation.
5. The old Auth0 subject MUST cease to be operational for managed bearer resolution after remediation.
6. Managed bearer tokens bound to the old subject MUST be revoked or otherwise rendered inoperative before the incident is closed.
7. Stale entitlement rows that would allow the old subject to continue resolving for the same email or account MUST be removed, deactivated, or superseded so one canonical subject remains operational.
8. Stale `partner_auth_clients.identity_user_id` values MUST be updated to the new canonical subject before delegated partner-admin issuance is considered complete.
9. Stale legacy aliases or compat credentials MAY remain recorded for audit history, but they MUST NOT continue to resolve as valid client identity after remediation.
10. If normalized email differs, or if multiple account/tenant mappings remain ambiguous, subject rebind MUST fail closed and require manual identity review outside this runbook.
11. The Auth0 portal identity, the managed bearer token, and the `identity-worker` OAuth password credential are separate credentials and MUST NOT be conflated during remediation.
12. If MCP OAuth host onboarding is in active use, the OAuth password credential MUST be reviewed or reset independently; the Auth0 password or session MUST NOT be reused as that credential.
13. This policy governs manual/operator handling first. It does not require new public endpoints, schema migrations, UI work, or Auth0 webhook automation in v1.
14. The governed outcome for a successful incident is:
   - the new subject resolves to the preserved MCP account context
   - the old subject no longer resolves as an active MCP credential holder
   - partner issuance and self-service issuance succeed under the new subject
15. Every completed incident MUST record evidence for:
   - old subject and new subject
   - normalized email match
   - preserved account and tenant mapping
   - token revoke or no-token verification
   - updated entitlement and partner mapping state
   - final verification that only the new subject remains operational

## Enforcement Surfaces

- `.agency`:
  - `GET|POST /api/admin/identity-seeds`
  - `GET|POST /api/admin/mcp-entitlements`
  - `POST /api/partners/half-dozen/clients/:slug/init`
  - `GET|POST /api/me/mcp-token`
  - `POST /api/me/mcp-token/regenerate`
  - `POST /api/me/mcp-token/revoke`
  - `GET|POST /api/me/mcp-oauth-password`
- `identity-worker`:
  - `POST /v1/mcp/long-lived-tokens/admin-get`
  - `POST /v1/mcp/long-lived-tokens/:id/revoke`
  - managed bearer resolve and `/oauth/userinfo` behavior

## Implementation Boundaries

- No new public endpoints in v1
- No schema migrations in v1
- No automatic Auth0 webhook reconciliation in v1
- No new UI in v1
- Automation MAY be proposed later only after the manual path is stable and auditable

## Evidence

- Operator case or incident reference
- Old subject and new subject values
- Normalized email used for the rebind decision
- `agency_mcp_entitlements` verification before and after remediation
- `agency_identity_seeds` verification when seed binding is involved
- `partner_auth_clients` verification when delegated partner issuance exists
- Managed bearer revoke evidence, or explicit proof that no old token existed
- Verification that self-service or partner-admin issuance now uses the new subject
- Verification that old subject resolution no longer succeeds

## Source Anchors

- `packages/agency/src/lib/server/mcp-token.ts`
- `packages/agency/src/lib/server/mcp-entitlements.ts`
- `packages/agency/src/routes/api/admin/identity-seeds/+server.ts`
- `packages/agency/src/routes/api/admin/mcp-entitlements/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/init/+server.ts`
- `packages/identity-worker/src/index.ts`
- `packages/identity-worker/src/db/queries.ts`
- `docs/AGENCY_USER_PROVISIONING_POLICY.md`
- `docs/policies/v1/policy.user-bearer-token-governance.v1.md`
- `docs/policies/v1/policy.mcp-credential-delivery.v1.md`
