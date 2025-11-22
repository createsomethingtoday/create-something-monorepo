-- Migration: Learning Analytics Table
-- Game-theoretic mechanism design: Track learning events for optimal intervention timing

CREATE TABLE IF NOT EXISTS learning_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  experiment_type TEXT NOT NULL CHECK(experiment_type IN ('terminal', 'code')),
  step_index INTEGER NOT NULL,
  step_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('step_start', 'step_complete', 'step_error', 'hint_shown', 'hint_helpful')),
  time_on_step INTEGER, -- milliseconds
  error_count INTEGER,
  retry_count INTEGER,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast queries by paper and step (mechanism design)
CREATE INDEX IF NOT EXISTS idx_learning_events_paper_step
ON learning_events(paper_id, step_index);

-- Index for session queries (debugging)
CREATE INDEX IF NOT EXISTS idx_learning_events_session
ON learning_events(session_id);

-- Index for aggregate analytics
CREATE INDEX IF NOT EXISTS idx_learning_events_analytics
ON learning_events(paper_id, step_index, action, timestamp);
