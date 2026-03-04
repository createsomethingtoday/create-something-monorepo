# EXP-05 Tool Argument Auto-Repair Dashboard

## Objective

Automatically repair missing required tool arguments to reduce validation errors and dead-end traces.

## Baseline (2026-03-04 sample)

- Validation category rows: 4
- Examples:
  - missing `playbook_id` for `get_outcome_playbook`
  - missing `proxyToolName` for `hub_describe_proxy_tool`

## KPI Definitions

- `validation_error_rows`: rows containing `Input validation error` or `is required`.
- `repair_attempt_rows`: rows where system retries after schema-guided argument patching.
- `repair_success_rows`: repairs that lead to successful tool execution.
- `repair_success_rate`: `repair_success_rows / repair_attempt_rows`.
- `unrepaired_validation_rows`: validation errors without attempted repair.

## Panels

1. Validation errors by tool and missing field
2. Repair attempt funnel (error -> retry -> success)
3. Repair success rate trend
4. Top unrepaired argument names

## Alert Thresholds

- Warning: `validation_error_rows > 3` in trailing 24h
- Critical: `validation_error_rows > 8` in trailing 24h
- Warning: `repair_success_rate < 0.80`

## Success Gates

- Trailing 1000-row sample has `validation_error_rows <= 1`.
- `repair_success_rate >= 0.90` over trailing 50 repair attempts.
- `unrepaired_validation_rows == 0` for missing-required-field errors with available schema.
