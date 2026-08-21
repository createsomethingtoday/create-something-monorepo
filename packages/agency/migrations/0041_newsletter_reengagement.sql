-- CREATE SOMETHING subscriber consent, re-engagement, and campaign receipts.
-- Newsletter state is shared through create-something-db. Agency migrations
-- are the authoritative production sequence for the shared database.

ALTER TABLE newsletter_subscribers ADD COLUMN consent_requested_at TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN consent_confirmed_at TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN consent_method TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN consent_evidence TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN confirmation_email_id TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN welcome_email_id TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN audience_classification TEXT NOT NULL DEFAULT 'legacy_or_unknown'
  CHECK (audience_classification IN (
    'legacy_or_unknown', 'unconfirmed', 'pending_review',
    'confirmed_subscriber', 'test', 'internal', 'bot', 'excluded'
  ));

-- Backfill only the subscriber whose direct confirmation is supported by a
-- newsletter warm-lead receipt. Migration-only confirmations stay ineligible.
UPDATE newsletter_subscribers
SET consent_requested_at = subscribed_at,
    consent_confirmed_at = confirmed_at,
    consent_method = 'double_opt_in',
    consent_evidence = 'confirmation_link',
    audience_classification = 'confirmed_subscriber'
WHERE confirmed_at IS NOT NULL
  AND source = 'io'
  AND EXISTS (
    SELECT 1
    FROM leads
    WHERE lower(leads.email) = lower(newsletter_subscribers.email)
      AND leads.source_detail = 'newsletter:io'
  );

UPDATE newsletter_subscribers
SET audience_classification = 'unconfirmed'
WHERE confirmed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_consent
  ON newsletter_subscribers(consent_method, consent_evidence, consent_confirmed_at);

CREATE TABLE IF NOT EXISTS newsletter_reengagement_campaigns (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT NOT NULL,
  html_snapshot TEXT NOT NULL,
  text_snapshot TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  reply_to TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'sending', 'sent', 'stopped', 'failed')),
  eligible_count INTEGER NOT NULL DEFAULT 0,
  excluded_count INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  seed_email_id TEXT,
  seed_status TEXT,
  seed_recipient_hash TEXT,
  seed_sent_at TEXT,
  sent_at TEXT,
  stopped_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS newsletter_reengagement_tokens (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES newsletter_reengagement_campaigns(id),
  subscriber_id INTEGER NOT NULL REFERENCES newsletter_subscribers(id),
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  first_opened_at TEXT,
  last_opened_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(campaign_id, subscriber_id)
);

CREATE TABLE IF NOT EXISTS newsletter_reengagement_responses (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES newsletter_reengagement_campaigns(id),
  subscriber_id INTEGER NOT NULL REFERENCES newsletter_subscribers(id),
  original_reason TEXT,
  still_interested TEXT NOT NULL
    CHECK (still_interested IN ('yes', 'not_sure', 'no')),
  updates_seen TEXT NOT NULL
    CHECK (updates_seen IN ('none', 'some', 'most')),
  wanted_next TEXT,
  responded_at TEXT NOT NULL DEFAULT (datetime('now')),
  retention_expires_at TEXT NOT NULL DEFAULT (datetime('now', '+365 days')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(campaign_id, subscriber_id)
);

CREATE TABLE IF NOT EXISTS newsletter_reengagement_deliveries (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES newsletter_reengagement_campaigns(id),
  subscriber_id INTEGER NOT NULL REFERENCES newsletter_subscribers(id),
  resend_email_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued',
  error_code TEXT,
  queued_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  delivered_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(campaign_id, subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_reengagement_tokens_lookup
  ON newsletter_reengagement_tokens(token_hash, expires_at, revoked_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_reengagement_responses_campaign
  ON newsletter_reengagement_responses(campaign_id, responded_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_reengagement_deliveries_campaign
  ON newsletter_reengagement_deliveries(campaign_id, status);
