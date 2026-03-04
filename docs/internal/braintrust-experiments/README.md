# Braintrust Trace Stabilization Experiments (Mar 2026)

Project: `8ca0d63b-d985-4373-9906-c253bf3f52d0`  
Source snapshot generated: `2026-03-04T11:31:23.274Z`  
Window: `2026-03-01T15:55:44.047Z` to `2026-03-04T11:30:22.524Z`  
Sample size: `1000` rows

## Baseline Signal

| Metric | Value |
|---|---:|
| Error rows | 71 |
| Error rate | 7.1% |
| Permission errors | 30 |
| Intent routing errors | 24 |
| Rate-limit errors | 4 |
| Validation errors | 4 |
| Worst latency outlier (`hub_update_state`) | 252,517 ms |
| `hub_route_intent` error rate | 61.1% (22/36) |

## Ranked Execution Queue

1. `lm-d02bbe3a` EXP-01 LinkedIn permission preflight and graceful degradation
2. `lm-e728756f` EXP-02 Intent canonicalization and semantic fallback routing
3. `lm-20131adb` EXP-03 Provider 429 circuit breaker and budget-aware retry
4. `lm-338081a9` EXP-04 Control-plane cache and latency stabilization
5. `lm-ba3c51f3` EXP-05 Tool-argument auto-repair for validation failures

## Dashboard Specs

| Experiment | Spec | Primary Success Metric | Target |
|---|---|---|---|
| EXP-01 | `EXP-01-linkedin-preflight-dashboard.md` | `linkedin_permission_error_rows` | `<= 9` over trailing 1000 |
| EXP-02 | `EXP-02-intent-routing-dashboard.md` | `hub_route_intent_error_rate` | `<= 0.20` over trailing 500 |
| EXP-03 | `EXP-03-rate-limit-dashboard.md` | `duplicate_rate_limit_rows` | `0` for 7 days |
| EXP-04 | `EXP-04-control-plane-latency-dashboard.md` | `refresh_p95_ms`, `update_state_p95_ms` | `<= 8,000`, `<= 15,000` for 7 days |
| EXP-05 | `EXP-05-arg-auto-repair-dashboard.md` | `repair_success_rate` | `>= 0.90` over trailing 50 repairs |

## Evidence Assets

- Snapshot dashboard (HTML): `docs/BRAINTRUST_CREATE_SOMETHING_TRACE_DASHBOARD_2026-03-04.html`
- Snapshot dashboard (PNG): `docs/BRAINTRUST_CREATE_SOMETHING_TRACE_DASHBOARD_2026-03-04.png`

