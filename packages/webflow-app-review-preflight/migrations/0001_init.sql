PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  site_id TEXT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  latest_version_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_reviews_owner_updated
  ON reviews(owner_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS review_versions (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  artifact_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  compressed_bytes INTEGER NOT NULL,
  policy_ruleset_version TEXT NOT NULL,
  policy_config_version TEXT NOT NULL,
  review_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(review_id, sequence),
  UNIQUE(review_id, artifact_sha256)
);

CREATE INDEX IF NOT EXISTS idx_review_versions_review_sequence
  ON review_versions(review_id, sequence DESC);

CREATE TABLE IF NOT EXISTS review_findings (
  id TEXT PRIMARY KEY,
  review_version_id TEXT NOT NULL REFERENCES review_versions(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence TEXT NOT NULL,
  finding_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_findings_rule
  ON review_findings(rule_id, created_at DESC);

CREATE TABLE IF NOT EXISTS runtime_jobs (
  id TEXT PRIMARY KEY,
  review_version_id TEXT NOT NULL REFERENCES review_versions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('proposed', 'approved', 'running', 'complete', 'partial', 'failed')),
  approved_by_user_id TEXT,
  approved_at TEXT,
  job_json TEXT NOT NULL,
  evidence_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pattern_candidates (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft', 'approved', 'rejected', 'handed_off')),
  anonymized_evidence_json TEXT NOT NULL,
  proposal_json TEXT NOT NULL,
  approved_by_user_id TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_events (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  review_version_id TEXT,
  actor_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_events_review_created
  ON review_events(review_id, created_at ASC);
