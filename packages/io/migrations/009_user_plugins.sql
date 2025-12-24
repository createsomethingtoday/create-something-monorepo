-- User Plugins Table
-- Stores user plugin preferences and settings

-- User plugin preferences
CREATE TABLE IF NOT EXISTS user_plugins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  plugin_slug TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1, -- 0 = disabled, 1 = enabled
  enabled_at TEXT,
  disabled_at TEXT,
  settings_json TEXT, -- JSON blob for plugin-specific settings
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, plugin_slug)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_plugins_user_id ON user_plugins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plugins_enabled ON user_plugins(enabled);
CREATE INDEX IF NOT EXISTS idx_user_plugins_slug ON user_plugins(plugin_slug);
