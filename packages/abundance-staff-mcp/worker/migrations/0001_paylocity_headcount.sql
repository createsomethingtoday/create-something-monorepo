PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS paylocity_import_batches (
  id TEXT PRIMARY KEY,
  source_file_name TEXT NOT NULL,
  source_file_sha256 TEXT NOT NULL UNIQUE,
  source_exported_at TEXT,
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  imported_by TEXT,
  row_count INTEGER NOT NULL,
  column_count INTEGER NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS paylocity_headcount_rows (
  id TEXT PRIMARY KEY,
  import_batch_id TEXT NOT NULL REFERENCES paylocity_import_batches(id) ON DELETE CASCADE,
  source_row_number INTEGER NOT NULL,
  employee_id TEXT NOT NULL,
  employee_status_code TEXT,
  position_code TEXT,
  position_description TEXT,
  department_code TEXT,
  department_description TEXT,
  raw_json TEXT NOT NULL,
  source_row_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (import_batch_id, source_row_number),
  UNIQUE (import_batch_id, employee_id)
);

CREATE TABLE IF NOT EXISTS staff_profiles (
  id TEXT PRIMARY KEY,
  paylocity_employee_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  legal_first_name TEXT,
  legal_middle_name TEXT,
  legal_last_name TEXT,
  role_bucket TEXT,
  role_confidence REAL,
  active_status TEXT NOT NULL DEFAULT 'active' CHECK (active_status IN ('active', 'inactive', 'unknown')),
  source_import_batch_id TEXT REFERENCES paylocity_import_batches(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS staff_employment_records (
  id TEXT PRIMARY KEY,
  staff_profile_id TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  paylocity_headcount_row_id TEXT REFERENCES paylocity_headcount_rows(id) ON DELETE SET NULL,
  source_import_batch_id TEXT REFERENCES paylocity_import_batches(id),
  is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1)),
  company_code TEXT,
  company_name TEXT,
  home_company_code TEXT,
  home_company_name TEXT,
  employee_status_code TEXT,
  employment_type TEXT,
  position_code TEXT,
  position_description TEXT,
  department_code TEXT,
  department_description TEXT,
  program TEXT,
  cost_center1 TEXT,
  cost_center2 TEXT,
  cost_center3 TEXT,
  job_title TEXT,
  eeo_class TEXT,
  hire_date TEXT,
  rehire_date TEXT,
  termination_date TEXT,
  location_description TEXT,
  work_state TEXT,
  supervisor_employee_id TEXT,
  supervisor_name TEXT,
  reviewer_employee_id TEXT,
  reviewer_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS staff_contact_points (
  id TEXT PRIMARY KEY,
  staff_profile_id TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('home_email', 'work_email', 'home_mobile', 'home_phone', 'work_phone', 'supervisor_email', 'reviewer_email', 'other')),
  label TEXT,
  value TEXT NOT NULL,
  redacted_value TEXT,
  normalized_value_hash TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  source_import_batch_id TEXT REFERENCES paylocity_import_batches(id),
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (staff_profile_id, type, value)
);

CREATE TABLE IF NOT EXISTS staff_addresses (
  id TEXT PRIMARY KEY,
  staff_profile_id TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('home', 'work', 'other')),
  line1 TEXT,
  line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  redacted_label TEXT,
  source_import_batch_id TEXT REFERENCES paylocity_import_batches(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (staff_profile_id, type, line1, city, state, postal_code)
);

CREATE TABLE IF NOT EXISTS staff_supervisor_relationships (
  id TEXT PRIMARY KEY,
  staff_profile_id TEXT NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  supervisor_employee_id TEXT,
  supervisor_name TEXT,
  reviewer_employee_id TEXT,
  reviewer_name TEXT,
  source_import_batch_id TEXT REFERENCES paylocity_import_batches(id),
  is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS staff_enrichment_tasks (
  id TEXT PRIMARY KEY,
  staff_profile_id TEXT REFERENCES staff_profiles(id) ON DELETE SET NULL,
  paylocity_employee_id TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('credential_check', 'contact_validation', 'role_classification', 'location_normalization', 'outreach_readiness', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  requested_by TEXT,
  assigned_to TEXT,
  instructions TEXT,
  input_json TEXT,
  result_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS staff_mcp_audit_events (
  id TEXT PRIMARY KEY,
  tool_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('read', 'write')),
  subject_type TEXT,
  subject_id TEXT,
  pii_accessed INTEGER NOT NULL DEFAULT 0 CHECK (pii_accessed IN (0, 1)),
  actor TEXT,
  request_source TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_paylocity_rows_employee_id ON paylocity_headcount_rows(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_role_bucket ON staff_profiles(role_bucket);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active_status ON staff_profiles(active_status);
CREATE INDEX IF NOT EXISTS idx_staff_employment_current ON staff_employment_records(staff_profile_id, is_current);
CREATE INDEX IF NOT EXISTS idx_staff_employment_department ON staff_employment_records(department_description);
CREATE INDEX IF NOT EXISTS idx_staff_employment_location ON staff_employment_records(location_description);
CREATE INDEX IF NOT EXISTS idx_staff_contact_profile_type ON staff_contact_points(staff_profile_id, type);
CREATE INDEX IF NOT EXISTS idx_staff_enrichment_status ON staff_enrichment_tasks(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_staff_mcp_audit_created_at ON staff_mcp_audit_events(created_at);

CREATE VIEW IF NOT EXISTS staff_headcount_current AS
SELECT
  p.id AS staff_profile_id,
  p.paylocity_employee_id,
  p.display_name,
  p.role_bucket,
  p.active_status,
  e.position_code,
  e.position_description,
  e.department_code,
  e.department_description,
  e.program,
  e.cost_center1,
  e.cost_center2,
  e.location_description,
  e.work_state,
  e.employee_status_code,
  e.employment_type,
  e.company_name,
  e.supervisor_name,
  e.hire_date,
  b.source_file_name,
  b.imported_at,
  p.updated_at
FROM staff_profiles p
LEFT JOIN staff_employment_records e
  ON e.staff_profile_id = p.id
  AND e.is_current = 1
LEFT JOIN paylocity_import_batches b
  ON b.id = COALESCE(e.source_import_batch_id, p.source_import_batch_id);

CREATE VIEW IF NOT EXISTS staff_role_summary AS
SELECT
  COALESCE(role_bucket, 'Unclassified') AS role_bucket,
  COALESCE(position_description, 'Unknown') AS position_description,
  COUNT(*) AS staff_count,
  MAX(imported_at) AS latest_imported_at
FROM staff_headcount_current
GROUP BY COALESCE(role_bucket, 'Unclassified'), COALESCE(position_description, 'Unknown')
ORDER BY staff_count DESC, role_bucket ASC, position_description ASC;
