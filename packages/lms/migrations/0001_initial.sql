-- CREATE SOMETHING LMS Schema
-- Progress tracking for hermeneutic learning
--
-- Philosophy: Learning recedes into practice.
-- The learner's journey is not linear but spiral—each return deepens understanding.

-- ─────────────────────────────────────────────────────────────────────────────
-- Learners
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learners (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_learners_email ON learners(email);

-- ─────────────────────────────────────────────────────────────────────────────
-- Path Progress
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS path_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  path_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at INTEGER,
  completed_at INTEGER,
  current_lesson TEXT,
  UNIQUE(learner_id, path_id)
);

CREATE INDEX IF NOT EXISTS idx_path_progress_learner ON path_progress(learner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Lesson Progress
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  path_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at INTEGER,
  completed_at INTEGER,
  time_spent INTEGER DEFAULT 0,  -- Seconds spent on lesson
  visits INTEGER DEFAULT 0,      -- Number of times visited (hermeneutic spiral)
  UNIQUE(learner_id, path_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_learner ON lesson_progress(learner_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_path ON lesson_progress(path_id, lesson_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Praxis Attempts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS praxis_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  praxis_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'submitted', 'passed', 'failed')),
  submission TEXT,            -- JSON of the submission
  feedback TEXT,              -- AI-generated feedback
  score REAL,                 -- 0.0 to 1.0
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  submitted_at INTEGER,
  metadata TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_praxis_learner ON praxis_attempts(learner_id, praxis_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Reflections (Learner insights)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reflections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  path_id TEXT,
  lesson_id TEXT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_reflections_learner ON reflections(learner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Understanding Snapshots
-- Track the hermeneutic spiral—how understanding deepens over time
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS understanding_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  path_id TEXT NOT NULL,
  understanding_level REAL NOT NULL,  -- 0.0 to 1.0
  assessed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('self', 'praxis', 'reflection')),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_understanding_learner ON understanding_snapshots(learner_id, path_id);
