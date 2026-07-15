PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companion_runs (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  review_version_id TEXT NOT NULL REFERENCES review_versions(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK(actor_role IN ('developer', 'reviewer')),
  evidence_trust TEXT NOT NULL CHECK(evidence_trust IN ('partner_supplied', 'webflow_observed')),
  policy_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('preparing', 'ready', 'running', 'blocked', 'failed', 'validated')),
  replay_of_run_id TEXT REFERENCES companion_runs(id),
  run_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_companion_runs_review_created
  ON companion_runs(review_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_companion_runs_version_created
  ON companion_runs(review_version_id, created_at DESC);

CREATE TABLE IF NOT EXISTS companion_mission_receipts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES companion_runs(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL CHECK(mission_id IN ('install_authorize', 'configure', 'publish', 'production_runtime', 'uninstall_cleanup')),
  status TEXT NOT NULL CHECK(status IN ('passed', 'failed', 'blocked', 'not_applicable')),
  evidence_trust TEXT NOT NULL CHECK(evidence_trust IN ('partner_supplied', 'webflow_observed', 'human_verified')),
  evidence_digest TEXT NOT NULL,
  event_count INTEGER NOT NULL CHECK(event_count > 0),
  artifact_count INTEGER NOT NULL CHECK(artifact_count >= 0),
  manifest_json TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(run_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_companion_mission_receipts_run
  ON companion_mission_receipts(run_id, mission_id);

CREATE TABLE IF NOT EXISTS companion_evidence_artifacts (
  id TEXT PRIMARY KEY,
  mission_receipt_id TEXT NOT NULL REFERENCES companion_mission_receipts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK(bytes >= 0),
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_companion_evidence_artifacts_receipt
  ON companion_evidence_artifacts(mission_receipt_id, created_at ASC);
