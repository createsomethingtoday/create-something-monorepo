-- Schedule MCP — Notifications Schema
-- Adds phone numbers, notification preferences, and delivery log.

-- Add phone column to members (E.164 format: +15551234567)
ALTER TABLE members ADD COLUMN phone TEXT;

-- Notification preferences: per-member opt-in for each trigger type
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  -- Trigger types
  reminders_enabled INTEGER DEFAULT 1,          -- 0/1
  changes_enabled INTEGER DEFAULT 1,            -- 0/1
  conflicts_enabled INTEGER DEFAULT 1,          -- 0/1
  -- Reminder lead times (minutes before event)
  reminder_minutes_1 INTEGER DEFAULT 15,        -- First reminder
  reminder_minutes_2 INTEGER DEFAULT 60,        -- Second reminder (0 = disabled)
  reminder_minutes_3 INTEGER DEFAULT 1440,      -- Third reminder: 1 day (0 = disabled)
  -- Channel
  sms_enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_prefs_member
  ON notification_preferences(member_id);

-- Notification log: audit trail + dedup + delivery status
CREATE TABLE IF NOT EXISTS notification_log (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  -- Notification type
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('reminder', 'change', 'conflict', 'manual')),
  -- Content
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  -- Delivery status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'failed')),
  error_message TEXT,
  -- Dedup key: prevents sending the same notification twice
  dedup_key TEXT,
  -- Timestamps
  scheduled_for INTEGER,            -- When the notification should be sent (unix seconds)
  sent_at INTEGER,                  -- When actually sent
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_member ON notification_log(member_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_dedup ON notification_log(dedup_key);
CREATE INDEX IF NOT EXISTS idx_notification_log_scheduled ON notification_log(scheduled_for);
