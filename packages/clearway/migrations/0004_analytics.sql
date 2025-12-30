-- Court Reserve Analytics & Demand Optimization
-- Analytics pipeline for utilization tracking, dynamic pricing, and gap filling
--
-- Migration: 0004_analytics
-- Created: 2024-12-30

-- =============================================================================
-- ANALYTICS: HOURLY UTILIZATION
-- Aggregates booking patterns by day of week and hour
-- =============================================================================

CREATE TABLE IF NOT EXISTS analytics_hourly (
    id TEXT PRIMARY KEY,
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=Sunday, 6=Saturday
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    total_slots INTEGER NOT NULL,
    booked_slots INTEGER NOT NULL,
    utilization_rate REAL NOT NULL CHECK (utilization_rate >= 0 AND utilization_rate <= 1),
    avg_revenue_cents INTEGER,
    calculated_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(facility_id, day_of_week, hour, calculated_at)
);

CREATE INDEX idx_analytics_hourly_facility ON analytics_hourly(facility_id);
CREATE INDEX idx_analytics_hourly_utilization ON analytics_hourly(utilization_rate);

-- =============================================================================
-- ANALYTICS: COURT POPULARITY
-- Track which courts get booked most frequently
-- =============================================================================

CREATE TABLE IF NOT EXISTS analytics_court_popularity (
    id TEXT PRIMARY KEY,
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    court_id TEXT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly')),
    total_bookings INTEGER NOT NULL DEFAULT 0,
    revenue_cents INTEGER NOT NULL DEFAULT 0,
    avg_duration_minutes INTEGER NOT NULL DEFAULT 0,
    calculated_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(facility_id, court_id, period, calculated_at)
);

CREATE INDEX idx_analytics_popularity_facility ON analytics_court_popularity(facility_id);
CREATE INDEX idx_analytics_popularity_court ON analytics_court_popularity(court_id);

-- =============================================================================
-- ANALYTICS: DETECTED GAPS
-- Empty slots in prime time or unusual availability patterns
-- =============================================================================

CREATE TABLE IF NOT EXISTS analytics_gaps (
    id TEXT PRIMARY KEY,
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    court_id TEXT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    slot_date TEXT NOT NULL,                     -- YYYY-MM-DD
    slot_hour INTEGER NOT NULL CHECK (slot_hour >= 0 AND slot_hour <= 23),
    gap_type TEXT NOT NULL CHECK (gap_type IN (
        'prime_time_empty',                      -- Peak hour with no bookings
        'long_gap',                              -- Extended availability > 3 hours
        'isolated_available'                     -- Available slot surrounded by booked
    )),
    notified INTEGER DEFAULT 0,                  -- Flag: gap-fill notifications sent
    created_at TEXT NOT NULL,
    UNIQUE(facility_id, court_id, slot_date, slot_hour)
);

CREATE INDEX idx_analytics_gaps_facility ON analytics_gaps(facility_id);
CREATE INDEX idx_analytics_gaps_date ON analytics_gaps(slot_date);
CREATE INDEX idx_analytics_gaps_notified ON analytics_gaps(notified);

-- =============================================================================
-- PRICING SUGGESTIONS
-- Dynamic pricing recommendations (require human approval)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pricing_suggestions (
    id TEXT PRIMARY KEY,
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    court_id TEXT REFERENCES courts(id) ON DELETE CASCADE,  -- NULL = all courts
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    hour_start INTEGER CHECK (hour_start >= 0 AND hour_start <= 23),
    hour_end INTEGER CHECK (hour_end >= 0 AND hour_end <= 23),
    suggested_rate_cents INTEGER NOT NULL,
    base_rate_cents INTEGER NOT NULL,
    adjustment_percent INTEGER NOT NULL,        -- e.g., +50 or -25
    reason TEXT NOT NULL,                       -- Human-readable explanation
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    created_at TEXT NOT NULL,
    reviewed_at TEXT,
    reviewed_by TEXT,                           -- Admin/staff who reviewed
    UNIQUE(facility_id, court_id, day_of_week, hour_start, status)
);

CREATE INDEX idx_pricing_suggestions_facility ON pricing_suggestions(facility_id);
CREATE INDEX idx_pricing_suggestions_status ON pricing_suggestions(status);

-- =============================================================================
-- GAP FILL NOTIFICATIONS
-- Track proactive notifications sent to fill empty slots
-- =============================================================================

CREATE TABLE IF NOT EXISTS gap_notifications (
    id TEXT PRIMARY KEY,
    gap_id TEXT NOT NULL REFERENCES analytics_gaps(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    match_score REAL NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
    notification_type TEXT NOT NULL CHECK (notification_type IN ('sms', 'email')),
    sent_at TEXT NOT NULL,
    converted INTEGER DEFAULT 0,                -- 1 if member booked the slot
    booking_id TEXT REFERENCES reservations(id),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_gap_notifications_gap ON gap_notifications(gap_id);
CREATE INDEX idx_gap_notifications_member ON gap_notifications(member_id);
CREATE INDEX idx_gap_notifications_converted ON gap_notifications(converted);
