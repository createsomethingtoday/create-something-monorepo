-- Generic partner-managed toolkit account bindings for operator auth flows.

CREATE TABLE IF NOT EXISTS partner_auth_toolkit_accounts (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  toolkit TEXT NOT NULL,
  account_slug TEXT NOT NULL,
  display_label TEXT,
  composio_user_id TEXT NOT NULL,
  auth_config_id TEXT,
  connected_account_id TEXT,
  connection_status TEXT NOT NULL DEFAULT 'INITIATED',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'revoked')),
  sync_enabled INTEGER NOT NULL DEFAULT 1 CHECK (sync_enabled IN (0, 1)),
  last_checked_at TEXT,
  connected_at TEXT,
  disabled_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (partner_client_id, toolkit, account_slug),
  UNIQUE (partner_client_id, toolkit, composio_user_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_toolkit_accounts_client_toolkit_status
  ON partner_auth_toolkit_accounts(partner_client_id, toolkit, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS partner_auth_toolkit_pins (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  toolkit TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  account_slug TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (partner_client_id, toolkit, tool_name)
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_toolkit_pins_client_tool
  ON partner_auth_toolkit_pins(partner_client_id, toolkit, tool_name);

CREATE TABLE IF NOT EXISTS partner_auth_toolkit_events (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  toolkit TEXT NOT NULL,
  account_slug TEXT,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_toolkit_events_client_toolkit_created
  ON partner_auth_toolkit_events(partner_client_id, toolkit, created_at DESC);
