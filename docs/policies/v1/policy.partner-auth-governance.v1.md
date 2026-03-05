# policy.partner-auth-governance.v1

- Status: `draft`
- Owner: `CREATE SOMETHING partner operations`
- Effective date: `TBD`

## Purpose

Define policy controls for partner-admin actions that mint MCP sessions on behalf of client workspaces.

## Scope

- Partner-boundary admin minting (`/v1/mcp/sessions/admin-mint`)
- Consent and actor trace requirements
- Hybrid rollout enforcement (`legacy_enforce -> shadow -> polar_enforce`)

## Policy Statements

1. Admin mint MUST be blocked when an active consent record is missing.
2. Admin mint MUST include actor trace metadata (`who minted`, `why`, `which client`).
3. Policy decisions for admin mint MUST be logged with:
   - `decision`
   - `evaluation_path`
   - `policy_hash`
   - `fallback_used`
   - `actor`
4. Rollout mode for partner governance MUST default to `legacy_enforce` until rollout gates pass.
5. Fallback policy path MAY be used only when primary policy evaluation fails, and fallback usage MUST be auditable.

## Enforcement Surfaces

- Identity worker:
  - `POST /v1/mcp/sessions/admin-mint`
  - `mcp_policy_rollout`
  - `mcp_policy_events`
- Agency partner API:
  - `POST /api/partners/half-dozen/clients/:slug/access/mint`

## Evidence

- Decision events in `mcp_policy_events`
- Consent linkage in admin mint payloads and partner consent records
- Delivery audit records in `partner_access_deliveries`

## Source Anchors

- `packages/identity-worker/src/index.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/access/mint/+server.ts`
- `packages/policy-os-engine/src/hybrid.ts`
