-- Migration: Add SMS support
-- Phase 4: SMS/Chat Booking

-- SMS number for facilities (receiving Twilio number)
ALTER TABLE facilities ADD COLUMN sms_number TEXT;

-- SMS conversation logs for analytics
CREATE TABLE IF NOT EXISTS sms_logs (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES facilities(id),
  member_id TEXT REFERENCES members(id),
  direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
  phone TEXT NOT NULL,
  body TEXT NOT NULL,
  intent TEXT,  -- parsed intent type
  message_sid TEXT,  -- Twilio message ID
  created_at TEXT NOT NULL
);

-- Index for querying logs by facility
CREATE INDEX idx_sms_logs_facility ON sms_logs(facility_id, created_at DESC);

-- Index for querying logs by member
CREATE INDEX idx_sms_logs_member ON sms_logs(member_id, created_at DESC);

-- Add phone column to members if not exists
-- (SQLite doesn't support ADD COLUMN IF NOT EXISTS, so this is a no-op if it exists)
-- The column was added in the initial schema
