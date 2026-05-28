-- Abundance public jobs ingestion contract.
--
-- The Dify-facing Jobs MCP remains the serving/funnel surface. These tables
-- make upstream job collection auditable across providers without binding the
-- product contract to Bright Data, RapidAPI, or any single scraper.

CREATE TABLE IF NOT EXISTS abundance_public_jobs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_url TEXT,
  external_job_id TEXT NOT NULL,
  raw_payload_hash TEXT NOT NULL,

  title TEXT NOT NULL,
  employer TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  location_text TEXT,
  specialty TEXT,
  discipline TEXT,
  employment_type TEXT,
  shift TEXT,
  duration TEXT,
  start_date TEXT,
  pay_min INTEGER,
  pay_max INTEGER,
  pay_text TEXT,
  currency TEXT DEFAULT 'USD',
  openings INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired', 'unknown')),
  application_url TEXT,
  posted_at TEXT,

  last_seen_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  normalized_at TEXT NOT NULL,
  provider_snapshot_id TEXT,
  raw_payload_json TEXT NOT NULL CHECK (json_valid(raw_payload_json)),
  raw_payload_expires_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(provider, source_system, external_job_id)
);

CREATE INDEX IF NOT EXISTS idx_abundance_public_jobs_status_seen
  ON abundance_public_jobs(status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_abundance_public_jobs_source
  ON abundance_public_jobs(provider, source_system, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_abundance_public_jobs_location
  ON abundance_public_jobs(state, city, status);

CREATE INDEX IF NOT EXISTS idx_abundance_public_jobs_specialty
  ON abundance_public_jobs(specialty, status, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS abundance_public_job_ingestion_runs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  source_system TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'snapshot_pending', 'succeeded', 'failed')),
  provider_snapshot_id TEXT,
  requested_filters_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(requested_filters_json)),
  result_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_abundance_job_runs_provider_status
  ON abundance_public_job_ingestion_runs(provider, status, started_at DESC);

CREATE TRIGGER IF NOT EXISTS abundance_public_jobs_updated_at
AFTER UPDATE ON abundance_public_jobs
BEGIN
  UPDATE abundance_public_jobs SET updated_at = datetime('now') WHERE id = NEW.id;
END;
