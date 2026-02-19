# Gateway Deployment Guide (Cloudflare)

This deployment bootstraps the Portkey-on-Cloudflare stack implemented in this repo:

- `packages/portkey-gateway-worker`
- `packages/gateway-control-worker`
- `migrations/cs-gateway/*`
- `migrations/cs-telemetry/0002_gateway_requests.sql`
- `migrations/cs-telemetry/0003_gateway_daily_rollups.sql`

## 1) Apply D1 migrations

### cs-gateway

```bash
cd packages/gateway-control-worker
pnpm exec wrangler d1 execute cs-gateway --local --file ../../migrations/cs-gateway/0001_tenants_and_runtime_keys.sql
pnpm exec wrangler d1 execute cs-gateway --local --file ../../migrations/cs-gateway/0002_provider_credentials_and_policies.sql
pnpm exec wrangler d1 execute cs-gateway --local --file ../../migrations/cs-gateway/0003_budgets_and_rate_limits.sql

pnpm exec wrangler d1 execute cs-gateway --remote --file ../../migrations/cs-gateway/0001_tenants_and_runtime_keys.sql
pnpm exec wrangler d1 execute cs-gateway --remote --file ../../migrations/cs-gateway/0002_provider_credentials_and_policies.sql
pnpm exec wrangler d1 execute cs-gateway --remote --file ../../migrations/cs-gateway/0003_budgets_and_rate_limits.sql
```

### cs-telemetry

```bash
cd packages/cs-telemetry-mcp/worker
pnpm exec wrangler d1 execute cs-telemetry --local --file ../../../migrations/cs-telemetry/0001_telemetry_tables.sql
pnpm exec wrangler d1 execute cs-telemetry --local --file ../../../migrations/cs-telemetry/0002_gateway_requests.sql
pnpm exec wrangler d1 execute cs-telemetry --local --file ../../../migrations/cs-telemetry/0003_gateway_daily_rollups.sql
pnpm exec wrangler d1 execute cs-telemetry --local --file ../../../migrations/cs-telemetry/0004_decision_views.sql

pnpm exec wrangler d1 execute cs-telemetry --remote --file ../../../migrations/cs-telemetry/0001_telemetry_tables.sql
pnpm exec wrangler d1 execute cs-telemetry --remote --file ../../../migrations/cs-telemetry/0002_gateway_requests.sql
pnpm exec wrangler d1 execute cs-telemetry --remote --file ../../../migrations/cs-telemetry/0003_gateway_daily_rollups.sql
pnpm exec wrangler d1 execute cs-telemetry --remote --file ../../../migrations/cs-telemetry/0004_decision_views.sql
```

## 2) Configure secrets

### gateway-control-worker

```bash
cd packages/gateway-control-worker
pnpm exec wrangler secret put OPERATOR_API_TOKEN
pnpm exec wrangler secret put BYOK_ROOT_KEY
pnpm exec wrangler secret put OPENAI_MANAGED_KEY
```

### portkey-gateway-worker (optional upstream auth)

```bash
cd packages/portkey-gateway-worker
pnpm exec wrangler secret put PORTKEY_UPSTREAM_API_KEY
```

### cs-telemetry-mcp (operator endpoint auth)

```bash
cd packages/cs-telemetry-mcp/worker
pnpm exec wrangler secret put OPERATOR_API_TOKEN
```

## 3) Set vars/bindings

- In `packages/portkey-gateway-worker/wrangler.toml` set `PORTKEY_UPSTREAM_URL`.
- In `packages/gateway-control-worker/wrangler.toml` set:
  - `database_id` values for `cs-gateway` and `cs-telemetry`
  - `PORTKEY_GATEWAY_URL` to deployed `portkey-gateway-worker` URL (or use service binding)
- In `packages/cs-telemetry-mcp/worker/wrangler.toml` set:
  - `CONTROL_DB` to `cs-gateway` for runtime-key scoped tenant SQL in MCP tools

## 4) Deploy workers

```bash
cd packages/portkey-gateway-worker
pnpm exec wrangler deploy

cd ../gateway-control-worker
pnpm exec wrangler deploy

cd ../cs-telemetry-mcp/worker
pnpm exec wrangler deploy
```

## 5) Verify runtime contract

```bash
curl -sS https://<control-worker>/health
curl -sS https://<control-worker>/v1/models -H "authorization: Bearer <tenant_runtime_key>"
```

Verify telemetry MCP split endpoints:

```bash
curl -sS https://<cs-telemetry-mcp>/mcp -H "authorization: Bearer <OPERATOR_API_TOKEN>"
curl -sS https://<cs-telemetry-mcp>/client/mcp -H "authorization: Bearer <tenant_runtime_key>"
```

## 6) Portal deployment

```bash
cd packages/client-governance-portal
pnpm install
pnpm build
pnpm deploy
```

Then use the portal to manage tenants, keys, credentials, allowlists, budgets, and rate limits.
