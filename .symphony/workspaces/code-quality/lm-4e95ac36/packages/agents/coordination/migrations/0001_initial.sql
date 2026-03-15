-- Migration: 0001_initial
-- Multi-agent coordination schema for CREATE SOMETHING
--
-- Philosophy: Graph-based task tracking with claims, dependencies, and health monitoring.
-- The coordination layer recedes; the swarm reasons.

-- ─────────────────────────────────────────────────────────────────────────────
-- Projects (Specific Directives)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'paused')),
  success_criteria TEXT DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER,
  metadata TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Issues (Actionable Work)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'blocked', 'done', 'cancelled')),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  parent_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
  priority INTEGER DEFAULT 2 CHECK (priority >= 0 AND priority <= 4),
  labels TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Dependencies (Graph Edges)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dependencies (
  from_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('blocks', 'informs', 'discovered_from', 'any_of')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (from_id, to_id, type)
);

CREATE INDEX IF NOT EXISTS idx_deps_to ON dependencies(to_id);
CREATE INDEX IF NOT EXISTS idx_deps_type ON dependencies(type);

-- ─────────────────────────────────────────────────────────────────────────────
-- Outcomes (Learning from Work)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outcomes (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('success', 'failure', 'partial', 'cancelled')),
  learnings TEXT DEFAULT '',
  metadata TEXT DEFAULT '{}',
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_outcomes_issue ON outcomes(issue_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_agent ON outcomes(agent_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Claims (Multi-Agent Coordination)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS claims (
  issue_id TEXT PRIMARY KEY REFERENCES issues(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  claimed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER,
  heartbeat_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_claims_agent ON claims(agent_id);
CREATE INDEX IF NOT EXISTS idx_claims_expires ON claims(expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Agent Registry
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  capabilities TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'dead')),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Broadcasts (Event Log)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL CHECK (event_type IN ('completed', 'blocked', 'discovered', 'claimed', 'released')),
  issue_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  payload TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_type ON broadcasts(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_broadcasts_issue ON broadcasts(issue_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Health Snapshots (Ethos Monitoring)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS health_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coherence REAL NOT NULL,
  velocity REAL NOT NULL,
  blockage REAL NOT NULL,
  staleness REAL NOT NULL,
  claim_health REAL NOT NULL,
  agent_health REAL NOT NULL,
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_health_time ON health_snapshots(recorded_at);
