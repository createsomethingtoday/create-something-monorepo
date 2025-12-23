-- Taste Collections & Reading Tracker
-- Enables users to track taste exploration and curate collections

-- =============================================================================
-- USER READING HISTORY
-- Tracks which taste references a user has viewed/engaged with
-- =============================================================================

CREATE TABLE IF NOT EXISTS taste_readings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('example', 'resource')),
  channel TEXT,
  first_viewed TEXT DEFAULT (datetime('now')),
  last_viewed TEXT DEFAULT (datetime('now')),
  view_count INTEGER DEFAULT 1,
  total_time_seconds INTEGER DEFAULT 0,
  max_scroll_depth INTEGER DEFAULT 0,
  studied INTEGER DEFAULT 0, -- Boolean: 0 = glanced, 1 = studied
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_taste_readings_user ON taste_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_taste_readings_ref ON taste_readings(reference_id);
CREATE INDEX IF NOT EXISTS idx_taste_readings_channel ON taste_readings(channel);
CREATE INDEX IF NOT EXISTS idx_taste_readings_studied ON taste_readings(user_id, studied);

-- =============================================================================
-- TASTE COLLECTIONS
-- User-curated collections of taste references
-- =============================================================================

CREATE TABLE IF NOT EXISTS taste_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  tags TEXT, -- JSON array of tags
  item_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_taste_collections_user ON taste_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_taste_collections_visibility ON taste_collections(visibility);

-- =============================================================================
-- COLLECTION ITEMS
-- References within collections, with ordering
-- =============================================================================

CREATE TABLE IF NOT EXISTS taste_collection_items (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('example', 'resource')),
  position INTEGER NOT NULL,
  note TEXT, -- User annotation
  added_at TEXT DEFAULT (datetime('now')),
  UNIQUE(collection_id, reference_id),
  FOREIGN KEY (collection_id) REFERENCES taste_collections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_taste_collection_items_collection ON taste_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_taste_collection_items_position ON taste_collection_items(collection_id, position);

-- =============================================================================
-- USER TASTE PROFILE
-- Aggregated taste profile data for quick access
-- =============================================================================

CREATE TABLE IF NOT EXISTS taste_profiles (
  user_id TEXT PRIMARY KEY,
  total_references_viewed INTEGER DEFAULT 0,
  total_references_studied INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  channels_explored TEXT, -- JSON array of explored channel slugs
  top_channels TEXT, -- JSON array of {channel, count} objects
  collection_count INTEGER DEFAULT 0,
  first_activity TEXT,
  last_activity TEXT,
  profile_summary TEXT, -- LLM-friendly summary for sharing
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- =============================================================================
-- DAILY READING AGGREGATES
-- For dashboard charts and trends
-- =============================================================================

CREATE TABLE IF NOT EXISTS taste_readings_daily (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  views INTEGER DEFAULT 0,
  studied INTEGER DEFAULT 0,
  time_seconds INTEGER DEFAULT 0,
  channels_touched TEXT, -- JSON array
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_taste_readings_daily_user ON taste_readings_daily(user_id, date);
