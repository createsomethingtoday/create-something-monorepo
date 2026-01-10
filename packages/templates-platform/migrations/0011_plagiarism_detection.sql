-- Plagiarism Detection System
-- Three-tier AI agent for reviewing template plagiarism reports
--
-- Architecture:
-- - Tier 1: Workers AI screening (free, fast)
-- - Tier 2: Claude Haiku analysis ($0.02/case)
-- - Tier 3: Claude Sonnet judgment ($0.15/case)

-- Main cases table
CREATE TABLE IF NOT EXISTS plagiarism_cases (
  id TEXT PRIMARY KEY,
  airtable_record_id TEXT NOT NULL UNIQUE,
  reporter_email TEXT NOT NULL,
  original_url TEXT NOT NULL,
  alleged_copy_url TEXT NOT NULL,
  complaint_text TEXT NOT NULL,
  alleged_creator TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed')),
  created_at INTEGER NOT NULL,
  completed_at INTEGER,

  -- Tier 1 (Workers AI)
  tier1_decision TEXT CHECK(tier1_decision IN ('obvious_not', 'obvious_yes', 'needs_analysis')),
  tier1_reasoning TEXT,

  -- Tier 2 (Claude Haiku)
  tier2_decision TEXT CHECK(tier2_decision IN ('no_violation', 'minor', 'major', 'unclear')),
  tier2_report TEXT, -- JSON blob
  tier2_screenshot_ids TEXT, -- JSON array

  -- Tier 3 (Claude Sonnet)
  tier3_decision TEXT CHECK(tier3_decision IN ('no_violation', 'minor', 'major')),
  tier3_reasoning TEXT,
  tier3_confidence REAL CHECK(tier3_confidence BETWEEN 0 AND 1),
  tier3_flags_human INTEGER DEFAULT 0,

  -- Final outcome
  final_decision TEXT CHECK(final_decision IN ('no_violation', 'minor', 'major')),
  cost_usd REAL DEFAULT 0.0
);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_plagiarism_cases_status
ON plagiarism_cases(status, created_at DESC);

-- Index for creator lookups
CREATE INDEX IF NOT EXISTS idx_plagiarism_cases_creator
ON plagiarism_cases(alleged_creator);

-- Creator violation history
CREATE TABLE IF NOT EXISTS creator_violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id TEXT NOT NULL,
  case_id TEXT NOT NULL REFERENCES plagiarism_cases(id),
  violation_type TEXT NOT NULL CHECK(violation_type IN ('minor', 'major')),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_creator_violations_creator
ON creator_violations(creator_id, created_at DESC);

-- Queue processing tracking (for observability)
CREATE TABLE IF NOT EXISTS plagiarism_queue_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL REFERENCES plagiarism_cases(id),
  tier INTEGER NOT NULL CHECK(tier IN (1, 2, 3)),
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  processing_time_ms INTEGER,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_queue_metrics_case
ON plagiarism_queue_metrics(case_id);
