-- Partner-managed Notion sync contracts for deterministic pairwise data-source sync.

CREATE TABLE IF NOT EXISTS partner_auth_notion_sync_contracts (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  contract_slug TEXT NOT NULL,
  source_account_slug TEXT NOT NULL,
  target_account_slug TEXT NOT NULL,
  source_data_source_id TEXT NOT NULL,
  target_data_source_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  match_strategy TEXT NOT NULL DEFAULT 'mapping_table' CHECK (match_strategy IN ('mapping_table')),
  conflict_policy TEXT NOT NULL DEFAULT 'manual' CHECK (conflict_policy IN ('manual', 'source_wins', 'target_wins')),
  propagate_create INTEGER NOT NULL DEFAULT 1 CHECK (propagate_create IN (0, 1)),
  propagate_update INTEGER NOT NULL DEFAULT 1 CHECK (propagate_update IN (0, 1)),
  propagate_archive INTEGER NOT NULL DEFAULT 1 CHECK (propagate_archive IN (0, 1)),
  propagate_delete INTEGER NOT NULL DEFAULT 1 CHECK (propagate_delete IN (0, 1)),
  delete_mode TEXT NOT NULL DEFAULT 'archive' CHECK (delete_mode IN ('archive')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (partner_client_id, contract_slug)
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_notion_sync_contracts_client_enabled
  ON partner_auth_notion_sync_contracts(partner_client_id, enabled, updated_at DESC);

CREATE TABLE IF NOT EXISTS partner_auth_notion_sync_contract_fields (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  contract_id TEXT NOT NULL REFERENCES partner_auth_notion_sync_contracts(id) ON DELETE CASCADE,
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('bidirectional', 'source_to_target', 'target_to_source')),
  ordinal INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_auth_notion_sync_contract_fields_unique_pair
  ON partner_auth_notion_sync_contract_fields(contract_id, source_field, target_field);

CREATE INDEX IF NOT EXISTS idx_partner_auth_notion_sync_contract_fields_contract
  ON partner_auth_notion_sync_contract_fields(contract_id, ordinal ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS partner_auth_notion_sync_record_mappings (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  contract_id TEXT NOT NULL REFERENCES partner_auth_notion_sync_contracts(id) ON DELETE CASCADE,
  source_page_id TEXT NOT NULL,
  target_page_id TEXT NOT NULL,
  source_last_edited_time TEXT,
  target_last_edited_time TEXT,
  source_last_hash TEXT,
  target_last_hash TEXT,
  mapping_status TEXT NOT NULL DEFAULT 'active' CHECK (mapping_status IN ('active', 'archived', 'tombstoned', 'conflicted')),
  last_synced_at TEXT,
  archived_at TEXT,
  tombstoned_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_auth_notion_sync_record_mappings_source
  ON partner_auth_notion_sync_record_mappings(contract_id, source_page_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_auth_notion_sync_record_mappings_target
  ON partner_auth_notion_sync_record_mappings(contract_id, target_page_id);

CREATE INDEX IF NOT EXISTS idx_partner_auth_notion_sync_record_mappings_contract_status
  ON partner_auth_notion_sync_record_mappings(contract_id, mapping_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS partner_auth_notion_sync_runs (
  id TEXT PRIMARY KEY,
  partner_client_id TEXT NOT NULL REFERENCES partner_auth_clients(id) ON DELETE CASCADE,
  contract_id TEXT NOT NULL REFERENCES partner_auth_notion_sync_contracts(id) ON DELETE CASCADE,
  contract_slug TEXT NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'dry_run')),
  dry_run INTEGER NOT NULL DEFAULT 0 CHECK (dry_run IN (0, 1)),
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  archived_count INTEGER NOT NULL DEFAULT 0,
  conflicted_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors_json TEXT NOT NULL DEFAULT '[]',
  conflicts_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_notion_sync_runs_contract_created
  ON partner_auth_notion_sync_runs(contract_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_auth_notion_sync_runs_client_created
  ON partner_auth_notion_sync_runs(partner_client_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_auth_notion_sync_runs_contract_idempotency
  ON partner_auth_notion_sync_runs(contract_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
