-- Module Enrollment Tracking
-- Tracks which modules learners have enabled/disabled
-- Follows the plugin catalog pattern: modules as installable learning units

CREATE TABLE IF NOT EXISTS module_enrollment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  module_slug TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,        -- 1 = enabled, 0 = disabled
  enrolled_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_accessed_at INTEGER,
  progress_percentage REAL DEFAULT 0, -- 0-100
  metadata TEXT DEFAULT '{}'         -- JSON for future extensibility
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_module_enrollment_unique
  ON module_enrollment(learner_id, module_slug);

CREATE INDEX IF NOT EXISTS idx_module_enrollment_learner
  ON module_enrollment(learner_id);

CREATE INDEX IF NOT EXISTS idx_module_enrollment_module
  ON module_enrollment(module_slug);
