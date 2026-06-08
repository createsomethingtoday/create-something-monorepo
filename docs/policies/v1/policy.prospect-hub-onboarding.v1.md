# policy.prospect-hub-onboarding.v1

- Status: `draft`
- Owner: `CREATE SOMETHING partner operations`
- Effective date: `TBD`

## Purpose

Define how a potential client may be provisioned into a governed MCP-ready workspace before commercial graduation without turning that prospect record into an issuable customer credential.

## Scope

- Partner prospect bootstrap in `packages/agency`
- Prospect client and lane metadata in `partner_auth_clients` and `partner_auth_access_lanes`
- Issuance guards for strict sessions, managed bearer tokens, and legacy keys
- Backend-managed Composio connection setup for prospect workspaces

## Policy Statements

1. Prospect onboarding MAY provision a workspace account, restricted lane, and delegated provider connection surfaces before commercial activation.
2. Prospect bootstrap MUST create or reconcile records in `initialized` state unless a separate graduation workflow promotes them.
3. Prospect bootstrap MUST stamp durable lifecycle metadata that marks the record as `prospect` and names the graduation requirements.
4. Prospect bootstrap MUST NOT require a canonical portal identity subject or identity account mapping at provisioning time.
5. Prospect bootstrap MAY preserve previously known identity fields on an existing prospect record, but those fields MUST NOT by themselves make the prospect issuable.
6. Prospect records MUST remain blocked from strict-session minting, managed bearer issuance, and legacy key issuance until graduation is explicitly recorded.
7. Graduation requires governed entitlement state and identity readiness at minimum: `service_entitled`, `policy_accepted`, `contract_active`, `billing_active`, `identity_account_id`, and `identity_user_id`.
8. Prospect lanes MUST use a narrow, auditable `allowed_tool_prefixes` set and MUST NOT inherit a broad shared Hub surface.
9. Prospect onboarding MAY support backend-managed service connection work, including Composio connect links and connected-account management, while issuance remains blocked.
10. Composio `auth_config_id` values SHOULD remain house-managed defaults for prospect onboarding. The user-facing action is connecting an account, not creating arbitrary auth configs, unless an approved bring-your-own-OAuth policy applies.
11. Prospect graduation MUST bind canonical identity fields, verify entitlement readiness against the house entitlement model, and require an active partner consent record before the lifecycle marker is cleared.
12. A signed-in `.agency` user MAY claim a preprovisioned prospect workspace only when the claimant email matches the prospect owner email or an explicit prospect claim allowlist. That claim flow MUST bind through the house identity-seed model and MUST NOT clear issuance blocks by itself.
13. Discovery surfaces MAY show claimable prospect workspaces and claimed-prospect toolkit connection state to the signed-in `.agency` user, but those surfaces MUST apply the same owner-email, allowlist, and conflict checks as the claim route and MUST scope toolkit status to the claimed prospect bindings.
14. Prospect self-service discovery and claim surfaces MUST treat only `initialized` and `active` prospect records as immediately claimable. `paused`, `sunset`, and `disabled` records MUST NOT present as self-service-claimable until operator action restores them.
15. A claimed prospect workspace MAY issue self-service Composio connect links only for toolkits already enabled on that prospect client or lane, and only through house-managed `auth_config_id` defaults. This flow MUST keep customer credential issuance blocked until graduation.

## Enforcement Surfaces

- `POST /api/partners/half-dozen/prospects/:slug/bootstrap`
- `POST /api/partners/half-dozen/prospects/:slug/graduate`
- `GET /api/me/prospects`
- `POST /api/me/prospects/:slug/claim`
- `POST /api/me/prospects/:slug/toolkits/:toolkit/connect-link`
- `POST /api/partners/half-dozen/clients/:slug/access/mint`
- `POST /api/partners/half-dozen/clients/:slug/bearer-token/issue`
- `POST /api/partners/half-dozen/clients/:slug/legacy-key/issue`
- `POST /api/partners/half-dozen/clients/:slug/lanes/:laneSlug/access/mint`
- `POST /api/partners/half-dozen/clients/:slug/lanes/:laneSlug/bearer-token/issue`

## Evidence

- `partner_auth_clients.metadata_json`
- `partner_auth_access_lanes.metadata_json`
- `partner_auth_toolkit_accounts.last_checked_at`
- `partner_auth_toolkit_accounts.connected_at`
- issuance deny records with `prospect_not_ready`
- partner access delivery records after graduation
- `partner_auth_toolkit_events` rows with `connect_link_created`
- route and audit traces showing the effective `allowed_tool_prefixes`

## Source Anchors

- `packages/agency/src/lib/server/partner-auth.ts`
- `packages/agency/src/lib/server/partner-prospect-bootstrap-core.ts`
- `packages/agency/src/lib/server/partner-prospect-bootstrap.ts`
- `packages/agency/src/lib/server/partner-prospect-claim-core.ts`
- `packages/agency/src/lib/server/partner-prospect-claim.ts`
- `packages/agency/src/lib/server/partner-prospect-discovery-core.ts`
- `packages/agency/src/lib/server/partner-prospect-discovery.ts`
- `packages/agency/src/lib/server/partner-prospect-list-core.ts`
- `packages/agency/src/lib/server/partner-prospect-list.ts`
- `packages/agency/src/lib/server/partner-prospect-toolkit-status-core.ts`
- `packages/agency/src/lib/server/partner-prospect-toolkit-status.ts`
- `packages/agency/src/lib/server/partner-prospect-toolkit-connect-link-core.ts`
- `packages/agency/src/lib/server/partner-prospect-toolkit-connect-link.ts`
- `packages/agency/src/lib/server/partner-prospect-graduate-core.ts`
- `packages/agency/src/lib/server/partner-prospect-graduate.ts`
- `packages/agency/src/routes/api/partners/half-dozen/prospects/[slug]/bootstrap/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/prospects/[slug]/graduate/+server.ts`
- `packages/agency/src/routes/api/me/prospects/+server.ts`
- `packages/agency/src/routes/api/me/prospects/[slug]/claim/+server.ts`
- `packages/agency/src/routes/api/me/prospects/[slug]/toolkits/[toolkit]/connect-link/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/access/mint/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/bearer-token/issue/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/legacy-key/issue/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/lanes/[laneSlug]/access/mint/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/lanes/[laneSlug]/bearer-token/issue/+server.ts`
- `docs/AGENCY_USER_PROVISIONING_POLICY.md`
- `docs/REMOTE_MCP_IDENTITY_STANDARD.md`
