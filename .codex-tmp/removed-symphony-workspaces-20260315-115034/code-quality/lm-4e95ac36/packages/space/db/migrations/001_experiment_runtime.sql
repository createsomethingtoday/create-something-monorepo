-- ============================================================================
-- EXPERIMENT RUNTIME SCHEMA
-- ============================================================================
-- Migration: 001_experiment_runtime
-- Created: 2025-11-16
-- Purpose: Add interactive experiment runtime capabilities

-- Add executable fields to existing papers table
ALTER TABLE papers ADD COLUMN is_executable INTEGER DEFAULT 0;
ALTER TABLE papers ADD COLUMN terminal_commands TEXT; -- JSON array of command objects
ALTER TABLE papers ADD COLUMN setup_instructions TEXT;
ALTER TABLE papers ADD COLUMN expected_output TEXT;
ALTER TABLE papers ADD COLUMN environment_config TEXT; -- JSON config for runtime

-- ============================================================================
-- EXPERIMENT EXECUTIONS TRACKING
-- ============================================================================
-- Tracks every time a user runs an experiment
CREATE TABLE IF NOT EXISTS experiment_executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  paper_id TEXT NOT NULL,
  user_session_id TEXT, -- Anonymous session ID (no auth required)
  commands_executed TEXT, -- JSON array of executed commands
  time_spent_seconds INTEGER DEFAULT 0,
  errors_encountered INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0, -- 1 if user completed all steps
  metrics TEXT, -- JSON object with custom metrics
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_executions_paper ON experiment_executions(paper_id);
CREATE INDEX IF NOT EXISTS idx_executions_session ON experiment_executions(user_session_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON experiment_executions(executed_at);

-- ============================================================================
-- EXPERIMENT VARIATIONS (Phase 2 - Future)
-- ============================================================================
-- Community-shared variations of experiments
CREATE TABLE IF NOT EXISTS experiment_variations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  paper_id TEXT NOT NULL,
  user_session_id TEXT NOT NULL,
  variation_name TEXT NOT NULL,
  commands TEXT NOT NULL, -- JSON array of modified commands
  description TEXT,
  shared INTEGER DEFAULT 0, -- 1 if publicly shared
  upvotes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variations_paper ON experiment_variations(paper_id);
CREATE INDEX IF NOT EXISTS idx_variations_shared ON experiment_variations(shared);
CREATE INDEX IF NOT EXISTS idx_variations_upvotes ON experiment_variations(upvotes DESC);
