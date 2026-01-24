-- Webinar Registrations Table
-- Tracks registrations for CREATE SOMETHING workshops
-- Supports segmentation by experience level and survey responses

CREATE TABLE IF NOT EXISTS webinar_registrations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  experience_level TEXT,  -- beginner, intermediate, builder
  webinar_slug TEXT NOT NULL,
  registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  attended INTEGER DEFAULT 0,
  survey_response TEXT,  -- JSON for flexibility
  drip_stage TEXT DEFAULT 'registered',  -- registered, warmup_sent, reminder_sent, attended, follow_up_sent
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for looking up registrations by email and webinar
CREATE INDEX IF NOT EXISTS idx_webinar_registrations_email_slug
  ON webinar_registrations(email, webinar_slug);

-- Index for finding registrations by webinar
CREATE INDEX IF NOT EXISTS idx_webinar_registrations_slug
  ON webinar_registrations(webinar_slug);

-- Index for drip campaign processing
CREATE INDEX IF NOT EXISTS idx_webinar_registrations_drip_stage
  ON webinar_registrations(drip_stage, webinar_slug);

-- Survey Responses Table (for anonymous/standalone responses)
-- Used when we don't have an email to link to a registration
CREATE TABLE IF NOT EXISTS webinar_survey_responses (
  id TEXT PRIMARY KEY,
  webinar_slug TEXT NOT NULL,
  track TEXT NOT NULL,  -- cloudflare, agentic, systems, workway
  feedback TEXT,
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for analyzing survey responses by webinar and track
CREATE INDEX IF NOT EXISTS idx_webinar_survey_responses_slug_track
  ON webinar_survey_responses(webinar_slug, track);
