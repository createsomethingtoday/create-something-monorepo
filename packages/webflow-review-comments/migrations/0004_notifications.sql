-- Outbox for the "feedback is ready" email. A row is written in the same
-- transaction that releases drafts, and the email is sent after it. A failed
-- send stays here and is retried on the next release call for the version, so
-- a released round never loses its email. `payload` holds the recipient until
-- the send succeeds or the retry window ends, then it is cleared. `claimed_at`
-- is a short lease, so two release calls at the same moment send once.
CREATE TABLE IF NOT EXISTS review_notifications (
	id TEXT PRIMARY KEY,
	version_ref TEXT NOT NULL,
	asset_ref TEXT NOT NULL,
	payload TEXT NOT NULL,
	created_at TEXT NOT NULL,
	sent_at TEXT,
	claimed_at TEXT,
	workflow_run_id TEXT,
	attempts INTEGER NOT NULL DEFAULT 0,
	last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_review_notifications_version ON review_notifications (version_ref, sent_at);
