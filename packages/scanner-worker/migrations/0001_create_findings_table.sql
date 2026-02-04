-- Scanner Findings Cache
-- Stores findings for P3-memory similarity search and RLHF feedback

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  fingerprint TEXT UNIQUE NOT NULL,
  rule_id TEXT NOT NULL,
  snippet TEXT NOT NULL,
  verdict TEXT NOT NULL DEFAULT 'INVESTIGATE',
  is_false_positive INTEGER DEFAULT 0,
  reasoning TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for rule-based lookups
CREATE INDEX IF NOT EXISTS idx_findings_rule_id ON findings(rule_id);

-- Index for fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_findings_fingerprint ON findings(fingerprint);

-- Index for false positive queries
CREATE INDEX IF NOT EXISTS idx_findings_false_positive ON findings(is_false_positive) WHERE is_false_positive = 1;
