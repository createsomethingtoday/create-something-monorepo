-- Add bounce tracking for auto-unsubscribe functionality
-- Track bounce count to auto-unsubscribe after 3 hard bounces

-- Add bounce_count column
ALTER TABLE newsletter_subscribers ADD COLUMN bounce_count INTEGER DEFAULT 0;

-- Add last_bounce_at timestamp (separate from bounced_at for first bounce)
ALTER TABLE newsletter_subscribers ADD COLUMN last_bounce_at TEXT;

-- Update existing bounced records to have bounce_count = 1
UPDATE newsletter_subscribers
SET bounce_count = 1, last_bounce_at = bounced_at
WHERE status = 'bounced' AND bounce_count = 0;
