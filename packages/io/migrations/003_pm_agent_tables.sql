-- PM Agent Tables
-- Tracks agent actions, decisions, and metrics for Experiment #3

-- Agent Decisions: Logs human review of agent drafts
CREATE TABLE IF NOT EXISTS agent_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL,
  draft_id TEXT NOT NULL,
  approved INTEGER NOT NULL, -- 0 = rejected, 1 = approved
  reviewed_at TEXT NOT NULL,
  draft_created_at TEXT NOT NULL,
  draft_body TEXT, -- Store draft content for analysis
  review_notes TEXT, -- Optional human feedback
  time_to_review_seconds INTEGER, -- Time from draft to review
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contact_id) REFERENCES contact_submissions(id)
);

-- Agent Actions: Logs all agent tool executions
CREATE TABLE IF NOT EXISTS agent_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER,
  action_type TEXT NOT NULL, -- tool name: query_contact_submissions, draft_response, escalate_to_human, etc.
  action_input TEXT, -- JSON of tool parameters
  action_output TEXT, -- JSON of tool result
  success INTEGER NOT NULL, -- 0 = failed, 1 = succeeded
  error_message TEXT,
  execution_time_ms INTEGER,
  agent_version TEXT DEFAULT 'pm-agent-v1',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contact_id) REFERENCES contact_submissions(id)
);

-- Agent Sessions: Tracks complete agent runs
CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY, -- UUID
  session_type TEXT NOT NULL, -- 'triage', 'process_contact', 'manual_run'
  contact_id INTEGER, -- NULL for triage runs
  started_at TEXT NOT NULL,
  completed_at TEXT,
  total_actions INTEGER DEFAULT 0,
  successful_actions INTEGER DEFAULT 0,
  failed_actions INTEGER DEFAULT 0,
  outcome TEXT, -- 'draft_created', 'escalated', 'error', 'no_action_needed'
  outcome_reason TEXT,
  agent_version TEXT DEFAULT 'pm-agent-v1',
  model_used TEXT,
  total_tokens INTEGER,
  cost_usd REAL,
  FOREIGN KEY (contact_id) REFERENCES contact_submissions(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_decisions_contact ON agent_decisions(contact_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_approved ON agent_decisions(approved);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_reviewed_at ON agent_decisions(reviewed_at);

CREATE INDEX IF NOT EXISTS idx_agent_actions_contact ON agent_actions(contact_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_type ON agent_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created ON agent_actions(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_type ON agent_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_outcome ON agent_sessions(outcome);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_started ON agent_sessions(started_at);

-- View: Agent Performance Metrics
CREATE VIEW IF NOT EXISTS agent_metrics AS
SELECT
  -- Approval rate
  COUNT(CASE WHEN approved = 1 THEN 1 END) * 100.0 / COUNT(*) as approval_rate_percent,

  -- Average time to review
  AVG(time_to_review_seconds) as avg_review_time_seconds,

  -- Total decisions
  COUNT(*) as total_decisions,
  COUNT(CASE WHEN approved = 1 THEN 1 END) as approved_count,
  COUNT(CASE WHEN approved = 0 THEN 1 END) as rejected_count,

  -- Date range
  MIN(reviewed_at) as first_decision,
  MAX(reviewed_at) as last_decision
FROM agent_decisions;

-- View: Escalation Rate
CREATE VIEW IF NOT EXISTS agent_escalation_rate AS
SELECT
  COUNT(CASE WHEN status = 'escalated' THEN 1 END) * 100.0 / COUNT(*) as escalation_rate_percent,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as drafts_pending,
  COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated_count,
  COUNT(*) as total_processed
FROM contact_submissions
WHERE status IN ('in_progress', 'escalated', 'responded');
