CREATE TABLE portal_sessions (id TEXT PRIMARY KEY, encrypted TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE oauth_attempts (id TEXT PRIMARY KEY, encrypted TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE portal_actions (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, action TEXT NOT NULL, target_id TEXT NOT NULL, arguments_hash TEXT NOT NULL, status TEXT NOT NULL, result_json TEXT, created_at TEXT NOT NULL);
CREATE INDEX portal_actions_owner ON portal_actions(owner_id,created_at);
CREATE UNIQUE INDEX action_target_pending ON portal_actions(owner_id,target_id) WHERE status IN ('pending','unknown');
CREATE TABLE analysis_jobs (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, bundle_id TEXT NOT NULL, bundle_sha256 TEXT NOT NULL, status TEXT NOT NULL, response_id TEXT, container_id TEXT, result_json TEXT, created_at TEXT NOT NULL);
CREATE INDEX analysis_jobs_owner ON analysis_jobs(owner_id,created_at);
CREATE UNIQUE INDEX analysis_one_active ON analysis_jobs(owner_id,bundle_id) WHERE status IN ('starting','queued','in_progress','unknown');
