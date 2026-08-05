PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS runtime_test_packages (
  id TEXT PRIMARY KEY,
  review_version_id TEXT NOT NULL REFERENCES review_versions(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ready', 'expired', 'revoked')),
  trust TEXT NOT NULL CHECK(trust = 'partner_supplied'),
  target_url TEXT NOT NULL,
  target_host TEXT NOT NULL,
  sandbox_installation_id TEXT NOT NULL,
  license_mode TEXT NOT NULL CHECK(license_mode = 'installation_allowlist'),
  license_expires_at TEXT NOT NULL,
  package_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runtime_test_packages_version_created
  ON runtime_test_packages(review_version_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_test_packages_owner_created
  ON runtime_test_packages(owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS runtime_observation_jobs (
  id TEXT PRIMARY KEY,
  test_package_id TEXT NOT NULL REFERENCES runtime_test_packages(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('approved', 'running', 'uploading', 'complete', 'failed', 'expired', 'revoked')),
  capability_sha256 TEXT NOT NULL UNIQUE,
  nonce TEXT NOT NULL UNIQUE,
  contract_json TEXT NOT NULL,
  approved_by_actor TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  evidence_trust TEXT CHECK(evidence_trust IS NULL OR evidence_trust IN ('webflow_observed', 'human_verified')),
  evidence_manifest_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runtime_observation_jobs_package_created
  ON runtime_observation_jobs(test_package_id, created_at DESC);

CREATE TABLE IF NOT EXISTS runtime_observation_artifacts (
  id TEXT PRIMARY KEY,
  observation_job_id TEXT NOT NULL REFERENCES runtime_observation_jobs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK(bytes >= 0),
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(observation_job_id, kind, sha256)
);

CREATE INDEX IF NOT EXISTS idx_runtime_observation_artifacts_job
  ON runtime_observation_artifacts(observation_job_id, created_at ASC);
