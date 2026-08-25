-- Approval context binds a wait to its exact Control and runtime tuple.
-- Historical rows remain readable as legacy ledger facts but cannot appear in
-- the v1 proof projection without this context.

ALTER TABLE control_workflow_runtime_approvals
  ADD COLUMN approval_context_json TEXT CHECK (
    approval_context_json IS NULL OR json_valid(approval_context_json)
  );

CREATE TRIGGER control_workflow_runtime_approval_context_is_required
BEFORE INSERT ON control_workflow_runtime_approvals
WHEN NEW.approval_context_json IS NULL OR json_valid(NEW.approval_context_json) = 0
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime approval context is required');
END;

CREATE TRIGGER control_workflow_runtime_approval_context_is_immutable
BEFORE UPDATE ON control_workflow_runtime_approvals
WHEN NEW.approval_context_json IS NOT OLD.approval_context_json
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime approval context is immutable');
END;
