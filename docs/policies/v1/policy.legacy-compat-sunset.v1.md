# policy.legacy-compat-sunset.v1

- Status: `draft`
- Owner: `CREATE SOMETHING MCP platform operations`
- Effective date: `TBD`

## Purpose

Govern temporary legacy compatibility lanes for bearer-only MCP hosts and force planned sunset.

## Scope

- Legacy bridge worker deployment (`HUB_IDENTITY_MODE=compat`)
- Sunset-bounded legacy key issuance
- Migration deadlines for strict-session adoption
- Excludes managed-bearer compat lanes that still resolve through `identity-worker` and preserve bound-host plus allowed-prefix enforcement for third-party host compatibility

## Policy Statements

1. Legacy compatibility MUST be treated as temporary exception infrastructure.
2. Legacy key issuance MUST include `sunset_at` and MUST NOT exceed the configured sunset window.
3. Legacy endpoints MUST be deployed separately from strict hubs.
4. Each legacy bundle MUST carry explicit expiry and sunset metadata in delivery outputs.
5. Legacy exceptions MUST be removable by revocation and tracked in audit records.
6. Compat workers MUST default `HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS=false`; any per-client override requires explicit operator exception approval.
7. This policy governs legacy key or shared-runtime-token compatibility paths, not managed-bearer compat lanes used to accommodate bearer-only third-party hosts.

## Enforcement Surfaces

- Identity worker:
  - `policy.legacy-compat-sunset.v1` decision path for key issuance
- Hub deploy scripts:
  - `scripts/cs-hub-legacy-bridge-deploy.sh`
- Operator runbooks:
  - `docs/MCP_HUB_REMOTE_DEPLOY.md`
  - `docs/CS_HUB_OPERATOR_CHECKLIST.md`

## Evidence

- `mcp_policy_events` entries for sunset policy decisions
- Legacy worker deploy vars include `HUB_LEGACY_SUNSET_AT`
- Legacy worker deploy vars include `HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS=false` by default
- Delivery bundles include `sunset_at`

## Source Anchors

- `packages/identity-worker/src/index.ts`
- `scripts/cs-hub-legacy-bridge-deploy.sh`
- `docs/STRATEGIC_MCP_SECURITY_POLICY_2026-02-27.md`
