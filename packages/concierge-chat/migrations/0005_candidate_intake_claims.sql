CREATE TABLE IF NOT EXISTS candidate_intake_claims (
	id TEXT PRIMARY KEY,
	source TEXT NOT NULL,
	applicant_email TEXT,
	applicant_phone TEXT,
	local_job_id TEXT,
	indeed_apply_id TEXT NOT NULL,
	thread_seed_json TEXT NOT NULL,
	claim_token_hash TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	claimed_at TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_intake_claims_token_hash
	ON candidate_intake_claims (claim_token_hash);

CREATE INDEX IF NOT EXISTS idx_candidate_intake_claims_apply_id
	ON candidate_intake_claims (source, indeed_apply_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidate_intake_claims_expires
	ON candidate_intake_claims (expires_at);
