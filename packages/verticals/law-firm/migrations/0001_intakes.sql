-- Law Firm Template: Client Intakes Schema
-- Supports WORKWAY Clio integration for client intake to matter workflow

-- Client intake submissions from website contact form
CREATE TABLE IF NOT EXISTS intakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Contact Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Case Details
  practice_area TEXT,           -- 'family-law', 'personal-injury', 'business-law'
  message TEXT,

  -- WORKWAY/Clio Sync Status
  clio_contact_id TEXT,         -- Set after WORKWAY syncs to Clio
  clio_matter_id TEXT,          -- Set after matter is created in Clio

  -- Status Tracking
  status TEXT DEFAULT 'pending', -- pending, synced, converted, archived

  -- Metadata
  source TEXT DEFAULT 'website', -- website, referral, etc.
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for status queries (pending intakes dashboard)
CREATE INDEX IF NOT EXISTS idx_intakes_status ON intakes(status);

-- Index for email lookups (duplicate detection)
CREATE INDEX IF NOT EXISTS idx_intakes_email ON intakes(email);

-- Index for practice area filtering
CREATE INDEX IF NOT EXISTS idx_intakes_practice_area ON intakes(practice_area);


-- Workflow execution logs for WORKWAY integration
CREATE TABLE IF NOT EXISTS workflow_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Reference to intake (optional - some workflows may not be intake-related)
  intake_id INTEGER REFERENCES intakes(id),

  -- Workflow identification
  workflow_name TEXT NOT NULL,  -- 'client_intake_to_matter', 'consultation_booking', etc.

  -- Execution details
  status TEXT NOT NULL,         -- 'triggered', 'success', 'failed', 'retry'
  request_payload TEXT,         -- JSON of what was sent to WORKWAY
  response_payload TEXT,        -- JSON of WORKWAY response
  error_message TEXT,           -- Error details if failed

  -- Timing
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,

  -- Retry tracking
  retry_count INTEGER DEFAULT 0
);

-- Index for workflow status monitoring
CREATE INDEX IF NOT EXISTS idx_workflow_logs_status ON workflow_logs(status);

-- Index for intake lookups
CREATE INDEX IF NOT EXISTS idx_workflow_logs_intake ON workflow_logs(intake_id);

-- Index for workflow type filtering
CREATE INDEX IF NOT EXISTS idx_workflow_logs_name ON workflow_logs(workflow_name);


-- Consultation bookings (from Calendly → WORKWAY → Clio)
CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Calendly event data
  calendly_event_id TEXT UNIQUE,
  calendly_invitee_id TEXT,

  -- Contact Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Scheduling
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  consultation_type TEXT,       -- 'initial', 'follow-up', 'case-review'

  -- Practice area (if specified during booking)
  practice_area TEXT,
  notes TEXT,

  -- Clio sync
  clio_contact_id TEXT,
  clio_activity_id TEXT,

  -- Status
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, no-show

  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for upcoming consultations
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled ON consultations(scheduled_at);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);

-- Index for Calendly event lookups
CREATE INDEX IF NOT EXISTS idx_consultations_calendly ON consultations(calendly_event_id);
