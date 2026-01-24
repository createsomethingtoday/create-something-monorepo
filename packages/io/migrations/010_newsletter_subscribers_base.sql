-- Newsletter Subscribers Complete Table
-- Creates the newsletter_subscribers table with all required columns
-- This migration creates the full table structure needed by:
-- @create-something/components/newsletter (subscribe.ts)
--
-- NOTE: This migration was manually applied to production on 2026-01-24
-- to fix a 500 error on the /api/newsletter endpoint.

-- Create full table structure if it doesn't exist
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TEXT DEFAULT (datetime('now')),
  unsubscribe_token TEXT NOT NULL,
  unsubscribed_at TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  -- Double opt-in columns
  confirmed_at TEXT,
  confirmation_token TEXT,
  -- Status tracking (active, bounced, complained, unsubscribed)
  status TEXT DEFAULT 'active',
  -- Source tracking for cross-property analytics
  source TEXT,
  -- Bounce handling
  bounce_reason TEXT,
  bounced_at TEXT,
  bounce_count INTEGER DEFAULT 0,
  last_bounce_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
  ON newsletter_subscribers(email);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_confirmed
  ON newsletter_subscribers(confirmed_at);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_confirmation_token
  ON newsletter_subscribers(confirmation_token);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status
  ON newsletter_subscribers(status);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_source
  ON newsletter_subscribers(source);
