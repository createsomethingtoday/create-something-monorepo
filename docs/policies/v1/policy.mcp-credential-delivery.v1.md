# policy.mcp-credential-delivery.v1

- Status: `draft`
- Owner: `CREATE SOMETHING security + partner operations`
- Effective date: `TBD`

## Purpose

Codify how MCP credentials are issued, rotated, revoked, vault-sourced, and delivered for partner-managed clients.

## Scope

- Legacy bridge bearer key issuance/revocation
- Strict session bundle delivery records
- Secret handling and audit controls
- Vault provider governance and migration controls for runtime Worker secrets

## Policy Statements

1. Legacy key issuance MUST be blocked when `exception_approved_by` is missing.
2. Every issued credential MUST have explicit `expires_at` and revocation path.
3. Plaintext secrets MUST NOT be persisted in docs, migration artifacts, or delivery audit tables.
4. Delivery must be recorded with channel, actor, recipient, and artifact reference.
5. Revocation actions MUST remain available regardless of legacy/sunset state.
6. Production credential sync/rotation MUST use an approved vault provider (`doppler` or `infisical`) and provider choice MUST be explicit in automation context.
7. Vault migration cutover MUST include:
   - a dry-run import
   - an executed import
   - verification results showing no missing or mismatched keys before production sync
8. CI/CD and unattended automation MUST use non-interactive machine auth (Doppler service token/OIDC or Infisical machine identity token); interactive login is prohibited for production automation.
9. Vault sync/rotation executions MUST produce auditable run context (`provider`, `source project/config`, `target env/path`, `dry_run`, `result`) without exposing plaintext secret values.

## Enforcement Surfaces

- Identity worker:
  - `POST /v1/mcp/legacy-keys/issue`
  - `POST /v1/mcp/legacy-keys/:id/revoke`
  - `mcp_legacy_keys`
  - `mcp_policy_events`
- Agency partner API:
  - `POST /api/partners/half-dozen/clients/:slug/legacy-key/issue`
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
- Secret scan of operator docs (no raw bearer artifacts)
- Vault audit trails for create/update operations
- Migration verification output (`missing=0`, `mismatched=0`) for provider cutover
- Sync/rotation command logs showing provider selection and non-secret execution context

## Source Anchors

- `packages/identity-worker/src/index.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/legacy-key/issue/+server.ts`
- `scripts/cs-hub-vault-sync.sh`
- `scripts/cs-hub-rotate-production.sh`
- `scripts/migrate-doppler-to-infisical.sh`
- `docs/CS_HUB_VAULT_ROTATION_WORKFLOW.md`
- `docs/DM_HUB_CLIENT_ONBOARDING.md`
