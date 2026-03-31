# EXP-06: Governed Promotion Scorecard

Issue: `lm-bf4658be`

## Objective

Turn candidate MCP and harness improvements into a governed promotion lane.

The first pilot surface is Hub intent routing, but the scorecard is designed to be reused for any governed MCP path.

## Baseline (Mar 31, 2026 setup)

- Primary pilot surface: `hub_route_intent`
- Existing route-quality baseline from `EXP-02`: `hub_route_intent_error_rate = 61.1%` (`22/36`)
- Governed trace completeness baseline: capture before the first candidate rollout
- Account isolation baseline: current `account_isolation` eval must remain a non-regression gate
- Holdout set: fixed intent phrases and routed-call scenarios not used during candidate search

## Acceptance Criteria (Exact)

1. Every candidate is scored on a fixed search set and a separate holdout set.
2. The held-out primary metric improves against baseline.
3. `governed_trace_completeness_rate = 1.00` for required governance fields on sampled candidate runs.
4. `account_isolation_pass_rate = 1.00` on the existing Braintrust account-isolation eval.
5. Latency and cost stay within predeclared guardrails for the pilot surface.
6. Promotion records include hypothesis, artifact set, baseline, candidate result, holdout result, and reviewer decision.

## Dashboard Panels

1. **Primary Metric Panel**
   - Baseline vs candidate vs holdout for the chosen quality metric.
2. **Governed Trace Completeness Panel**
   - Coverage of required governance fields after normalization.
3. **Account Isolation Gate**
   - Binary pass or fail plus most recent failure reason.
4. **Latency and Cost Guardrails**
   - p95 latency, cost per successful run, and operator interrupt rate.
5. **Promotion Ledger**
   - candidate id, baseline id, reviewer, decision, and linked artifact set.

## Core Metrics

- `heldout_primary_metric_delta`: held-out candidate result minus held-out baseline result.
- `governed_trace_completeness_rate`: percent of sampled governed runs with all required governance fields present.
- `account_isolation_pass_rate`: pass ratio for the `account_isolation` eval.
- `candidate_cost_per_success`: candidate run cost divided by successful governed outcomes.
- `operator_interrupt_rate`: operator interrupts or manual overrides per governed candidate run.

## Required Governance Fields

- `account_id`
- `tenant_id`
- `correlation_id`
- `route_classification`
- `authz_decision`
- `lane_slug` or `bound_host`

## Query Sketch (BTQL / SQL-like)

```sql
-- held-out primary metric delta for hub intent routing
WITH baseline_rows AS (
  SELECT is_error
  FROM project_logs(project_id)
  WHERE tool = 'hub_route_intent'
    AND metadata.cohort = 'holdout'
    AND metadata.candidate_id = 'baseline'
),
candidate_rows AS (
  SELECT is_error
  FROM project_logs(project_id)
  WHERE tool = 'hub_route_intent'
    AND metadata.cohort = 'holdout'
    AND metadata.candidate_id = :candidate_id
)
SELECT
  (
    1 - AVG(CASE WHEN candidate_rows.is_error THEN 1 ELSE 0 END)
  ) - (
    1 - AVG(CASE WHEN baseline_rows.is_error THEN 1 ELSE 0 END)
  ) AS heldout_primary_metric_delta
FROM baseline_rows, candidate_rows;

-- governed trace completeness after normalization in the query layer
SELECT
  AVG(CASE WHEN missing_required_governance_fields = 0 THEN 1 ELSE 0 END)
    AS governed_trace_completeness_rate
FROM project_logs(project_id)
WHERE metadata.phase IN ('candidate', 'holdout')
  AND tool = 'hub_route_intent';

-- cost and interrupts per successful governed run
SELECT
  SUM(duration_ms) AS total_duration_ms,
  SUM(cost_usd) / NULLIF(SUM(CASE WHEN is_error = FALSE THEN 1 ELSE 0 END), 0)
    AS candidate_cost_per_success,
  SUM(CASE WHEN metadata.operator_interrupt = TRUE THEN 1 ELSE 0 END)::float
    / COUNT(*) AS operator_interrupt_rate
FROM project_logs(project_id)
WHERE metadata.candidate_id = :candidate_id;
```

## Promotion Rule

Do not promote a candidate unless:

- the held-out primary metric delta is positive
- governed trace completeness remains perfect on the sampled pilot runs
- account isolation remains green
- latency, cost, and operator interrupts stay within guardrails
- a human reviewer signs off on the artifact set
