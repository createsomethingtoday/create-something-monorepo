# EXP-01 LinkedIn Permission Preflight Dashboard

## Objective

Reduce repeated LinkedIn authorization and ACL failures before write actions are attempted.

## Baseline (2026-03-04 sample)

- Permission category errors: 30
- Repeated cluster: `Forbidden. You don't have permission to access this post.` (8 rows in `unknown`, 8 in `hub_execute_proxy_tool`)

## KPI Definitions

- `linkedin_permission_error_rows`: error rows where message matches `(forbidden|permission|unauthorized|org acl scope)` and tool context is LinkedIn.
- `linkedin_write_attempt_rows`: rows for LinkedIn write/reaction/comment actions.
- `permission_error_rate`: `linkedin_permission_error_rows / linkedin_write_attempt_rows`.
- `preflight_block_rows`: rows with structured code `permission_preflight_denied`.
- `duplicate_forbidden_clusters_24h`: count of identical forbidden error messages with `count > 1` in trailing 24h.

## Panels

1. `permission_error_rate` (daily)
2. `preflight_block_rows` vs downstream forbidden errors (daily)
3. Top forbidden messages (24h)
4. Trace drilldown table: `created`, `tool`, `root_span_id`, `message`, `account_id`

## Alert Thresholds

- Warning: `permission_error_rate > 0.15` over trailing 24h
- Critical: `permission_error_rate > 0.25` over trailing 24h
- Critical: `duplicate_forbidden_clusters_24h > 1`

## Success Gates

- Trailing 1000-row sample has `linkedin_permission_error_rows <= 9`.
- `duplicate_forbidden_clusters_24h == 0` for 7 consecutive days.
