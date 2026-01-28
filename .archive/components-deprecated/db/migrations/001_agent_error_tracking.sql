-- Agent-Queryable Error Tracking
-- Enables agents to programmatically analyze application errors
--
-- This table stores structured error logs that agents can query to:
-- - Find patterns in recurring errors
-- - Analyze error frequency by service/endpoint
-- - Correlate errors with deployments
-- - Self-heal by identifying and fixing common issues

CREATE TABLE IF NOT EXISTS agent_error_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  
  -- Error classification
  level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'fatal')),
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Context for debugging
  correlation_id TEXT,
  path TEXT,
  method TEXT,
  user_id TEXT,
  
  -- Structured metadata (JSON)
  metadata TEXT,
  
  -- Error details
  error_name TEXT,
  error_message TEXT,
  stack_trace TEXT,
  
  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  -- Agent processing
  analyzed_at TEXT,
  analyzed_by TEXT,
  resolution_status TEXT CHECK (resolution_status IN ('new', 'analyzing', 'resolved', 'wontfix', 'recurring')),
  resolution_notes TEXT,
  linked_issue_id TEXT
);

-- Indexes for agent queries
CREATE INDEX IF NOT EXISTS idx_error_logs_service ON agent_error_logs(service);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON agent_error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON agent_error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_correlation_id ON agent_error_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolution_status ON agent_error_logs(resolution_status);
CREATE INDEX IF NOT EXISTS idx_error_logs_path ON agent_error_logs(path);

-- Compound index for common agent queries
CREATE INDEX IF NOT EXISTS idx_error_logs_service_created ON agent_error_logs(service, created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON agent_error_logs(resolution_status, created_at) 
  WHERE resolution_status = 'new' OR resolution_status = 'recurring';

-- Error pattern aggregation view for agents
CREATE VIEW IF NOT EXISTS v_error_patterns AS
SELECT 
  service,
  message,
  error_name,
  path,
  COUNT(*) as occurrence_count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  COUNT(DISTINCT correlation_id) as unique_requests,
  COUNT(DISTINCT user_id) as affected_users
FROM agent_error_logs
WHERE created_at >= datetime('now', '-7 days')
GROUP BY service, message, error_name, path
ORDER BY occurrence_count DESC;

-- Daily error summary for trend analysis
CREATE VIEW IF NOT EXISTS v_error_daily_summary AS
SELECT 
  date(created_at) as date,
  service,
  level,
  COUNT(*) as error_count
FROM agent_error_logs
WHERE created_at >= datetime('now', '-30 days')
GROUP BY date(created_at), service, level
ORDER BY date DESC, error_count DESC;
