-- Migration: Tenant Subscriptions for Self-Provisioning
--
-- Enables self-provisioning workflow:
-- 1. User configures site → subdomain reserved
-- 2. User pays via Stripe → subscription created
-- 3. Webhook fires → tenant activated
--
-- Canon: The infrastructure recedes; the site appears.

-- ═══════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS (linked to tenants, not users)
-- Track Stripe subscriptions for vertical templates
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('solo', 'team')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'canceled', 'past_due', 'incomplete', 'expired')
  ),
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER DEFAULT 0,
  canceled_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_stripe_customer ON tenant_subscriptions(stripe_customer_id);
CREATE INDEX idx_tenant_subscriptions_stripe_sub ON tenant_subscriptions(stripe_subscription_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- EXTEND TENANTS TABLE
-- Add reservation and customer fields for self-provisioning
-- ═══════════════════════════════════════════════════════════════════════════

-- Reservation expiry for unpaid configurations
ALTER TABLE tenants ADD COLUMN reservation_expires_at TEXT;

-- Customer email for notifications
ALTER TABLE tenants ADD COLUMN customer_email TEXT;

-- Pending ID for linking checkout sessions to tenants
ALTER TABLE tenants ADD COLUMN pending_checkout_id TEXT;

-- Index for expiry cleanup job
CREATE INDEX idx_tenants_reservation_expires ON tenants(reservation_expires_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- STRIPE WEBHOOK EVENTS
-- Idempotent event processing log
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TEXT DEFAULT (datetime('now')),
  payload TEXT -- JSON payload for debugging
);

CREATE INDEX idx_stripe_events_type ON stripe_events(event_type);
CREATE INDEX idx_stripe_events_processed ON stripe_events(processed_at);
