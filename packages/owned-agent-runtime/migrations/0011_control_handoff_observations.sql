-- Minimized source evidence for the handoff capability. This is not dispatch
-- authority. Control owns the parent run/step/attempt and the receipt relation.
-- Raw source records, credentials, free text, and submission data have no column.
CREATE TABLE control_workflow_runtime_handoff_observations (
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  request_sha256 TEXT NOT NULL CHECK (
    length(request_sha256) = 71 AND substr(request_sha256, 1, 7) = 'sha256:'
    AND substr(request_sha256, 8) NOT GLOB '*[^a-f0-9]*'
  ),
  source_invocation_sha256 TEXT NOT NULL CHECK (
    length(source_invocation_sha256) = 71 AND substr(source_invocation_sha256, 1, 7) = 'sha256:'
    AND substr(source_invocation_sha256, 8) NOT GLOB '*[^a-f0-9]*'
  ),
  observed_at TEXT NOT NULL CHECK (length(observed_at) = 24 AND julianday(observed_at) IS NOT NULL),
  observation_state TEXT NOT NULL,
  reason TEXT NOT NULL,
  next_action TEXT NOT NULL,
  evidence_sha256 TEXT NOT NULL CHECK (
    length(evidence_sha256) = 71 AND substr(evidence_sha256, 1, 7) = 'sha256:'
    AND substr(evidence_sha256, 8) NOT GLOB '*[^a-f0-9]*'
  ),
  dispatched_at TEXT NOT NULL CHECK (length(dispatched_at) = 24 AND julianday(dispatched_at) IS NOT NULL),
  received_at TEXT NOT NULL CHECK (length(received_at) = 24 AND julianday(received_at) IS NOT NULL),
  PRIMARY KEY (run_id, step_id, attempt_id),
  UNIQUE (source_invocation_sha256),
  FOREIGN KEY (run_id, step_id, attempt_id)
    REFERENCES control_workflow_runtime_attempts(run_id, step_id, attempt_id) ON DELETE RESTRICT,
  CHECK (julianday(dispatched_at) <= julianday(observed_at) AND julianday(observed_at) <= julianday(received_at)),
  CHECK (
    (observation_state = 'confirmed' AND reason = 'review_ready' AND next_action = 'await_review')
    OR (observation_state = 'confirmed' AND reason = 'review_progressed' AND next_action = 'inspect_review_outcome')
    OR (observation_state = 'insufficient_evidence'
      AND reason IN ('asset_missing', 'version_missing', 'review_status_missing', 'review_status_unknown', 'review_state_unproven')
      AND next_action = 'inspect_source_evidence')
    OR (observation_state = 'conflicting_evidence'
      AND reason IN ('source_identity_mismatch', 'version_asset_mismatch')
      AND next_action = 'escalate_source_conflict')
  )
);

CREATE TRIGGER control_handoff_observations_no_update
BEFORE UPDATE ON control_workflow_runtime_handoff_observations
BEGIN
  SELECT RAISE(ABORT, 'Control handoff observations are immutable');
END;

CREATE TRIGGER control_handoff_observations_no_delete
BEFORE DELETE ON control_workflow_runtime_handoff_observations
BEGIN
  SELECT RAISE(ABORT, 'Control handoff observations cannot be deleted');
END;

-- SQLite REPLACE can skip delete triggers when recursive_triggers is disabled.
-- Reject collisions before SQLite reaches its replacement conflict strategy.
CREATE TRIGGER control_handoff_observations_no_replace
BEFORE INSERT ON control_workflow_runtime_handoff_observations
WHEN EXISTS (
  SELECT 1 FROM control_workflow_runtime_handoff_observations existing
  WHERE (existing.run_id = NEW.run_id AND existing.step_id = NEW.step_id AND existing.attempt_id = NEW.attempt_id)
    OR existing.source_invocation_sha256 = NEW.source_invocation_sha256
)
BEGIN
  SELECT RAISE(ABORT, 'Control handoff observations cannot be replaced');
END;
