-- Double Opt-In for Newsletter Subscribers
-- Adds confirmed_at column to track subscription confirmation
-- Subscribers must click confirmation link before receiving newsletters

-- Add confirmed_at column (NULL = unconfirmed, timestamp = confirmed)
ALTER TABLE newsletter_subscribers ADD COLUMN confirmed_at TEXT;

-- Add confirmation_token column for secure confirmation links
ALTER TABLE newsletter_subscribers ADD COLUMN confirmation_token TEXT;

-- Index for filtering confirmed subscribers during bulk sends
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_confirmed
  ON newsletter_subscribers(confirmed_at);

-- Index for confirmation token lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_confirmation_token
  ON newsletter_subscribers(confirmation_token);

-- Migrate existing subscribers: set confirmed_at = subscribed_at for existing active subscribers
-- This ensures existing subscribers don't need to re-confirm
UPDATE newsletter_subscribers
SET confirmed_at = COALESCE(subscribed_at, created_at)
WHERE unsubscribed_at IS NULL;
