# EXP-02 Intent Routing Canonicalization Dashboard

## Objective

Lower `hub_route_intent` and `hub_run_intent` route misses caused by intent phrasing variance.

## Baseline (2026-03-04 sample)

- `hub_route_intent`: 37 rows, 23 errors (62.2%)
- Routing miss category rows: 25
- Repeated misses: Sheets and Gmail intent phrasing variants

## KPI Definitions

- `route_attempt_rows`: rows for `hub_route_intent` and `hub_run_intent`.
- `route_miss_rows`: rows containing `No route found for intent`.
- `route_success_rows`: `route_attempt_rows - route_miss_rows`.
- `route_success_rate`: `route_success_rows / route_attempt_rows`.
- `canonicalized_intent_rows`: rows where an input intent is rewritten to canonical form before routing.
- `fallback_resolution_rows`: route misses resolved by semantic fallback to an executable tool.

## Panels

1. `route_success_rate` (hourly + 7-day trend)
2. Top unmapped intent strings (count + first_seen + last_seen)
3. Canonicalization funnel: input intent -> canonical intent -> resolved tool
4. Fallback success rate by integration family (Gmail, Sheets, Notion)

## Alert Thresholds

- Warning: `route_success_rate < 0.75` over trailing 24h
- Critical: `route_success_rate < 0.60` over trailing 24h
- Warning: new unmapped intent string count > 10/day

## Success Gates

- `hub_route_intent` error rate <= 0.20 over trailing 500 route attempts.
- Trailing 1000-row sample has `route_miss_rows <= 8`.
- At least 80% of previously top 10 failing intent strings route successfully.
