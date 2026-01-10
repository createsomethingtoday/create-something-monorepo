-- Cleanup Unused Plagiarism Detection Schema
-- Removes tables and columns that were created but never implemented
--
-- This migration addresses technical debt identified in the Heideggerian code review.
-- Elements removed:
-- 1. tier3_flags_human column - no code uses this
-- 2. creator_violations table - good idea but unimplemented (can re-add in Phase 2)
-- 3. plagiarism_queue_metrics table - created but never written to

-- Drop unused tables
DROP TABLE IF EXISTS creator_violations;
DROP TABLE IF EXISTS plagiarism_queue_metrics;

-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
-- Create new table without tier3_flags_human
CREATE TABLE plagiarism_cases_new (
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

  -- Final outcome
  final_decision TEXT CHECK(final_decision IN ('no_violation', 'minor', 'major')),
  cost_usd REAL DEFAULT 0.0
);

-- Copy data from old table (excluding tier3_flags_human)
INSERT INTO plagiarism_cases_new
SELECT
  id, airtable_record_id, reporter_email, original_url, alleged_copy_url,
  complaint_text, alleged_creator, status, created_at, completed_at,
  tier1_decision, tier1_reasoning,
  tier2_decision, tier2_report, tier2_screenshot_ids,
  tier3_decision, tier3_reasoning, tier3_confidence,
  final_decision, cost_usd
FROM plagiarism_cases;

-- Drop old table
DROP TABLE plagiarism_cases;

-- Rename new table
ALTER TABLE plagiarism_cases_new RENAME TO plagiarism_cases;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_plagiarism_cases_status
ON plagiarism_cases(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plagiarism_cases_creator
ON plagiarism_cases(alleged_creator);
