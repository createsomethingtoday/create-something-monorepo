# Security and scalability

## Security

### Identity (account ID)

- **Source**: Account ID is taken from `X-MCP-Account-Id` or `Authorization: Bearer <value>`. It is **client-supplied** and not cryptographically verified by this worker.
- **Implications**: Any client can send any account ID. Use this worker behind a gateway that authenticates the user and sets the header (e.g. API gateway that maps a validated JWT or session to `X-MCP-Account-Id`). For single-tenant or trusted clients, passing a stable id is sufficient.
- **Normalization**: Raw values are normalized before use:
  - Trim and length-cap (256 chars).
  - Only `[a-zA-Z0-9._@-]` allowed; other characters are replaced with `_`.
  - Empty → `default`.
- **Storage**: Normalized account ID is used as D1 `account_id` and Composio `entityId` (parameterized; no SQL injection).

### Secrets

- **COMPOSIO_API_KEY**, **COMPOSIO_*_AUTH_CONFIG_ID**: Set via `wrangler secret put`; not in code or logs.
- **D1**: Used only for run counts; no user content. Queries are parameterized.

### Metering

- **Best-effort**: If D1 write fails, the tool response is still returned; metering is logged and not retried in-band. Prevents a full outage when D1 is slow or unavailable.
- **Enforcement**: The worker only records usage; it does not block tool calls when over the free tier. Enforce a hard cap via a gateway that checks usage and rejects requests, or by extending the worker to check usage before executing tools.

## Scalability

### D1

- **Schema**: One row per `(account_id, period_start)`; updates are single-row upserts. High concurrency on the same account in the same period hits one row; D1 handles this. For very high TPS per account, consider batching or a queue (out of scope for 100 free / 1¢ run tier).
- **Migrations**: Applied once per environment (`wrangler d1 migrations apply gmail-notion-mcp-runs --remote`). See README.

### Durable Object

- **Single-threaded**: One request at a time per DO instance. `currentAccountId` is set at the start of `fetch()` and used for the duration of that request; no cross-request leakage.
- **Scale**: DO instances are created per session/key; horizontal scale is automatic.

### Rate limiting

- Not implemented in this worker. For production, put the worker behind a gateway or use Cloudflare rate limiting (e.g. WAF or Rate Limiting rules) keyed by IP or by a validated identity header.
