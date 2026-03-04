# EXP-03: Provider 429 Circuit Breaker and Budget-Aware Retry Dashboard

Issue: `lm-20131adb`

## Objective

Eliminate duplicate provider throttling calls by adding a deterministic 429 circuit breaker keyed by `(provider, account_id, service_error_code, day)`.

## Baseline (Mar 4, 2026 snapshot)

- `rate_limit` category rows: `4`
- Repeated cluster:
  - `code=TOO_MANY_REQUESTS`, `serviceErrorCode=101`
  - Appears in both `unknown` and `hub_execute_proxy_tool` tool paths

## Acceptance Criteria (Exact)

1. Implement a circuit breaker keyed by `(provider, account_id, service_error_code, day)`.
2. After first 429 for a key, max one downstream provider call is allowed for that key per day.
3. Return deterministic fallback responses with retry guidance when breaker is open.
4. `duplicate_rate_limit_rows == 0` for 7 consecutive days.
5. `fallback_response_rows / blocked_call_rows >= 0.95` over trailing 7 days.

## Dashboard Panels

1. **429 Daily Count**
   - Total 429 rows per day by provider.
2. **Duplicate Throttle Panel**
   - `duplicate_rate_limit_rows` by day.
3. **Circuit Breaker State Timeline**
   - `open`, `half-open`, `closed` transitions per key.
4. **Blocked Call vs Fallback Coverage**
   - `blocked_call_rows`, `fallback_response_rows`, ratio.
5. **Retry Guidance Quality**
   - `%` fallback responses containing next retry window.

## Core Metrics

- `duplicate_rate_limit_rows`: rows after first 429 for key/day that still invoke provider.
- `blocked_call_rows`: provider calls prevented by open breaker.
- `fallback_response_rows`: deterministic fallback responses emitted when breaker open.
- `fallback_coverage_ratio`: `fallback_response_rows / blocked_call_rows`.

## Query Sketch (BTQL / SQL-like)

```sql
-- duplicate 429 rows by key/day
WITH keyed AS (
  SELECT provider, account_id, service_error_code, DATE(created_at) AS day, created_at,
         ROW_NUMBER() OVER (
           PARTITION BY provider, account_id, service_error_code, DATE(created_at)
           ORDER BY created_at
         ) AS rn
  FROM project_logs(project_id)
  WHERE error_code = 'TOO_MANY_REQUESTS'
)
SELECT COUNT(*) AS duplicate_rate_limit_rows
FROM keyed
WHERE rn > 1;

-- fallback coverage
SELECT
  SUM(CASE WHEN event_type = 'breaker_blocked_call' THEN 1 ELSE 0 END) AS blocked_call_rows,
  SUM(CASE WHEN event_type = 'breaker_fallback_returned' THEN 1 ELSE 0 END) AS fallback_response_rows
FROM project_logs(project_id)
WHERE created_at >= NOW() - INTERVAL '7 days';
```

