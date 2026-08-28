-- Control-owned source-observation dispatch ledger. It contains only fixed
-- request metadata, digests, bounded counts, and verifier evidence; raw queue
-- records and credentials have no storage column.

CREATE TABLE control_workflow_runtime_dispatches (
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  capability_parameter_sha256 TEXT NOT NULL CHECK (length(capability_parameter_sha256) = 71),
  request_sha256 TEXT NOT NULL CHECK (length(request_sha256) = 71),
  source_idempotency_key TEXT NOT NULL,
  source_service TEXT NOT NULL,
  source_resource TEXT NOT NULL,
  source_tool TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('prepared', 'verified', 'effect_unknown')),
  source_invocation_sha256 TEXT CHECK (source_invocation_sha256 IS NULL OR length(source_invocation_sha256) = 71),
  response_sha256 TEXT CHECK (response_sha256 IS NULL OR length(response_sha256) = 71),
  observed_item_count INTEGER CHECK (observed_item_count IS NULL OR (observed_item_count >= 0 AND observed_item_count <= 5)),
  source_invocation_evidence_sha256 TEXT CHECK (source_invocation_evidence_sha256 IS NULL OR length(source_invocation_evidence_sha256) = 71),
  verifier TEXT CHECK (
    verifier IS NULL OR (
      length(verifier) BETWEEN 1 AND 80
      AND verifier GLOB '[a-z]*'
      AND verifier NOT GLOB '*[^a-z0-9_-]*'
    )
  ),
  verifier_evidence_sha256 TEXT CHECK (verifier_evidence_sha256 IS NULL OR length(verifier_evidence_sha256) = 71),
  failure_code TEXT CHECK (
    failure_code IS NULL OR (
      length(failure_code) BETWEEN 1 AND 80
      AND failure_code GLOB '[a-z]*'
      AND failure_code NOT GLOB '*[^a-z0-9_]*'
    )
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (run_id, step_id, attempt_id),
  UNIQUE (source_service, source_idempotency_key),
  FOREIGN KEY (run_id, step_id, attempt_id)
    REFERENCES control_workflow_runtime_attempts(run_id, step_id, attempt_id) ON DELETE RESTRICT,
  CHECK (
    (status = 'prepared'
      AND source_invocation_sha256 IS NULL AND response_sha256 IS NULL
      AND observed_item_count IS NULL AND source_invocation_evidence_sha256 IS NULL
      AND verifier IS NULL AND verifier_evidence_sha256 IS NULL AND failure_code IS NULL)
    OR
    (status = 'verified'
      AND source_invocation_sha256 IS NOT NULL AND response_sha256 IS NOT NULL
      AND observed_item_count IS NOT NULL AND source_invocation_evidence_sha256 IS NOT NULL
      AND verifier IS NOT NULL AND verifier_evidence_sha256 IS NOT NULL AND failure_code IS NULL)
    OR
    (status = 'effect_unknown'
      AND source_invocation_sha256 IS NOT NULL AND response_sha256 IS NOT NULL
      AND observed_item_count IS NOT NULL AND source_invocation_evidence_sha256 IS NOT NULL
      AND verifier IS NULL AND verifier_evidence_sha256 IS NULL AND failure_code IS NOT NULL)
  )
);

CREATE INDEX idx_control_workflow_runtime_dispatches_status
  ON control_workflow_runtime_dispatches(status, updated_at DESC);

CREATE TRIGGER control_workflow_runtime_dispatch_identity_is_immutable
BEFORE UPDATE ON control_workflow_runtime_dispatches
WHEN NEW.run_id IS NOT OLD.run_id
  OR NEW.step_id IS NOT OLD.step_id
  OR NEW.attempt_id IS NOT OLD.attempt_id
  OR NEW.capability_id IS NOT OLD.capability_id
  OR NEW.capability_parameter_sha256 IS NOT OLD.capability_parameter_sha256
  OR NEW.request_sha256 IS NOT OLD.request_sha256
  OR NEW.source_idempotency_key IS NOT OLD.source_idempotency_key
  OR NEW.source_service IS NOT OLD.source_service
  OR NEW.source_resource IS NOT OLD.source_resource
  OR NEW.source_tool IS NOT OLD.source_tool
  OR OLD.status IS NOT 'prepared'
  OR NEW.status NOT IN ('verified', 'effect_unknown')
  OR NEW.created_at IS NOT OLD.created_at
  OR NEW.updated_at < OLD.updated_at
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime dispatch identity is immutable');
END;

CREATE TRIGGER control_workflow_runtime_dispatch_cannot_be_deleted
BEFORE DELETE ON control_workflow_runtime_dispatches
BEGIN
  SELECT RAISE(ABORT, 'Control Workflow Runtime dispatches cannot be deleted');
END;
