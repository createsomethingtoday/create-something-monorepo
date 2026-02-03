-- Template Metadata for Temporal Analysis
--
-- Tracks when templates were first seen and their marketplace publication dates.
-- Used by PageRank to determine edge direction (older = more authoritative).
--
-- Canon: Time reveals the original.

-- Add temporal columns to template_minhash
ALTER TABLE template_minhash ADD COLUMN first_indexed_at TEXT;
ALTER TABLE template_minhash ADD COLUMN marketplace_published_at TEXT;
ALTER TABLE template_minhash ADD COLUMN date_source TEXT;

-- Update existing records with first_indexed_at from created_at or current time
UPDATE template_minhash 
SET first_indexed_at = COALESCE(created_at, datetime('now'))
WHERE first_indexed_at IS NULL;

-- Index for temporal queries
CREATE INDEX IF NOT EXISTS idx_template_minhash_first_indexed 
  ON template_minhash(first_indexed_at);

CREATE INDEX IF NOT EXISTS idx_template_minhash_published 
  ON template_minhash(marketplace_published_at);

-- Template temporal priority view (for PageRank direction)
CREATE VIEW IF NOT EXISTS template_temporal_priority AS
SELECT 
  id,
  name,
  url,
  first_indexed_at,
  marketplace_published_at,
  -- Priority: marketplace date > indexed date > null
  COALESCE(marketplace_published_at, first_indexed_at) as effective_date,
  date_source
FROM template_minhash
WHERE first_indexed_at IS NOT NULL OR marketplace_published_at IS NOT NULL;
