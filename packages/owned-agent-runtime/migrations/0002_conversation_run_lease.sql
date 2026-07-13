ALTER TABLE agent_conversations ADD COLUMN active_run_id TEXT;
ALTER TABLE agent_conversations ADD COLUMN active_run_started_at TEXT;

CREATE INDEX IF NOT EXISTS idx_agent_conversations_active_run
  ON agent_conversations(active_run_id, active_run_started_at);
