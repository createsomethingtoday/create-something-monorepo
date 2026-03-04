# Braintrust Trace Experiments (2026-03-04)

Scope: CREATE SOMETHING Braintrust project `8ca0d63b-d985-4373-9906-c253bf3f52d0`.
Data window for baseline: latest 1,000 rows from `project_logs(project_id)` captured on 2026-03-04.

## Baseline Snapshot

- Sample rows: 1000
- Error rows: 73 (7.3%)
- Top error categories:
  - permission: 30
  - intent_routing: 25
  - rate_limit: 4
  - validation: 4
- Major latency outliers:
  - `hub_update_state` max 252517 ms
  - `hub_refresh_connections` max 24327 ms

## Dashboard Specs

- [EXP-01 LinkedIn Permission Preflight Dashboard](./EXP-01-linkedin-preflight-dashboard.md)
- [EXP-02 Intent Routing Canonicalization Dashboard](./EXP-02-intent-routing-dashboard.md)
- [EXP-03 Rate Limit Circuit Breaker Dashboard](./EXP-03-rate-limit-dashboard.md)
- [EXP-04 Control Plane Latency and Cache Dashboard](./EXP-04-control-plane-latency-dashboard.md)
- [EXP-05 Argument Auto-Repair Dashboard](./EXP-05-arg-auto-repair-dashboard.md)

## Ranked Execution Order

1. EXP-01 LinkedIn permission preflight and graceful degradation
2. EXP-02 Intent canonicalization and semantic fallback routing
3. EXP-03 Provider 429 circuit breaker and budget-aware retry
4. EXP-04 Control-plane cache and latency stabilization
5. EXP-05 Tool-argument auto-repair for validation failures
