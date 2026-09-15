-- Host-owned relation between an accepted Agency Build and compiler artifacts.
-- Existing checkpoints/receipts retain their original interpretation. This table
-- alone does not authorize checkpoint admission; the versioned admission guard
-- and proof reader must consume this exact relation before new execution.
CREATE TABLE control_workflow_runtime_build_bindings (
  run_id TEXT PRIMARY KEY REFERENCES control_runs(id) ON DELETE RESTRICT,
  registration_version INTEGER NOT NULL CHECK (registration_version = 2),
  activation_id TEXT NOT NULL,
  activation_version INTEGER NOT NULL CHECK (activation_version >= 1),
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  build_release_id TEXT NOT NULL CHECK (length(trim(build_release_id)) > 0),
  build_manifest_sha256 TEXT NOT NULL CHECK (length(build_manifest_sha256) = 71 AND substr(build_manifest_sha256,1,7) = 'sha256:' AND substr(build_manifest_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  build_artifact_set_sha256 TEXT NOT NULL CHECK (length(build_artifact_set_sha256) = 71 AND substr(build_artifact_set_sha256,1,7) = 'sha256:' AND substr(build_artifact_set_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  binding_sha256 TEXT NOT NULL CHECK (length(binding_sha256) = 71 AND substr(binding_sha256,1,7) = 'sha256:' AND substr(binding_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  contract_sha256 TEXT NOT NULL CHECK (length(contract_sha256) = 71 AND substr(contract_sha256,1,7) = 'sha256:' AND substr(contract_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  runtime_policy_sha256 TEXT NOT NULL CHECK (length(runtime_policy_sha256) = 71 AND substr(runtime_policy_sha256,1,7) = 'sha256:' AND substr(runtime_policy_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  artifact_manifest_sha256 TEXT NOT NULL CHECK (length(artifact_manifest_sha256) = 71 AND substr(artifact_manifest_sha256,1,7) = 'sha256:' AND substr(artifact_manifest_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  runtime_manifest_sha256 TEXT NOT NULL CHECK (length(runtime_manifest_sha256) = 71 AND substr(runtime_manifest_sha256,1,7) = 'sha256:' AND substr(runtime_manifest_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  definition_hash TEXT NOT NULL CHECK (length(definition_hash) = 71 AND substr(definition_hash,1,7) = 'sha256:' AND substr(definition_hash,8) NOT GLOB '*[^0-9a-f]*'),
  attestation_public_key_fingerprint TEXT NOT NULL CHECK (length(attestation_public_key_fingerprint) = 71 AND substr(attestation_public_key_fingerprint,1,7) = 'sha256:' AND substr(attestation_public_key_fingerprint,8) NOT GLOB '*[^0-9a-f]*'),
  workflow_id TEXT NOT NULL CHECK (length(trim(workflow_id)) > 0),
  workflow_version TEXT NOT NULL CHECK (length(trim(workflow_version)) > 0),
  compiler_version TEXT NOT NULL CHECK (length(trim(compiler_version)) > 0),
  runtime_manifest_schema TEXT NOT NULL CHECK (runtime_manifest_schema IN ('workflow_runtime_manifest.v0.1','workflow_runtime_manifest.v0.2')),
  attestation_key_id TEXT NOT NULL CHECK (length(trim(attestation_key_id)) > 0),
  artifact_prefix TEXT NOT NULL CHECK (artifact_prefix = 'workflow-artifacts/' || substr(artifact_manifest_sha256,8) || '/'),
  verified_at TEXT NOT NULL CHECK (length(trim(verified_at)) > 0)
);
CREATE TRIGGER control_workflow_runtime_build_binding_matches_parent
BEFORE INSERT ON control_workflow_runtime_build_bindings
WHEN NOT EXISTS (
  SELECT 1 FROM control_runs p WHERE p.id = NEW.run_id
    AND p.activation_id = NEW.activation_id AND p.activation_version = NEW.activation_version
    AND p.account_id = NEW.account_id AND p.tenant_id = NEW.tenant_id AND p.workspace_account_id = NEW.workspace_account_id
    AND json_extract(p.activation_json,'$.buildReleaseId') = NEW.build_release_id
    AND 'sha256:' || json_extract(p.activation_json,'$.buildManifestSha256') = NEW.build_manifest_sha256
    AND 'sha256:' || json_extract(p.activation_json,'$.buildArtifactSetSha256') = NEW.build_artifact_set_sha256
    AND 'sha256:' || json_extract(p.activation_json,'$.contractSha256') = NEW.contract_sha256
    AND 'sha256:' || json_extract(p.activation_json,'$.policySha256') = NEW.runtime_policy_sha256
    AND p.status IN ('queued','running')
) OR EXISTS (SELECT 1 FROM control_workflow_runtime_runs WHERE run_id = NEW.run_id)
BEGIN SELECT RAISE(ABORT, 'runtime_build_binding_parent_mismatch'); END;
CREATE TRIGGER control_workflow_runtime_build_binding_no_update
BEFORE UPDATE ON control_workflow_runtime_build_bindings
BEGIN SELECT RAISE(ABORT, 'runtime_build_binding_immutable'); END;
CREATE TRIGGER control_workflow_runtime_build_binding_no_delete
BEFORE DELETE ON control_workflow_runtime_build_bindings
BEGIN SELECT RAISE(ABORT, 'runtime_build_binding_immutable'); END;
CREATE TRIGGER control_workflow_runtime_build_binding_no_replace
BEFORE INSERT ON control_workflow_runtime_build_bindings
WHEN EXISTS (SELECT 1 FROM control_workflow_runtime_build_bindings WHERE run_id = NEW.run_id)
BEGIN SELECT RAISE(ABORT, 'runtime_build_binding_immutable'); END;
