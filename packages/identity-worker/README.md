# @create-something/identity-worker

Centralized authentication service for CREATE SOMETHING properties.

## Purpose

Single identity across all properties: .space, .io, .agency, .ltd, .learn, and templates platform.

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

## Related

- `packages/lms` - Primary consumer
- `packages/templates-platform` - Template authentication
