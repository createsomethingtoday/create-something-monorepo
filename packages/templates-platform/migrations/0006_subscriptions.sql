-- Stripe Subscriptions and Payment History
-- Enables subscription management and payment tracking

-- ═══════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS
-- Track active Stripe subscriptions per user
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'agency')),
  status TEXT NOT NULL CHECK (
    status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')
  ),
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  cancel_at_period_end INTEGER DEFAULT 0,
  canceled_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENT HISTORY
-- Track all payment attempts and completions
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (
    status IN ('succeeded', 'pending', 'failed', 'canceled')
  ),
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_payment_history_user ON payment_history(user_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_payment_history_created ON payment_history(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- ADD STRIPE_CUSTOMER_ID TO USERS
-- Cache customer ID for faster lookups
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
