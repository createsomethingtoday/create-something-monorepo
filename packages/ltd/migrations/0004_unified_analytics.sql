-- Unified Analytics Events Table
-- Apply this migration to each property's D1 database
--
-- Usage: Copy to packages/{property}/migrations/XXXX_unified_analytics.sql
-- Then run: wrangler d1 migrations apply {DB_NAME}

-- =============================================================================
-- UNIFIED EVENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS unified_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  property TEXT NOT NULL CHECK (property IN ('space', 'io', 'agency', 'ltd', 'lms')),
  category TEXT NOT NULL CHECK (category IN ('navigation', 'interaction', 'search', 'content', 'conversion', 'error', 'performance')),
  action TEXT NOT NULL,
  target TEXT,
  value REAL,
  url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_country TEXT,
  metadata TEXT, -- JSON blob for additional context
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_unified_events_session ON unified_events(session_id);
CREATE INDEX IF NOT EXISTS idx_unified_events_category ON unified_events(category, action);
CREATE INDEX IF NOT EXISTS idx_unified_events_property ON unified_events(property, created_at);
CREATE INDEX IF NOT EXISTS idx_unified_events_created ON unified_events(created_at);

-- =============================================================================
-- DAILY AGGREGATES TABLE (for fast dashboard queries)
-- =============================================================================

CREATE TABLE IF NOT EXISTS unified_events_daily (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL, -- YYYY-MM-DD
  property TEXT NOT NULL CHECK (property IN ('space', 'io', 'agency', 'ltd', 'lms')),
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  total_value REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date, property, category, action)
);

CREATE INDEX IF NOT EXISTS idx_unified_daily_date ON unified_events_daily(date);
CREATE INDEX IF NOT EXISTS idx_unified_daily_property ON unified_events_daily(property, date);

-- =============================================================================
-- SESSION SUMMARY TABLE (for session-level analysis)
-- =============================================================================

CREATE TABLE IF NOT EXISTS unified_sessions (
  id TEXT PRIMARY KEY, -- session_id
  property TEXT NOT NULL,
  user_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  page_views INTEGER DEFAULT 0,
  interactions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  max_scroll_depth INTEGER DEFAULT 0,
  entry_url TEXT,
  exit_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_country TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_unified_sessions_property ON unified_sessions(property, started_at);
CREATE INDEX IF NOT EXISTS idx_unified_sessions_user ON unified_sessions(user_id) WHERE user_id IS NOT NULL;
