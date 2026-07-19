# @create-something/identity-worker

Centralized authentication service for CREATE SOMETHING properties.

## Purpose

Single identity across all properties: .space, .io, .agency, .ltd, and .learn.

## Features

- JWT-based authentication
- Refresh token rotation
- Password hashing (bcrypt)
- JWKS endpoint for token verification
- User management (signup, login, profile)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/create-something-auth` | Versioned AI-readable platform discovery |
| GET | `/v1/auth/openapi.json` | Auth-focused OpenAPI 3.1 contract |
| POST | `/v1/auth/signup` | Create account |
| POST | `/v1/auth/login` | Authenticate |
| POST | `/v1/auth/refresh` | Refresh tokens |
| POST | `/v1/auth/logout` | Invalidate session |
| GET | `/v1/users/me` | Get current user |
| GET | `/.well-known/jwks.json` | Public keys |
| POST | `/v1/mcp/sessions` | Create MCP session token + policy claims |
| POST | `/v1/mcp/sessions/admin-mint` | Admin mint MCP session for mapped account (API key + policy gated) |
| POST | `/v1/control/scheduler-tokens/admin-issue` | Issue a short-lived Control scheduler JWT after exact frozen-activation scope readback (API key permission gated) |
| POST | `/v1/mcp/sessions/resolve` | Resolve MCP session token (hub-only) |
| POST | `/v1/mcp/long-lived-tokens/admin-issue` | Issue or regenerate a managed bearer token (API key + policy gated) |
| POST | `/v1/mcp/long-lived-tokens/admin-get` | Inspect managed bearer token metadata by auth subject (API key gated) |
| POST | `/v1/mcp/long-lived-tokens/:id/revoke` | Revoke managed bearer token (API key + policy gated) |
| GET | `/v1/mcp/sessions/:id` | Inspect own MCP session |
| POST | `/v1/mcp/sessions/:id/revoke` | Revoke own MCP session |
| POST | `/v1/mcp/legacy-keys/issue` | Issue legacy bearer key (API key + policy gated) |
| POST | `/v1/mcp/legacy-keys/:id/revoke` | Revoke legacy bearer key (API key + policy gated) |

## Stack

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1
- **Crypto**: Web Crypto API

## Development

```bash
pnpm --filter=identity-worker dev
```

Control preview/local pairs must set one explicit `OAUTH_ISSUER`, list the
paired runtime MCP audience in `CONTROL_RUNTIME_RESOURCES`, and configure that
runtime with the same issuer plus this Identity instance's JWKS URL. Production
pins these values only in the production deploy command; shared Wrangler
defaults intentionally do not impersonate the production issuer or audience.
Do not reuse a production audience for a preview runtime.
Control credential roles are new execution authority. Existing entitlement
rows are not converted to readers implicitly; an owning approval workflow must
provision `account_owner` or `account_reader` explicitly before customer OAuth
can mint a Control token. The initial fail-closed deployment provisions no such
customer role or access grant.

## Deployment

```bash
pnpm --filter=identity-worker deploy
```

## Database Migrations

```bash
pnpm --filter=identity-worker db:migrate
```

Cloudflare D1 uses the package-local migrations directory configured in
[wrangler.toml](/Users/micahjohnson/Documents/Github/Create%20Something/create-something-monorepo/packages/identity-worker/wrangler.toml#L29).

## Integration

### First-party applications

Identity Worker is the credential and token authority and the primary API surface for CREATE SOMETHING applications. Agents discover it through `/.well-known/create-something-auth`, `/v1/auth/openapi.json`, or the CREATE SOMETHING MCP resources `auth://platform/contract` and `auth://platform/openapi`. The read-only MCP tool `auth_config_validate` checks proposed non-secret integration configuration without network access or mutation.

Access tokens are ES256 JWTs published through `/.well-known/jwks.json`; application-specific audiences include `ona-agents`. Canon consumers verify the exact issuer, audience, signature, and expiry before applying app-owned allow rules. Canon is the reference adapter, not the platform contract.

New SvelteKit applications should adopt `@create-something/canon/auth/access`, `@create-something/canon/auth/handlers`, `@create-something/canon/auth/cookies`, and `@create-something/canon/auth/components` rather than implementing a provider-specific verifier. The full integration and promotion contract is in [`docs/guides/FIRST_PARTY_AUTH_PLATFORM.md`](../../docs/guides/FIRST_PARTY_AUTH_PLATFORM.md).

Production audience changes require an Identity Worker deployment. Application cutover, real-user migration, and removal of prior provider credentials remain separate approval-gated actions.

### Property and MCP integration

Properties verify tokens by:
1. Fetching JWKS from `/.well-known/jwks.json`
2. Validating JWT signature
3. Checking expiration and issuer

MCP hub integration:
1. Frontend/backend creates session via `POST /v1/mcp/sessions` with user JWT
   - Session token (`ms_tok_*`) is ephemeral, while `account_id` is stable per `{user_id, tenant_id}`
2. Host stores returned MCP token and calls hub endpoint
3. Hub introspects token via `POST /v1/mcp/sessions/resolve` using `MCP_SESSION_RESOLVE_TOKEN`
   - resolver accepts MCP session tokens, managed `.agency` bearer tokens, and issued legacy personal bearer tokens (`mlk_*`) for compat lanes
4. Managed `.agency` bearer tokens are only considered valid when `.agency` confirms live entitlement state for the Auth0 subject and mapped account
   - current `.agency` reconciliation uses partner client status, mapped identity/account records, and active consent state before returning allow/deny

Recommended production config:

- Worker secret `MCP_SESSION_RESOLVE_TOKEN`
  - must match hub secret `HUB_SESSION_RESOLVE_TOKEN`
- Optional Oso primary evaluator:
  - Worker var `OSO_URL=https://cloud.osohq.com`
  - Worker secret `OSO_API_KEY`
  - Worker var `OSO_FETCH_TIMEOUT_MILLIS=5000`
  - Worker var `OSO_BOOTSTRAP_POLICY=false`
  - Worker var `MCP_POLICY_FALLBACK_ENABLED=true`
- Required for managed `.agency` bearer token issue + resolve:
  - Worker var `AGENCY_INTERNAL_API_URL=https://createsomething.agency`
  - Worker secret `AGENCY_INTERNAL_API_KEY`

Partner-admin integration:
1. Agency partner API stores consent records and identity account mapping
2. Partner API calls `POST /v1/mcp/sessions/admin-mint` with API key scope `mcp_session_admin_mint`
3. Policy decision telemetry is written to `mcp_policy_events`
4. Legacy exceptions (temporary) use:
   - `POST /v1/mcp/legacy-keys/issue` (`mcp_legacy_key_issue`)
   - `POST /v1/mcp/legacy-keys/:id/revoke` (`mcp_legacy_key_revoke`)
5. Legacy issuance requires approved exception + sunset metadata; no plaintext key persistence in docs/artifacts
6. Compat hubs can resolve those legacy bearer tokens directly when `HUB_SESSION_RESOLVE_URL` + `HUB_SESSION_RESOLVE_TOKEN` are configured

## Related

- `packages/lms` - Primary consumer
