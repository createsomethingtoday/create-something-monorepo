CREATE TABLE IF NOT EXISTS indeed_staffing_jobs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  reference_number TEXT NOT NULL,
  requisition_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  source_name TEXT,
  url TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  postal_code TEXT,
  street_address TEXT,
  description_html TEXT NOT NULL,
  employment_type TEXT,
  email TEXT,
  job_meta TEXT,
  phone_config TEXT NOT NULL DEFAULT 'optional',
  coverletter_config TEXT NOT NULL DEFAULT 'optional',
  resume_config TEXT NOT NULL DEFAULT 'required',
  name_config TEXT NOT NULL DEFAULT 'firstlastname',
  questions_json TEXT,
  resume_fields_required_json TEXT,
  resume_fields_optional_json TEXT,
  metadata_json TEXT,
  published_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS indeed_staffing_jobs_account_reference_idx
  ON indeed_staffing_jobs(account_id, reference_number);

CREATE INDEX IF NOT EXISTS indeed_staffing_jobs_account_status_idx
  ON indeed_staffing_jobs(account_id, status);

CREATE TABLE IF NOT EXISTS indeed_staffing_applications (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  indeed_apply_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  applicant_full_name TEXT,
  applicant_first_name TEXT,
  applicant_last_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  applicant_location_json TEXT,
  applicant_json TEXT NOT NULL,
  analytics_json TEXT,
  answers_json TEXT,
  raw_payload_json TEXT NOT NULL,
  resume_artifact_ref TEXT,
  resume_sha256 TEXT,
  disposition_status TEXT,
  disposition_notes TEXT,
  disposition_recorded_at TEXT,
  disposition_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (job_id) REFERENCES indeed_staffing_jobs(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS indeed_staffing_applications_account_apply_id_idx
  ON indeed_staffing_applications(account_id, indeed_apply_id);

CREATE INDEX IF NOT EXISTS indeed_staffing_applications_account_job_idx
  ON indeed_staffing_applications(account_id, job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS indeed_staffing_applications_account_email_idx
  ON indeed_staffing_applications(account_id, applicant_email, created_at DESC);

CREATE TABLE IF NOT EXISTS indeed_staffing_webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  application_id TEXT,
  job_id TEXT,
  indeed_apply_id TEXT,
  signature_verified INTEGER NOT NULL DEFAULT 0,
  signature_reason TEXT,
  duplicate INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS indeed_staffing_webhook_events_account_created_idx
  ON indeed_staffing_webhook_events(account_id, created_at DESC);
