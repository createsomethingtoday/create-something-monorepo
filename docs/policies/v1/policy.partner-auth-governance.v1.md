# policy.partner-auth-governance.v1

- Status: `draft`
- Owner: `CREATE SOMETHING partner operations`
- Effective date: `TBD`

## Purpose

Define policy controls for partner-admin actions that mint MCP sessions and manage toolkit auth on behalf of client workspaces.

## Scope

- Partner-boundary admin minting (`/v1/mcp/sessions/admin-mint`)
- Partner toolkit auth account management (`/api/partners/half-dozen/clients/:slug/notion/accounts/*`)
- Partner toolkit auth account management (`/api/partners/half-dozen/clients/:slug/toolkits/:toolkit/accounts/*`)
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
6. Toolkit auth account viewing, upserts, and connect-link issuance MUST require an active consent record.
7. Toolkit account pinning and disabling MUST require a human review trace (for example `X-Partner-Review-Step`).
8. Unattended partner-managed automation MUST execute against operator-approved pinned toolkit accounts or equivalent governed runtime credentials. Personal end-user bearer tokens MUST NOT be repurposed as background job credentials.
9. Background job executions MUST record workflow or job identity in addition to actor trace metadata.

## Enforcement Surfaces

- Identity worker:
  - `POST /v1/mcp/sessions/admin-mint`
  - `mcp_policy_rollout`
  - `mcp_policy_events`
- Agency partner API:
  - `POST /api/partners/half-dozen/clients/:slug/access/mint`
  - `GET|POST /api/partners/half-dozen/clients/:slug/notion/accounts`
  - `POST /api/partners/half-dozen/clients/:slug/notion/accounts/:accountSlug/connect-link`
  - `POST /api/partners/half-dozen/clients/:slug/notion/accounts/:accountSlug/pin`
  - `POST /api/partners/half-dozen/clients/:slug/notion/accounts/:accountSlug/disable`
  - `GET|POST /api/partners/half-dozen/clients/:slug/toolkits/:toolkit/accounts`
  - `POST /api/partners/half-dozen/clients/:slug/toolkits/:toolkit/accounts/:accountSlug/connect-link`
  - `POST /api/partners/half-dozen/clients/:slug/toolkits/:toolkit/accounts/:accountSlug/pin`
  - `POST /api/partners/half-dozen/clients/:slug/toolkits/:toolkit/accounts/:accountSlug/disable`

## Evidence

- Decision events in `mcp_policy_events`
- Consent linkage in admin mint payloads and partner consent records
- Delivery audit records in `partner_access_deliveries`
- workflow or job traces showing pinned account and runtime identity selection

## Source Anchors

- `packages/identity-worker/src/index.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/access/mint/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/notion/accounts/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/toolkits/[toolkit]/accounts/+server.ts`
- `docs/policies/v1/policy.cross-workspace-sync-governance.v1.md`
- `packages/agency/src/lib/server/partner-auth.ts`
- `packages/policy-os-engine/src/hybrid.ts`
