-- Agentic Layer Database Schema
-- Multi-session autonomous work with budget enforcement and quality gates

-- ============================================================================
-- Sessions (Durable Object state tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agentic_sessions (
  id TEXT PRIMARY KEY,              -- Durable Object ID
  issue_id TEXT NOT NULL,           -- Beads issue
  epic_id TEXT,                     -- Orchestration epic
  convoy_id TEXT,                   -- Convoy (if part of one)
  budget REAL NOT NULL,             -- Allocated budget in USD
  cost_consumed REAL DEFAULT 0,     -- Actual cost consumed
  iteration INTEGER DEFAULT 0,      -- Current iteration
  status TEXT DEFAULT 'running',    -- running, paused, complete, budget_exhausted, error
  started_at INTEGER NOT NULL,      -- Unix timestamp
  completed_at INTEGER,             -- Unix timestamp
  updated_at INTEGER,               -- Unix timestamp (last activity)
  termination_reason TEXT           -- Why session ended (if not complete)
);

CREATE INDEX idx_sessions_issue ON agentic_sessions(issue_id);
CREATE INDEX idx_sessions_convoy ON agentic_sessions(convoy_id);
CREATE INDEX idx_sessions_status ON agentic_sessions(status);
CREATE INDEX idx_sessions_updated ON agentic_sessions(updated_at);

-- ============================================================================
-- Iterations (per-iteration cost tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agentic_iterations (
  session_id TEXT NOT NULL,
  iteration INTEGER NOT NULL,
  cost REAL NOT NULL,               -- Cost of this iteration
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  files_modified INTEGER DEFAULT 0,
  tools_used TEXT,                  -- JSON array of tool names
  created_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, iteration)
);

CREATE INDEX idx_iterations_session ON agentic_iterations(session_id);
CREATE INDEX idx_iterations_created ON agentic_iterations(created_at);

-- ============================================================================
-- Events (audit log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agentic_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,                  -- NULL for system events
  issue_id TEXT NOT NULL,
  event_type TEXT NOT NULL,         -- budget_warning, budget_exhausted, completion_rejected, quality_gate_failed, etc
  event_data TEXT,                  -- JSON
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_events_session ON agentic_events(session_id);
CREATE INDEX idx_events_issue ON agentic_events(issue_id);
CREATE INDEX idx_events_type ON agentic_events(event_type);
CREATE INDEX idx_events_created ON agentic_events(created_at);

-- ============================================================================
-- Metadata (extends Beads issues)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agentic_metadata (
  issue_id TEXT PRIMARY KEY,
  budget REAL NOT NULL,
  cost_consumed REAL DEFAULT 0,
  preview_url TEXT,
  quality_reports TEXT,             -- JSON
  review_status TEXT DEFAULT 'pending',  -- pending, approved, rejected, budget_exhausted
  reviewed_by TEXT,
  reviewed_at INTEGER,
  budget_exhausted_at INTEGER
);

-- ============================================================================
-- Convoys (batch work coordination)
-- ============================================================================

CREATE TABLE IF NOT EXISTS convoys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  epic_id TEXT,                     -- Links to orchestration epic
  budget REAL,                      -- Total convoy budget
  cost_consumed REAL DEFAULT 0,     -- Actual cost consumed
  created_by TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX idx_convoys_created_by ON convoys(created_by);
CREATE INDEX idx_convoys_created ON convoys(created_at);

-- ============================================================================
-- Convoy Tasks (links issues to convoys)
-- ============================================================================

CREATE TABLE IF NOT EXISTS convoy_tasks (
  convoy_id TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  session_id TEXT,                  -- Assigned session (once started)
  status TEXT DEFAULT 'pending',    -- pending, in_progress, complete, budget_exhausted, failed
  assigned_worker TEXT,             -- Worker identifier
  started_at INTEGER,
  completed_at INTEGER,
  PRIMARY KEY (convoy_id, issue_id)
);

CREATE INDEX idx_convoy_tasks_convoy ON convoy_tasks(convoy_id);
CREATE INDEX idx_convoy_tasks_issue ON convoy_tasks(issue_id);
CREATE INDEX idx_convoy_tasks_status ON convoy_tasks(status);

-- ============================================================================
-- Checkpoints (session recovery)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agentic_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  iteration INTEGER NOT NULL,
  cost_consumed REAL NOT NULL,
  files_modified TEXT,              -- JSON array
  conversation_length INTEGER,      -- Number of messages in history
  checkpoint_data TEXT,             -- Full checkpoint (JSON) - compressed conversation history
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_checkpoints_session ON agentic_checkpoints(session_id);
CREATE INDEX idx_checkpoints_created ON agentic_checkpoints(created_at);
