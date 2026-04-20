-- Abundance public listing enrichment
--
-- Adds first-class structured fields for public job listings so travel nurse
-- and other public-board imports can be filtered, surfaced in MCP, and handed
-- off without reparsing raw payloads.

ALTER TABLE inbound_jobs ADD COLUMN category TEXT;
ALTER TABLE inbound_jobs ADD COLUMN specialty TEXT;
ALTER TABLE inbound_jobs ADD COLUMN facility_name TEXT;
ALTER TABLE inbound_jobs ADD COLUMN employment_type TEXT;
ALTER TABLE inbound_jobs ADD COLUMN pay_min REAL;
ALTER TABLE inbound_jobs ADD COLUMN pay_max REAL;
ALTER TABLE inbound_jobs ADD COLUMN pay_period TEXT;
ALTER TABLE inbound_jobs ADD COLUMN shift TEXT;
ALTER TABLE inbound_jobs ADD COLUMN duration_weeks INTEGER;
ALTER TABLE inbound_jobs ADD COLUMN start_date TEXT;
ALTER TABLE inbound_jobs ADD COLUMN openings INTEGER;
ALTER TABLE inbound_jobs ADD COLUMN source_posted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_inbound_jobs_specialty
  ON inbound_jobs(specialty);

CREATE INDEX IF NOT EXISTS idx_inbound_jobs_start_date
  ON inbound_jobs(start_date);

CREATE INDEX IF NOT EXISTS idx_inbound_jobs_source_posted_at
  ON inbound_jobs(source_posted_at DESC);
