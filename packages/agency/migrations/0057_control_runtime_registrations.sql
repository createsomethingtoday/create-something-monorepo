-- Agency owns the immutable verified release registration. Only the owning
-- Build verification path may insert after signature/policy verification.
-- SQL binds authority; it does not itself verify artifact signatures.
-- Version 2 preserves the accepted delivery Build digest separately from the
-- signed compiler inventory. The owning verifier checks binding_sha256 under
-- the accepted artifact set before INSERT. No equality-only writer is accepted.
-- This migration is unpromoted: no historical registry rows exist to reinterpret.
CREATE TABLE customer_control_runtime_registrations (
  registration_version INTEGER NOT NULL CHECK (registration_version = 2),
  build_manifest_sha256 TEXT NOT NULL CHECK (length(build_manifest_sha256) = 64 AND build_manifest_sha256 NOT GLOB '*[^0-9a-f]*'),
  build_artifact_set_sha256 TEXT NOT NULL CHECK (length(build_artifact_set_sha256) = 64 AND build_artifact_set_sha256 NOT GLOB '*[^0-9a-f]*'),
  binding_sha256 TEXT NOT NULL CHECK (length(binding_sha256) = 71 AND substr(binding_sha256,1,7) = 'sha256:' AND substr(binding_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  activation_id TEXT PRIMARY KEY REFERENCES customer_control_activations(id) ON DELETE RESTRICT,
  activation_version INTEGER NOT NULL CHECK (activation_version >= 1),
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_account_id TEXT NOT NULL,
  build_release_id TEXT NOT NULL,
  contract_sha256 TEXT NOT NULL CHECK (length(contract_sha256) = 64 AND contract_sha256 NOT GLOB '*[^0-9a-f]*'),
  runtime_policy_sha256 TEXT NOT NULL CHECK (length(runtime_policy_sha256) = 64 AND runtime_policy_sha256 NOT GLOB '*[^0-9a-f]*'),
  workflow_id TEXT NOT NULL CHECK (length(trim(workflow_id)) > 0),
  workflow_version TEXT NOT NULL CHECK (length(trim(workflow_version)) > 0),
  compiler_version TEXT NOT NULL CHECK (length(trim(compiler_version)) > 0),
  runtime_manifest_schema TEXT NOT NULL CHECK (runtime_manifest_schema IN ('workflow_runtime_manifest.v0.1','workflow_runtime_manifest.v0.2')),
  definition_hash TEXT NOT NULL CHECK (length(definition_hash) = 71 AND substr(definition_hash,1,7) = 'sha256:' AND substr(definition_hash,8) NOT GLOB '*[^0-9a-f]*'),
  artifact_manifest_sha256 TEXT NOT NULL CHECK (length(artifact_manifest_sha256) = 71 AND substr(artifact_manifest_sha256,1,7) = 'sha256:' AND substr(artifact_manifest_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  runtime_manifest_sha256 TEXT NOT NULL CHECK (length(runtime_manifest_sha256) = 71 AND substr(runtime_manifest_sha256,1,7) = 'sha256:' AND substr(runtime_manifest_sha256,8) NOT GLOB '*[^0-9a-f]*'),
  attestation_public_key_fingerprint TEXT NOT NULL CHECK (length(attestation_public_key_fingerprint) = 71 AND substr(attestation_public_key_fingerprint,1,7) = 'sha256:' AND substr(attestation_public_key_fingerprint,8) NOT GLOB '*[^0-9a-f]*'),
  attestation_key_id TEXT NOT NULL CHECK (length(trim(attestation_key_id)) > 0),
  artifact_prefix TEXT NOT NULL CHECK (artifact_prefix = 'workflow-artifacts/' || substr(artifact_manifest_sha256,8) || '/'),
  verified_by TEXT NOT NULL CHECK (length(trim(verified_by)) > 0),
  verified_at TEXT NOT NULL CHECK (length(trim(verified_at)) > 0)
);
CREATE TRIGGER customer_control_runtime_registrations_bind_activation
BEFORE INSERT ON customer_control_runtime_registrations
WHEN NOT EXISTS (
  SELECT 1 FROM customer_control_activations a
  WHERE a.id = NEW.activation_id AND a.activation_version = NEW.activation_version
    AND a.account_id = NEW.account_id AND a.tenant_id = NEW.tenant_id
    AND a.workspace_account_id = NEW.workspace_account_id
    AND a.build_release_id = NEW.build_release_id
    AND a.build_manifest_sha256 = NEW.build_manifest_sha256
    AND a.build_artifact_set_sha256 = NEW.build_artifact_set_sha256
    AND a.contract_sha256 = NEW.contract_sha256
    AND a.policy_sha256 = NEW.runtime_policy_sha256
    AND a.status = 'active'
)
BEGIN SELECT RAISE(ABORT, 'runtime_registration_activation_mismatch'); END;
CREATE TRIGGER customer_control_runtime_registrations_no_update
BEFORE UPDATE ON customer_control_runtime_registrations
BEGIN SELECT RAISE(ABORT, 'runtime_registration_immutable'); END;
CREATE TRIGGER customer_control_runtime_registrations_no_delete
BEFORE DELETE ON customer_control_runtime_registrations
BEGIN SELECT RAISE(ABORT, 'runtime_registration_immutable'); END;
CREATE TRIGGER customer_control_runtime_registrations_no_replace
BEFORE INSERT ON customer_control_runtime_registrations
WHEN EXISTS (SELECT 1 FROM customer_control_runtime_registrations WHERE activation_id = NEW.activation_id)
BEGIN SELECT RAISE(ABORT, 'runtime_registration_immutable'); END;
