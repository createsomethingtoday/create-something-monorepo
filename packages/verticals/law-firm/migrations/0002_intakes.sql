-- Law Firm Template: Client Intakes
-- Schema for intake form submissions that trigger WORKWAY → Clio workflow

-- Intakes table: stores client intake form submissions
CREATE TABLE IF NOT EXISTS intakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    practice_area TEXT NOT NULL,
    message TEXT NOT NULL,

    -- Clio integration fields (populated by WORKWAY webhook response)
    clio_contact_id TEXT,
    clio_matter_id TEXT,

    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'converted', 'closed')),

    -- Metadata
    created_at TEXT NOT NULL,
    updated_at TEXT,
    synced_at TEXT,      -- When WORKWAY successfully synced to Clio
    converted_at TEXT    -- When intake became a client
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_intakes_email ON intakes(email);
CREATE INDEX IF NOT EXISTS idx_intakes_status ON intakes(status);
CREATE INDEX IF NOT EXISTS idx_intakes_practice_area ON intakes(practice_area);
CREATE INDEX IF NOT EXISTS idx_intakes_created_at ON intakes(created_at);

-- Intake workflow logs: tracks WORKWAY webhook executions
-- Separate from general workflow_logs for intake-specific tracking
CREATE TABLE IF NOT EXISTS intake_workflow_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intake_id INTEGER NOT NULL REFERENCES intakes(id),
    workflow_name TEXT NOT NULL,  -- 'client_intake_to_matter', 'consultation_booking_to_clio'
    status TEXT NOT NULL CHECK (status IN ('triggered', 'success', 'failed')),
    response TEXT,                -- WORKWAY response body
    created_at TEXT NOT NULL
);

-- Create index for intake lookups
CREATE INDEX IF NOT EXISTS idx_intake_workflow_logs_intake_id ON intake_workflow_logs(intake_id);
