CREATE TABLE IF NOT EXISTS thread_attachments (
	id TEXT PRIMARY KEY,
	session_id TEXT NOT NULL,
	thread_id TEXT NOT NULL,
	artifact_id TEXT NOT NULL,
	document_key TEXT,
	title TEXT NOT NULL,
	file_name TEXT,
	content_type TEXT,
	byte_size INTEGER,
	storage_key TEXT,
	href TEXT,
	status TEXT NOT NULL,
	source TEXT NOT NULL,
	summary TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_thread_attachments_thread_created
	ON thread_attachments (thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_thread_attachments_thread_document
	ON thread_attachments (session_id, thread_id, document_key);
