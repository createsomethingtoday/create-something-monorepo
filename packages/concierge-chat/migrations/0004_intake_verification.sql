CREATE TABLE IF NOT EXISTS intake_verification_challenges (
	id TEXT PRIMARY KEY,
	purpose TEXT NOT NULL,
	session_id TEXT NOT NULL,
	email TEXT NOT NULL,
	code_hash TEXT NOT NULL,
	delivery_mode TEXT NOT NULL,
	created_at TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	resend_available_at TEXT NOT NULL,
	consumed_at TEXT,
	attempt_count INTEGER NOT NULL DEFAULT 0,
	last_attempt_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_intake_verification_email_created
	ON intake_verification_challenges (purpose, email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intake_verification_session_email
	ON intake_verification_challenges (purpose, session_id, email, created_at DESC);
