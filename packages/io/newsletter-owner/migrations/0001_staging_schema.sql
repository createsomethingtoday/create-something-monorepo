-- Schema-only projection of the existing subscriber system. Staging starts empty.
CREATE TABLE "leads" (
  id TEXT PRIMARY KEY,


  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  role TEXT,
  linkedin_url TEXT,


  source TEXT CHECK (source IN ('linkedin', 'website', 'referral', 'cold', 'event', 'other', 'abundance')),
  source_detail TEXT,
  campaign TEXT,


  stage TEXT DEFAULT 'awareness' CHECK (stage IN ('awareness', 'consideration', 'decision', 'won', 'lost')),


  estimated_value REAL,
  actual_value REAL,
  service_interest TEXT,


  first_touch_at TEXT,
  last_touch_at TEXT,
  discovery_call_at TEXT,
  proposal_sent_at TEXT,
  closed_at TEXT,


  notes TEXT,


  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE newsletter_signup_attributions (
  subscriber_id INTEGER PRIMARY KEY REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  confirmation_email_id TEXT NOT NULL,
  edition TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('newsletter', 'linkedin', 'substack')),
  campaign TEXT NOT NULL,
  traffic_class TEXT NOT NULL CHECK (traffic_class IN ('external', 'internal', 'test', 'automated', 'preview', 'unknown')),
  requested_at TEXT NOT NULL,
  confirmed_at TEXT
);

CREATE TABLE newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TEXT NOT NULL,
  unsubscribe_token TEXT UNIQUE NOT NULL,
  unsubscribed_at TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
, confirmed_at TEXT, confirmation_token TEXT, status TEXT DEFAULT 'active', source TEXT, bounce_reason TEXT, bounced_at TEXT, bounce_count INTEGER DEFAULT 0, last_bounce_at TEXT, consent_requested_at TEXT, consent_confirmed_at TEXT, consent_method TEXT, consent_evidence TEXT, confirmation_email_id TEXT, welcome_email_id TEXT, audience_classification TEXT NOT NULL DEFAULT 'legacy_or_unknown'
  CHECK (audience_classification IN (
    'legacy_or_unknown', 'unconfirmed', 'pending_review',
    'confirmed_subscriber', 'test', 'internal', 'bot', 'excluded'
  )));

CREATE INDEX idx_leads_campaign ON leads(campaign);

CREATE INDEX idx_leads_source ON leads(source);

CREATE INDEX idx_leads_stage ON leads(stage);

CREATE INDEX idx_newsletter_active ON newsletter_subscribers(active);

CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);

CREATE INDEX idx_newsletter_subscribers_confirmation_token ON newsletter_subscribers(confirmation_token);

CREATE INDEX idx_newsletter_subscribers_confirmed
  ON newsletter_subscribers(confirmed_at);

CREATE INDEX idx_newsletter_subscribers_consent
  ON newsletter_subscribers(consent_method, consent_evidence, consent_confirmed_at);

CREATE INDEX idx_newsletter_subscribers_source ON newsletter_subscribers(source);

CREATE INDEX idx_newsletter_subscribers_status ON newsletter_subscribers(status);

CREATE INDEX newsletter_signup_attributions_requested
  ON newsletter_signup_attributions(requested_at, edition, channel, campaign, traffic_class);
