CREATE TABLE IF NOT EXISTS partner_auth_access_lanes (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  identity_user_id TEXT,
  owner_email TEXT,
  hub_url TEXT NOT NULL,
  host_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('initialized', 'active', 'paused', 'sunset', 'disabled')),
  toolkit_profile_json TEXT NOT NULL DEFAULT '[]',
  allowed_tool_prefixes_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (partner_client_id, slug),
  UNIQUE (hub_url),
  UNIQUE (host_key)
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_access_lanes_client_status
  ON partner_auth_access_lanes(partner_client_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_auth_access_lanes_identity
  ON partner_auth_access_lanes(identity_user_id, owner_email, updated_at DESC);
