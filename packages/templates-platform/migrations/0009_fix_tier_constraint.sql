-- Migration: Fix tier constraint to include 'solo' and 'team'
--
-- The original tenants table only allowed 'free', 'pro', 'enterprise' tiers.
-- The self-provisioning system uses 'solo' and 'team' tiers.
-- SQLite doesn't support ALTER CONSTRAINT, so we recreate the table.
--
-- Canon: Correct what's broken; the infrastructure recedes.

-- ═══════════════════════════════════════════════════════════════════════════
-- RECREATE TENANTS TABLE WITH UPDATED TIER CONSTRAINT
-- ═══════════════════════════════════════════════════════════════════════════

-- Temporarily disable foreign keys
PRAGMA foreign_keys=OFF;

-- Create new table with correct constraint
CREATE TABLE tenants_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT NOT NULL REFERENCES templates(id),
  subdomain TEXT NOT NULL UNIQUE,
  custom_domain TEXT,
  status TEXT DEFAULT 'configuring' CHECK (status IN ('configuring', 'building', 'deploying', 'active', 'error', 'suspended')),
  config TEXT NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'solo', 'team', 'pro', 'enterprise')),
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deployed_at TEXT,
  last_edited_at TEXT,
  template_version TEXT,
  worker_id TEXT,
  auto_update TEXT DEFAULT 'minor' CHECK (auto_update IN ('none', 'minor', 'all')),
  reservation_expires_at TEXT,
  customer_email TEXT,
  pending_checkout_id TEXT
);

-- Copy data from old table
INSERT INTO tenants_new SELECT * FROM tenants;

-- Drop old table
DROP TABLE tenants;

-- Rename new table
ALTER TABLE tenants_new RENAME TO tenants;

-- Recreate indexes
CREATE UNIQUE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_user ON tenants(user_id);
CREATE INDEX idx_tenants_template ON tenants(template_id);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_reservation_expires ON tenants(reservation_expires_at);

-- Re-enable foreign keys
PRAGMA foreign_keys=ON;
