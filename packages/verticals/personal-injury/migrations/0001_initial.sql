-- Personal Injury Template: Initial Schema
-- Core tables for PI client intake and case management

-- ============================================================================
-- PI Intakes: Enhanced intake with screening fields
-- ============================================================================
CREATE TABLE IF NOT EXISTS pi_intakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Contact Information
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    best_time_to_call TEXT,           -- 'morning', 'afternoon', 'evening', 'anytime'

    -- Accident Details
    accident_type TEXT NOT NULL,       -- 'car-accident', 'truck-accident', etc.
    accident_date TEXT NOT NULL,       -- Date of accident (ISO format)
    accident_location TEXT,            -- City/intersection/address
    accident_description TEXT,

    -- Fault & Liability
    at_fault_party TEXT NOT NULL,      -- 'yes', 'no', 'unsure'
    at_fault_details TEXT,             -- Description if 'yes' or 'unsure'
    police_report_filed INTEGER DEFAULT 0,

    -- Injury Details
    injury_severity TEXT NOT NULL,     -- 'minor', 'moderate', 'serious', 'severe', 'catastrophic'
    injury_description TEXT,
    received_treatment INTEGER DEFAULT 0,
    treatment_providers TEXT,          -- JSON array of providers
    ongoing_treatment INTEGER DEFAULT 0,

    -- Insurance Information
    has_insurance INTEGER DEFAULT 1,
    insurance_company TEXT,
    other_party_insurance TEXT,

    -- Case Screening Results
    screening_score INTEGER,           -- 0-100 calculated score
    screening_result TEXT,             -- 'qualified', 'review', 'declined'
    is_hot_lead INTEGER DEFAULT 0,     -- Flag for urgent/high-value cases
    screening_reasons TEXT,            -- JSON array of scoring factors

    -- Clio Integration (via WORKWAY)
    clio_contact_id TEXT,
    clio_matter_id TEXT,

    -- Status Tracking
    status TEXT DEFAULT 'new' CHECK (status IN (
        'new',           -- Just submitted
        'screening',     -- Being auto-screened
        'qualified',     -- Passed screening, pending contact
        'contacted',     -- Attorney has reached out
        'retained',      -- Client signed retainer
        'declined'       -- Case declined
    )),

    -- Source & Attribution
    source TEXT DEFAULT 'website',     -- 'website', 'referral', 'google', 'social'
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    -- Metadata
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    contacted_at TEXT,
    retained_at TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pi_intakes_email ON pi_intakes(email);
CREATE INDEX IF NOT EXISTS idx_pi_intakes_status ON pi_intakes(status);
CREATE INDEX IF NOT EXISTS idx_pi_intakes_accident_type ON pi_intakes(accident_type);
CREATE INDEX IF NOT EXISTS idx_pi_intakes_screening_result ON pi_intakes(screening_result);
CREATE INDEX IF NOT EXISTS idx_pi_intakes_is_hot_lead ON pi_intakes(is_hot_lead);
CREATE INDEX IF NOT EXISTS idx_pi_intakes_created_at ON pi_intakes(created_at);


-- ============================================================================
-- Screening Log: Audit trail for case screening decisions
-- ============================================================================
CREATE TABLE IF NOT EXISTS screening_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intake_id INTEGER NOT NULL REFERENCES pi_intakes(id),

    -- Screening Breakdown
    at_fault_score INTEGER NOT NULL,       -- 0-25 points
    severity_score INTEGER NOT NULL,       -- 0-35 points
    accident_type_score INTEGER NOT NULL,  -- 0-20 points
    statute_score INTEGER NOT NULL,        -- 0-20 points
    total_score INTEGER NOT NULL,          -- Sum

    -- Result
    result TEXT NOT NULL,                  -- 'qualified', 'review', 'declined'
    is_hot_lead INTEGER DEFAULT 0,
    reasons TEXT NOT NULL,                 -- JSON array of scoring reasons

    -- Metadata
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_screening_log_intake ON screening_log(intake_id);


-- ============================================================================
-- Workflow Logs: Track WORKWAY/Clio integrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Reference to intake
    intake_id INTEGER REFERENCES pi_intakes(id),

    -- Workflow identification
    workflow_name TEXT NOT NULL,           -- 'pi-intake-to-clio', 'urgent-case-alert', etc.

    -- Execution details
    status TEXT NOT NULL CHECK (status IN ('triggered', 'success', 'failed', 'retry')),
    request_payload TEXT,                  -- JSON of what was sent
    response_payload TEXT,                 -- JSON of response
    error_message TEXT,

    -- Timing
    triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,

    -- Retry tracking
    retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_intake ON workflow_logs(intake_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_status ON workflow_logs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_name ON workflow_logs(workflow_name);


-- ============================================================================
-- Consultations: Free case review bookings (Calendly integration)
-- ============================================================================
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
    consultation_type TEXT DEFAULT 'free-case-review',

    -- Case details (if linked to intake)
    intake_id INTEGER REFERENCES pi_intakes(id),
    accident_type TEXT,
    notes TEXT,

    -- Clio sync
    clio_contact_id TEXT,
    clio_activity_id TEXT,

    -- Status
    status TEXT DEFAULT 'scheduled' CHECK (status IN (
        'scheduled',
        'completed',
        'cancelled',
        'no-show'
    )),

    -- Metadata
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_consultations_scheduled ON consultations(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_calendly ON consultations(calendly_event_id);
CREATE INDEX IF NOT EXISTS idx_consultations_intake ON consultations(intake_id);
