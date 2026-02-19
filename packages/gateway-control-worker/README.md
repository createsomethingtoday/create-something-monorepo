# Gateway Control Worker

Tenant-isolated control plane in front of the Portkey OSS gateway.

## Runtime API

- `POST /v1/responses`
- `POST /v1/chat/completions`
- `GET /v1/models`

Auth:
- `Authorization: Bearer <tenant_runtime_key>`
- Optional: `X-CS-Tenant` (must match resolved tenant id or slug)

## Admin API

- `POST /api/tenants`
- `GET /api/tenants`
- `GET /api/tenants/:tenantId`
- `POST /api/tenants/:tenantId/runtime-keys`
- `POST /api/tenants/:tenantId/provider-credentials`
- `PUT /api/tenants/:tenantId/policy`
- `GET /api/tenants/:tenantId/usage?from&to`
- `GET /api/admin/performance?days=30` (MCP fleet + agent + tenant scorecards)

Admin auth:
- `x-cs-admin-token: <OPERATOR_API_TOKEN>` or `Authorization: Bearer <OPERATOR_API_TOKEN>`

## Required bindings/secrets

- D1: `DB` (`cs-gateway`)
- D1: `TELEMETRY_DB` (`cs-telemetry`)
- One of:
  - `PORTKEY_GATEWAY` service binding, or
  - `PORTKEY_GATEWAY_URL` var
- Secret: `OPERATOR_API_TOKEN`
- Secret: `BYOK_ROOT_KEY` (32-byte base64 or 64-char hex)

Managed credentials:
- Add provider keys as Worker secrets (for example `OPENAI_MANAGED_KEY`) and reference them by name in `managed_secret_name`.

BYOK credentials:
- API key is encrypted with `BYOK_ROOT_KEY` and persisted to D1.

## Notes

- Runtime keys are stored as `key_prefix + key_hash` only.
- Idempotency supported via `Idempotency-Key` for POST endpoints.
- Budget and rate-limit checks happen before forwarding requests.
- Correlation id is logged to telemetry and returned as `x-cs-correlation-id`.
