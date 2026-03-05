-- Partner auth + MCP access delivery
-- Half Dozen partner onboarding surfaces for Composio-first workflows.

CREATE TABLE IF NOT EXISTS partner_auth_clients (
  id TEXT PRIMARY KEY,
  partner_key TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_name TEXT,
  workspace_account_id TEXT NOT NULL,
  identity_account_id TEXT,
  identity_user_id TEXT,
  identity_tenant_id TEXT,
  owner_email TEXT,
  status TEXT NOT NULL DEFAULT 'initialized' CHECK (status IN ('initialized', 'active', 'paused', 'sunset', 'disabled')),
  required_toolkits_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (partner_key, slug),
  UNIQUE (workspace_account_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_clients_partner_status
  ON partner_auth_clients(partner_key, status, updated_at);

CREATE TABLE IF NOT EXISTS partner_auth_consents (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL DEFAULT 'v1',
  consent_granted_by TEXT NOT NULL,
  consent_channel TEXT NOT NULL DEFAULT 'portal',
  consent_reference TEXT,
  granted_at TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_consents_client_active
  ON partner_auth_consents(partner_client_id, revoked_at, granted_at DESC);

CREATE TABLE IF NOT EXISTS partner_auth_connections (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  toolkit TEXT NOT NULL,
  auth_config_id TEXT,
  connected_account_id TEXT,
  connection_status TEXT NOT NULL,
  last_checked_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (partner_client_id, toolkit, connected_account_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_connections_client_toolkit
  ON partner_auth_connections(partner_client_id, toolkit, updated_at DESC);

CREATE TABLE IF NOT EXISTS partner_access_deliveries (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('strict_session_bundle', 'legacy_key_bundle')),
  delivery_channel TEXT NOT NULL DEFAULT 'portal' CHECK (delivery_channel IN ('portal', 'secure_note', 'email', 'manual')),
  delivered_by TEXT NOT NULL,
  recipient TEXT,
  artifact_ref TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_partner_access_deliveries_client_created
  ON partner_access_deliveries(partner_client_id, created_at DESC);
