-- Stripe-backed commercial state for .agency entitlement reconciliation
--
-- Canon: billing and contract posture should be queryable from durable state, not reconstructed from webhook logs.

CREATE TABLE agency_commercial_accounts (
  id TEXT PRIMARY KEY,
  normalized_email TEXT,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  product_id TEXT,
  service_tier TEXT,
  subscription_status TEXT,
  contract_active INTEGER NOT NULL DEFAULT 0,
  billing_active INTEGER NOT NULL DEFAULT 0,
  current_period_end TEXT,
  last_invoice_status TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_agency_commercial_accounts_email
  ON agency_commercial_accounts(normalized_email);

CREATE INDEX idx_agency_commercial_accounts_subscription
  ON agency_commercial_accounts(stripe_subscription_id);
