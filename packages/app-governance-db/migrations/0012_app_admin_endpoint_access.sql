-- Webflow Admin endpoint capability and receipt state.
-- The MRP endpoint is app-supported when an MRP id no-op probe succeeds.
-- Existing templates currently resolve to legacy Template ids and should be
-- recorded as unsupported until a successful probe proves an MRP row exists.

ALTER TABLE apps ADD COLUMN mrp_id TEXT;
ALTER TABLE apps ADD COLUMN mrp_resource_type TEXT;
ALTER TABLE apps ADD COLUMN mrp_status TEXT;
ALTER TABLE apps ADD COLUMN mrp_visibility TEXT;
ALTER TABLE apps ADD COLUMN mrp_update_supported INTEGER;
ALTER TABLE apps ADD COLUMN mrp_verified_at TEXT;
ALTER TABLE apps ADD COLUMN mrp_update_error TEXT;

CREATE INDEX IF NOT EXISTS idx_apps_app_id ON apps (app_id);
CREATE INDEX IF NOT EXISTS idx_apps_workspace ON apps (workspace_id);
CREATE INDEX IF NOT EXISTS idx_apps_mrp ON apps (mrp_id);

CREATE TABLE IF NOT EXISTS app_admin_endpoint_capabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,             -- app | template | library | other
  entity_key TEXT NOT NULL,              -- stable local key: slug, template id, etc.
  app_slug TEXT,
  app_id TEXT,
  client_id TEXT,
  workspace_id TEXT,
  mrp_id TEXT,
  resource_type TEXT,
  resource_id TEXT,
  endpoint_method TEXT NOT NULL DEFAULT 'PUT',
  endpoint_path TEXT NOT NULL DEFAULT '/admin/api/mrp/airtable',
  supports_noop_read INTEGER NOT NULL DEFAULT 0,
  supports_write INTEGER NOT NULL DEFAULT 0,
  http_status INTEGER,
  status TEXT NOT NULL,                  -- verified | unsupported | error | unknown
  unsupported_reason TEXT,
  error TEXT,
  response_summary_json TEXT,
  verified_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (entity_type, entity_key, endpoint_method, endpoint_path)
);

CREATE INDEX IF NOT EXISTS idx_app_endpoint_capabilities_mrp ON app_admin_endpoint_capabilities (mrp_id);
CREATE INDEX IF NOT EXISTS idx_app_endpoint_capabilities_app ON app_admin_endpoint_capabilities (app_slug, app_id);

CREATE TABLE IF NOT EXISTS app_admin_endpoint_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_slug TEXT,
  app_id TEXT,
  client_id TEXT,
  workspace_id TEXT,
  mrp_id TEXT,
  endpoint_method TEXT NOT NULL DEFAULT 'PUT',
  endpoint_path TEXT NOT NULL DEFAULT '/admin/api/mrp/airtable',
  operation TEXT NOT NULL,               -- noop_read | update | unsupported_probe
  status TEXT NOT NULL,                  -- requested | approved | succeeded | failed | unsupported
  http_status INTEGER,
  requested_patch_json TEXT,
  before_json TEXT,
  after_json TEXT,
  response_summary_json TEXT,
  error TEXT,
  expected_until TEXT,
  actor TEXT NOT NULL DEFAULT 'app-governance',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_endpoint_receipts_app ON app_admin_endpoint_receipts (app_slug, app_id, created_at);
CREATE INDEX IF NOT EXISTS idx_app_endpoint_receipts_mrp ON app_admin_endpoint_receipts (mrp_id, created_at);
