-- Agent/API-managed workflow actions for Atlas runtime operation.
-- Runs record execution, receipts record evidence, and actions record the
-- proposed/approved/blocked work units that move a mapped workflow forward.

CREATE TABLE IF NOT EXISTS workflow_actions (
  action_id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL REFERENCES atlas_canvases(canvas_id),
  node_id TEXT REFERENCES atlas_nodes(node_id),
  run_id TEXT REFERENCES workflow_runs(run_id),
  title TEXT NOT NULL,
  description TEXT,
  action_kind TEXT NOT NULL DEFAULT 'task',     -- task | approval | question | decision | handoff | automation
  status TEXT NOT NULL DEFAULT 'proposed',      -- proposed | approved | rejected | ready | running | completed | blocked | canceled
  gate_kind TEXT NOT NULL DEFAULT 'review',     -- safe | review | approval
  priority TEXT NOT NULL DEFAULT 'P2',          -- P0 | P1 | P2 | P3
  owner TEXT,
  proposed_by TEXT NOT NULL,
  approved_by TEXT,
  source_kind TEXT,
  source_id TEXT,
  artifact_url TEXT,
  evidence TEXT,
  metadata_json TEXT,
  approved_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workflow_actions_canvas_status
  ON workflow_actions (canvas_id, status, gate_kind);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_node_status
  ON workflow_actions (node_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_run
  ON workflow_actions (run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_owner
  ON workflow_actions (owner, status);
