CREATE TABLE IF NOT EXISTS abundance_travel_reports (
 id TEXT PRIMARY KEY,
 source_run_id TEXT NOT NULL,
 cache_key TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL,
 report_json TEXT NOT NULL CHECK(json_valid(report_json))
);
CREATE INDEX IF NOT EXISTS idx_abundance_travel_reports_cache ON abundance_travel_reports(cache_key,created_at_ms);
