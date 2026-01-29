-- Notion Agent Database Schema
-- Initial migration: users, agents, executions, audit_logs

-- Users table: Notion workspace connections
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    notion_workspace_id TEXT NOT NULL UNIQUE,
    notion_workspace_name TEXT NOT NULL,
    notion_access_token TEXT NOT NULL,  -- encrypted
    notion_bot_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON users(notion_workspace_id);

-- Agents table: Agent configurations
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    user_message TEXT NOT NULL,         -- User's configurable prompt
    databases TEXT NOT NULL DEFAULT '[]', -- JSON array of allowed database IDs
    schedule TEXT,                       -- Cron expression (optional)
    enabled INTEGER NOT NULL DEFAULT 1,  -- SQLite boolean
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_enabled_schedule ON agents(enabled, schedule);

-- Executions table: Agent execution history
CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'webhook')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    input TEXT,                          -- JSON: trigger context
    output TEXT,                         -- JSON: agent response
    error TEXT,                          -- Error message if failed
    tokens_used INTEGER,
    started_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_executions_agent_id ON executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON executions(started_at DESC);

-- Audit logs table: Security and compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,                        -- JSON: action-specific data
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
