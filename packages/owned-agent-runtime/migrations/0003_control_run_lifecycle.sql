-- Governed Control run state belongs to the owned runtime. The authoritative
-- activation remains in Agency D1 and is frozen into each run; this migration
-- creates no run, command, approval, or receipt rows.

CREATE TABLE control_runs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  activation_id TEXT NOT NULL,
  activation_version INTEGER NOT NULL CHECK (activation_version >= 1),
  activation_json TEXT NOT NULL CHECK (json_valid(activation_json)),
  status TEXT NOT NULL CHECK (status IN (
    'queued', 'running', 'waiting_for_approval', 'stopped', 'cancelled',
    'failed', 'fallback_required', 'recovering', 'recovered', 'completed',
    'terminated'
  )),
  version INTEGER NOT NULL CHECK (version >= 1),
  attempt INTEGER NOT NULL CHECK (attempt >= 1),
  concurrency_key TEXT NOT NULL,
  requested_tools_json TEXT NOT NULL
    CHECK (json_valid(requested_tools_json) AND json_type(requested_tools_json) = 'array'),
  requested_resources_json TEXT NOT NULL
    CHECK (json_valid(requested_resources_json) AND json_type(requested_resources_json) = 'array'),
  pending_approval_kind TEXT,
  recovery TEXT,
  last_error TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_control_runs_scope_updated
  ON control_runs(account_id, tenant_id, workspace_account_id, updated_at DESC);

CREATE UNIQUE INDEX idx_control_runs_active_concurrency
  ON control_runs(account_id, tenant_id, workspace_account_id, concurrency_key)
  WHERE status IN ('queued', 'running', 'waiting_for_approval', 'recovering');

CREATE TABLE control_run_commands (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  command_sha256 TEXT NOT NULL CHECK (length(command_sha256) = 64),
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  created_at TEXT NOT NULL,
  UNIQUE (account_id, tenant_id, workspace_account_id, idempotency_key),
  FOREIGN KEY (run_id) REFERENCES control_runs(id) ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE control_run_receipts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  event_index INTEGER NOT NULL CHECK (event_index >= 1),
  status TEXT NOT NULL CHECK (status IN (
    'queued', 'running', 'waiting_for_approval', 'stopped', 'cancelled',
    'failed', 'fallback_required', 'recovering', 'recovered', 'completed',
    'terminated'
  )),
  receipt_json TEXT NOT NULL CHECK (json_valid(receipt_json)),
  receipt_sha256 TEXT NOT NULL CHECK (length(receipt_sha256) = 64),
  previous_receipt_sha256 TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (run_id, event_index),
  UNIQUE (run_id, receipt_sha256),
  FOREIGN KEY (run_id) REFERENCES control_runs(id) ON DELETE RESTRICT
);

CREATE INDEX idx_control_run_receipts_scope
  ON control_run_receipts(account_id, tenant_id, workspace_account_id, run_id, event_index);

CREATE TRIGGER control_run_frozen_activation_is_immutable
BEFORE UPDATE ON control_runs
WHEN NEW.id IS NOT OLD.id
  OR NEW.account_id IS NOT OLD.account_id
  OR NEW.tenant_id IS NOT OLD.tenant_id
  OR NEW.workspace_account_id IS NOT OLD.workspace_account_id
  OR NEW.activation_id IS NOT OLD.activation_id
  OR NEW.activation_version IS NOT OLD.activation_version
  OR NEW.activation_json IS NOT OLD.activation_json
  OR NEW.concurrency_key IS NOT OLD.concurrency_key
  OR NEW.requested_tools_json IS NOT OLD.requested_tools_json
  OR NEW.requested_resources_json IS NOT OLD.requested_resources_json
  OR NEW.created_by IS NOT OLD.created_by
  OR NEW.created_at IS NOT OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'Control run activation, scope, policy request, and creator are immutable');
END;

CREATE TRIGGER control_run_version_is_monotonic
BEFORE UPDATE ON control_runs
WHEN NEW.version <= OLD.version OR NEW.attempt < OLD.attempt OR NEW.updated_at < OLD.updated_at
BEGIN
  SELECT RAISE(ABORT, 'Control run version, attempt, and update time must be monotonic');
END;

CREATE TRIGGER control_run_state_transition_is_valid
BEFORE UPDATE OF status ON control_runs
WHEN NOT (
  (OLD.status = 'queued' AND NEW.status IN (
    'running', 'waiting_for_approval', 'stopped', 'cancelled', 'failed',
    'fallback_required', 'completed', 'terminated'
  ))
  OR (OLD.status = 'running' AND NEW.status IN (
    'waiting_for_approval', 'stopped', 'cancelled', 'failed',
    'fallback_required', 'completed', 'terminated'
  ))
  OR (OLD.status = 'waiting_for_approval' AND NEW.status IN (
    'queued', 'stopped', 'cancelled', 'terminated'
  ))
  OR (OLD.status = 'stopped' AND NEW.status IN ('queued', 'recovering', 'cancelled', 'terminated'))
  OR (OLD.status = 'failed' AND NEW.status IN ('cancelled', 'terminated'))
  OR (
    OLD.status = 'failed' AND NEW.status = 'recovering' AND EXISTS (
      SELECT 1 FROM control_run_receipts receipt
      WHERE receipt.run_id = OLD.id
        AND receipt.event_index = (
          SELECT MAX(latest.event_index)
          FROM control_run_receipts latest
          WHERE latest.run_id = OLD.id
        )
        AND json_extract(receipt.receipt_json, '$.verifier') = 'retryable_failure'
    )
  )
  OR (
    OLD.status = 'failed' AND NEW.status = 'queued' AND EXISTS (
      SELECT 1 FROM control_run_receipts receipt
      WHERE receipt.run_id = OLD.id
        AND receipt.event_index = (
          SELECT MAX(latest.event_index)
          FROM control_run_receipts latest
          WHERE latest.run_id = OLD.id
        )
        AND json_extract(receipt.receipt_json, '$.verifier') = 'retryable_failure'
    )
  )
  OR (OLD.status = 'fallback_required' AND NEW.status IN ('recovering', 'cancelled', 'terminated'))
  OR (OLD.status = 'recovering' AND NEW.status IN ('recovered', 'cancelled', 'terminated'))
  OR (OLD.status = 'recovered' AND NEW.status IN ('queued', 'cancelled', 'terminated'))
)
BEGIN
  SELECT RAISE(ABORT, 'Control run state transition is invalid');
END;

CREATE TRIGGER control_run_receipt_matches_scope_and_chain
BEFORE INSERT ON control_run_receipts
WHEN NOT EXISTS (
  SELECT 1 FROM control_runs run
  WHERE run.id = NEW.run_id
    AND run.account_id = NEW.account_id
    AND run.tenant_id = NEW.tenant_id
    AND run.workspace_account_id = NEW.workspace_account_id
)
OR (
  NEW.event_index = 1 AND NEW.previous_receipt_sha256 IS NOT NULL
)
OR (
  NEW.event_index > 1 AND NOT EXISTS (
    SELECT 1 FROM control_run_receipts previous
    WHERE previous.run_id = NEW.run_id
      AND previous.event_index = NEW.event_index - 1
      AND previous.receipt_sha256 = NEW.previous_receipt_sha256
  )
)
BEGIN
  SELECT RAISE(ABORT, 'Control run receipt scope or hash chain is invalid');
END;

CREATE TRIGGER control_run_receipt_is_immutable
BEFORE UPDATE ON control_run_receipts
BEGIN
  SELECT RAISE(ABORT, 'Control run receipts are immutable');
END;

CREATE TRIGGER control_run_receipt_cannot_be_deleted
BEFORE DELETE ON control_run_receipts
BEGIN
  SELECT RAISE(ABORT, 'Control run receipts cannot be deleted');
END;

CREATE TRIGGER control_run_command_is_immutable_after_result
BEFORE UPDATE ON control_run_commands
WHEN OLD.result_json IS NOT NULL
  OR NEW.id IS NOT OLD.id
  OR NEW.account_id IS NOT OLD.account_id
  OR NEW.tenant_id IS NOT OLD.tenant_id
  OR NEW.workspace_account_id IS NOT OLD.workspace_account_id
  OR NEW.run_id IS NOT OLD.run_id
  OR NEW.idempotency_key IS NOT OLD.idempotency_key
  OR NEW.command_sha256 IS NOT OLD.command_sha256
  OR NEW.created_at IS NOT OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'Control run command identity and terminal result are immutable');
END;

CREATE TRIGGER control_run_command_cannot_be_deleted
BEFORE DELETE ON control_run_commands
BEGIN
  SELECT RAISE(ABORT, 'Control run commands cannot be deleted');
END;
