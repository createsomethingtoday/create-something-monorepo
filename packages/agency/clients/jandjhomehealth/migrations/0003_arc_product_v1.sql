CREATE TABLE IF NOT EXISTS arcs (
  id TEXT PRIMARY KEY,
  owner_contact TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  current_revision INTEGER NOT NULL,
  published_revision INTEGER,
  document_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS arc_versions (
  arc_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  status TEXT NOT NULL,
  document_json TEXT NOT NULL,
  actor TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (arc_id, revision),
  FOREIGN KEY (arc_id) REFERENCES arcs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS arc_receipts (
  id TEXT PRIMARY KEY,
  arc_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (arc_id) REFERENCES arcs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS arc_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  arc_id TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (arc_id) REFERENCES arcs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS arc_analytics (
  id TEXT PRIMARY KEY,
  arc_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('opened', 'completed', 'exited')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (arc_id) REFERENCES arcs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_arc_versions_arc ON arc_versions(arc_id, revision DESC);
CREATE INDEX IF NOT EXISTS idx_arc_receipts_arc ON arc_receipts(arc_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arc_analytics_arc ON arc_analytics(arc_id, created_at DESC);
