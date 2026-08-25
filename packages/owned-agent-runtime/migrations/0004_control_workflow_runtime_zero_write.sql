-- Additive, zero-write Workflow Runtime prototype ledger. The parent Control
-- run remains the tenant/activation authority; these tables cannot become a
-- second activation or external-effect writer.

CREATE TABLE control_workflow_runtime_runs (
  run_id TEXT PRIMARY KEY,
  admission_command_id TEXT NOT NULL UNIQUE,
  artifact_manifest_sha256 TEXT NOT NULL CHECK (length(artifact_manifest_sha256) = 71),
  runtime_manifest_sha256 TEXT NOT NULL CHECK (length(runtime_manifest_sha256) = 71),
  status TEXT NOT NULL CHECK (status IN (
    'queued', 'running', 'waiting_for_approval', 'retryable_failure',
    'blocked', 'failed', 'cancelled', 'completed'
  )),
  version INTEGER NOT NULL CHECK (version >= 1),
  run_json TEXT NOT NULL CHECK (json_valid(run_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES control_runs(id) ON DELETE RESTRICT
);

CREATE TABLE control_workflow_runtime_commands (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  command_sha256 TEXT NOT NULL CHECK (length(command_sha256) = 64),
  expected_version INTEGER,
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  created_at TEXT NOT NULL,
  UNIQUE (run_id, idempotency_key),
  UNIQUE (account_id, tenant_id, workspace_account_id, idempotency_key),
  FOREIGN KEY (run_id) REFERENCES control_workflow_runtime_runs(run_id) ON DELETE RESTRICT
);

CREATE TABLE control_workflow_runtime_steps (
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'ready', 'running', 'waiting_for_approval', 'succeeded',
    'retryable_failure', 'blocked', 'failed', 'cancelled'
  )),
  version INTEGER NOT NULL CHECK (version >= 1),
  step_json TEXT NOT NULL CHECK (json_valid(step_json)),
  PRIMARY KEY (run_id, step_id),
  FOREIGN KEY (run_id) REFERENCES control_workflow_runtime_runs(run_id) ON DELETE RESTRICT
);

CREATE TABLE control_workflow_runtime_attempts (
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'prepared', 'succeeded', 'retryable_failure', 'failed', 'abandoned'
  )),
  attempt_json TEXT NOT NULL CHECK (json_valid(attempt_json)),
  created_at TEXT NOT NULL,
  PRIMARY KEY (run_id, step_id, attempt_id),
  FOREIGN KEY (run_id, step_id) REFERENCES control_workflow_runtime_steps(run_id, step_id) ON DELETE RESTRICT
);

CREATE TABLE control_workflow_runtime_approvals (
  approval_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  binding_sha256 TEXT NOT NULL CHECK (length(binding_sha256) = 71),
  decision TEXT CHECK (decision IN ('approved', 'rejected')),
  approval_json TEXT NOT NULL CHECK (json_valid(approval_json)),
  created_at TEXT NOT NULL,
  decided_at TEXT,
  FOREIGN KEY (run_id, step_id) REFERENCES control_workflow_runtime_steps(run_id, step_id) ON DELETE RESTRICT
);

CREATE TABLE control_workflow_runtime_receipts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  event_index INTEGER NOT NULL CHECK (event_index >= 1),
  receipt_json TEXT NOT NULL CHECK (json_valid(receipt_json)),
  receipt_sha256 TEXT NOT NULL CHECK (length(receipt_sha256) = 71),
  previous_receipt_sha256 TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (run_id, event_index),
  UNIQUE (run_id, receipt_sha256),
  FOREIGN KEY (run_id) REFERENCES control_workflow_runtime_runs(run_id) ON DELETE RESTRICT
);

CREATE TABLE control_workflow_runtime_checkpoints (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  run_version INTEGER NOT NULL CHECK (run_version >= 1),
  run_sha256 TEXT NOT NULL CHECK (length(run_sha256) = 71),
  receipt_sha256 TEXT NOT NULL CHECK (length(receipt_sha256) = 71),
  checkpoint_json TEXT NOT NULL CHECK (json_valid(checkpoint_json)),
  created_at TEXT NOT NULL,
  UNIQUE (run_id, run_version),
  FOREIGN KEY (run_id) REFERENCES control_workflow_runtime_runs(run_id) ON DELETE RESTRICT
);

CREATE INDEX idx_control_workflow_runtime_runs_status
  ON control_workflow_runtime_runs(status, updated_at DESC);
CREATE INDEX idx_control_workflow_runtime_receipts_run
  ON control_workflow_runtime_receipts(run_id, event_index);
CREATE INDEX idx_control_workflow_runtime_checkpoints_run
  ON control_workflow_runtime_checkpoints(run_id, run_version DESC);

CREATE TRIGGER control_workflow_runtime_run_identity_is_immutable
BEFORE UPDATE ON control_workflow_runtime_runs
WHEN NEW.run_id IS NOT OLD.run_id
  OR NEW.admission_command_id IS NOT OLD.admission_command_id
  OR NEW.artifact_manifest_sha256 IS NOT OLD.artifact_manifest_sha256
  OR NEW.runtime_manifest_sha256 IS NOT OLD.runtime_manifest_sha256
  OR NEW.version <= OLD.version
  OR NEW.updated_at < OLD.updated_at
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime identity and version are immutable or non-monotonic');
END;

CREATE TRIGGER control_workflow_runtime_receipt_chain_is_valid
BEFORE INSERT ON control_workflow_runtime_receipts
WHEN (NEW.event_index = 1 AND NEW.previous_receipt_sha256 IS NOT NULL)
  OR (NEW.event_index > 1 AND NOT EXISTS (
    SELECT 1 FROM control_workflow_runtime_receipts previous
    WHERE previous.run_id = NEW.run_id
      AND previous.event_index = NEW.event_index - 1
      AND previous.receipt_sha256 = NEW.previous_receipt_sha256
  ))
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime receipt chain is invalid');
END;

CREATE TRIGGER control_workflow_runtime_receipt_is_immutable
BEFORE UPDATE ON control_workflow_runtime_receipts
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime receipts are immutable');
END;

CREATE TRIGGER control_workflow_runtime_receipt_cannot_be_deleted
BEFORE DELETE ON control_workflow_runtime_receipts
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime receipts cannot be deleted');
END;

CREATE TRIGGER control_workflow_runtime_checkpoint_is_immutable
BEFORE UPDATE ON control_workflow_runtime_checkpoints
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime checkpoints are immutable');
END;

CREATE TRIGGER control_workflow_runtime_checkpoint_cannot_be_deleted
BEFORE DELETE ON control_workflow_runtime_checkpoints
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime checkpoints cannot be deleted');
END;

CREATE TRIGGER control_workflow_runtime_command_is_immutable_after_result
BEFORE UPDATE ON control_workflow_runtime_commands
WHEN OLD.result_json IS NOT NULL
  OR NEW.id IS NOT OLD.id
  OR NEW.run_id IS NOT OLD.run_id
  OR NEW.account_id IS NOT OLD.account_id
  OR NEW.tenant_id IS NOT OLD.tenant_id
  OR NEW.workspace_account_id IS NOT OLD.workspace_account_id
  OR NEW.idempotency_key IS NOT OLD.idempotency_key
  OR NEW.command_sha256 IS NOT OLD.command_sha256
  OR NEW.created_at IS NOT OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime command identity and terminal result are immutable');
END;

CREATE TRIGGER control_workflow_runtime_command_cannot_be_deleted
BEFORE DELETE ON control_workflow_runtime_commands
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime commands cannot be deleted');
END;
