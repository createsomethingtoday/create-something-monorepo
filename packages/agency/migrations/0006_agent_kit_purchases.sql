-- Agent-in-a-Box purchase tracking
-- Stores license keys and activation history

CREATE TABLE IF NOT EXISTS agent_kit_purchases (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('solo', 'team', 'org')),
  license_key TEXT UNIQUE NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  office_hours_remaining INTEGER DEFAULT 0,
  team_seats_total INTEGER DEFAULT 1,
  team_seats_used INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for license key lookups (primary access pattern)
CREATE INDEX IF NOT EXISTS idx_agent_kit_license ON agent_kit_purchases(license_key);

-- Index for email lookups (customer support)
CREATE INDEX IF NOT EXISTS idx_agent_kit_email ON agent_kit_purchases(email);

-- Machine activations (track where kit is installed)
CREATE TABLE IF NOT EXISTS agent_kit_activations (
  id TEXT PRIMARY KEY,
  license_key TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  hostname TEXT,
  os TEXT,
  activated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (license_key) REFERENCES agent_kit_purchases(license_key) ON DELETE CASCADE,
  UNIQUE(license_key, machine_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_kit_activations_license ON agent_kit_activations(license_key);

-- Team member invitations (for team/org tiers)
CREATE TABLE IF NOT EXISTS agent_kit_team_members (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL,
  email TEXT NOT NULL,
  license_key TEXT UNIQUE, -- Each team member gets their own key
  invited_at TEXT DEFAULT CURRENT_TIMESTAMP,
  accepted_at TEXT,
  FOREIGN KEY (purchase_id) REFERENCES agent_kit_purchases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_kit_team_purchase ON agent_kit_team_members(purchase_id);

-- Office hours session tracking
CREATE TABLE IF NOT EXISTS agent_kit_office_hours (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  completed_at TEXT,
  duration_minutes INTEGER,
  notes TEXT,
  FOREIGN KEY (purchase_id) REFERENCES agent_kit_purchases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_kit_hours_purchase ON agent_kit_office_hours(purchase_id);
