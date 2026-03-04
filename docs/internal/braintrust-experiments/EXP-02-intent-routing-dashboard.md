# EXP-02: Intent Canonicalization and Semantic Fallback Routing Dashboard

Issue: `lm-e728756f`

## Objective

Reduce `hub_route_intent` route misses by canonicalizing intent variants and introducing semantic fallback routing.

## Baseline (Mar 4, 2026 snapshot)

- `hub_route_intent` rows: `36`
- `hub_route_intent` errors: `22`
- Baseline route error rate: `61.1%`
- Repeated misses:
  - `"create a google sheet and write a formula"`
  - `"write values in sheets"`
  - `"search_spreadsheets"`

## Acceptance Criteria (Exact)

1. Add canonicalization rules for top failing intent phrases (Sheets, Gmail, Notion variants) before routing.
2. Add semantic fallback that proposes/executes mapped tool when confidence threshold is met.
3. `hub_route_intent` error rate is `<= 0.20` over trailing 500 route attempts.
4. Trailing 1000-row sample shows `route_miss_rows <= 8`.
5. At least 80% of previous top 10 failing intent strings route successfully.

## Dashboard Panels

1. **Route Error Rate (Trailing 500)**
   - `hub_route_intent_error_rate` trend by hour.
2. **Canonicalization Funnel**
   - `raw_intent -> canonical_form -> resolved_tool`.
3. **Top Unmapped Strings**
   - Top 20 unresolved strings and frequency.
4. **Fallback Confidence Distribution**
   - Histogram of confidence for accepted/rejected semantic fallback decisions.
5. **Legacy Top-10 Recovery Panel**
   - Success rate for previous top-10 failing strings.

## Core Metrics

- `hub_route_intent_error_rate`: route errors / route attempts over trailing 500.
- `route_miss_rows`: count of route-miss rows in trailing 1000.
- `legacy_top10_recovery_rate`: successful routes among previously top-10 failing strings.
- `canonicalization_coverage`: percent of route attempts mapped by canonical rules before fallback.

## Query Sketch (BTQL / SQL-like)

```sql
-- trailing 500 route intent error rate
WITH route_rows AS (
  SELECT is_error
  FROM project_logs(project_id)
  WHERE tool = 'hub_route_intent'
  ORDER BY created_at DESC
  LIMIT 500
)
SELECT SUM(CASE WHEN is_error THEN 1 ELSE 0 END)::float / COUNT(*) AS hub_route_intent_error_rate
FROM route_rows;

-- top unmapped strings
SELECT intent_text, COUNT(*) AS misses
FROM project_logs(project_id)
WHERE tool = 'hub_route_intent'
  AND is_error = TRUE
  AND error_code = 'route_miss'
GROUP BY intent_text
ORDER BY misses DESC
LIMIT 20;
```

