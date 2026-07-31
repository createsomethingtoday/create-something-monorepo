-- Privacy-safe interaction ledger for measuring where humans, agents, systems,
-- and policy participate in a workflow. Store identifiers as hashes and keep
-- raw content and direct personal identifiers out of this table.

CREATE TABLE workflow_interaction_events (
  id TEXT PRIMARY KEY,
  property TEXT NOT NULL DEFAULT 'agency' CHECK (property = 'agency'),
  workflow_id TEXT,
  account_id TEXT,
  tenant_id TEXT,
  workspace_account_id TEXT,
  session_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  parent_event_id TEXT,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'agent', 'system', 'policy')),
  actor_id_hash TEXT CHECK (actor_id_hash IS NULL OR length(actor_id_hash) = 64),
  event_type TEXT NOT NULL
    CHECK (event_type IN ('request', 'recommendation', 'approval_requested', 'approval_decided', 'action_proposed', 'action_executed', 'proof_attached', 'recovery_triggered')),
  authority_state TEXT CHECK (authority_state IN ('run', 'wait', 'stop')),
  tool_id TEXT,
  outcome TEXT CHECK (outcome IN ('completed', 'blocked', 'failed', 'cancelled')),
  approval_required INTEGER NOT NULL DEFAULT 0 CHECK (approval_required IN (0, 1)),
  proof_ref TEXT,
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_event_id) REFERENCES workflow_interaction_events(id) ON DELETE RESTRICT
);

CREATE INDEX idx_workflow_interactions_correlation
  ON workflow_interaction_events(correlation_id, created_at);

CREATE INDEX idx_workflow_interactions_workflow
  ON workflow_interaction_events(workflow_id, created_at);

CREATE INDEX idx_workflow_interactions_actor_event
  ON workflow_interaction_events(actor_kind, event_type, created_at);
