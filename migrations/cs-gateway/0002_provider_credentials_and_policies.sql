PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS provider_credentials (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider_slug TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('managed', 'byok')),
  managed_secret_name TEXT,
  encrypted_api_key TEXT,
  key_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES gateway_tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_credentials_unique_active
  ON provider_credentials(tenant_id, provider_slug, status);

CREATE TABLE IF NOT EXISTS tenant_policies (
  tenant_id TEXT PRIMARY KEY,
  read_only INTEGER NOT NULL DEFAULT 0,
  allow_prompt_logging INTEGER NOT NULL DEFAULT 0,
  approval_posture TEXT NOT NULL DEFAULT 'operator' CHECK (approval_posture IN ('operator', 'tenant', 'none')),
  policy_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES gateway_tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_model_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider_slug TEXT NOT NULL,
  model_name TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  max_output_tokens INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES gateway_tenants(id) ON DELETE CASCADE,
  UNIQUE (tenant_id, provider_slug, model_name)
);

CREATE TABLE IF NOT EXISTS tenant_provider_kill_switches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider_slug TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES gateway_tenants(id) ON DELETE CASCADE,
  UNIQUE (tenant_id, provider_slug)
);

CREATE INDEX IF NOT EXISTS idx_model_policies_tenant ON tenant_model_policies(tenant_id, model_name, is_enabled);
CREATE INDEX IF NOT EXISTS idx_kill_switches_tenant ON tenant_provider_kill_switches(tenant_id, provider_slug, is_enabled);

CREATE TRIGGER IF NOT EXISTS trg_provider_credentials_updated_at
AFTER UPDATE ON provider_credentials
FOR EACH ROW
BEGIN
  UPDATE provider_credentials SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_tenant_policies_updated_at
AFTER UPDATE ON tenant_policies
FOR EACH ROW
BEGIN
  UPDATE tenant_policies SET updated_at = datetime('now') WHERE tenant_id = OLD.tenant_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_tenant_model_policies_updated_at
AFTER UPDATE ON tenant_model_policies
FOR EACH ROW
BEGIN
  UPDATE tenant_model_policies SET updated_at = datetime('now') WHERE id = OLD.id;
END;
