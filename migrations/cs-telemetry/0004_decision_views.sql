PRAGMA foreign_keys = ON;

-- Adoption view: daily activity footprint by tenant.
CREATE VIEW IF NOT EXISTS vw_gateway_adoption AS
SELECT
  day,
  tenant_id,
  SUM(request_count) AS requests,
  COUNT(DISTINCT provider_slug) AS active_providers,
  COUNT(DISTINCT model_name) AS active_models,
  SUM(total_tokens) AS total_tokens,
  SUM(total_cost_usd) AS total_cost_usd
FROM gateway_daily_rollups
GROUP BY day, tenant_id;

-- Cost efficiency view: monthly cost/tokens blend by tenant.
CREATE VIEW IF NOT EXISTS vw_gateway_cost_efficiency AS
SELECT
  strftime('%Y-%m', day) AS period,
  tenant_id,
  SUM(request_count) AS requests,
  SUM(total_tokens) AS total_tokens,
  ROUND(SUM(total_cost_usd), 6) AS total_cost_usd,
  ROUND(
    CASE
      WHEN SUM(total_tokens) > 0 THEN (SUM(total_cost_usd) / (SUM(total_tokens) / 1000.0))
      ELSE 0
    END,
    6
  ) AS cost_per_1k_tokens
FROM gateway_daily_rollups
GROUP BY period, tenant_id;

-- Reliability view: per-day reliability indicators by tenant.
CREATE VIEW IF NOT EXISTS vw_gateway_reliability AS
SELECT
  date(created_at) AS day,
  tenant_id,
  COUNT(*) AS requests,
  SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS errors,
  ROUND(
    CASE
      WHEN COUNT(*) > 0 THEN (100.0 * SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) / COUNT(*))
      ELSE 0
    END,
    3
  ) AS error_rate_percent,
  ROUND(COALESCE(AVG(latency_ms), 0), 2) AS avg_latency_ms,
  SUM(CASE WHEN rate_limited = 1 THEN 1 ELSE 0 END) AS rate_limited_events,
  SUM(CASE WHEN failover_activated = 1 THEN 1 ELSE 0 END) AS failover_events
FROM gateway_requests
GROUP BY day, tenant_id;

-- Policy risk view: daily policy pressure by tenant.
CREATE VIEW IF NOT EXISTS vw_gateway_policy_risk AS
SELECT
  date(gr.created_at) AS day,
  gr.tenant_id AS tenant_id,
  SUM(CASE WHEN gr.budget_decision = 'warn' THEN 1 ELSE 0 END) AS budget_warn_events,
  SUM(CASE WHEN gr.budget_decision = 'block' THEN 1 ELSE 0 END) AS budget_block_events,
  SUM(CASE WHEN gr.rate_limited = 1 THEN 1 ELSE 0 END) AS rate_limited_events,
  SUM(CASE WHEN gr.failover_activated = 1 THEN 1 ELSE 0 END) AS failover_events,
  (
    SELECT COUNT(*)
    FROM gateway_alerts ga
    WHERE ga.tenant_id = gr.tenant_id
      AND date(ga.created_at) = date(gr.created_at)
      AND ga.alert_type = 'budget_threshold_crossed'
  ) AS budget_alerts
FROM gateway_requests gr
GROUP BY day, tenant_id;
