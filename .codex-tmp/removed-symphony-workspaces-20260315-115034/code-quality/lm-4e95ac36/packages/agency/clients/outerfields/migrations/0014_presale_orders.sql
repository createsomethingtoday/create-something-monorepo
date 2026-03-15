-- Capture completed Stripe checkout sessions for pre-sale fulfillment and later onboarding.
CREATE TABLE IF NOT EXISTS presale_orders (
  stripe_session_id TEXT PRIMARY KEY,
  stripe_event_id TEXT,
  user_id TEXT,
  email TEXT,
  name TEXT,
  amount_total INTEGER,
  currency TEXT,
  payment_status TEXT,
  membership_type TEXT,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  metadata_json TEXT,
  customer_details_json TEXT,
  raw_session_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_presale_orders_email ON presale_orders(email);
CREATE INDEX IF NOT EXISTS idx_presale_orders_user_id ON presale_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_presale_orders_created_at ON presale_orders(created_at);
