-- Partner-managed Notion account bindings for Composio-backed service areas.

CREATE TABLE IF NOT EXISTS partner_auth_notion_accounts (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
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
  UNIQUE (partner_client_id, account_slug),
  UNIQUE (partner_client_id, composio_user_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_notion_accounts_client_status
  ON partner_auth_notion_accounts(partner_client_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS partner_auth_notion_pins (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  account_slug TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (partner_client_id, tool_name)
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_notion_pins_client_tool
  ON partner_auth_notion_pins(partner_client_id, tool_name);

CREATE TABLE IF NOT EXISTS partner_auth_notion_events (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  account_slug TEXT,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_notion_events_client_created
  ON partner_auth_notion_events(partner_client_id, created_at DESC);
