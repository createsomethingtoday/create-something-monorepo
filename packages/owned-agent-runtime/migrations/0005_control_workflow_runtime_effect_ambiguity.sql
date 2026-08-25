-- A v0.2 zero-write runtime intent can be externally dispatched after it is
-- persisted. Preserve that uncertainty on stop or cancellation with the
-- effect_ambiguous status; v0.1 checkpoints retain their abandoned label.

CREATE TABLE control_workflow_runtime_attempts_next (
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'prepared', 'succeeded', 'retryable_failure', 'failed', 'abandoned',
    'effect_ambiguous'
  )),
  attempt_json TEXT NOT NULL CHECK (json_valid(attempt_json)),
  created_at TEXT NOT NULL,
  PRIMARY KEY (run_id, step_id, attempt_id),
  FOREIGN KEY (run_id, step_id) REFERENCES control_workflow_runtime_steps(run_id, step_id) ON DELETE RESTRICT
);

INSERT INTO control_workflow_runtime_attempts_next
  (run_id, step_id, attempt_id, status, attempt_json, created_at)
SELECT run_id, step_id, attempt_id, status, attempt_json, created_at
FROM control_workflow_runtime_attempts;

DROP TABLE control_workflow_runtime_attempts;
ALTER TABLE control_workflow_runtime_attempts_next RENAME TO control_workflow_runtime_attempts;
