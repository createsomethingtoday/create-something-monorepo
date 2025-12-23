-- Bounce Handling for Newsletter Subscribers
-- Adds status column for tracking bounced/complained emails
-- Bounced emails should be excluded from bulk sends

-- Add status column with default 'active'
-- Possible values: 'active', 'bounced', 'complained'
ALTER TABLE newsletter_subscribers ADD COLUMN status TEXT DEFAULT 'active';

-- Add bounce_reason for diagnostic purposes
ALTER TABLE newsletter_subscribers ADD COLUMN bounce_reason TEXT;

-- Add bounced_at timestamp
ALTER TABLE newsletter_subscribers ADD COLUMN bounced_at TEXT;

-- Index for filtering by status during bulk sends
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status
  ON newsletter_subscribers(status);

-- Update any existing NULL status values to 'active'
UPDATE newsletter_subscribers SET status = 'active' WHERE status IS NULL;
