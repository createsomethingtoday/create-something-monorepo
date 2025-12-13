-- Assessment responses for Subtractive Triad Assessment
-- Tracks user responses and recommendations for analytics and follow-up

CREATE TABLE IF NOT EXISTS assessment_responses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL,

  -- Q1: What's accumulating? (JSON array of option IDs)
  accumulating JSON,

  -- Q2: What would you remove? (free text, ~200 chars)
  removal_insight TEXT,

  -- Q3: What's stopping you? (JSON array of option IDs)
  blockers JSON,

  -- Derived recommendations
  recommended_service TEXT,
  recommended_case_study TEXT,
  triad_level TEXT,  -- 'implementation' | 'artifact' | 'system'

  -- Timing analytics (milliseconds)
  time_on_q1_ms INTEGER,
  time_on_q2_ms INTEGER,
  time_on_q3_ms INTEGER,
  total_time_ms INTEGER,

  -- Timestamps
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,

  -- Conversion tracking
  converted_to_contact INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_assessment_responses_session
  ON assessment_responses(session_id);

CREATE INDEX IF NOT EXISTS idx_assessment_responses_service
  ON assessment_responses(recommended_service);

CREATE INDEX IF NOT EXISTS idx_assessment_responses_converted
  ON assessment_responses(converted_to_contact);

CREATE INDEX IF NOT EXISTS idx_assessment_responses_completed
  ON assessment_responses(completed_at);

-- Link assessments to contact submissions
ALTER TABLE contact_submissions ADD COLUMN assessment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_contact_submissions_assessment
  ON contact_submissions(assessment_id);
