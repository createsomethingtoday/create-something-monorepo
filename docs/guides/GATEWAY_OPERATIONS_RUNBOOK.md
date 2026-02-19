# Gateway Operations Runbook

Operational runbook for:

- `gateway-control-worker`
- `portkey-gateway-worker`
- `cs-telemetry-mcp` (`/mcp` operator, `/client/mcp` tenant-scoped)
- `cs-gateway` D1
- `cs-telemetry` D1

## SLO Targets

- Availability: `99.9%` monthly for runtime endpoints (`/v1/responses`, `/v1/chat/completions`, `/v1/models`)
- p95 latency (control worker overhead): `< 150ms` excluding upstream model latency
- Failed request ratio: `< 2%` over rolling 60 minutes (excluding policy blocks)
- Budget alert delivery lag: `< 60s`

## Alert Types

- `budget_threshold_crossed`
- `error_rate_spike`
- `provider_failover_activated`
- `provider_kill_switch_blocked`

## Kill Switch Procedure

1. Set provider kill switch via `PUT /api/tenants/:tenantId/policy` with `kill_switches` payload.
2. Verify subsequent requests return `503` for that provider.
3. Confirm `gateway_alerts` includes `provider_kill_switch_blocked` entries.
4. Route tenant to alternate provider/model allowlist.

## D1 Backup Procedure

### cs-gateway

```bash
cd packages/gateway-control-worker
pnpm exec wrangler d1 export cs-gateway --output ./backups/cs-gateway-$(date +%F-%H%M).sql
```

### cs-telemetry

```bash
cd packages/cs-telemetry-mcp/worker
pnpm exec wrangler d1 export cs-telemetry --output ./backups/cs-telemetry-$(date +%F-%H%M).sql
```

Recommended cadence:

- `cs-gateway`: hourly snapshot + daily retention copy
- `cs-telemetry`: daily snapshot + weekly retention copy

## D1 Restore Procedure

1. Pause writes by enabling global maintenance gate in control worker deployment.
2. Restore target DB from known snapshot:

```bash
pnpm exec wrangler d1 execute cs-gateway --file ./backups/cs-gateway-YYYY-MM-DD-HHMM.sql
```

3. Run integrity checks:

```sql
SELECT COUNT(*) FROM gateway_tenants;
SELECT COUNT(*) FROM tenant_runtime_keys;
SELECT COUNT(*) FROM provider_credentials;
```

4. Re-enable runtime traffic.
5. Verify `/health` and sample tenant request flow.

## Incident Severity

- `SEV1`: runtime outage for all tenants or cross-tenant data leak risk
- `SEV2`: partial outage, high error rates, budget/rate control malfunction
- `SEV3`: degraded portal/admin behavior, non-blocking telemetry gaps

## Canary Rollout Checklist

1. Deploy to preview worker.
2. Validate with one canary tenant using managed keys.
3. Validate with one canary tenant using BYOK.
4. Run `query_gateway_usage`, `query_tenant_cost`, and `query_decision_scorecard` checks.
5. Promote to production and monitor `gateway_alerts` for 60 minutes.

## Admin Visibility

- Admin API view: `GET /api/admin/performance?days=30` on `gateway-control-worker`
- MCP operator review: connect to `cs-telemetry-mcp /mcp` with `OPERATOR_API_TOKEN`
- Client performance review: connect to `cs-telemetry-mcp /client/mcp` with tenant runtime key and run prompt `client_performance_review`
