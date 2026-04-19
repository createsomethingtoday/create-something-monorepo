-- Abundance Network: inbound jobs intake
-- Monday-ready operator intake table for agent-farmed jobs.

CREATE TABLE IF NOT EXISTS inbound_jobs (
    id TEXT PRIMARY KEY,
    source_agent TEXT NOT NULL,
    source_agents TEXT NOT NULL,      -- JSON array of agent identifiers that surfaced this job
    source_run_id TEXT,
    source_system TEXT,
    external_job_id TEXT,
    job_url TEXT,
    employer TEXT,
    location TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
        'new',
        'reviewing',
        'qualified',
        'rejected',
        'archived'
    )),
    dedupe_key TEXT NOT NULL UNIQUE,
    raw_payload TEXT NOT NULL,
    notes TEXT,
    seen_count INTEGER NOT NULL DEFAULT 1,
    ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inbound_jobs_status ON inbound_jobs(status);
CREATE INDEX IF NOT EXISTS idx_inbound_jobs_source_agent ON inbound_jobs(source_agent);
CREATE INDEX IF NOT EXISTS idx_inbound_jobs_ingested_at ON inbound_jobs(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_jobs_last_seen_at ON inbound_jobs(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_jobs_employer ON inbound_jobs(employer);

CREATE TRIGGER IF NOT EXISTS inbound_jobs_updated_at
AFTER UPDATE ON inbound_jobs
BEGIN
    UPDATE inbound_jobs SET updated_at = datetime('now') WHERE id = NEW.id;
END;
