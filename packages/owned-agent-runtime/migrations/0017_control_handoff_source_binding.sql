-- Preserve historical prototype evidence; mapped requests have explicit semantics.
ALTER TABLE control_workflow_runtime_handoff_observations ADD COLUMN source_binding_version INTEGER NOT NULL DEFAULT 1 CHECK (source_binding_version IN (1,2));
CREATE TRIGGER control_handoff_source_binding_required
BEFORE INSERT ON control_workflow_runtime_handoff_observations
WHEN (NEW.source_binding_version=2 AND NOT EXISTS (
 SELECT 1 FROM control_workflow_runtime_source_bindings b
 JOIN control_workflow_runtime_attempts a ON a.run_id=b.run_id AND a.step_id=b.step_id
 WHERE b.run_id=NEW.run_id AND b.step_id=NEW.step_id AND a.attempt_id=NEW.attempt_id
   AND b.request_sha256=NEW.request_sha256
   AND json_extract(a.attempt_json,'$.capability.id')=b.capability_id
   AND json_extract(a.attempt_json,'$.capability.parameterDigest')=b.capability_parameter_sha256
)) OR (NEW.source_binding_version=1 AND EXISTS (
 SELECT 1 FROM control_workflow_runtime_source_bindings b WHERE b.run_id=NEW.run_id AND b.step_id=NEW.step_id
))
BEGIN SELECT RAISE(ABORT,'handoff_source_binding_required'); END;
