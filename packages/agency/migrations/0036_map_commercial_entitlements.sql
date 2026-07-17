-- Account-scoped subscription lifecycle for CREATE SOMETHING Map.
-- Live activation remains gated by MAP_COMMERCIAL_LAUNCH_APPROVED plus both approved price IDs.

CREATE TABLE agency_map_entitlements (
  id TEXT PRIMARY KEY,
  auth_subject TEXT NOT NULL,
  normalized_email TEXT NOT NULL,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('map-monthly', 'map-yearly')),
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly', 'yearly')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT NOT NULL,
  entitlement_status TEXT NOT NULL
    CHECK (entitlement_status IN ('pending', 'active', 'payment_failed', 'canceled')),
  billing_active INTEGER NOT NULL DEFAULT 0 CHECK (billing_active IN (0, 1)),
  current_period_end TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (account_id, workspace_account_id)
);

CREATE INDEX idx_agency_map_entitlements_subscription
  ON agency_map_entitlements(stripe_subscription_id);

CREATE INDEX idx_agency_map_entitlements_status
  ON agency_map_entitlements(entitlement_status, updated_at DESC);
