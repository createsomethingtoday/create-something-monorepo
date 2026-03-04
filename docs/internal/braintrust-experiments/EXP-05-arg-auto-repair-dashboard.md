# EXP-05: Tool-Argument Auto-Repair for Validation Failures Dashboard

Issue: `lm-ba3c51f3`

## Objective

Automatically repair missing required fields on tool-call validation failures, retry once, and eliminate avoidable validation regressions.

## Baseline (Mar 4, 2026 snapshot)

- `validation` category rows: `4`
- Repeated signature: `"proxyToolName" is required` (count `2`)
- Example roots:
  - `1e16b8af-ac74-4078-9aa5-162c6dc0a6bd`
  - `b2da1815-c75c-45b7-8610-b9c912866a53`

## Acceptance Criteria (Exact)

1. On missing-required-field validation errors, perform one schema-guided argument repair and retry once.
2. `repair_success_rate >= 0.90` over trailing 50 repair attempts.
3. Trailing 1000-row sample shows `validation_error_rows <= 1`.
4. `unrepaired_validation_rows == 0` for missing-required-field errors where schema is available.

## Dashboard Panels

1. **Repair Funnel**
   - `validation_error -> repair_attempted -> retry_success`.
2. **Field-Level Unrepaired Panel**
   - Missing-field name and count where schema was available.
3. **Repair Success Trend**
   - `repair_success_rate` over trailing 50 attempts.
4. **Validation Error Budget**
   - `validation_error_rows` in trailing 1000 sample.
5. **One-Retry Discipline**
   - Guardrail panel verifying max one repair retry per event.

## Core Metrics

- `repair_success_rate`: successful retries / repair attempts (trailing 50).
- `validation_error_rows`: validation errors in trailing 1000 rows.
- `unrepaired_validation_rows`: missing-required-field validation failures with schema present and no successful repair.
- `multi_retry_violations`: count of events with more than one repair retry.

## Query Sketch (BTQL / SQL-like)

```sql
-- trailing 50 repair success
WITH repairs AS (
  SELECT repair_outcome
  FROM project_logs(project_id)
  WHERE event_type = 'validation_repair_attempt'
  ORDER BY created_at DESC
  LIMIT 50
)
SELECT
  SUM(CASE WHEN repair_outcome = 'success' THEN 1 ELSE 0 END)::float / COUNT(*) AS repair_success_rate
FROM repairs;

-- unrepaired missing required field rows with schema available
SELECT COUNT(*) AS unrepaired_validation_rows
FROM project_logs(project_id)
WHERE category = 'validation'
  AND error_code = 'missing_required_field'
  AND schema_available = TRUE
  AND repaired = FALSE;
```

