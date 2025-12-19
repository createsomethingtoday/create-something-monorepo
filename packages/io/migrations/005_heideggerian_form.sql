-- Heideggerian Form Experience Tables
-- An interactive experiment demonstrating philosophy through service configuration
--
-- Usage: wrangler d1 migrations apply create-something-db

-- =============================================================================
-- SERVICE CONFIGURATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_configurations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,

  -- Cascading selections
  service_type TEXT NOT NULL CHECK (service_type IN ('automation', 'transformation', 'advisory', 'development')),
  scope TEXT NOT NULL,
  features TEXT NOT NULL DEFAULT '[]', -- JSON array of feature IDs
  pricing_tier TEXT NOT NULL CHECK (pricing_tier IN ('starter', 'growth', 'enterprise')),

  -- Form interaction metrics (philosophy tracking)
  form_completion_ms INTEGER,          -- How long did configuration take?
  validation_failures INTEGER DEFAULT 0, -- How many Vorhandenheit moments?

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now'))
);

-- Index for listing (most recent first)
CREATE INDEX IF NOT EXISTS idx_service_configs_created
  ON service_configurations(created_at DESC);

-- Index for session-based lookups
CREATE INDEX IF NOT EXISTS idx_service_configs_session
  ON service_configurations(session_id);
