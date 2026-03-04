# EXP-04 Control Plane Latency and Cache Dashboard

## Objective

Reduce control-plane latency spikes from state updates and connection refresh operations.

## Baseline (2026-03-04 sample)

- `hub_refresh_connections`: avg 10965.5 ms, p95 20452 ms, max 24327 ms
- `hub_update_state`: max 252517 ms

## KPI Definitions

- `refresh_latency_ms`: duration for `hub_refresh_connections` rows.
- `update_state_latency_ms`: duration for `hub_update_state` rows.
- `refresh_p95_ms`: p95 of `refresh_latency_ms` over trailing 24h.
- `update_state_p95_ms`: p95 of `update_state_latency_ms` over trailing 24h.
- `cache_hit_rate`: cached state reads / total state reads.
- `refresh_calls_per_session`: refresh invocations per root session.

## Panels

1. p50/p95/max latency for `hub_refresh_connections`
2. p50/p95/max latency for `hub_update_state`
3. Cache hit rate trend
4. Refresh calls per session distribution

## Alert Thresholds

- Warning: `refresh_p95_ms > 12000`
- Critical: `refresh_p95_ms > 20000`
- Warning: `update_state_p95_ms > 20000`
- Critical: any `update_state_latency_ms > 120000`

## Success Gates

- `refresh_p95_ms <= 8000` for 7 consecutive days.
- `update_state_p95_ms <= 15000` for 7 consecutive days.
- No single `hub_update_state` event exceeds 60000 ms over trailing 7 days.
- `refresh_calls_per_session` reduced by at least 50% vs baseline week.
