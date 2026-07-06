-- Docs alignment layer: governed documentation locations (webflow/openapi-internal)
-- and programmatic subscriptions. When a submission/finding is flagged as
-- misaligned with a doc location, subscribers of that location (or its path
-- prefix, category, or source) get queued notifications — delivery evidence
-- lands in notifications + events (the receipts).

CREATE TABLE IF NOT EXISTS doc_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo TEXT NOT NULL DEFAULT 'webflow/openapi-internal',
  path TEXT NOT NULL,                     -- e.g. fern/products/data/pages/MARKETPLACE/private-apps.mdx
  title TEXT,
  category_id TEXT REFERENCES categories(id),
  atlas_node_id TEXT,
  status TEXT NOT NULL DEFAULT 'governed',-- governed | draft | deprecated
  last_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (repo, path)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target TEXT NOT NULL,                   -- '@paige', '#triage-marketplace-apps', 'security@'
  scope_kind TEXT NOT NULL,               -- doc_path | category | source
  scope_key TEXT NOT NULL,                -- path prefix, category id, or source external id
  reason TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_doc_locations_path ON doc_locations (path);
CREATE INDEX IF NOT EXISTS idx_subscriptions_scope ON subscriptions (scope_kind, scope_key, active);

INSERT OR IGNORE INTO sources (source_type, external_id, name, workspace, atlas_canvas_id, atlas_node_id) VALUES
  ('docs_repo', 'webflow/openapi-internal', 'Developer docs & API reference (openapi-internal)', 'github.com',
   'webflow-app-marketplace-governance-control-plane-mapping-mqsd1vwd', 'touchpoint_mqsd4e9s_70e0bu');
