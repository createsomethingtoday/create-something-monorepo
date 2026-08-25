-- Proof readers derive approval facts from this Control-owned side ledger.
-- A pending approval may be decided once; neither identity nor decision history
-- may be rewritten after that point.

CREATE TRIGGER control_workflow_runtime_approval_must_begin_pending
BEFORE INSERT ON control_workflow_runtime_approvals
WHEN NEW.decision IS NOT NULL OR NEW.decided_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime approval must begin pending');
END;

CREATE TRIGGER control_workflow_runtime_approval_identity_is_immutable
BEFORE UPDATE ON control_workflow_runtime_approvals
WHEN NEW.approval_id IS NOT OLD.approval_id
  OR NEW.run_id IS NOT OLD.run_id
  OR NEW.step_id IS NOT OLD.step_id
  OR NEW.binding_sha256 IS NOT OLD.binding_sha256
  OR NEW.approval_json IS NOT OLD.approval_json
  OR NEW.created_at IS NOT OLD.created_at
  OR OLD.decision IS NOT NULL
  OR NEW.decision IS NULL
  OR NEW.decided_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime approval identity or decision is immutable');
END;

CREATE TRIGGER control_workflow_runtime_approvals_cannot_be_deleted
BEFORE DELETE ON control_workflow_runtime_approvals
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime approvals cannot be deleted');
END;

CREATE UNIQUE INDEX idx_control_workflow_runtime_approvals_run_step
  ON control_workflow_runtime_approvals(run_id, step_id);
