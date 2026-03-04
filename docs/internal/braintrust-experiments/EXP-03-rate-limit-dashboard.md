# EXP-03 Provider 429 Circuit Breaker Dashboard

## Objective

Stop repeated provider 429 calls and convert throttles into deterministic, actionable responses.

## Baseline (2026-03-04 sample)

- Rate-limit category rows: 4
- Repeated identical LinkedIn throttle message appears in both `unknown` and `hub_execute_proxy_tool` contexts

## KPI Definitions

- `rate_limit_rows`: rows matching `(429|TOO_MANY_REQUESTS|throttle)`.
- `unique_rate_limit_keys`: unique `(provider, account_id, service_error_code, day)` tuples.
- `duplicate_rate_limit_rows`: `rate_limit_rows - unique_rate_limit_keys`.
- `circuit_open_events`: events where breaker state changes to open.
- `blocked_call_rows`: calls prevented due to open breaker.
- `fallback_response_rows`: blocked calls that return structured retry guidance.

## Panels

1. Rate-limit row trend by provider (daily)
2. Duplicate rate-limit rows (daily)
3. Circuit breaker state transitions (open/half-open/closed)
4. Blocked-call outcomes with next retry timestamp

## Alert Thresholds

- Warning: `duplicate_rate_limit_rows > 0` in trailing 24h
- Critical: `duplicate_rate_limit_rows > 3` in trailing 24h

## Success Gates

- `duplicate_rate_limit_rows == 0` for 7 consecutive days.
- For a given `(provider, account_id, day)` throttle key, max one downstream provider call after first 429.
- `fallback_response_rows / blocked_call_rows >= 0.95`.
