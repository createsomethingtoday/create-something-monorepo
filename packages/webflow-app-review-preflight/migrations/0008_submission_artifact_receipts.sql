PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS review_artifact_sets (
  id TEXT PRIMARY KEY,
  review_version_id TEXT NOT NULL REFERENCES review_versions(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  artifact_set_sha256 TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  scan_status TEXT NOT NULL CHECK(scan_status IN ('passed')),
  review_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(review_version_id, sequence),
  UNIQUE(review_version_id, artifact_set_sha256)
);

CREATE INDEX IF NOT EXISTS idx_review_artifact_sets_version_sequence
  ON review_artifact_sets(review_version_id, sequence DESC);

CREATE TABLE IF NOT EXISTS review_version_artifacts (
  id TEXT PRIMARY KEY,
  artifact_set_id TEXT NOT NULL REFERENCES review_artifact_sets(id) ON DELETE CASCADE,
  review_version_id TEXT NOT NULL REFERENCES review_versions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('bundle', 'source_maps')),
  file_name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  object_key TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(artifact_set_id, kind),
  UNIQUE(artifact_set_id, sha256)
);

CREATE INDEX IF NOT EXISTS idx_review_version_artifacts_version
  ON review_version_artifacts(review_version_id, kind);

CREATE TABLE IF NOT EXISTS artifact_receipts (
  id TEXT PRIMARY KEY,
  artifact_set_id TEXT NOT NULL UNIQUE REFERENCES review_artifact_sets(id) ON DELETE CASCADE,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  review_version_id TEXT NOT NULL REFERENCES review_versions(id) ON DELETE CASCADE,
  artifact_set_sequence INTEGER NOT NULL,
  artifact_set_sha256 TEXT NOT NULL,
  bundle_sha256 TEXT NOT NULL,
  source_map_artifact_sha256 TEXT,
  policy_version TEXT NOT NULL,
  scan_status TEXT NOT NULL CHECK(scan_status IN ('passed')),
  reconciliation_status TEXT NOT NULL DEFAULT 'not_checked'
    CHECK(reconciliation_status IN ('not_checked', 'matched', 'mismatch')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artifact_receipts_review_version
  ON artifact_receipts(review_version_id, created_at DESC);

CREATE TABLE IF NOT EXISTS submission_artifact_reconciliations (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  receipt_id TEXT REFERENCES artifact_receipts(id) ON DELETE SET NULL,
  status TEXT NOT NULL
    CHECK(status IN ('receipt_not_provided', 'receipt_not_found', 'matched', 'mismatch')),
  receipt_valid INTEGER CHECK(receipt_valid IN (0, 1) OR receipt_valid IS NULL),
  bundle_sha256 TEXT NOT NULL,
  source_map_artifact_sha256 TEXT,
  mismatches_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submission_reconciliations_submission
  ON submission_artifact_reconciliations(submission_id, created_at DESC);
