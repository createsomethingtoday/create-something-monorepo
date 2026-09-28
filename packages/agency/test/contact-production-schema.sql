-- Schema-only fixture from coordinator primary D1 preflight, 2026-09-28.
-- No production records. Preserve integer identity and legacy defaults.
CREATE TABLE contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  responded_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  assessment_id TEXT,
  service TEXT,
  company TEXT
);
