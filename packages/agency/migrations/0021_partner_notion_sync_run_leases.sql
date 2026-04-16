-- Contract-scoped leases to prevent overlapping live Notion sync runs.

CREATE TABLE IF NOT EXISTS partner_auth_notion_sync_run_leases (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  contract_id TEXT NOT NULL REFERENCES partner_auth_notion_sync_contracts(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES partner_auth_notion_sync_runs(id) ON DELETE CASCADE,
  lease_token TEXT NOT NULL,
  lease_expires_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (contract_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_notion_sync_run_leases_contract_expires
  ON partner_auth_notion_sync_run_leases(contract_id, lease_expires_at ASC);

CREATE INDEX IF NOT EXISTS idx_partner_auth_notion_sync_run_leases_run
  ON partner_auth_notion_sync_run_leases(run_id);
