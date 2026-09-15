-- A compiler capability digest describes a tool contract, not its concrete
-- source request. Preserve both identities without changing signed artifacts.
CREATE TABLE control_workflow_runtime_source_bindings (
  run_id TEXT NOT NULL REFERENCES control_workflow_runtime_build_bindings(run_id) ON DELETE RESTRICT,
  step_id TEXT NOT NULL CHECK (length(step_id) BETWEEN 1 AND 180),
  binding_version INTEGER NOT NULL CHECK (binding_version = 1),
  runtime_manifest_sha256 TEXT NOT NULL CHECK (length(runtime_manifest_sha256)=71 AND substr(runtime_manifest_sha256,1,7)='sha256:' AND substr(runtime_manifest_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  capability_id TEXT NOT NULL CHECK (length(capability_id) BETWEEN 1 AND 500),
  capability_parameter_sha256 TEXT NOT NULL CHECK (length(capability_parameter_sha256)=71 AND substr(capability_parameter_sha256,1,7)='sha256:' AND substr(capability_parameter_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  source_tool TEXT NOT NULL CHECK (source_tool='template_review_observe_handoff'),
  source_resource TEXT NOT NULL CHECK (source_resource='https://webflow-template-review-mcp.createsomething.workers.dev/mcp'),
  asset_id TEXT NOT NULL CHECK (length(asset_id)=17 AND substr(asset_id,1,3)='rec' AND substr(asset_id,4) NOT GLOB '*[^A-Za-z0-9]*'),
  version_id TEXT NOT NULL CHECK (length(version_id)=17 AND substr(version_id,1,3)='rec' AND substr(version_id,4) NOT GLOB '*[^A-Za-z0-9]*'),
  request_sha256 TEXT NOT NULL CHECK (length(request_sha256)=71 AND substr(request_sha256,1,7)='sha256:' AND substr(request_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  PRIMARY KEY (run_id,step_id)
);
CREATE TRIGGER control_runtime_source_binding_before_execution
BEFORE INSERT ON control_workflow_runtime_source_bindings
WHEN EXISTS (SELECT 1 FROM control_workflow_runtime_source_bindings WHERE run_id=NEW.run_id AND step_id=NEW.step_id)
 OR NOT EXISTS (
  SELECT 1 FROM control_workflow_runtime_runs r
  JOIN control_runs p ON p.id=r.run_id
  JOIN control_workflow_runtime_build_bindings b ON b.run_id=r.run_id
  WHERE r.run_id=NEW.run_id AND r.build_binding_version=2
    AND r.runtime_manifest_sha256=NEW.runtime_manifest_sha256
    AND b.runtime_manifest_sha256=NEW.runtime_manifest_sha256
    AND r.status='queued' AND p.status IN ('queued','running')
    AND EXISTS (SELECT 1 FROM json_each(r.run_json,'$.steps') s
      WHERE json_extract(s.value,'$.id')=NEW.step_id
        AND json_extract(s.value,'$.status') IN ('ready','pending'))
    AND NOT EXISTS (SELECT 1 FROM json_each(r.run_json,'$.steps') s,
      json_each(s.value,'$.attempts') a)
 )
BEGIN SELECT RAISE(ABORT,'runtime_source_binding_requires_unexecuted_checkpoint'); END;
CREATE TRIGGER control_runtime_source_binding_no_update
BEFORE UPDATE ON control_workflow_runtime_source_bindings
BEGIN SELECT RAISE(ABORT,'runtime_source_binding_immutable'); END;
CREATE TRIGGER control_runtime_source_binding_no_delete
BEFORE DELETE ON control_workflow_runtime_source_bindings
BEGIN SELECT RAISE(ABORT,'runtime_source_binding_immutable'); END;
