-- Migration: Create discovery_calls table
-- Stores scheduled discovery calls for Founding Members
-- Created: 2026-01-12

CREATE TABLE IF NOT EXISTS discovery_calls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  call_time TEXT NOT NULL,
  calendly_event_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for looking up calls by user
CREATE INDEX IF NOT EXISTS idx_discovery_calls_user_id ON discovery_calls(user_id);

-- Index for looking up calls by Calendly event ID (for webhook updates)
CREATE INDEX IF NOT EXISTS idx_discovery_calls_calendly_event_id ON discovery_calls(calendly_event_id);

-- Index for ordering by call time (for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_discovery_calls_call_time ON discovery_calls(call_time);
