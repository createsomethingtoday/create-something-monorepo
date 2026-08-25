-- A registration-bound approval must carry the exact compiler approval
-- surface and a Control-defined command contract. Decision roles are derived
-- from a verified Identity assertion and remain separate from subjects.
-- Legacy v0.1 checkpoints remain readable without this new attestation.

CREATE TABLE control_workflow_runtime_approval_attestations (
  approval_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  approval_surface_schema TEXT NOT NULL CHECK (
    approval_surface_schema IN (
      'approval_surfaces.v0.1', 'approval_surfaces.v0.2', 'approval_surfaces.v0.3'
    )
  ),
  approval_surface_sha256 TEXT NOT NULL CHECK (
    length(approval_surface_sha256) = 71
    AND substr(approval_surface_sha256, 1, 7) = 'sha256:'
    AND substr(approval_surface_sha256, 8) NOT GLOB '*[^0-9a-f]*'
  ),
  approval_command_schema TEXT NOT NULL CHECK (
    approval_command_schema = 'create-something/control-workflow-runtime-approval-command@1'
  ),
  approval_command_version INTEGER NOT NULL CHECK (approval_command_version = 1),
  decision_actor_role TEXT CHECK (
    decision_actor_role IS NULL OR decision_actor_role IN (
      'account_owner', 'agency_operator', 'account_reader', 'control_scheduler'
    )
  ),
  created_at TEXT NOT NULL,
  UNIQUE (run_id, step_id),
  FOREIGN KEY (approval_id) REFERENCES control_workflow_runtime_approvals(approval_id)
    ON DELETE RESTRICT,
  FOREIGN KEY (run_id, step_id) REFERENCES control_workflow_runtime_steps(run_id, step_id)
    ON DELETE RESTRICT
);

CREATE TRIGGER control_workflow_runtime_approval_attestation_must_match_wait_receipt
BEFORE INSERT ON control_workflow_runtime_approval_attestations
WHEN EXISTS (
  SELECT 1 FROM control_workflow_runtime_runs runtime
  WHERE runtime.run_id = NEW.run_id
    AND json_extract(runtime.run_json, '$.schema') = 'workflow_runtime_run.v0.2'
)
  AND (
    NEW.decision_actor_role IS NOT NULL
    OR NOT EXISTS (
      SELECT 1
      FROM control_workflow_runtime_approvals approval
      JOIN control_workflow_runtime_receipts receipt
        ON receipt.run_id = approval.run_id
      WHERE approval.approval_id = NEW.approval_id
        AND approval.run_id = NEW.run_id
        AND approval.step_id = NEW.step_id
        AND approval.created_at = NEW.created_at
        AND receipt.created_at = NEW.created_at
        AND json_extract(receipt.receipt_json, '$.eventType') = 'wait_created'
        AND json_extract(receipt.receipt_json, '$.stepId') = NEW.step_id
        AND json_extract(receipt.receipt_json, '$.approvalSurfaceSha256') =
          NEW.approval_surface_sha256
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime approval attestation must match its wait receipt');
END;

CREATE TRIGGER control_workflow_runtime_approval_attestation_identity_is_immutable
BEFORE UPDATE ON control_workflow_runtime_approval_attestations
WHEN NEW.approval_id IS NOT OLD.approval_id
  OR NEW.run_id IS NOT OLD.run_id
  OR NEW.step_id IS NOT OLD.step_id
  OR NEW.approval_surface_schema IS NOT OLD.approval_surface_schema
  OR NEW.approval_surface_sha256 IS NOT OLD.approval_surface_sha256
  OR NEW.approval_command_schema IS NOT OLD.approval_command_schema
  OR NEW.approval_command_version IS NOT OLD.approval_command_version
  OR NEW.created_at IS NOT OLD.created_at
  OR OLD.decision_actor_role IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime approval attestation identity is immutable');
END;

CREATE TRIGGER control_workflow_runtime_approval_attestation_role_requires_decision_receipt
BEFORE UPDATE OF decision_actor_role ON control_workflow_runtime_approval_attestations
WHEN NEW.decision_actor_role IS NOT OLD.decision_actor_role
  AND (
    OLD.decision_actor_role IS NOT NULL
    OR NEW.decision_actor_role IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM control_workflow_runtime_approvals approval
      JOIN control_workflow_runtime_receipts receipt
        ON receipt.run_id = approval.run_id
      WHERE approval.approval_id = NEW.approval_id
        AND approval.run_id = NEW.run_id
        AND approval.step_id = NEW.step_id
        AND approval.decision IN ('approved', 'rejected')
        AND approval.decided_at IS NOT NULL
        AND receipt.created_at = approval.decided_at
        AND json_extract(receipt.receipt_json, '$.eventType') = 'approval_decided'
        AND json_extract(receipt.receipt_json, '$.stepId') = NEW.step_id
        AND json_extract(receipt.receipt_json, '$.actorRole') = NEW.decision_actor_role
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime approval role requires its decision receipt');
END;

CREATE TRIGGER control_workflow_runtime_approval_attestations_cannot_be_deleted
BEFORE DELETE ON control_workflow_runtime_approval_attestations
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime approval attestations cannot be deleted');
END;

CREATE TRIGGER control_workflow_runtime_approval_decision_requires_attestation
BEFORE UPDATE OF decision, decided_at ON control_workflow_runtime_approvals
WHEN EXISTS (
  SELECT 1 FROM control_workflow_runtime_runs runtime
  WHERE runtime.run_id = NEW.run_id
    AND json_extract(runtime.run_json, '$.schema') = 'workflow_runtime_run.v0.2'
)
  AND (
    NEW.decision IS NULL
    OR NEW.decided_at IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM control_workflow_runtime_approval_attestations attestation
      JOIN control_workflow_runtime_receipts receipt
        ON receipt.run_id = attestation.run_id
      WHERE attestation.approval_id = NEW.approval_id
        AND attestation.run_id = NEW.run_id
        AND attestation.step_id = NEW.step_id
        AND receipt.created_at = NEW.decided_at
        AND json_extract(receipt.receipt_json, '$.eventType') = 'approval_decided'
        AND json_extract(receipt.receipt_json, '$.stepId') = NEW.step_id
        AND json_extract(receipt.receipt_json, '$.actorRole') IN (
          'account_owner', 'agency_operator', 'account_reader', 'control_scheduler'
        )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime approval decision requires an attestation');
END;
