-- Public campaign attribution is retained only when the signup's existing
-- analytics preference allows it. No backfill and no consent inference.
-- Subscriber linkage is private operational data, not an anonymous dataset.
CREATE TABLE IF NOT EXISTS newsletter_signup_attributions (
  subscriber_id INTEGER PRIMARY KEY REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  confirmation_email_id TEXT NOT NULL,
  edition TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('newsletter', 'linkedin', 'substack')),
  campaign TEXT NOT NULL,
  traffic_class TEXT NOT NULL CHECK (traffic_class IN ('external', 'internal', 'test', 'automated', 'preview', 'unknown')),
  requested_at TEXT NOT NULL,
  confirmed_at TEXT
);
CREATE INDEX IF NOT EXISTS newsletter_signup_attributions_requested
  ON newsletter_signup_attributions(requested_at, edition, channel, campaign, traffic_class);
