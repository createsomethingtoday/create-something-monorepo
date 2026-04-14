-- Abundance Nurse Staffing Foundation
-- Additive nurse-side tables layered beside the generic Abundance matching core.
-- This migration establishes stable people identity, candidate qualification state,
-- canonical openings, external source listings, and recruiter handoff primitives.

CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    name TEXT NOT NULL,
    primary_role TEXT NOT NULL DEFAULT 'unknown' CHECK (primary_role IN (
        'candidate',
        'recruiter',
        'facility_contact',
        'operator',
        'unknown'
    )),
    status TEXT NOT NULL DEFAULT 'onboarding' CHECK (status IN ('active', 'inactive', 'onboarding')),
    source TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS candidate_profiles (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
    profession TEXT NOT NULL DEFAULT 'rn' CHECK (profession IN (
        'rn',
        'lpn',
        'lvn',
        'cna',
        'allied',
        'other'
    )),
    specialty_primary TEXT,
    specialties TEXT NOT NULL DEFAULT '[]',         -- JSON array
    years_experience INTEGER,
    recent_specialty_months INTEGER,
    contract_preferences TEXT,                      -- JSON array
    shift_preferences TEXT,                         -- JSON array
    start_window_start TEXT,
    start_window_end TEXT,
    travel_radius_miles INTEGER,
    preferred_locations TEXT,                       -- JSON array
    home_state TEXT,
    compact_license INTEGER NOT NULL DEFAULT 0 CHECK (compact_license IN (0, 1)),
    compact_states TEXT,                            -- JSON array
    pay_floor_weekly INTEGER,
    pay_target_weekly INTEGER,
    available_from TEXT,
    recruiter_notes TEXT,
    profile_status TEXT NOT NULL DEFAULT 'draft' CHECK (profile_status IN (
        'draft',
        'ready_for_review',
        'eligible',
        'inactive'
    )),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    CHECK (years_experience IS NULL OR years_experience >= 0),
    CHECK (recent_specialty_months IS NULL OR recent_specialty_months >= 0),
    CHECK (travel_radius_miles IS NULL OR travel_radius_miles >= 0)
);

CREATE TABLE IF NOT EXISTS candidate_licenses (
    id TEXT PRIMARY KEY,
    candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    license_type TEXT NOT NULL,
    issuing_state TEXT NOT NULL,
    license_number TEXT,
    compact_privilege INTEGER NOT NULL DEFAULT 0 CHECK (compact_privilege IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN (
        'active',
        'pending',
        'expired',
        'inactive',
        'unknown'
    )),
    expires_at TEXT,
    verification_source TEXT,
    verified_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(candidate_profile_id, license_type, issuing_state)
);

CREATE TABLE IF NOT EXISTS candidate_credentials (
    id TEXT PRIMARY KEY,
    candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN (
        'active',
        'pending',
        'expired',
        'unknown'
    )),
    expires_at TEXT,
    verification_source TEXT,
    verified_at TEXT,
    metadata_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(candidate_profile_id, credential_type)
);

CREATE TABLE IF NOT EXISTS candidate_documents (
    id TEXT PRIMARY KEY,
    candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'resume',
        'skills_checklist',
        'reference',
        'immunization',
        'background_check',
        'license_copy',
        'consent',
        'other'
    )),
    status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN (
        'missing',
        'pending',
        'received',
        'verified',
        'rejected'
    )),
    storage_url TEXT,
    consent_scope TEXT,
    uploaded_at TEXT,
    verified_at TEXT,
    metadata_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(candidate_profile_id, document_type)
);

CREATE TABLE IF NOT EXISTS openings (
    id TEXT PRIMARY KEY,
    external_dedupe_key TEXT UNIQUE,
    facility_name TEXT NOT NULL,
    profession TEXT NOT NULL DEFAULT 'rn',
    specialty TEXT NOT NULL,
    sub_specialty TEXT,
    city TEXT,
    state TEXT,
    location_label TEXT,
    contract_type TEXT NOT NULL DEFAULT 'travel' CHECK (contract_type IN (
        'travel',
        'staff',
        'local_contract',
        'per_diem',
        'other'
    )),
    shift_type TEXT,
    schedule_summary TEXT,
    start_date TEXT,
    assignment_length_weeks INTEGER,
    pay_package_min_weekly INTEGER,
    pay_package_max_weekly INTEGER,
    stipend_housing_weekly INTEGER,
    stipend_meals_weekly INTEGER,
    license_states TEXT,                            -- JSON array
    compact_eligible INTEGER NOT NULL DEFAULT 0 CHECK (compact_eligible IN (0, 1)),
    required_credentials TEXT,                      -- JSON array
    required_documents TEXT,                        -- JSON array
    source_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open',
        'paused',
        'closed',
        'stale'
    )),
    first_seen_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    CHECK (
        pay_package_min_weekly IS NULL OR
        pay_package_max_weekly IS NULL OR
        pay_package_max_weekly >= pay_package_min_weekly
    )
);

CREATE TABLE IF NOT EXISTS source_listings (
    id TEXT PRIMARY KEY,
    canonical_opening_id TEXT REFERENCES openings(id) ON DELETE SET NULL,
    source_slug TEXT NOT NULL,
    external_listing_id TEXT NOT NULL,
    source_url TEXT NOT NULL,
    listing_type TEXT NOT NULL DEFAULT 'travel' CHECK (listing_type IN (
        'travel',
        'staff',
        'local_contract',
        'per_diem',
        'other'
    )),
    freshness_status TEXT NOT NULL DEFAULT 'unknown' CHECK (freshness_status IN (
        'fresh',
        'stale',
        'unknown'
    )),
    trust_tier TEXT NOT NULL DEFAULT 'unknown' CHECK (trust_tier IN (
        'primary',
        'secondary',
        'manual',
        'unknown'
    )),
    fetched_at TEXT DEFAULT (datetime('now')),
    raw_payload TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(source_slug, external_listing_id)
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    opening_id TEXT NOT NULL REFERENCES openings(id) ON DELETE CASCADE,
    source_listing_id TEXT REFERENCES source_listings(id) ON DELETE SET NULL,
    recruiter_person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
    external_apply_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',
        'submitted',
        'screening',
        'shortlisted',
        'interview',
        'offer',
        'placed',
        'closed',
        'rejected'
    )),
    submitted_at TEXT,
    last_status_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(candidate_profile_id, opening_id)
);

CREATE TABLE IF NOT EXISTS eligibility_checks (
    id TEXT PRIMARY KEY,
    candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    opening_id TEXT NOT NULL REFERENCES openings(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN (
        'eligible',
        'needs_review',
        'ineligible'
    )),
    hard_fail_reasons TEXT,                         -- JSON array
    missing_requirements TEXT,                      -- JSON array
    warnings TEXT,                                  -- JSON array
    fit_score INTEGER,
    evaluated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS handoffs (
    id TEXT PRIMARY KEY,
    candidate_profile_id TEXT REFERENCES candidate_profiles(id) ON DELETE SET NULL,
    opening_id TEXT REFERENCES openings(id) ON DELETE SET NULL,
    recruiter_person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
    queue_slug TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open',
        'accepted',
        'completed',
        'cancelled'
    )),
    reason TEXT NOT NULL,
    sla_due_at TEXT,
    acknowledged_at TEXT,
    resolved_at TEXT,
    notes_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS candidate_events (
    id TEXT PRIMARY KEY,
    candidate_profile_id TEXT REFERENCES candidate_profiles(id) ON DELETE SET NULL,
    opening_id TEXT REFERENCES openings(id) ON DELETE SET NULL,
    application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    source TEXT,
    metadata_json TEXT,
    event_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_people_phone ON people(phone);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE INDEX IF NOT EXISTS idx_people_role ON people(primary_role);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_person ON candidate_profiles(person_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_status ON candidate_profiles(profile_status);
CREATE INDEX IF NOT EXISTS idx_candidate_licenses_profile ON candidate_licenses(candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_candidate_licenses_state_status ON candidate_licenses(issuing_state, status);
CREATE INDEX IF NOT EXISTS idx_candidate_credentials_profile ON candidate_credentials(candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_profile ON candidate_documents(candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_openings_specialty_state ON openings(specialty, state);
CREATE INDEX IF NOT EXISTS idx_openings_status_contract ON openings(status, contract_type);
CREATE INDEX IF NOT EXISTS idx_source_listings_canonical_opening ON source_listings(canonical_opening_id);
CREATE INDEX IF NOT EXISTS idx_source_listings_source_slug ON source_listings(source_slug);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_status ON applications(candidate_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_opening_status ON applications(opening_id, status);
CREATE INDEX IF NOT EXISTS idx_eligibility_checks_candidate_opening ON eligibility_checks(candidate_profile_id, opening_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_recruiter_status ON handoffs(recruiter_person_id, status);
CREATE INDEX IF NOT EXISTS idx_candidate_events_profile_time ON candidate_events(candidate_profile_id, event_at);

CREATE TRIGGER IF NOT EXISTS people_updated_at
AFTER UPDATE ON people
BEGIN
    UPDATE people SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS candidate_profiles_updated_at
AFTER UPDATE ON candidate_profiles
BEGIN
    UPDATE candidate_profiles SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS candidate_licenses_updated_at
AFTER UPDATE ON candidate_licenses
BEGIN
    UPDATE candidate_licenses SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS candidate_credentials_updated_at
AFTER UPDATE ON candidate_credentials
BEGIN
    UPDATE candidate_credentials SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS candidate_documents_updated_at
AFTER UPDATE ON candidate_documents
BEGIN
    UPDATE candidate_documents SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS openings_updated_at
AFTER UPDATE ON openings
BEGIN
    UPDATE openings SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS applications_updated_at
AFTER UPDATE ON applications
BEGIN
    UPDATE applications SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS handoffs_updated_at
AFTER UPDATE ON handoffs
BEGIN
    UPDATE handoffs SET updated_at = datetime('now') WHERE id = NEW.id;
END;
