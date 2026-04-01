CREATE TABLE IF NOT EXISTS staffing_jobs (
    id TEXT PRIMARY KEY,
    employer_id TEXT NOT NULL,
    employer_name TEXT,
    title TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    country TEXT NOT NULL,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    description TEXT NOT NULL,
    apply_url TEXT,
    requirements TEXT,
    specialty TEXT,
    discipline TEXT,
    shift TEXT,
    compensation_min INTEGER,
    compensation_max INTEGER,
    compensation_currency TEXT,
    starts_on TEXT,
    source TEXT NOT NULL DEFAULT 'ziprecruiter',
    partner_attributes_json TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS staffing_candidates (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'ziprecruiter',
    external_candidate_id TEXT,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    nurse_specialties_json TEXT,
    license_summary_json TEXT,
    profile_json TEXT,
    latest_resume_sha256 TEXT,
    latest_resume_artifact_ref TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS staffing_applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES staffing_jobs(id),
    candidate_id TEXT NOT NULL REFERENCES staffing_candidates(id),
    source TEXT NOT NULL DEFAULT 'ziprecruiter',
    external_application_id TEXT,
    ziprecruiter_response_id TEXT UNIQUE,
    zr_application_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'received',
    status_name TEXT,
    status_group TEXT,
    rejection_reason TEXT,
    answers_json TEXT,
    attributes_json TEXT,
    profile_json TEXT,
    additional_data_json TEXT,
    resume_sha256 TEXT,
    resume_artifact_ref TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    last_event_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS ziprecruiter_job_links (
    job_id TEXT PRIMARY KEY REFERENCES staffing_jobs(id),
    ziprecruiter_job_id TEXT NOT NULL UNIQUE,
    employer_id TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'synced',
    last_payload_hash TEXT,
    questions_json TEXT,
    last_synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS ziprecruiter_apply_events (
    id TEXT PRIMARY KEY,
    ziprecruiter_response_id TEXT NOT NULL UNIQUE,
    ziprecruiter_job_id TEXT NOT NULL,
    raw_payload TEXT NOT NULL,
    signature_verified INTEGER NOT NULL DEFAULT 0,
    signature_version TEXT,
    signature_timestamp TEXT,
    processed_status TEXT NOT NULL,
    processing_error TEXT,
    candidate_id TEXT REFERENCES staffing_candidates(id),
    application_id TEXT REFERENCES staffing_applications(id),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS ziprecruiter_hiring_signal_log (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES staffing_applications(id),
    zr_application_id TEXT NOT NULL,
    event TEXT NOT NULL,
    request_body TEXT NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    success INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    attempted_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_staffing_jobs_status ON staffing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_staffing_jobs_specialty ON staffing_jobs(specialty);
CREATE INDEX IF NOT EXISTS idx_staffing_candidates_email ON staffing_candidates(email);
CREATE INDEX IF NOT EXISTS idx_staffing_candidates_phone ON staffing_candidates(phone);
CREATE INDEX IF NOT EXISTS idx_staffing_applications_job ON staffing_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_staffing_applications_candidate ON staffing_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_staffing_applications_status ON staffing_applications(status);
CREATE INDEX IF NOT EXISTS idx_staffing_applications_zr_application_id ON staffing_applications(zr_application_id);
CREATE INDEX IF NOT EXISTS idx_ziprecruiter_apply_events_created_at ON ziprecruiter_apply_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ziprecruiter_hiring_signal_log_attempted_at ON ziprecruiter_hiring_signal_log(attempted_at);

CREATE TRIGGER IF NOT EXISTS staffing_jobs_updated_at
AFTER UPDATE ON staffing_jobs
BEGIN
    UPDATE staffing_jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS staffing_candidates_updated_at
AFTER UPDATE ON staffing_candidates
BEGIN
    UPDATE staffing_candidates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS staffing_applications_updated_at
AFTER UPDATE ON staffing_applications
BEGIN
    UPDATE staffing_applications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS ziprecruiter_job_links_updated_at
AFTER UPDATE ON ziprecruiter_job_links
BEGIN
    UPDATE ziprecruiter_job_links SET updated_at = CURRENT_TIMESTAMP WHERE job_id = NEW.job_id;
END;
