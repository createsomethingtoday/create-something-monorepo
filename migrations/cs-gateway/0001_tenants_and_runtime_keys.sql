PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS gateway_tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_runtime_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  created_by TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES gateway_tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_runtime_keys_tenant ON tenant_runtime_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_runtime_keys_active ON tenant_runtime_keys(key_hash, revoked_at);

CREATE TRIGGER IF NOT EXISTS trg_gateway_tenants_updated_at
AFTER UPDATE ON gateway_tenants
FOR EACH ROW
BEGIN
  UPDATE gateway_tenants SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_runtime_keys_updated_at
AFTER UPDATE ON tenant_runtime_keys
FOR EACH ROW
BEGIN
  UPDATE tenant_runtime_keys SET updated_at = datetime('now') WHERE id = OLD.id;
END;
