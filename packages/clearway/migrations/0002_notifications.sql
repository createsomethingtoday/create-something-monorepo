-- Court Reserve: Notification Log
-- Migration: 0002_notifications
-- Created: 2024-12-30

-- =============================================================================
-- NOTIFICATION LOG
-- Audit trail for all notifications sent (reminders, waitlist offers, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_log (
    id TEXT PRIMARY KEY,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'reminder',
        'waitlist_offer',
        'waitlist_auto_booked',
        'cancellation',
        'confirmation'
    )),
    reservation_id TEXT REFERENCES reservations(id),
    waitlist_id TEXT REFERENCES waitlist(id),
    member_id TEXT NOT NULL REFERENCES members(id),
    facility_id TEXT NOT NULL REFERENCES facilities(id),

    -- Metadata
    sent_at TEXT NOT NULL,
    minutes_before INTEGER,                      -- For reminders: how far in advance
    channel TEXT CHECK (channel IN ('email', 'sms', 'both')),

    -- Data snapshot (JSON)
    data TEXT,                                    -- Full message data for audit

    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_notification_log_reservation ON notification_log(reservation_id);
CREATE INDEX idx_notification_log_waitlist ON notification_log(waitlist_id);
CREATE INDEX idx_notification_log_member ON notification_log(member_id);
CREATE INDEX idx_notification_log_type ON notification_log(notification_type);
CREATE INDEX idx_notification_log_sent ON notification_log(sent_at);

-- =============================================================================
-- CHECKPOINT SESSION ID COLUMN
-- Add session_id to reservations for tracking Stripe Checkout sessions
-- =============================================================================

-- Add column if not exists (SQLite doesn't support IF NOT EXISTS for columns)
-- This will fail silently if column already exists
ALTER TABLE reservations ADD COLUMN stripe_checkout_session_id TEXT;
