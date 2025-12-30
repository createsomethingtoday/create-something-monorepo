-- Court Reserve Database Schema
-- The infrastructure disappears; courts get booked.
--
-- Migration: 0001_initial
-- Created: 2024-12-30

-- =============================================================================
-- FACILITIES
-- Tennis clubs, pickleball centers, multi-sport complexes
-- =============================================================================

CREATE TABLE IF NOT EXISTS facilities (
    id TEXT PRIMARY KEY,                              -- fac_xxxxx
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,                        -- URL-safe identifier
    timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    status TEXT DEFAULT 'configuring' CHECK (status IN ('configuring', 'active', 'suspended')),

    -- Operating hours
    opening_time TEXT NOT NULL DEFAULT '06:00',       -- HH:MM
    closing_time TEXT NOT NULL DEFAULT '22:00',       -- HH:MM
    slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
    advance_booking_days INTEGER NOT NULL DEFAULT 14,

    -- Cancellation policy
    cancellation_hours INTEGER NOT NULL DEFAULT 24,   -- Must cancel X hours before
    cancellation_fee_cents INTEGER DEFAULT 0,
    no_show_penalty_credits INTEGER DEFAULT 0,

    -- Contact
    email TEXT,
    phone TEXT,
    address TEXT,

    -- Stripe Connect
    stripe_account_id TEXT UNIQUE,                    -- acct_xxx
    stripe_account_status TEXT DEFAULT 'pending',     -- pending, onboarding, active, restricted
    stripe_charges_enabled INTEGER DEFAULT 0,
    stripe_payouts_enabled INTEGER DEFAULT 0,
    stripe_customer_id TEXT,                          -- For SaaS subscription
    platform_fee_bps INTEGER DEFAULT 500,             -- 500 = 5%

    -- Configuration (JSON)
    config TEXT DEFAULT '{}',

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_facilities_slug ON facilities(slug);
CREATE INDEX idx_facilities_stripe ON facilities(stripe_account_id);

-- =============================================================================
-- FACILITY ADMINS
-- Staff who can manage facility settings
-- =============================================================================

CREATE TABLE IF NOT EXISTS facility_admins (
    id TEXT PRIMARY KEY,
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    identity_user_id TEXT,                            -- Link to identity service
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(facility_id, email)
);

CREATE INDEX idx_facility_admins_facility ON facility_admins(facility_id);

-- =============================================================================
-- COURTS
-- Bookable resources within a facility
-- =============================================================================

CREATE TABLE IF NOT EXISTS courts (
    id TEXT PRIMARY KEY,                              -- crt_xxxxx
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                               -- "Court 1", "Pickleball A"
    court_type TEXT NOT NULL DEFAULT 'pickleball' CHECK (court_type IN (
        'pickleball', 'tennis', 'basketball', 'badminton', 'squash', 'racquetball'
    )),
    surface_type TEXT,                                -- 'hard', 'clay', 'grass', etc.
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,

    -- Pricing (null = use facility default)
    price_per_slot_cents INTEGER,
    peak_price_cents INTEGER,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_courts_facility ON courts(facility_id);

-- =============================================================================
-- MEMBERS
-- Users who book courts at a facility
-- =============================================================================

CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,                              -- mbr_xxxxx
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,

    -- Membership
    membership_type TEXT DEFAULT 'guest' CHECK (membership_type IN (
        'guest', 'member', 'premium', 'unlimited'
    )),
    membership_expires_at TEXT,

    -- Booking limits
    max_advance_hours INTEGER,                        -- Override facility default
    max_active_reservations INTEGER DEFAULT 3,

    -- Stats & penalties
    credits_balance INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,

    -- Identity & payments
    identity_user_id TEXT,                            -- Link to identity service
    stripe_customer_id TEXT,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),

    -- Preferences (JSON)
    preferences TEXT DEFAULT '{}',

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(facility_id, email)
);

CREATE INDEX idx_members_facility ON members(facility_id);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_phone ON members(phone);

-- =============================================================================
-- RESERVATIONS
-- The core booking entity with state machine
-- =============================================================================

CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,                              -- rsv_xxxxx
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    court_id TEXT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES members(id),

    -- Time slot
    start_time TEXT NOT NULL,                         -- ISO 8601 with timezone
    end_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,

    -- Booking details
    booking_type TEXT DEFAULT 'standard' CHECK (booking_type IN (
        'standard', 'recurring', 'lesson', 'event'
    )),
    participants TEXT,                                -- JSON array of names/emails
    notes TEXT,

    -- Pricing
    rate_cents INTEGER,
    credits_used INTEGER DEFAULT 0,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'refunded', 'waived'
    )),
    stripe_payment_intent_id TEXT,

    -- State machine
    -- pending → confirmed → in_progress → completed → archived
    --     ↓         ↓             ↓
    -- cancelled   no_show     disputed → refunded
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'in_progress', 'completed',
        'cancelled', 'no_show', 'disputed', 'refunded', 'archived'
    )),

    -- State timestamps
    cancelled_at TEXT,
    cancellation_reason TEXT,
    confirmed_at TEXT,
    checked_in_at TEXT,
    completed_at TEXT,

    -- Audit
    booking_source TEXT DEFAULT 'web' CHECK (booking_source IN (
        'web', 'sms', 'staff', 'api', 'waitlist'
    )),
    created_by TEXT,                                  -- Staff member ID if staff-booked

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Prevent double-booking at database level
    UNIQUE(court_id, start_time)
);

CREATE INDEX idx_reservations_facility ON reservations(facility_id);
CREATE INDEX idx_reservations_court ON reservations(court_id);
CREATE INDEX idx_reservations_member ON reservations(member_id);
CREATE INDEX idx_reservations_time ON reservations(start_time, end_time);
CREATE INDEX idx_reservations_status ON reservations(status);

-- =============================================================================
-- WAITLIST
-- Queue for fully-booked slots
-- =============================================================================

CREATE TABLE IF NOT EXISTS waitlist (
    id TEXT PRIMARY KEY,                              -- wl_xxxxx
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES members(id),
    court_id TEXT REFERENCES courts(id),              -- null = any court
    court_type TEXT,                                  -- Fallback: any court of type

    -- Desired time window
    preferred_date TEXT NOT NULL,                     -- YYYY-MM-DD
    preferred_start_time TEXT,                        -- HH:MM (null = any time)
    preferred_end_time TEXT,
    duration_minutes INTEGER DEFAULT 60,

    -- Notification preferences
    notify_sms INTEGER DEFAULT 1,
    notify_email INTEGER DEFAULT 1,
    auto_book INTEGER DEFAULT 0,                      -- Auto-confirm if slot opens

    -- Priority (higher = more priority)
    priority INTEGER DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active', 'offered', 'converted', 'expired', 'cancelled'
    )),

    -- Offer tracking
    offered_reservation_id TEXT REFERENCES reservations(id),
    offer_expires_at TEXT,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_waitlist_facility ON waitlist(facility_id);
CREATE INDEX idx_waitlist_date ON waitlist(preferred_date, status);

-- =============================================================================
-- AVAILABILITY BLOCKS
-- Custom availability, blackouts, maintenance, events
-- =============================================================================

CREATE TABLE IF NOT EXISTS availability_blocks (
    id TEXT PRIMARY KEY,                              -- blk_xxxxx
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    court_id TEXT REFERENCES courts(id),              -- null = all courts

    block_type TEXT NOT NULL CHECK (block_type IN (
        'blackout',                                   -- Court unavailable
        'maintenance',                                -- Scheduled maintenance
        'event',                                      -- Tournament, league, etc.
        'extended'                                    -- Extended hours
    )),

    -- Time range
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,

    -- Recurrence (RFC 5545 RRULE, null = one-time)
    recurrence_rule TEXT,

    -- Metadata
    title TEXT,
    description TEXT,

    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_blocks_facility ON availability_blocks(facility_id);
CREATE INDEX idx_blocks_time ON availability_blocks(start_time, end_time);

-- =============================================================================
-- PRICING RULES
-- Time-based, member-based, and dynamic pricing
-- =============================================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
    id TEXT PRIMARY KEY,                              -- prc_xxxxx
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,

    rule_type TEXT NOT NULL CHECK (rule_type IN (
        'base',                                       -- Default pricing
        'peak',                                       -- Peak hours
        'off_peak',                                   -- Discounted hours
        'member',                                     -- Member discount
        'weekend',                                    -- Weekend pricing
        'holiday'                                     -- Holiday pricing
    )),

    -- Conditions (JSON: { dayOfWeek: [0,6], startHour: 17, endHour: 20 })
    conditions TEXT DEFAULT '{}',

    -- Pricing
    price_cents INTEGER NOT NULL,

    -- Priority (higher = checked first)
    priority INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,

    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_pricing_facility ON pricing_rules(facility_id);

-- =============================================================================
-- CANCELLATION LOG
-- Audit trail for cancellations (policy enforcement)
-- =============================================================================

CREATE TABLE IF NOT EXISTS cancellation_log (
    id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL REFERENCES reservations(id),
    member_id TEXT NOT NULL REFERENCES members(id),
    cancelled_at TEXT NOT NULL,
    hours_before_start REAL,                          -- How far in advance
    reason TEXT,
    penalty_applied INTEGER DEFAULT 0,
    penalty_credits INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_cancellation_member ON cancellation_log(member_id);

-- =============================================================================
-- NO-SHOW LOG
-- Audit trail for no-shows (penalty tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS no_show_log (
    id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL REFERENCES reservations(id),
    member_id TEXT NOT NULL REFERENCES members(id),
    recorded_at TEXT NOT NULL,
    penalty_credits INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_no_show_member ON no_show_log(member_id);

-- =============================================================================
-- FACILITY SUBSCRIPTIONS
-- SaaS subscription for Court Reserve platform
-- =============================================================================

CREATE TABLE IF NOT EXISTS facility_subscriptions (
    id TEXT PRIMARY KEY,
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,               -- sub_xxx
    stripe_customer_id TEXT,                          -- cus_xxx
    plan TEXT NOT NULL CHECK (plan IN ('basic', 'pro', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active', 'past_due', 'canceled', 'trialing', 'incomplete'
    )),
    current_period_start TEXT,
    current_period_end TEXT,
    cancel_at_period_end INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_subscriptions_facility ON facility_subscriptions(facility_id);

-- =============================================================================
-- RESERVATION PAYMENTS
-- Track payments for court bookings (Stripe Connect)
-- =============================================================================

CREATE TABLE IF NOT EXISTS reservation_payments (
    id TEXT PRIMARY KEY,
    facility_id TEXT NOT NULL REFERENCES facilities(id),
    reservation_id TEXT NOT NULL REFERENCES reservations(id),
    member_email TEXT NOT NULL,

    -- Stripe details
    stripe_payment_intent_id TEXT UNIQUE,             -- pi_xxx
    stripe_charge_id TEXT,                            -- ch_xxx
    stripe_transfer_id TEXT,                          -- tr_xxx

    -- Amounts (in cents)
    amount_total INTEGER NOT NULL,                    -- Total charged to member
    platform_fee INTEGER NOT NULL,                    -- Fee to Court Reserve
    facility_amount INTEGER NOT NULL,                 -- Amount to facility
    currency TEXT DEFAULT 'usd',

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'succeeded', 'failed', 'refunded', 'disputed'
    )),
    refund_amount INTEGER DEFAULT 0,
    refund_reason TEXT,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_payments_facility ON reservation_payments(facility_id);
CREATE INDEX idx_payments_reservation ON reservation_payments(reservation_id);
CREATE INDEX idx_payments_intent ON reservation_payments(stripe_payment_intent_id);
