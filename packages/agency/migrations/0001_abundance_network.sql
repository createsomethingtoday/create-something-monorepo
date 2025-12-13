-- Abundance Network: Core Tables
-- Subtractive approach: Only what's needed for matching
-- Complex scoring/archetypes earned through iteration

-- Seekers: People looking for creative help
CREATE TABLE IF NOT EXISTS seekers (
    id TEXT PRIMARY KEY,

    -- Identity (WhatsApp phone as stable ID)
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,

    -- Brand context (reusable across jobs)
    brand_name TEXT,
    brand_vibe TEXT,  -- freeform tags: "colorful, spiritual, rave"
    website TEXT,

    -- Preferences
    typical_budget_min INTEGER,
    typical_budget_max INTEGER,
    preferred_formats TEXT,  -- JSON array: ["cover_art", "merch", "video"]

    -- Simple readiness indicator (0-100, optional)
    readiness_score INTEGER DEFAULT 50,

    -- Metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'onboarding')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Talent: Creatives offering services
CREATE TABLE IF NOT EXISTS talent (
    id TEXT PRIMARY KEY,

    -- Identity
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,

    -- Portfolio
    portfolio_url TEXT,
    instagram TEXT,

    -- Capabilities (simple tags, no complex matrices)
    skills TEXT NOT NULL,       -- JSON array: ["illustration", "3d", "motion"]
    styles TEXT,                -- JSON array: ["psychedelic", "minimal", "rave"]

    -- Availability & Pricing
    hourly_rate_min INTEGER,
    hourly_rate_max INTEGER,
    availability TEXT DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'unavailable')),
    timezone TEXT,

    -- Simple capability indicator (0-100, optional)
    abundance_index INTEGER DEFAULT 50,

    -- Metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'onboarding')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Matches: Connections between Seekers and Talent
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    seeker_id TEXT NOT NULL REFERENCES seekers(id),
    talent_id TEXT NOT NULL REFERENCES talent(id),

    -- The job/brief that triggered this match
    job_title TEXT,
    job_description TEXT,
    deliverables TEXT,         -- JSON array: ["album_cover", "t_shirt_design"]
    budget INTEGER,
    deadline TEXT,

    -- Simple fit score (0-100)
    fit_score INTEGER NOT NULL,
    fit_breakdown TEXT,        -- JSON: {"skills": 40, "budget": 30, "availability": 30}

    -- Status flow
    status TEXT DEFAULT 'suggested' CHECK (status IN (
        'suggested',    -- System suggested this match
        'accepted',     -- Both parties agreed
        'declined',     -- One party declined
        'in_progress',  -- Work has started
        'completed',    -- Job finished
        'cancelled'     -- Job cancelled
    )),

    -- Feedback (post-completion)
    seeker_rating INTEGER CHECK (seeker_rating BETWEEN 1 AND 5),
    seeker_feedback TEXT,
    talent_rating INTEGER CHECK (talent_rating BETWEEN 1 AND 5),
    talent_feedback TEXT,

    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,

    UNIQUE(seeker_id, talent_id, job_title)
);

-- Intakes: Conversation history from GPT/WhatsApp
-- Supports the "hermeneutic spiral" - users return with evolving context
CREATE TABLE IF NOT EXISTS intakes (
    id TEXT PRIMARY KEY,

    -- Who this belongs to
    user_id TEXT NOT NULL,     -- seeker.id or talent.id
    user_type TEXT NOT NULL CHECK (user_type IN ('seeker', 'talent')),

    -- Type of conversation
    intake_type TEXT NOT NULL CHECK (intake_type IN (
        'onboarding',   -- First time setup
        'new_job',      -- New brief/request
        'checkin',      -- Returning user update
        'feedback'      -- Post-job reflection
    )),

    -- The conversation data
    data TEXT NOT NULL,        -- JSON: full intake responses
    summary TEXT,              -- AI-generated summary

    -- Spiral linkage (previous intake for trajectory)
    previous_intake_id TEXT REFERENCES intakes(id),

    -- Metadata
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_seekers_phone ON seekers(phone);
CREATE INDEX IF NOT EXISTS idx_talent_phone ON talent(phone);
CREATE INDEX IF NOT EXISTS idx_talent_availability ON talent(availability);
CREATE INDEX IF NOT EXISTS idx_matches_seeker ON matches(seeker_id);
CREATE INDEX IF NOT EXISTS idx_matches_talent ON matches(talent_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_intakes_user ON intakes(user_id, user_type);

-- Trigger: Update seekers.updated_at on change
CREATE TRIGGER IF NOT EXISTS seekers_updated_at
AFTER UPDATE ON seekers
BEGIN
    UPDATE seekers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger: Update talent.updated_at on change
CREATE TRIGGER IF NOT EXISTS talent_updated_at
AFTER UPDATE ON talent
BEGIN
    UPDATE talent SET updated_at = datetime('now') WHERE id = NEW.id;
END;
