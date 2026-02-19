PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS gateway_daily_rollups (
  day TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  provider_slug TEXT NOT NULL,
  model_name TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  total_prompt_tokens INTEGER NOT NULL DEFAULT 0,
  total_completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost_usd REAL NOT NULL DEFAULT 0,
  avg_latency_ms REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (day, tenant_id, provider_slug, model_name)
);

CREATE INDEX IF NOT EXISTS idx_gateway_daily_rollups_tenant_day
  ON gateway_daily_rollups(tenant_id, day);

CREATE TRIGGER IF NOT EXISTS trg_gateway_rollup_on_insert
AFTER INSERT ON gateway_requests
BEGIN
  INSERT INTO gateway_daily_rollups (
    day,
    tenant_id,
    provider_slug,
    model_name,
    request_count,
    success_count,
    error_count,
    total_prompt_tokens,
    total_completion_tokens,
    total_tokens,
    total_cost_usd,
    avg_latency_ms,
    updated_at
  )
  VALUES (
    date(NEW.created_at),
    NEW.tenant_id,
    NEW.provider_slug,
    COALESCE(NEW.model_name, 'unknown'),
    1,
    CASE WHEN NEW.success = 1 THEN 1 ELSE 0 END,
    CASE WHEN NEW.success = 0 THEN 1 ELSE 0 END,
    COALESCE(NEW.prompt_tokens, 0),
    COALESCE(NEW.completion_tokens, 0),
    COALESCE(NEW.total_tokens, 0),
    COALESCE(NEW.estimated_cost_usd, 0),
    COALESCE(NEW.latency_ms, 0),
    datetime('now')
  )
  ON CONFLICT(day, tenant_id, provider_slug, model_name)
  DO UPDATE SET
    request_count = request_count + 1,
    success_count = success_count + CASE WHEN NEW.success = 1 THEN 1 ELSE 0 END,
    error_count = error_count + CASE WHEN NEW.success = 0 THEN 1 ELSE 0 END,
    total_prompt_tokens = total_prompt_tokens + COALESCE(NEW.prompt_tokens, 0),
    total_completion_tokens = total_completion_tokens + COALESCE(NEW.completion_tokens, 0),
    total_tokens = total_tokens + COALESCE(NEW.total_tokens, 0),
    total_cost_usd = total_cost_usd + COALESCE(NEW.estimated_cost_usd, 0),
    avg_latency_ms = (
      (avg_latency_ms * request_count) + COALESCE(NEW.latency_ms, 0)
    ) / (request_count + 1),
    updated_at = datetime('now');
END;

CREATE VIEW IF NOT EXISTS gateway_monthly_tenant_spend AS
SELECT
  strftime('%Y-%m', day) AS period,
  tenant_id,
  SUM(request_count) AS requests,
  SUM(total_tokens) AS tokens,
  ROUND(SUM(total_cost_usd), 6) AS total_cost_usd
FROM gateway_daily_rollups
GROUP BY period, tenant_id;
