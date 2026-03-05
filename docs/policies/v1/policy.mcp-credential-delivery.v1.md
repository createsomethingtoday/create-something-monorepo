# policy.mcp-credential-delivery.v1

- Status: `draft`
- Owner: `CREATE SOMETHING security + partner operations`
- Effective date: `TBD`

## Purpose

Codify how MCP credentials are issued, rotated, revoked, and delivered for partner-managed clients.

## Scope

- Legacy bridge bearer key issuance/revocation
- Strict session bundle delivery records
- Secret handling and audit controls

## Policy Statements

1. Legacy key issuance MUST be blocked when `exception_approved_by` is missing.
2. Every issued credential MUST have explicit `expires_at` and revocation path.
3. Plaintext secrets MUST NOT be persisted in docs, migration artifacts, or delivery audit tables.
4. Delivery must be recorded with channel, actor, recipient, and artifact reference.
5. Revocation actions MUST remain available regardless of legacy/sunset state.

## Enforcement Surfaces

- Identity worker:
  - `POST /v1/mcp/legacy-keys/issue`
  - `POST /v1/mcp/legacy-keys/:id/revoke`
  - `mcp_legacy_keys`
  - `mcp_policy_events`
- Agency partner API:
  - `POST /api/partners/half-dozen/clients/:slug/legacy-key/issue`
  - `partner_access_deliveries`

## Evidence

- `mcp_policy_events` decisions for issue/revoke actions
- `partner_access_deliveries` rows with non-secret metadata
- Secret scan of operator docs (no raw bearer artifacts)

## Source Anchors

- `packages/identity-worker/src/index.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/legacy-key/issue/+server.ts`
- `docs/DM_HUB_CLIENT_ONBOARDING.md`
