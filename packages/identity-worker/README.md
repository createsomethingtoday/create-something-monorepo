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
| POST | `/auth/signup` | Create account |
| POST | `/auth/login` | Authenticate |
| POST | `/auth/refresh` | Refresh tokens |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Get current user |
| GET | `/.well-known/jwks.json` | Public keys |
| POST | `/v1/mcp/sessions` | Create MCP session token + policy claims |
| POST | `/v1/mcp/sessions/admin-mint` | Admin mint MCP session for mapped account (API key + policy gated) |
| POST | `/v1/mcp/sessions/resolve` | Resolve MCP session token (hub-only) |
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

Properties verify tokens by:
1. Fetching JWKS from `/.well-known/jwks.json`
2. Validating JWT signature
3. Checking expiration and issuer

MCP hub integration:
1. Frontend/backend creates session via `POST /v1/mcp/sessions` with user JWT
   - Session token (`ms_tok_*`) is ephemeral, while `account_id` is stable per `{user_id, tenant_id}`
2. Host stores returned MCP token and calls hub endpoint
3. Hub introspects token via `POST /v1/mcp/sessions/resolve` using `MCP_SESSION_RESOLVE_TOKEN`

Recommended production config:

- Worker secret `MCP_SESSION_RESOLVE_TOKEN`
  - must match hub secret `HUB_SESSION_RESOLVE_TOKEN`
- Optional Oso primary evaluator:
  - Worker var `OSO_URL=https://cloud.osohq.com`
  - Worker secret `OSO_API_KEY`
  - Worker var `OSO_FETCH_TIMEOUT_MILLIS=5000`
  - Worker var `OSO_BOOTSTRAP_POLICY=false`
  - Worker var `MCP_POLICY_FALLBACK_ENABLED=true`

Partner-admin integration:
1. Agency partner API stores consent records and identity account mapping
2. Partner API calls `POST /v1/mcp/sessions/admin-mint` with API key scope `mcp_session_admin_mint`
3. Policy decision telemetry is written to `mcp_policy_events`
4. Legacy exceptions (temporary) use:
   - `POST /v1/mcp/legacy-keys/issue` (`mcp_legacy_key_issue`)
   - `POST /v1/mcp/legacy-keys/:id/revoke` (`mcp_legacy_key_revoke`)
5. Legacy issuance requires approved exception + sunset metadata; no plaintext key persistence in docs/artifacts

## Related

- `packages/lms` - Primary consumer
