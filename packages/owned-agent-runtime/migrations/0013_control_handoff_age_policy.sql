-- Preserve historical source-clock age semantics. The current writer always
-- records version 2, bounding the oldest plausible observation by dispatch.
ALTER TABLE control_workflow_runtime_handoff_observations
  ADD COLUMN age_policy_version INTEGER NOT NULL DEFAULT 1 CHECK (age_policy_version IN (1, 2));
CREATE TRIGGER control_handoff_age_policy_v2
BEFORE INSERT ON control_workflow_runtime_handoff_observations
WHEN NEW.age_policy_version = 2 AND (
  (CAST(strftime('%s', NEW.received_at) AS INTEGER) * 1000 + CAST(substr(NEW.received_at,21,3) AS INTEGER)) -
  MAX(
    (CAST(strftime('%s', NEW.dispatched_at) AS INTEGER) * 1000 + CAST(substr(NEW.dispatched_at,21,3) AS INTEGER)),
    (CAST(strftime('%s', NEW.observed_at) AS INTEGER) * 1000 + CAST(substr(NEW.observed_at,21,3) AS INTEGER)) - NEW.maximum_clock_skew_ms
  ) > NEW.maximum_age_ms
)
BEGIN SELECT RAISE(ABORT, 'handoff_age_budget_exceeded'); END;
-- Only rows present before this migration may retain legacy age interpretation.
CREATE TRIGGER control_handoff_require_current_age_policy
BEFORE INSERT ON control_workflow_runtime_handoff_observations
WHEN NEW.age_policy_version != 2
BEGIN SELECT RAISE(ABORT, 'handoff_current_age_policy_required'); END;
