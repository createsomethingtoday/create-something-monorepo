-- Migration: Rescan Tracking for Plagiarism Compliance
-- Allows tracking drift when creators make changes after being flagged

-- Add original signature storage to cases
-- This captures the MinHash of the alleged copy at time of report
ALTER TABLE plagiarism_cases ADD COLUMN original_copy_signature TEXT;
ALTER TABLE plagiarism_cases ADD COLUMN original_similarity REAL;

-- Rescan history tracks each compliance check
CREATE TABLE IF NOT EXISTS plagiarism_rescans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL,
  
  -- Drift from original (how much they changed)
  drift_from_original REAL NOT NULL,
  
  -- Current similarity to the victim template
  current_similarity REAL NOT NULL,
  
  -- Previous similarity (from last scan or original)
  previous_similarity REAL NOT NULL,
  
  -- Verdict based on thresholds
  verdict TEXT NOT NULL, -- 'resolved', 'insufficient_changes', 'still_similar'
  
  -- Detailed metrics JSON
  metrics_json TEXT,
  
  -- Timestamps
  scanned_at INTEGER NOT NULL,
  
  FOREIGN KEY (case_id) REFERENCES plagiarism_cases(id)
);

CREATE INDEX IF NOT EXISTS idx_plagiarism_rescans_case ON plagiarism_rescans(case_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_rescans_verdict ON plagiarism_rescans(verdict);
