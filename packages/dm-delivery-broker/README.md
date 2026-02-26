# @create-something/dm-delivery-broker

Cloudflare Worker for secure one-time client secret delivery.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/v1/delivery/issue` | Admin bearer token | Create one-time delivery package |
| `GET` | `/v1/delivery/redeem?token=...` | Delivery code header | Redeem package payload |
| `POST` | `/v1/delivery/:id/revoke` | Admin bearer token | Revoke package before expiry |
| `GET` | `/v1/delivery/:id` | Admin bearer token | Inspect package state |
| `GET` | `/v1/delivery?client_id=...` | Admin bearer token | List packages (all or by client) |
| `GET` | `/v1/delivery/events?client_id=...` | Admin bearer token | Audit events (all or by client) |
| `GET` | `/health` | None | Health check |

## Security Model

- One-time URL token + out-of-band delivery code.
- Token and code are stored as SHA-256 hashes only.
- Payload is encrypted with AES-GCM before being stored in D1.
- Every package is scoped by required `client_id`.
- Package lifecycle is audited in `delivery_events`.

## Environment

Required secrets:

- `DELIVERY_ADMIN_TOKEN`: Bearer token for issue/revoke/inspect.
- `DELIVERY_ENCRYPTION_KEY`: Base64/base64url encoded 32-byte key for AES-GCM.

Generate an encryption key:

```bash
openssl rand -base64 32
```

Optional vars:

- `DELIVERY_BASE_URL`: Public base URL used to construct `delivery_url` in issue responses.
- `ALLOWED_ORIGINS`: Comma-separated CORS allowlist.

## Development

```bash
pnpm --filter @create-something/dm-delivery-broker dev
```

## Database

```bash
pnpm --filter @create-something/dm-delivery-broker db:migrate:local
pnpm --filter @create-something/dm-delivery-broker db:migrate
```

## Deploy

```bash
pnpm --filter @create-something/dm-delivery-broker deploy
```

Set secrets before deploy:

```bash
cd packages/dm-delivery-broker
pnpm exec wrangler secret put DELIVERY_ADMIN_TOKEN
pnpm exec wrangler secret put DELIVERY_ENCRYPTION_KEY
```

## Example: Issue

```bash
curl -fsS -X POST "https://dm-delivery-broker.createsomething.workers.dev/v1/delivery/issue" \
  -H "Authorization: Bearer $DELIVERY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Operator-Id: micah" \
  -d '{
    "client_id": "acme",
    "ttl_seconds": 900,
    "max_redemptions": 1,
    "recipient": "client@example.com",
    "note": "DM + Hub onboarding package",
    "payload": {
      "dm": {"endpoint": "https://dm.mcp.workway.co/mcp", "api_key": "DM_TOKEN"},
      "hub": {"endpoint": "https://cs-mcp-hub-remote.createsomething.workers.dev/mcp", "api_token": "HUB_TOKEN"}
    }
  }'
```

## Example: Redeem

```bash
curl -fsS "$DELIVERY_URL" -H "X-Delivery-Code: $DELIVERY_CODE"
```

## Example: Revoke

```bash
curl -fsS -X POST "https://dm-delivery-broker.createsomething.workers.dev/v1/delivery/$DELIVERY_ID/revoke" \
  -H "Authorization: Bearer $DELIVERY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"issued to wrong recipient"}'
```

## Example: List Client Packages

```bash
curl -fsS "https://dm-delivery-broker.createsomething.workers.dev/v1/delivery?client_id=acme&status=active&limit=50" \
  -H "Authorization: Bearer $DELIVERY_ADMIN_TOKEN"
```

## Example: List Client Audit Events

```bash
curl -fsS "https://dm-delivery-broker.createsomething.workers.dev/v1/delivery/events?client_id=acme&limit=100" \
  -H "Authorization: Bearer $DELIVERY_ADMIN_TOKEN"
```
