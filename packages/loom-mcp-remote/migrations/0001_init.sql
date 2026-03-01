-- Loom MCP Remote schema
-- Core tables required for remote task/session parity + migration cutover.

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  priority TEXT NOT NULL DEFAULT 'normal',
  issue_type TEXT NOT NULL DEFAULT 'task',
  agent TEXT,
  labels_json TEXT NOT NULL DEFAULT '[]',
  parent TEXT,
  evidence TEXT,
  actual_cost_usd REAL,
  repo TEXT,
  close_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dependencies (
  task_id TEXT NOT NULL,
  depends_on TEXT NOT NULL,
  dep_type TEXT NOT NULL DEFAULT 'blocks',
  created_at TEXT NOT NULL,
  PRIMARY KEY (task_id, depends_on, dep_type)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  working_dir TEXT,
  git_branch TEXT,
  last_checkpoint TEXT,
  context_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  summary TEXT NOT NULL,
  context_json TEXT,
  git_commit TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_type TEXT,
  success INTEGER NOT NULL,
  duration_secs REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  options_json TEXT,
  decision TEXT NOT NULL,
  rationale TEXT,
  created_at TEXT NOT NULL
);

-- Staging tables used for atomic cutover swap during /admin/migrate
CREATE TABLE IF NOT EXISTS staging_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  agent TEXT,
  labels_json TEXT NOT NULL,
  parent TEXT,
  evidence TEXT,
  actual_cost_usd REAL,
  repo TEXT,
  close_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staging_dependencies (
  task_id TEXT NOT NULL,
  depends_on TEXT NOT NULL,
  dep_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (task_id, depends_on, dep_type)
);

CREATE TABLE IF NOT EXISTS staging_sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  working_dir TEXT,
  git_branch TEXT,
  last_checkpoint TEXT,
  context_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staging_checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  summary TEXT NOT NULL,
  context_json TEXT,
  git_commit TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staging_agent_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_type TEXT,
  success INTEGER NOT NULL,
  duration_secs REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_issue_type ON tasks(issue_type);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent);
CREATE INDEX IF NOT EXISTS idx_tasks_repo ON tasks(repo);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

CREATE INDEX IF NOT EXISTS idx_dependencies_task ON dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on ON dependencies(depends_on);
CREATE INDEX IF NOT EXISTS idx_dependencies_dep_type ON dependencies(dep_type);

CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON checkpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_sequence ON checkpoints(session_id, sequence);

CREATE INDEX IF NOT EXISTS idx_agent_executions_agent ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_task ON agent_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_created ON agent_executions(created_at);

CREATE INDEX IF NOT EXISTS idx_task_preferences_task ON task_preferences(task_id);
CREATE INDEX IF NOT EXISTS idx_task_preferences_created ON task_preferences(created_at);

CREATE TRIGGER IF NOT EXISTS trg_tasks_touch_updated_at
AFTER UPDATE ON tasks
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE tasks SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;
