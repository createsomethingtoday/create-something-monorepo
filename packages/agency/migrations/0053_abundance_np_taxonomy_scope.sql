-- Scope the same official archive independently for legacy primary FNP and all NP membership.
ALTER TABLE abundance_healthcare_nationwide_runs ADD COLUMN taxonomy_scope TEXT NOT NULL DEFAULT 'primary_family_np'
  CHECK (taxonomy_scope IN ('primary_family_np','all_np_taxonomies'));
DROP INDEX idx_abundance_healthcare_nationwide_source_file;
CREATE UNIQUE INDEX idx_abundance_healthcare_nationwide_source_scope
  ON abundance_healthcare_nationwide_runs(source_file,taxonomy_scope) WHERE status='succeeded';
CREATE TABLE abundance_healthcare_scoped_source_receipts (
  source_file TEXT NOT NULL,
  taxonomy_scope TEXT NOT NULL CHECK (taxonomy_scope IN ('primary_family_np','all_np_taxonomies')),
  source_kind TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_published_at TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  run_id TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  processed_row_count INTEGER NOT NULL,
  provider_count INTEGER NOT NULL,
  PRIMARY KEY(source_file,taxonomy_scope)
);
INSERT INTO abundance_healthcare_scoped_source_receipts
 SELECT source_file,'primary_family_np',source_kind,source_url,source_published_at,source_sha256,run_id,applied_at,processed_row_count,provider_count
 FROM abundance_healthcare_nationwide_source_receipts;
-- Keep the original receipt ledger for rollback and audit.
CREATE INDEX idx_abundance_healthcare_scoped_receipts_applied ON abundance_healthcare_scoped_source_receipts(applied_at DESC);
