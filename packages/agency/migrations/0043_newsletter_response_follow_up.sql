-- Durable, deduplicated operator notification and warm-lead receipts for
-- subscriber check-in responses. Response submission remains successful when
-- a downstream notification fails; failed actions are safe to retry.

ALTER TABLE newsletter_reengagement_responses ADD COLUMN response_fingerprint TEXT;
ALTER TABLE newsletter_reengagement_responses ADD COLUMN notification_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (notification_status IN ('pending', 'sending', 'sent', 'failed'));
ALTER TABLE newsletter_reengagement_responses ADD COLUMN notification_email_id TEXT;
ALTER TABLE newsletter_reengagement_responses ADD COLUMN notified_at TEXT;
ALTER TABLE newsletter_reengagement_responses ADD COLUMN warm_lead_status TEXT NOT NULL DEFAULT 'not_applicable'
  CHECK (warm_lead_status IN ('not_applicable', 'pending', 'updating', 'updated', 'failed'));
ALTER TABLE newsletter_reengagement_responses ADD COLUMN warm_lead_id TEXT;
ALTER TABLE newsletter_reengagement_responses ADD COLUMN notification_error TEXT;
ALTER TABLE newsletter_reengagement_responses ADD COLUMN warm_lead_error TEXT;

CREATE INDEX IF NOT EXISTS idx_newsletter_reengagement_response_follow_up
  ON newsletter_reengagement_responses(notification_status, warm_lead_status, updated_at);
