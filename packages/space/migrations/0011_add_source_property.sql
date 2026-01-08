-- Add source_property for cross-property tracking
-- Part of Anti-Concierge: Wayfinding Through Design

-- NOTE: Column already exists in production (added manually)
-- This migration now just ensures the index exists

-- Verify column exists (this will succeed silently if column exists)
-- We can't use IF NOT EXISTS with ALTER TABLE in SQLite
-- So we just ensure the index exists
-- ALTER TABLE unified_sessions ADD COLUMN source_property TEXT;

-- Index for cross-property queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_unified_sessions_source ON unified_sessions(source_property) WHERE source_property IS NOT NULL;
