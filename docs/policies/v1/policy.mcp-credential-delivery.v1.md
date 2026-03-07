# policy.mcp-credential-delivery.v1

- Status: `draft`
- Owner: `CREATE SOMETHING security + partner operations`
- Effective date: `TBD`

## Purpose

Codify how MCP credentials are issued, rotated, revoked, vault-sourced, and delivered for partner-managed clients.

## Scope

- Managed bearer-token delivery for authenticated `.agency` users and partner-mapped users
- Legacy bridge bearer key issuance/revocation
- Strict session bundle delivery records
- Secret handling and audit controls
- Infisical governance and migration controls for runtime Worker secrets

## Policy Statements

1. `managed_bearer_bundle` is the default customer-facing MCP credential delivery mode.
2. Legacy key issuance MUST be blocked when `exception_approved_by` is missing.
3. Every issued credential MUST have explicit revocation path; time-bounded credentials MUST also have explicit `expires_at`.
4. Plaintext secrets MUST NOT be persisted in docs, migration artifacts, or delivery audit tables.
5. Delivery must be recorded with channel, actor, recipient, and artifact reference.
6. Revocation actions MUST remain available regardless of legacy/sunset state.
7. Production credential sync/rotation MUST use Infisical for runtime secrets. Doppler MAY exist only as a one-time migration source.
8. Managed bearer-token issuance for partner-linked users MUST reconcile against current `partner_auth_clients` status and active consent before issuance or request-time allow.
9. Vault migration cutover MUST include:
   - a dry-run import
   - an executed import
   - verification results showing no missing or mismatched keys before production sync
10. CI/CD and unattended automation MUST use non-interactive Infisical machine identity auth; interactive login is prohibited for production automation.
11. Vault sync/rotation executions MUST produce auditable run context (`provider`, `source project/config`, `target env/path`, `dry_run`, `result`) without exposing plaintext secret values.

## Enforcement Surfaces

- Identity worker:
  - `POST /v1/mcp/long-lived-tokens/admin-issue`
  - `POST /v1/mcp/long-lived-tokens/:id/revoke`
  - `POST /v1/mcp/legacy-keys/issue`
  - `POST /v1/mcp/legacy-keys/:id/revoke`
  - managed bearer resolve/introspection path
  - `mcp_legacy_keys`
  - `mcp_long_lived_tokens`
  - `mcp_policy_events`
- Agency partner API:
  - `POST /api/partners/half-dozen/clients/:slug/bearer-token/issue`
  - `POST /api/partners/half-dozen/clients/:slug/legacy-key/issue`
  - `POST /api/admin/mcp-entitlements`
  - `POST /api/admin/contracts`
  - `partner_access_deliveries`
- Vault/sync automation:
  - `scripts/cs-hub-vault-sync.sh`
  - `scripts/cs-hub-rotate-production.sh`
  - `scripts/migrate-doppler-to-infisical.sh`
  - `pnpm mcp:hub:vault:sync`
  - `pnpm mcp:hub:rotate:production`
  - `pnpm mcp:hub:vault:migrate:doppler-to-infisical`

## Evidence

- `mcp_policy_events` decisions for issue/revoke actions
- `partner_access_deliveries` rows with non-secret metadata
- `agency_mcp_entitlements` rows and operator mutation history
- `partner_auth_clients` and `partner_auth_consents` records used for entitlement reconciliation
- `agency_contract_state` records used as explicit contract authority
- Secret scan of operator docs (no raw bearer artifacts)
- Vault audit trails for create/update operations
- Migration verification output (`missing=0`, `mismatched=0`) for provider cutover
- Sync/rotation command logs showing provider selection and non-secret execution context

## Source Anchors

- `packages/identity-worker/src/index.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/bearer-token/issue/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/legacy-key/issue/+server.ts`
- `packages/agency/src/routes/api/admin/mcp-entitlements/+server.ts`
- `scripts/cs-hub-vault-sync.sh`
- `scripts/cs-hub-rotate-production.sh`
- `scripts/migrate-doppler-to-infisical.sh`
- `docs/CS_HUB_VAULT_ROTATION_WORKFLOW.md`
