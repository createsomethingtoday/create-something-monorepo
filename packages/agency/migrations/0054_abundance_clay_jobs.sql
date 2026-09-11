CREATE TABLE IF NOT EXISTS abundance_clay_jobs (
 id TEXT PRIMARY KEY,
 cache_key TEXT NOT NULL,
 npi TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','delivery_unknown','review_required','no_match','ambiguous')),
 callback_hash TEXT NOT NULL,
 source_run_id TEXT NOT NULL,
 source_payload_hash TEXT NOT NULL,
 result_json TEXT,
 created_at TEXT NOT NULL,
 completed_at TEXT,
 UNIQUE(cache_key)
);
CREATE INDEX IF NOT EXISTS idx_abundance_clay_created ON abundance_clay_jobs(created_at);
