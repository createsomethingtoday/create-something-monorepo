CREATE TABLE IF NOT EXISTS governance_connections (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('source', 'subscription')),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  atlas_canvas_id TEXT NOT NULL,
  atlas_node_id TEXT,
  endpoint_url TEXT,
  signing_secret_name TEXT,
  event_types_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(event_types_json)),
  owner TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_governance_connections_kind_status
  ON governance_connections(kind, status, created_at);

CREATE INDEX IF NOT EXISTS idx_governance_connections_atlas_canvas
  ON governance_connections(atlas_canvas_id, created_at);

CREATE TABLE IF NOT EXISTS governance_delivery_receipts (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  record_product_id TEXT NOT NULL CHECK (record_product_id IN ('atlas', 'signal', 'decision', 'proof')),
  record_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'delivered', 'failed', 'skipped')),
  status_code INTEGER,
  response_excerpt TEXT,
  delivered_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_governance_delivery_receipts_connection
  ON governance_delivery_receipts(connection_id, created_at);

CREATE INDEX IF NOT EXISTS idx_governance_delivery_receipts_record
  ON governance_delivery_receipts(record_product_id, record_id, created_at);

CREATE INDEX IF NOT EXISTS idx_governance_delivery_receipts_status
  ON governance_delivery_receipts(status, created_at);
