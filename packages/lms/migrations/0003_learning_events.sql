-- Learning Events Schema
-- Cross-property activity tracking
--
-- Philosophy: Action across the system contributes to understanding.
-- Reading a paper (.io), completing an exercise (.space), applying a principle (.ltd),
-- delivering a project (.agency)—all deepen the hermeneutic spiral.

-- ─────────────────────────────────────────────────────────────────────────────
-- Learning Events
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  property TEXT NOT NULL CHECK (property IN ('io', 'space', 'ltd', 'agency')),
  event_type TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_learning_events_learner ON learning_events(learner_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_property ON learning_events(property);
CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at);

-- Event Type Examples:
-- io: paper_started, paper_completed, paper_reflected
-- space: experiment_started, experiment_completed, challenge_submitted
-- ltd: canon_reviewed, principle_adopted
-- agency: methodology_applied, project_completed
