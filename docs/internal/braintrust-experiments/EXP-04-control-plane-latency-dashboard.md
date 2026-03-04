# EXP-04: Control-Plane Cache and Latency Stabilization Dashboard

Issue: `lm-338081a9`

## Objective

Stabilize control-plane tail latency by reducing redundant `hub_refresh_connections` and `hub_update_state` calls and adding cache-aware execution.

## Baseline (Mar 4, 2026 snapshot)

- Worst outlier: `hub_update_state = 252,517 ms`
- Additional control-plane outliers:
  - `hub_update_state = 24,413 ms`
  - `hub_refresh_connections = 24,327 ms`
  - `hub_refresh_connections = 20,452 ms`

## Acceptance Criteria (Exact)

1. Introduce cache strategy that reduces redundant `hub_refresh_connections` and `hub_update_state` calls.
2. `refresh_p95_ms <= 8000` for 7 consecutive days.
3. `update_state_p95_ms <= 15000` for 7 consecutive days.
4. No single `hub_update_state` event exceeds 60000 ms over trailing 7 days.
5. `refresh_calls_per_session` is reduced by at least 50% vs baseline week.

## Dashboard Panels

1. **Latency Distribution Panel**
   - p50/p95/max for `hub_refresh_connections` and `hub_update_state`.
2. **Outlier Timeline**
   - Individual outlier points over 7 days.
3. **Cache Hit Panel**
   - `cache_hit_rate` and `cache_bypass_reason` breakdown.
4. **Calls per Session**
   - `refresh_calls_per_session` before and after rollout.
5. **SLO Scorecard**
   - Binary pass/fail for each acceptance criterion per day.

## Core Metrics

- `refresh_p95_ms`: p95 latency for `hub_refresh_connections` over 24h window.
- `update_state_p95_ms`: p95 latency for `hub_update_state` over 24h window.
- `max_update_state_ms`: max `hub_update_state` latency over trailing 7 days.
- `refresh_calls_per_session`: mean refresh calls grouped by `session_id`.
- `cache_hit_rate`: cache hits / eligible control-plane requests.

## Query Sketch (BTQL / SQL-like)

```sql
-- daily latency stats for refresh/update_state
SELECT
  DATE(created_at) AS day,
  tool,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  MAX(duration_ms) AS max_ms
FROM project_logs(project_id)
WHERE tool IN ('hub_refresh_connections', 'hub_update_state')
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), tool;

-- refresh calls per session
SELECT AVG(refresh_calls) AS refresh_calls_per_session
FROM (
  SELECT session_id, COUNT(*) AS refresh_calls
  FROM project_logs(project_id)
  WHERE tool = 'hub_refresh_connections'
  GROUP BY session_id
) s;
```

