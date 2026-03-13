CREATE TABLE IF NOT EXISTS agent_profiles (
  id TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runtime_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staging_agent_profiles (
  id TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staging_runtime_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_updated_at ON agent_profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_runtime_settings_updated_at ON runtime_settings(updated_at);
