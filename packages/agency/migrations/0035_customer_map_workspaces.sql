-- Durable customer Map workspaces for the authenticated .agency product.
--
-- Every access path is scoped by account_id + tenant_id + workspace_account_id.
-- Public /map browser drafts are intentionally not stored here until an authenticated
-- customer explicitly imports or creates a map.

CREATE TABLE customer_maps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version >= 1),
  review_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (review_state IN ('draft', 'in_review', 'approved', 'changes_requested')),
  retention_expires_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_customer_maps_workspace_updated
  ON customer_maps(account_id, tenant_id, workspace_account_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE customer_map_versions (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  canvas_json TEXT NOT NULL CHECK (json_valid(canvas_json)),
  message TEXT CHECK (message IS NULL OR length(message) <= 240),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (map_id, version),
  FOREIGN KEY (map_id) REFERENCES customer_maps(id) ON DELETE CASCADE
);

CREATE INDEX idx_customer_map_versions_account_map
  ON customer_map_versions(account_id, map_id, version DESC);

CREATE TABLE customer_map_review_events (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  map_version INTEGER NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  note TEXT,
  actor_subject TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (map_id) REFERENCES customer_maps(id) ON DELETE CASCADE
);

CREATE INDEX idx_customer_map_review_events_account_map
  ON customer_map_review_events(account_id, map_id, created_at DESC);

CREATE TABLE customer_map_shares (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  map_version INTEGER NOT NULL,
  token_digest TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (map_id) REFERENCES customer_maps(id) ON DELETE CASCADE
);

CREATE INDEX idx_customer_map_shares_account_map
  ON customer_map_shares(account_id, map_id, created_at DESC);

CREATE TABLE customer_map_handoffs (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  map_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared'
    CHECK (status IN ('prepared', 'accepted', 'cancelled')),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  accepted_at TEXT,
  FOREIGN KEY (map_id) REFERENCES customer_maps(id) ON DELETE CASCADE
);

CREATE INDEX idx_customer_map_handoffs_account_map
  ON customer_map_handoffs(account_id, map_id, created_at DESC);

CREATE TABLE customer_map_audit_events (
  id TEXT PRIMARY KEY,
  map_id TEXT,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  actor_subject TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL,
  FOREIGN KEY (map_id) REFERENCES customer_maps(id) ON DELETE SET NULL
);

CREATE INDEX idx_customer_map_audit_workspace_created
  ON customer_map_audit_events(account_id, tenant_id, workspace_account_id, created_at DESC);
