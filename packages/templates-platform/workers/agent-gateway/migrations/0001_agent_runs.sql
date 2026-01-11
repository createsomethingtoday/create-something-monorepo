-- CREATE SOMETHING Agent Runs Table
-- Tracks all agent executions for cost monitoring and debugging

CREATE TABLE IF NOT EXISTS agent_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT UNIQUE NOT NULL,
    issue_id TEXT,                          -- Beads issue ID if linked
    success INTEGER NOT NULL DEFAULT 0,     -- 1 = success, 0 = failure
    output TEXT,                            -- Agent output (truncated)
    cost_usd REAL NOT NULL DEFAULT 0,       -- API cost
    model TEXT NOT NULL,                    -- Model used
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    iterations INTEGER NOT NULL DEFAULT 0,
    agent_type TEXT DEFAULT 'default',      -- Agent type
    created_at TEXT NOT NULL,               -- ISO timestamp
    completed_at TEXT                       -- ISO timestamp when finished
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON agent_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_runs_issue_id ON agent_runs(issue_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_model ON agent_runs(model);
CREATE INDEX IF NOT EXISTS idx_agent_runs_success ON agent_runs(success);
