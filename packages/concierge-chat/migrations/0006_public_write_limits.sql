CREATE TABLE IF NOT EXISTS public_write_usage_buckets (
	bucket_key TEXT PRIMARY KEY,
	scope TEXT NOT NULL,
	subject_key TEXT NOT NULL,
	window_start_ms INTEGER NOT NULL,
	expires_at TEXT NOT NULL,
	hit_count INTEGER NOT NULL DEFAULT 0,
	byte_count INTEGER NOT NULL DEFAULT 0,
	updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_write_usage_expires
	ON public_write_usage_buckets (expires_at);

CREATE INDEX IF NOT EXISTS idx_public_write_usage_scope_subject_window
	ON public_write_usage_buckets (scope, subject_key, window_start_ms DESC);
