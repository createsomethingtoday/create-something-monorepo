# policy.mcp-credential-delivery.v1

- Status: `draft`
- Owner: `CREATE SOMETHING security + partner operations`
- Effective date: `TBD`

## Purpose

Codify how MCP credentials are issued, rotated, revoked, vault-sourced, and delivered for partner-managed clients.

## Scope

- Managed bearer-token delivery for authenticated `.agency` users and partner-mapped users
- OAuth-facade delivery for hosts that require OAuth but should still receive managed bearer credentials
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
12. When a third-party host requires OAuth, OAuth MAY be used as the credential-delivery mechanism for `managed_bearer_bundle`; in that case the delivered OAuth `access_token` MUST be the same managed bearer artifact already governed by `.agency` and `identity-worker`.
13. OAuth delivery MUST NOT require replacing the existing direct bearer-token experience for current MCP clients.
14. OAuth discovery, authorization, token, registration, and OIDC endpoints MUST NOT expose or deliver shared worker/runtime guardrail tokens such as `HUB_API_TOKEN`.
15. Any UI that surfaces managed bearer credentials MUST only reveal plaintext at issuance or regeneration time, while keeping revoke and regenerate controls continuously available.

## Enforcement Surfaces

- Identity worker:
  - `/.well-known/oauth-authorization-server`
  - `/.well-known/openid-configuration`
  - `/oauth/authorize`
  - `/oauth/token`
  - `/oauth/register`
  - `/oauth/userinfo`
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
- Hub discovery surfaces:
  - `GET /.well-known/oauth-authorization-server`
  - `GET /mcp/.well-known/oauth-authorization-server`
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
- OAuth discovery responses and token-exchange traces showing managed bearer delivery without leaking `HUB_API_TOKEN`
- UI audit events for token reveal, regenerate, and revoke actions
- Vault audit trails for create/update operations
- Migration verification output (`missing=0`, `mismatched=0`) for provider cutover
- Sync/rotation command logs showing provider selection and non-secret execution context

## Source Anchors

- `packages/identity-worker/src/index.ts`
- `packages/identity-worker/README.md`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/bearer-token/issue/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/legacy-key/issue/+server.ts`
- `packages/agency/src/routes/api/admin/mcp-entitlements/+server.ts`
- `scripts/cs-hub-vault-sync.sh`
- `scripts/cs-hub-rotate-production.sh`
- `scripts/migrate-doppler-to-infisical.sh`
- `docs/CS_HUB_VAULT_ROTATION_WORKFLOW.md`
- `docs/guides/CHATGPT_MCP_OAUTH_MANAGED_BEARER.md`
