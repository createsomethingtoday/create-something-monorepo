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
| POST | `/v1/mcp/sessions/resolve` | Resolve MCP session token (hub-only) |
| GET | `/v1/mcp/sessions/:id` | Inspect own MCP session |
| POST | `/v1/mcp/sessions/:id/revoke` | Revoke own MCP session |

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

## Related

- `packages/lms` - Primary consumer
