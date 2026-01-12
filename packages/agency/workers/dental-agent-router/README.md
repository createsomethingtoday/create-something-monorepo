# Dental Agent Edge Router

Cloudflare Worker that provides edge routing for dental practice management agents. Handles authentication, rate limiting, audit logging, and proxies requests to Modal backend.

## Architecture

```
Client Request
    ↓
Edge Router (Cloudflare Worker)
    ↓ (query practice config)
D1 Database
    ↓ (decrypt PMS credentials)
    ↓ (check rate limits)
KV Namespace
    ↓ (proxy with full context)
Modal Backend (/agents/dental/schedule or /agents/dental/daily-ops)
    ↓
Response + Audit Log
```

## HIPAA Compliance

- All PHI access is logged to KV with 6-year retention
- PMS credentials are encrypted in D1 (AES-256)
- Only minimum necessary PHI is passed to Modal backend
- Audit logs contain no PHI (only patient_id references)

## Environment Variables

Set via `wrangler secret`:

```bash
wrangler secret put MODAL_ENDPOINT_URL
wrangler secret put MODAL_API_KEY
```

## D1 Schema

```sql
CREATE TABLE practices (
  practice_id TEXT PRIMARY KEY,
  practice_name TEXT NOT NULL,
  pms_type TEXT NOT NULL CHECK(pms_type IN ('dentrix', 'opendental', 'eaglesoft')),
  encrypted_credentials TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'suspended', 'trial')),
  rate_limit_per_minute INTEGER DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Request Format

```json
{
  "practice_id": "practice_abc123",
  "operation": "schedule",
  "task": "Find and reschedule no-show appointments from last 7 days"
}
```

## Response Format

```json
{
  "success": true,
  "output": "Rescheduled 5 no-show appointments...",
  "model": "claude-haiku-4-20250514",
  "tokens": 1234,
  "cost": 0.0012,
  "practice_id": "practice_abc123",
  "operation": "schedule",
  "correlation_id": "dental-uuid-here",
  "timestamp": "2026-01-12T22:00:00.000Z"
}
```

## Audit Log Format

```json
{
  "timestamp": "2026-01-12T22:00:00.000Z",
  "action": "dental_schedule",
  "actor_id": "edge-router",
  "actor_type": "agent",
  "practice_id": "practice_abc123",
  "resource_type": "agent_execution",
  "outcome": "success",
  "ip_address": "192.0.2.1",
  "user_agent": "dental-agent-client/1.0",
  "correlation_id": "dental-uuid-here"
}
```

## Rate Limiting

Each practice has a configurable rate limit (default 100 requests/minute). Rate limits are tracked per practice in KV with 1-minute sliding windows.

## Development

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Deploy to Cloudflare
pnpm deploy

# View logs
pnpm tail
```

## Production Setup

1. Create D1 database:
   ```bash
   wrangler d1 create dental-practices
   ```

2. Create KV namespace:
   ```bash
   wrangler kv:namespace create AUDIT_LOG
   ```

3. Update wrangler.toml with database_id and namespace id

4. Set secrets:
   ```bash
   wrangler secret put MODAL_ENDPOINT_URL
   wrangler secret put MODAL_API_KEY
   ```

5. Deploy:
   ```bash
   pnpm deploy
   ```
