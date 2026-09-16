-- Nationwide NPPES Family Nurse Practitioner snapshots.
-- Readers only select succeeded runs. A running or failed replacement therefore
-- cannot partially replace the last complete national snapshot.

CREATE TABLE IF NOT EXISTS abundance_healthcare_nationwide_runs (
  id TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('monthly_full', 'weekly_incremental')),
  source_file TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_published_at TEXT,
  source_sha256 TEXT,
  base_run_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  processed_row_count INTEGER NOT NULL DEFAULT 0,
  included_count INTEGER NOT NULL DEFAULT 0,
  removed_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  provider_count INTEGER,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (base_run_id) REFERENCES abundance_healthcare_nationwide_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_abundance_healthcare_nationwide_runs_current
  ON abundance_healthcare_nationwide_runs (status, finished_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_abundance_healthcare_nationwide_source_file
  ON abundance_healthcare_nationwide_runs (source_file)
  WHERE status = 'succeeded';

CREATE TABLE IF NOT EXISTS abundance_healthcare_nationwide_memberships (
  run_id TEXT NOT NULL,
  provider_npi TEXT NOT NULL,
  provider_snapshot_json TEXT NOT NULL CHECK (json_valid(provider_snapshot_json)),
  practice_state TEXT,
  practice_city TEXT,
  last_updated_date TEXT,
  provider_status TEXT NOT NULL,
  primary_taxonomy_code TEXT,
  practice_has_location INTEGER NOT NULL DEFAULT 0 CHECK (practice_has_location IN (0, 1)),
  practice_has_phone INTEGER NOT NULL DEFAULT 0 CHECK (practice_has_phone IN (0, 1)),
  license_has_fields INTEGER NOT NULL DEFAULT 0 CHECK (license_has_fields IN (0, 1)),
  endpoint_count INTEGER NOT NULL DEFAULT 0,
  name_search TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (run_id, provider_npi),
  FOREIGN KEY (run_id) REFERENCES abundance_healthcare_nationwide_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_abundance_healthcare_nationwide_market
  ON abundance_healthcare_nationwide_memberships (run_id, practice_state, practice_city);

CREATE INDEX IF NOT EXISTS idx_abundance_healthcare_nationwide_updated
  ON abundance_healthcare_nationwide_memberships (run_id, last_updated_date DESC);

-- Lightweight permanent ingestion ledger. Materialized snapshots can be pruned
-- without making an already-applied weekly file appear pending again.
CREATE TABLE IF NOT EXISTS abundance_healthcare_nationwide_source_receipts (
  source_file TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('monthly_full', 'weekly_incremental')),
  source_url TEXT NOT NULL,
  source_published_at TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  run_id TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  processed_row_count INTEGER NOT NULL,
  provider_count INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_abundance_healthcare_source_receipts_applied
  ON abundance_healthcare_nationwide_source_receipts (applied_at DESC);
