CREATE TABLE IF NOT EXISTS governance_signals (
  id TEXT PRIMARY KEY,
  atlas_canvas_id TEXT NOT NULL,
  atlas_node_id TEXT,
  source TEXT NOT NULL,
  source_url TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'dismissed')),
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_governance_signals_atlas_canvas
  ON governance_signals(atlas_canvas_id, created_at);

CREATE INDEX IF NOT EXISTS idx_governance_signals_atlas_node
  ON governance_signals(atlas_node_id, created_at);

CREATE INDEX IF NOT EXISTS idx_governance_signals_status
  ON governance_signals(status, created_at);

CREATE TABLE IF NOT EXISTS governance_decisions (
  id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL,
  atlas_canvas_id TEXT NOT NULL,
  atlas_node_id TEXT,
  decision_state TEXT NOT NULL CHECK (decision_state IN ('run', 'wait', 'stop')),
  decision_owner TEXT NOT NULL,
  reason TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_governance_decisions_signal
  ON governance_decisions(signal_id, created_at);

CREATE INDEX IF NOT EXISTS idx_governance_decisions_atlas_canvas
  ON governance_decisions(atlas_canvas_id, created_at);

CREATE TABLE IF NOT EXISTS governance_proofs (
  id TEXT PRIMARY KEY,
  signal_id TEXT,
  decision_id TEXT NOT NULL,
  atlas_canvas_id TEXT NOT NULL,
  atlas_node_id TEXT,
  evidence TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'documented' CHECK (outcome IN ('documented', 'passed', 'failed', 'rolled_back')),
  receipt_url TEXT,
  rollback_note TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_governance_proofs_decision
  ON governance_proofs(decision_id, created_at);

CREATE INDEX IF NOT EXISTS idx_governance_proofs_signal
  ON governance_proofs(signal_id, created_at);

CREATE INDEX IF NOT EXISTS idx_governance_proofs_atlas_canvas
  ON governance_proofs(atlas_canvas_id, created_at);
