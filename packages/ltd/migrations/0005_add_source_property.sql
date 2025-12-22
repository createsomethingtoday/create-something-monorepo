-- Add source_property for cross-property tracking
-- Part of Anti-Concierge: Wayfinding Through Design

ALTER TABLE unified_sessions ADD COLUMN source_property TEXT;

-- Index for cross-property queries
CREATE INDEX IF NOT EXISTS idx_unified_sessions_source ON unified_sessions(source_property) WHERE source_property IS NOT NULL;
