# EXP-01: LinkedIn Permission Preflight and Graceful Degradation Dashboard

Issue: `lm-d02bbe3a`

## Objective

Prevent repeated LinkedIn `403 Forbidden` clusters by adding permission preflight checks and deterministic fallback responses before mutation calls.

## Baseline (Mar 4, 2026 snapshot)

- `permission` category rows: `30` (42.3% of all errors)
- Repeated cluster example: `Forbidden. You don't have permission to access this post.` count `8`
- Repeated cluster example root span: `60014025-c192-465d-b987-fc8bb21deb16`

## Acceptance Criteria (Exact)

1. LinkedIn write/reaction/comment flows run a preflight permission check before downstream provider mutation calls.
2. Preflight denials emit a structured error code `permission_preflight_denied` and include fields `required_scopes`, `actor`, and `next_action`.
3. Trailing 1000-row sample shows `linkedin_permission_error_rows <= 9`.
4. `duplicate_forbidden_clusters_24h == 0` for 7 consecutive days.

## Dashboard Panels

1. **Permission Error Trend (7d)**
   - Time series of `linkedin_permission_error_rows` by day.
2. **Preflight Outcome Funnel**
   - `permission_preflight_checked -> preflight_denied -> blocked_before_provider_call`.
3. **Forbidden Cluster Heatmap**
   - Top repeated forbidden signatures by 24h bucket.
4. **Structured Denial Quality**
   - `%` of denials containing all required fields.
5. **Provider Call Avoidance**
   - Count of prevented downstream LinkedIn calls due to preflight.

## Core Metrics

- `linkedin_permission_error_rows`: rows classified as LinkedIn permission failures in trailing 1000 sample.
- `duplicate_forbidden_clusters_24h`: repeated identical forbidden signature count where count > 1 in same 24h window.
- `structured_denial_completeness`: fraction of preflight denials containing `required_scopes`, `actor`, `next_action`.
- `preflight_block_rate`: denied preflight calls / preflight checks.

## Query Sketch (BTQL / SQL-like)

```sql
-- trailing 1000 sample permission rows
SELECT COUNT(*) AS linkedin_permission_error_rows
FROM project_logs(project_id)
WHERE category = 'permission'
  AND provider = 'linkedin'
LIMIT 1000;

-- duplicate forbidden clusters in last 24h
SELECT message_fingerprint, COUNT(*) AS c
FROM project_logs(project_id)
WHERE provider = 'linkedin'
  AND error_message LIKE 'Forbidden%'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY message_fingerprint
HAVING COUNT(*) > 1;
```

## Required Screenshots

- Baseline snapshot from `docs/BRAINTRUST_CREATE_SOMETHING_TRACE_DASHBOARD_2026-03-04.png`
- 7-day trend screenshot after rollout (store under `docs/internal/braintrust-experiments/screenshots/exp-01/`)

