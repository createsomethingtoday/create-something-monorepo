# Codex + Portkey Gateway Setup

This guide configures Codex clients to route through the CREATE SOMETHING gateway stack:

1. `gateway-control-worker` (tenant auth, policy, budgets, rate limits)
2. `portkey-gateway-worker` (stable wrapper to pinned Portkey OSS gateway)
3. Provider target selected by control-plane policy

## Runtime Contract

- `POST /v1/responses`
- `POST /v1/chat/completions`
- `GET /v1/models`
- Auth header: `Authorization: Bearer <tenant_runtime_key>`

Optional tenant assertion:
- `X-CS-Tenant: <tenant-id-or-slug>`

## 1) Create Tenant and Runtime Key

Use admin APIs on `gateway-control-worker`.

```bash
export CONTROL_URL="https://gateway-control-worker.example.workers.dev"
export OPERATOR_TOKEN="<operator-token>"

curl -sS -X POST "$CONTROL_URL/api/tenants" \
  -H "x-cs-admin-token: $OPERATOR_TOKEN" \
  -H "content-type: application/json" \
  -d '{"name":"Acme Client","slug":"acme"}'
```

```bash
export TENANT_ID="<tenant-id-from-previous-response>"

curl -sS -X POST "$CONTROL_URL/api/tenants/$TENANT_ID/runtime-keys" \
  -H "x-cs-admin-token: $OPERATOR_TOKEN" \
  -H "content-type: application/json" \
  -d '{"label":"prod-codex"}'
```

Store the returned runtime key securely. It is only returned once.

## 2) Configure Provider Credential

### Managed (default)

Set provider key as Worker secret on `gateway-control-worker`:

```bash
cd packages/gateway-control-worker
pnpm exec wrangler secret put OPENAI_MANAGED_KEY
```

Attach credential to tenant:

```bash
curl -sS -X POST "$CONTROL_URL/api/tenants/$TENANT_ID/provider-credentials" \
  -H "x-cs-admin-token: $OPERATOR_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "provider_slug":"openai",
    "mode":"managed",
    "managed_secret_name":"OPENAI_MANAGED_KEY"
  }'
```

### BYOK (optional)

```bash
curl -sS -X POST "$CONTROL_URL/api/tenants/$TENANT_ID/provider-credentials" \
  -H "x-cs-admin-token: $OPERATOR_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "provider_slug":"openai",
    "mode":"byok",
    "api_key":"<client-provider-api-key>"
  }'
```

## 3) Set Allowlist + Budgets + Rate Limits

```bash
curl -sS -X PUT "$CONTROL_URL/api/tenants/$TENANT_ID/policy" \
  -H "x-cs-admin-token: $OPERATOR_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "model_allowlist": [
      {"provider_slug":"openai","model_name":"gpt-4.1"},
      {"provider_slug":"openai","model_name":"gpt-4.1-mini"}
    ],
    "budget": {
      "monthly_budget_usd": 500,
      "warn_threshold_percent": 80,
      "hard_limit_enabled": true
    },
    "rate_limit": {
      "requests_per_minute": 120,
      "burst_limit": 180,
      "window_seconds": 60
    }
  }'
```

## 4) Codex Client Configuration

Point Codex/OpenAI-compatible clients to the control worker base URL.

```bash
export OPENAI_BASE_URL="https://gateway-control-worker.example.workers.dev/v1"
export OPENAI_API_KEY="<tenant_runtime_key>"
```

Example request:

```bash
curl -sS "https://gateway-control-worker.example.workers.dev/v1/chat/completions" \
  -H "authorization: Bearer <tenant_runtime_key>" \
  -H "content-type: application/json" \
  -d '{
    "model":"gpt-4.1-mini",
    "messages":[{"role":"user","content":"Hello from Codex"}]
  }'
```

## 5) Observability Checks

- Runtime responses include `x-cs-correlation-id`.
- Gateway events are written to `cs-telemetry.gateway_requests`.
- Query from telemetry MCP:
  - `query_gateway_usage`
  - `query_tenant_cost`
  - `query_budget_burn`
  - `query_decision_scorecard`
  - `query_tenant_sql` (runtime-key scoped read-only advanced queries)

Decision resource:

- `telemetry://decision/scorecards`

Telemetry MCP endpoint split:

- Operator/admin MCP: `/mcp` (Bearer `OPERATOR_API_TOKEN`)
- Client MCP: `/client/mcp` (Bearer `<tenant_runtime_key>`)

Client performance chat pattern:

1. Connect your MCP host to `/client/mcp` using tenant runtime key.
2. Use prompt `client_performance_review`.
3. Agent calls tenant-scoped tools and resources:
   - `telemetry://client/overview`
   - `query_decision_scorecard`
   - `query_budget_burn`

## Security Notes

- Runtime keys are stored as hash+prefix only.
- BYOK secrets are encrypted at rest with `BYOK_ROOT_KEY`.
- `X-CS-Tenant` mismatch blocks cross-tenant attempts.
- Use idempotency headers (`Idempotency-Key`) for replay-safe writes.
- `query_tenant_sql` requires runtime key validation against `cs-gateway` (`CONTROL_DB` binding in telemetry MCP).
