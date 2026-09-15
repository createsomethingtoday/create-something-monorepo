-- Persist host admission semantics separately from core receipt schemas.
-- Existing rows remain version 1; only explicit version 2 admissions are new.
ALTER TABLE control_workflow_runtime_runs ADD COLUMN build_binding_version INTEGER NOT NULL DEFAULT 1 CHECK (build_binding_version IN (1,2));
CREATE TRIGGER control_runtime_build_binding_version_immutable
BEFORE UPDATE OF build_binding_version ON control_workflow_runtime_runs
WHEN NEW.build_binding_version IS NOT OLD.build_binding_version
BEGIN SELECT RAISE(ABORT, 'runtime_build_binding_version_immutable'); END;
CREATE TRIGGER control_runtime_new_admission_requires_build_binding
BEFORE INSERT ON control_workflow_runtime_runs
WHEN NEW.build_binding_version IS NOT 2
  OR json_extract(NEW.run_json,'$.schema') IS NOT 'workflow_runtime_run.v0.2'
  OR NOT EXISTS (
    SELECT 1 FROM control_workflow_runtime_build_bindings b
    WHERE b.run_id = NEW.run_id AND b.registration_version = 2
      AND b.artifact_manifest_sha256 = NEW.artifact_manifest_sha256
      AND b.runtime_manifest_sha256 = NEW.runtime_manifest_sha256
      AND b.runtime_manifest_schema = json_extract(NEW.run_json,'$.runtimeManifestSchema')
      AND b.activation_id = json_extract(NEW.run_json,'$.activation.id')
      AND b.activation_version = json_extract(NEW.run_json,'$.activation.version')
      AND b.build_release_id = json_extract(NEW.run_json,'$.registration.buildReleaseId')
      AND b.contract_sha256 = json_extract(NEW.run_json,'$.registration.contractSha256')
      AND b.runtime_policy_sha256 = json_extract(NEW.run_json,'$.registration.runtimePolicySha256')
  )
BEGIN SELECT RAISE(ABORT, 'runtime_verified_build_binding_required'); END;

DROP TRIGGER control_workflow_runtime_registration_matches_activation_on_insert;
DROP TRIGGER control_workflow_runtime_registration_matches_activation_on_update;

CREATE TRIGGER control_workflow_runtime_registration_matches_activation_on_insert
BEFORE INSERT ON control_workflow_runtime_runs
WHEN json_extract(NEW.run_json, '$.schema') = 'workflow_runtime_run.v0.2'
  AND (
    json_extract(NEW.run_json, '$.registration.buildReleaseId') IS NULL
    OR json_extract(NEW.run_json, '$.registration.contractSha256') IS NULL
    OR json_extract(NEW.run_json, '$.registration.runtimePolicySha256') IS NULL
    OR json_extract(NEW.run_json, '$.id') IS NOT NEW.run_id
    OR json_extract(NEW.run_json, '$.status') IS NOT NEW.status
    OR json_type(NEW.run_json, '$.version') IS NOT 'integer'
    OR json_extract(NEW.run_json, '$.version') IS NOT NEW.version
    OR EXISTS (
      SELECT 1 FROM json_tree(NEW.run_json) entry
      WHERE entry.key IS NOT NULL
      GROUP BY entry.parent, entry.key
      HAVING count(*) > 1
    )
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.run_json)) IS NOT 11
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.run_json)
      WHERE key NOT IN (
        'activation', 'artifactManifestSha256', 'id', 'receipts', 'registration',
        'runtimeManifestSha256', 'runtimeManifestSchema', 'schema', 'status', 'steps', 'version'
      )
    )
    OR json_type(NEW.run_json, '$.activation') IS NOT 'object'
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.run_json, '$.activation')) IS NOT 3
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.run_json, '$.activation')
      WHERE key NOT IN ('id', 'policySha256', 'version')
    )
    OR json_type(NEW.run_json, '$.registration') IS NOT 'object'
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.run_json, '$.registration')) IS NOT 3
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.run_json, '$.registration')
      WHERE key NOT IN ('buildReleaseId', 'contractSha256', 'runtimePolicySha256')
    )
    OR json_type(NEW.run_json, '$.steps') IS NOT 'array'
    OR json_type(NEW.run_json, '$.receipts') IS NOT 'array'
    OR json_extract(NEW.run_json, '$.runtimeManifestSchema') IS NULL
    OR json_extract(NEW.run_json, '$.runtimeManifestSchema') NOT IN (
      'workflow_runtime_manifest.v0.1', 'workflow_runtime_manifest.v0.2'
    )
    OR json_extract(NEW.run_json, '$.artifactManifestSha256') IS NULL
    OR json_extract(NEW.run_json, '$.runtimeManifestSha256') IS NULL
    OR json_extract(NEW.run_json, '$.artifactManifestSha256') IS NOT NEW.artifact_manifest_sha256
    OR json_extract(NEW.run_json, '$.runtimeManifestSha256') IS NOT NEW.runtime_manifest_sha256
    OR length(NEW.artifact_manifest_sha256) IS NOT 71
    OR substr(NEW.artifact_manifest_sha256, 1, 7) IS NOT 'sha256:'
    OR substr(NEW.artifact_manifest_sha256, 8) GLOB '*[^0-9a-f]*'
    OR length(NEW.runtime_manifest_sha256) IS NOT 71
    OR substr(NEW.runtime_manifest_sha256, 1, 7) IS NOT 'sha256:'
    OR substr(NEW.runtime_manifest_sha256, 8) GLOB '*[^0-9a-f]*'
    OR length(json_extract(NEW.run_json, '$.registration.contractSha256')) IS NOT 71
    OR substr(json_extract(NEW.run_json, '$.registration.contractSha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.run_json, '$.registration.contractSha256'), 8) GLOB '*[^0-9a-f]*'
    OR length(json_extract(NEW.run_json, '$.registration.runtimePolicySha256')) IS NOT 71
    OR substr(json_extract(NEW.run_json, '$.registration.runtimePolicySha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.run_json, '$.registration.runtimePolicySha256'), 8) GLOB '*[^0-9a-f]*'
    OR NOT EXISTS (
      SELECT 1 FROM control_runs parent
      WHERE parent.id = NEW.run_id
        AND parent.activation_id = json_extract(NEW.run_json, '$.activation.id')
        AND parent.activation_version = json_extract(NEW.run_json, '$.activation.version')
        AND 'sha256:' || json_extract(parent.activation_json, '$.policySha256') =
          json_extract(NEW.run_json, '$.activation.policySha256')
        AND json_extract(parent.activation_json, '$.buildReleaseId') =
          json_extract(NEW.run_json, '$.registration.buildReleaseId')
        AND json_extract(parent.activation_json, '$.contractSha256') =
          substr(json_extract(NEW.run_json, '$.registration.contractSha256'), 8)
        AND json_extract(parent.activation_json, '$.policySha256') =
          substr(json_extract(NEW.run_json, '$.registration.runtimePolicySha256'), 8)
        AND (
          (NEW.build_binding_version = 1 AND json_extract(parent.activation_json, '$.buildManifestSha256') = substr(NEW.artifact_manifest_sha256, 8))
          OR (NEW.build_binding_version = 2 AND EXISTS (
            SELECT 1 FROM control_workflow_runtime_build_bindings b
            WHERE b.run_id = NEW.run_id
              AND b.activation_id = parent.activation_id AND b.activation_version = parent.activation_version
              AND b.artifact_manifest_sha256 = NEW.artifact_manifest_sha256
              AND b.runtime_manifest_sha256 = NEW.runtime_manifest_sha256
              AND b.build_manifest_sha256 = 'sha256:' || json_extract(parent.activation_json, '$.buildManifestSha256')
              AND b.build_artifact_set_sha256 = 'sha256:' || json_extract(parent.activation_json, '$.buildArtifactSetSha256')
          ))
        )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime registration does not match its frozen activation');
END;

CREATE TRIGGER control_workflow_runtime_registration_matches_activation_on_update
BEFORE UPDATE OF run_json, status, version ON control_workflow_runtime_runs
WHEN json_extract(NEW.run_json, '$.schema') = 'workflow_runtime_run.v0.2'
  AND (
    EXISTS (
      SELECT 1 FROM control_workflow_runtime_receipts ledger_receipt
      WHERE ledger_receipt.run_id = NEW.run_id
        AND NOT EXISTS (
          SELECT 1 FROM json_each(NEW.run_json, '$.receipts') checkpoint_receipt
          WHERE json_extract(checkpoint_receipt.value, '$.id') IS ledger_receipt.id
            AND json_extract(checkpoint_receipt.value, '$.runId') IS ledger_receipt.run_id
            AND json_extract(checkpoint_receipt.value, '$.eventIndex') IS ledger_receipt.event_index
            AND json_extract(checkpoint_receipt.value, '$.receiptSha256')
              IS ledger_receipt.receipt_sha256
            AND json_extract(checkpoint_receipt.value, '$.previousReceiptSha256')
              IS ledger_receipt.previous_receipt_sha256
            AND json_extract(checkpoint_receipt.value, '$.createdAt') IS ledger_receipt.created_at
            AND json(checkpoint_receipt.value) IS json(ledger_receipt.receipt_json)
        )
    )
    OR json_extract(NEW.run_json, '$.registration.buildReleaseId') IS NULL
    OR json_extract(NEW.run_json, '$.registration.contractSha256') IS NULL
    OR json_extract(NEW.run_json, '$.registration.runtimePolicySha256') IS NULL
    OR json_extract(NEW.run_json, '$.id') IS NOT NEW.run_id
    OR json_extract(NEW.run_json, '$.status') IS NOT NEW.status
    OR json_type(NEW.run_json, '$.version') IS NOT 'integer'
    OR json_extract(NEW.run_json, '$.version') IS NOT NEW.version
    OR EXISTS (
      SELECT 1 FROM json_tree(NEW.run_json) entry
      WHERE entry.key IS NOT NULL
      GROUP BY entry.parent, entry.key
      HAVING count(*) > 1
    )
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.run_json)) IS NOT 11
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.run_json)
      WHERE key NOT IN (
        'activation', 'artifactManifestSha256', 'id', 'receipts', 'registration',
        'runtimeManifestSha256', 'runtimeManifestSchema', 'schema', 'status', 'steps', 'version'
      )
    )
    OR json_type(NEW.run_json, '$.activation') IS NOT 'object'
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.run_json, '$.activation')) IS NOT 3
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.run_json, '$.activation')
      WHERE key NOT IN ('id', 'policySha256', 'version')
    )
    OR json_type(NEW.run_json, '$.registration') IS NOT 'object'
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.run_json, '$.registration')) IS NOT 3
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.run_json, '$.registration')
      WHERE key NOT IN ('buildReleaseId', 'contractSha256', 'runtimePolicySha256')
    )
    OR json_type(NEW.run_json, '$.steps') IS NOT 'array'
    OR json_type(NEW.run_json, '$.receipts') IS NOT 'array'
    OR json_extract(NEW.run_json, '$.runtimeManifestSchema') IS NULL
    OR json_extract(NEW.run_json, '$.runtimeManifestSchema') NOT IN (
      'workflow_runtime_manifest.v0.1', 'workflow_runtime_manifest.v0.2'
    )
    OR json_extract(NEW.run_json, '$.artifactManifestSha256') IS NULL
    OR json_extract(NEW.run_json, '$.runtimeManifestSha256') IS NULL
    OR json_extract(NEW.run_json, '$.artifactManifestSha256') IS NOT NEW.artifact_manifest_sha256
    OR json_extract(NEW.run_json, '$.runtimeManifestSha256') IS NOT NEW.runtime_manifest_sha256
    OR length(NEW.artifact_manifest_sha256) IS NOT 71
    OR substr(NEW.artifact_manifest_sha256, 1, 7) IS NOT 'sha256:'
    OR substr(NEW.artifact_manifest_sha256, 8) GLOB '*[^0-9a-f]*'
    OR length(NEW.runtime_manifest_sha256) IS NOT 71
    OR substr(NEW.runtime_manifest_sha256, 1, 7) IS NOT 'sha256:'
    OR substr(NEW.runtime_manifest_sha256, 8) GLOB '*[^0-9a-f]*'
    OR length(json_extract(NEW.run_json, '$.registration.contractSha256')) IS NOT 71
    OR substr(json_extract(NEW.run_json, '$.registration.contractSha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.run_json, '$.registration.contractSha256'), 8) GLOB '*[^0-9a-f]*'
    OR length(json_extract(NEW.run_json, '$.registration.runtimePolicySha256')) IS NOT 71
    OR substr(json_extract(NEW.run_json, '$.registration.runtimePolicySha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.run_json, '$.registration.runtimePolicySha256'), 8) GLOB '*[^0-9a-f]*'
    OR NOT EXISTS (
      SELECT 1 FROM control_runs parent
      WHERE parent.id = NEW.run_id
        AND parent.activation_id = json_extract(NEW.run_json, '$.activation.id')
        AND parent.activation_version = json_extract(NEW.run_json, '$.activation.version')
        AND 'sha256:' || json_extract(parent.activation_json, '$.policySha256') =
          json_extract(NEW.run_json, '$.activation.policySha256')
        AND json_extract(parent.activation_json, '$.buildReleaseId') =
          json_extract(NEW.run_json, '$.registration.buildReleaseId')
        AND json_extract(parent.activation_json, '$.contractSha256') =
          substr(json_extract(NEW.run_json, '$.registration.contractSha256'), 8)
        AND json_extract(parent.activation_json, '$.policySha256') =
          substr(json_extract(NEW.run_json, '$.registration.runtimePolicySha256'), 8)
        AND (
          (NEW.build_binding_version = 1 AND json_extract(parent.activation_json, '$.buildManifestSha256') = substr(NEW.artifact_manifest_sha256, 8))
          OR (NEW.build_binding_version = 2 AND EXISTS (
            SELECT 1 FROM control_workflow_runtime_build_bindings b
            WHERE b.run_id = NEW.run_id
              AND b.activation_id = parent.activation_id AND b.activation_version = parent.activation_version
              AND b.artifact_manifest_sha256 = NEW.artifact_manifest_sha256
              AND b.runtime_manifest_sha256 = NEW.runtime_manifest_sha256
              AND b.build_manifest_sha256 = 'sha256:' || json_extract(parent.activation_json, '$.buildManifestSha256')
              AND b.build_artifact_set_sha256 = 'sha256:' || json_extract(parent.activation_json, '$.buildArtifactSetSha256')
          ))
        )
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime registration does not match its frozen activation');
END;

