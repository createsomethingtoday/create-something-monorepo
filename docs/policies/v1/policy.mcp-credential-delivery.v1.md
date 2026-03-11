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
2. Named teammate lanes MUST deliver one transparent house URL per lane, and that URL MUST be reflected in the delivery artifact, audit metadata, and `.agency` access view.
3. Credentials issued for a named lane MUST be host-bound so they are rejected on a different named-lane URL unless explicitly approved.
4. Telemetry and Braintrust tracing are mandatory baseline observability controls for dedicated named-lane delivery.
5. Delivery, issuance, and resolve traces for named lanes MUST carry explicit account attribution, including at minimum `account_id`, `tenant_id`, and the active lane or host binding, so operator observability can distinguish one client lane from another.
6. Operator-assisted white-glove onboarding is an approved first-class pathway for initial customer credential delivery when a partner or operator is actively setting up host access for the customer.
7. White-glove onboarding MAY deliver a managed bearer token or an approved legacy credential before the customer has ever logged into `.agency`, provided all policy prerequisites for that credential type are satisfied and the handoff is fully audited.
8. `.agency` remains the canonical self-service surface after white-glove delivery for revoke, regenerate, password rotation, connection management, and ongoing access visibility.
9. Vault-backed worker/runtime bearer tokens MAY be provisioned for dedicated named lanes or reviewer-style pilot hubs as an operator-only bootstrap mechanism before customer identity is ready.
10. Operator bootstrap tokens are runtime guardrail secrets, not customer delivery artifacts. They MUST NOT be displayed in `.agency`, delivered to clients, or represented as end-user bearer credentials.
11. Named-lane infrastructure MAY be deployed before customer identity mapping or consent is complete, but customer-facing managed bearer delivery MUST remain blocked until required identity mapping, active consent, and any required Auth0 subject binding exist.
12. Legacy key issuance MUST be blocked when `exception_approved_by` is missing.
13. Every issued credential MUST have explicit revocation path; time-bounded credentials MUST also have explicit `expires_at`.
14. Plaintext secrets MUST NOT be persisted in docs, migration artifacts, or delivery audit tables.
15. Delivery must be recorded with channel, actor, recipient, and artifact reference.
16. White-glove delivery records MUST also identify whether the credential is an initial onboarding handoff and where the customer will perform ongoing self-service management.
17. Revocation actions MUST remain available regardless of legacy/sunset state.
18. Production credential sync/rotation MUST use Infisical for runtime secrets. Doppler MAY exist only as a one-time migration source.
19. Managed bearer-token issuance for partner-linked users MUST reconcile against current `partner_auth_clients` status and active consent before issuance or request-time allow.
20. Free `MCP-only` versus paid `Policy OS` credential scope MUST follow [`policy.service-tier-entitlement.v1`](./policy.service-tier-entitlement.v1.md); credential delivery alone MUST NOT imply paid governed access.
21. Vault migration cutover MUST include:
   - a dry-run import
   - an executed import
   - verification results showing no missing or mismatched keys before production sync
22. CI/CD and unattended automation MUST use non-interactive Infisical machine identity auth; interactive login is prohibited for production automation.
23. Vault sync/rotation executions MUST produce auditable run context (`provider`, `source project/config`, `target env/path`, `dry_run`, `result`) without exposing plaintext secret values.
24. When a third-party host requires OAuth, OAuth MAY be used as the credential-delivery mechanism for `managed_bearer_bundle`; in that case the delivered OAuth `access_token` MUST be the same managed bearer artifact already governed by `.agency` and `identity-worker`.
25. OAuth delivery MUST NOT require replacing the existing direct bearer-token experience for current MCP clients.
26. OAuth discovery, authorization, token, registration, and OIDC endpoints MUST NOT expose or deliver shared worker/runtime guardrail tokens such as `HUB_API_TOKEN`.
27. Any UI that surfaces managed bearer credentials MUST only reveal plaintext at issuance or regeneration time, while keeping revoke and regenerate controls continuously available.
28. The interactive password used by `identity-worker` OAuth login MUST be governed as a separate credential from the managed bearer token and from the Auth0 portal session.
29. `.agency` MUST provide a self-service surface for entitled users to set or rotate that OAuth login password without exposing previously stored plaintext password material.
30. The OAuth authorization code issued during host onboarding MAY be a signed `identity-worker` token instead of a database-persisted opaque code.
31. If signed authorization codes are used, token exchange MUST validate the signed code against the original OAuth request context, including `client_id`, `redirect_uri`, issuer, expiry, and any PKCE challenge material carried by the authorization flow.
32. Existing compat bearer tokens stored in an approved runtime vault MAY be migrated into `mcp_long_lived_tokens` without rotating the plaintext token, provided the credential is rebound to one canonical Auth0 subject and one canonical `.agency` account/tenant mapping.
33. After managed-token migration, `mcp_long_lived_tokens` becomes the source of truth for token state, while Infisical or another approved vault MAY continue storing the same plaintext value only for runtime compatibility.
34. Credential-delivery migration MUST include duplicate-subject cleanup so that stale entitlement rows, stale token rows, and stale legacy aliases no longer resolve for the same email or account.
35. Auth0 delete/recreate incidents for the same normalized email MUST follow [`policy.auth0-subject-rebind-governance.v1`](./policy.auth0-subject-rebind-governance.v1.md) so delivery artifacts preserve canonical account context while stale old-subject credentials are revoked or deactivated.

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
  - `POST /api/partners/half-dozen/clients/:slug/lanes/:laneSlug/bearer-token/issue`
  - `POST /api/partners/half-dozen/clients/:slug/legacy-key/issue`
  - `POST /api/admin/mcp-entitlements`
  - `POST /api/admin/contracts`
  - `partner_access_deliveries`
- Hub discovery surfaces:
  - `GET /.well-known/oauth-authorization-server`
  - `GET /mcp/.well-known/oauth-authorization-server`
- Portal-managed MCP OAuth password surfaces:
  - `.agency` `MCP Access`
  - authenticated password set/rotate API for entitled users
  - `identity-worker` password verification on `/oauth/authorize`
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
- `partner_access_deliveries` rows exposing named lane URL, host key, bound host, and effective prefix set without plaintext secret storage
- `partner_access_deliveries` rows exposing `account_id`, `tenant_id`, lane URL, host key, bound host, and effective prefix set without plaintext secret storage
- `partner_access_deliveries` rows identifying white-glove versus self-service handoff context and the delivery channel used for initial onboarding
- `agency_mcp_entitlements` rows and operator mutation history
- `partner_auth_clients` and `partner_auth_consents` records used for entitlement reconciliation
- `agency_contract_state` records used as explicit contract authority
- Secret scan of operator docs (no raw bearer artifacts)
- OAuth discovery responses and token-exchange traces showing managed bearer delivery without leaking `HUB_API_TOKEN`
- OAuth authorize and token-exchange traces showing signed authorization-code issuance by `identity-worker`
- Portal audit records showing MCP OAuth password set or rotation without plaintext persistence
- UI audit events for token reveal, regenerate, and revoke actions
- Vault audit trails for create/update operations
- Managed-token migration records showing canonical subject binding before or during import
- Verification output confirming one active token row and one active entitlement row per migrated email
- Migration verification output (`missing=0`, `mismatched=0`) for provider cutover
- Sync/rotation command logs showing provider selection and non-secret execution context
- evidence that runtime bootstrap secrets were stored only in Infisical/Worker secret state and never emitted as customer delivery artifacts
- portal or operator evidence showing lane infrastructure ready while customer credential delivery remained blocked pending identity mapping or consent
- Braintrust and telemetry traces showing explicit `account_id`, `tenant_id`, and lane host attribution for named-lane issuance and resolution events

## Source Anchors

- `packages/identity-worker/src/index.ts`
- `packages/identity-worker/README.md`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/bearer-token/issue/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/lanes/[laneSlug]/bearer-token/issue/+server.ts`
- `packages/agency/src/routes/api/partners/half-dozen/clients/[slug]/legacy-key/issue/+server.ts`
- `packages/agency/src/routes/api/admin/mcp-entitlements/+server.ts`
- `scripts/cs-hub-vault-sync.sh`
- `scripts/cs-hub-rotate-production.sh`
- `scripts/cs-hub-webflow-reviewers-phase-a-vault-sync.sh`
- `scripts/cs-hub-webflow-reviewers-phase-a-deploy.sh`
- `scripts/migrate-doppler-to-infisical.sh`
- `docs/CS_HUB_VAULT_ROTATION_WORKFLOW.md`
- `docs/guides/CHATGPT_MCP_OAUTH_MANAGED_BEARER.md`
- `docs/policies/v1/policy.service-tier-entitlement.v1.md`
- `docs/policies/v1/policy.mcp-oauth-password-governance.v1.md`
- `docs/policies/v1/policy.auth0-subject-rebind-governance.v1.md`
