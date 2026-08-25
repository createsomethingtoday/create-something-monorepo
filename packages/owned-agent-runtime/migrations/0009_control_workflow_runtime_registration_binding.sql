-- Registration-bound v0.2 checkpoints cannot be separated from the frozen
-- Agency activation that authorized their Build release, contract, policy, or
-- artifact manifest. Legacy v0.1 rows remain readable under their original
-- schema and hash semantics.

CREATE TRIGGER control_workflow_runtime_checkpoint_rejects_duplicate_keys_on_insert
BEFORE INSERT ON control_workflow_runtime_runs
WHEN EXISTS (
  SELECT 1 FROM json_tree(NEW.run_json) entry
  WHERE entry.key IS NOT NULL
  GROUP BY entry.parent, entry.key
  HAVING count(*) > 1
)
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime checkpoint JSON must not contain duplicate object keys');
END;

CREATE TRIGGER control_workflow_runtime_checkpoint_rejects_duplicate_keys_on_update
BEFORE UPDATE OF run_json ON control_workflow_runtime_runs
WHEN EXISTS (
  SELECT 1 FROM json_tree(NEW.run_json) entry
  WHERE entry.key IS NOT NULL
  GROUP BY entry.parent, entry.key
  HAVING count(*) > 1
)
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime checkpoint JSON must not contain duplicate object keys');
END;

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
        AND json_extract(parent.activation_json, '$.buildManifestSha256') =
          substr(NEW.artifact_manifest_sha256, 8)
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
        AND json_extract(parent.activation_json, '$.buildManifestSha256') =
          substr(NEW.artifact_manifest_sha256, 8)
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime registration does not match its frozen activation');
END;

CREATE TRIGGER control_workflow_runtime_registration_schema_is_immutable
BEFORE UPDATE OF run_json ON control_workflow_runtime_runs
WHEN json_extract(OLD.run_json, '$.schema') IS NOT json_extract(NEW.run_json, '$.schema')
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime registration checkpoint schema is immutable');
END;

CREATE TRIGGER control_workflow_runtime_registration_receipt_matches_run
BEFORE INSERT ON control_workflow_runtime_receipts
WHEN EXISTS (
  SELECT 1 FROM control_workflow_runtime_runs runtime
  WHERE runtime.run_id = NEW.run_id
    AND json_extract(runtime.run_json, '$.schema') = 'workflow_runtime_run.v0.2'
)
  AND (
    json_extract(NEW.receipt_json, '$.schema') IS NOT 'create-something/control-run-receipt@3'
    OR json_extract(NEW.receipt_json, '$.buildReleaseId') IS NULL
    OR json_extract(NEW.receipt_json, '$.contractSha256') IS NULL
    OR json_extract(NEW.receipt_json, '$.runtimePolicySha256') IS NULL
    OR json_extract(NEW.receipt_json, '$.runtimeManifestSchema') IS NULL
    OR EXISTS (
      SELECT 1 FROM json_tree(NEW.receipt_json) entry
      WHERE entry.key IS NOT NULL
      GROUP BY entry.parent, entry.key
      HAVING count(*) > 1
    )
    OR json_type(NEW.receipt_json, '$.workflowCompilerVersion') IS NOT 'text'
    OR length(trim(json_extract(NEW.receipt_json, '$.workflowCompilerVersion'))) < 1
    OR length(trim(json_extract(NEW.receipt_json, '$.workflowCompilerVersion'))) > 160
    OR json_type(NEW.receipt_json, '$.actionId') IS NULL
    OR json_type(NEW.receipt_json, '$.actionId') NOT IN ('text', 'null')
    OR length(json_extract(NEW.receipt_json, '$.contractSha256')) IS NOT 71
    OR substr(json_extract(NEW.receipt_json, '$.contractSha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.receipt_json, '$.contractSha256'), 8) GLOB '*[^0-9a-f]*'
    OR length(json_extract(NEW.receipt_json, '$.runtimePolicySha256')) IS NOT 71
    OR substr(json_extract(NEW.receipt_json, '$.runtimePolicySha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.receipt_json, '$.runtimePolicySha256'), 8) GLOB '*[^0-9a-f]*'
    OR NOT EXISTS (
      SELECT 1 FROM control_workflow_runtime_runs runtime
      WHERE runtime.run_id = NEW.run_id
        AND json_extract(runtime.run_json, '$.registration.buildReleaseId') =
          json_extract(NEW.receipt_json, '$.buildReleaseId')
        AND json_extract(runtime.run_json, '$.registration.contractSha256') =
          json_extract(NEW.receipt_json, '$.contractSha256')
        AND json_extract(runtime.run_json, '$.registration.runtimePolicySha256') =
          json_extract(NEW.receipt_json, '$.runtimePolicySha256')
        AND json_extract(runtime.run_json, '$.runtimeManifestSchema') =
          json_extract(NEW.receipt_json, '$.runtimeManifestSchema')
    )
    OR NOT EXISTS (
      SELECT 1 FROM control_workflow_runtime_runs runtime
      JOIN json_each(runtime.run_json, '$.receipts') checkpoint_receipt
      WHERE runtime.run_id = NEW.run_id
        AND json_extract(checkpoint_receipt.value, '$.id') IS NEW.id
        AND json_extract(checkpoint_receipt.value, '$.runId') IS NEW.run_id
        AND json_extract(checkpoint_receipt.value, '$.eventIndex') IS NEW.event_index
        AND json_extract(checkpoint_receipt.value, '$.receiptSha256') IS NEW.receipt_sha256
        AND json_extract(checkpoint_receipt.value, '$.previousReceiptSha256')
          IS NEW.previous_receipt_sha256
        AND json_extract(checkpoint_receipt.value, '$.createdAt') IS NEW.created_at
        AND json(checkpoint_receipt.value) IS json(NEW.receipt_json)
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime registration receipt schema must match its checkpoint');
END;

CREATE TRIGGER control_workflow_runtime_registration_approval_matches_run
BEFORE INSERT ON control_workflow_runtime_approvals
WHEN EXISTS (
  SELECT 1 FROM control_workflow_runtime_runs runtime
  WHERE runtime.run_id = NEW.run_id
    AND json_extract(runtime.run_json, '$.schema') = 'workflow_runtime_run.v0.2'
)
  AND (
    EXISTS (
      SELECT 1 FROM json_tree(NEW.approval_json) entry
      WHERE entry.key IS NOT NULL
      GROUP BY entry.parent, entry.key
      HAVING count(*) > 1
    )
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.approval_json)) IS NOT 4
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.approval_json)
      WHERE key NOT IN ('bindingSha256', 'expiresAt', 'id', 'policyId')
    )
    OR json_type(NEW.approval_json, '$.id') IS NOT 'text'
    OR json_type(NEW.approval_json, '$.bindingSha256') IS NOT 'text'
    OR json_type(NEW.approval_json, '$.policyId') IS NOT 'text'
    OR json_type(NEW.approval_json, '$.expiresAt') IS NOT 'text'
    OR json_extract(NEW.approval_json, '$.id') IS NOT NEW.approval_id
    OR json_extract(NEW.approval_json, '$.bindingSha256') IS NOT NEW.binding_sha256
    OR length(trim(json_extract(NEW.approval_json, '$.id'))) < 1
    OR length(trim(json_extract(NEW.approval_json, '$.id'))) > 240
    OR length(trim(json_extract(NEW.approval_json, '$.policyId'))) < 1
    OR length(trim(json_extract(NEW.approval_json, '$.policyId'))) > 180
    OR json_extract(NEW.approval_json, '$.policyId') IS NOT trim(json_extract(NEW.approval_json, '$.policyId'))
    OR length(json_extract(NEW.approval_json, '$.bindingSha256')) IS NOT 71
    OR substr(json_extract(NEW.approval_json, '$.bindingSha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.approval_json, '$.bindingSha256'), 8) GLOB '*[^0-9a-f]*'
    OR length(json_extract(NEW.approval_json, '$.expiresAt')) < 1
    OR length(json_extract(NEW.approval_json, '$.expiresAt')) > 64
    OR strftime('%Y-%m-%dT%H:%M:%fZ', json_extract(NEW.approval_json, '$.expiresAt')) IS NOT
      json_extract(NEW.approval_json, '$.expiresAt')
    OR json_extract(NEW.approval_context_json, '$.schema') IS NOT
      'create-something/workflow-runtime-approval-context@2'
    OR json_extract(NEW.approval_context_json, '$.version') IS NOT 2
    OR EXISTS (
      SELECT 1 FROM json_tree(NEW.approval_context_json) entry
      WHERE entry.key IS NOT NULL
      GROUP BY entry.parent, entry.key
      HAVING count(*) > 1
    )
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.approval_context_json)) IS NOT 14
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.approval_context_json)
      WHERE key NOT IN (
        'actionId', 'activation', 'artifactManifestSha256', 'attempt', 'evidenceDigest',
        'registration', 'runVersion', 'runtimeManifestSha256', 'runtimeManifestSchema',
        'schema', 'scope', 'stepVersion', 'version', 'workflow'
      )
    )
    OR json_type(NEW.approval_context_json, '$.scope') IS NOT 'object'
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.approval_context_json, '$.scope')) IS NOT 3
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.approval_context_json, '$.scope')
      WHERE key NOT IN ('accountId', 'tenantId', 'workspaceAccountId')
    )
    OR json_type(NEW.approval_context_json, '$.activation') IS NOT 'object'
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.approval_context_json, '$.activation')) IS NOT 3
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.approval_context_json, '$.activation')
      WHERE key NOT IN ('id', 'policySha256', 'version')
    )
    OR json_type(NEW.approval_context_json, '$.attempt') IS NOT 'object'
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.approval_context_json, '$.attempt')) IS NOT 1
    OR json_extract(NEW.approval_context_json, '$.attempt.type') IS NOT 'no_capability_attempt'
    OR json_type(NEW.approval_context_json, '$.registration') IS NOT 'object'
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.approval_context_json, '$.registration')) IS NOT 3
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.approval_context_json, '$.registration')
      WHERE key NOT IN ('buildReleaseId', 'contractSha256', 'runtimePolicySha256')
    )
    OR json_type(NEW.approval_context_json, '$.workflow') IS NOT 'object'
    OR (SELECT count(DISTINCT key) FROM json_each(NEW.approval_context_json, '$.workflow')) IS NOT 5
    OR EXISTS (
      SELECT 1 FROM json_each(NEW.approval_context_json, '$.workflow')
      WHERE key NOT IN ('compiledBundleSchema', 'compilerVersion', 'definitionHash', 'id', 'version')
    )
    OR json_extract(NEW.approval_context_json, '$.workflow.compiledBundleSchema') IS NOT
      'compiled_workflow_bundle.v0.3'
    OR json_type(NEW.approval_context_json, '$.runVersion') IS NOT 'integer'
    OR json_extract(NEW.approval_context_json, '$.runVersion') < 1
    OR json_extract(NEW.approval_context_json, '$.runVersion') > 2147483647
    OR json_type(NEW.approval_context_json, '$.stepVersion') IS NOT 'integer'
    OR json_extract(NEW.approval_context_json, '$.stepVersion') < 1
    OR json_extract(NEW.approval_context_json, '$.stepVersion') > 2147483647
    OR json_type(NEW.approval_context_json, '$.scope.accountId') IS NOT 'text'
    OR json_type(NEW.approval_context_json, '$.scope.tenantId') IS NOT 'text'
    OR json_type(NEW.approval_context_json, '$.scope.workspaceAccountId') IS NOT 'text'
    OR json_type(NEW.approval_context_json, '$.activation.id') IS NOT 'text'
    OR json_type(NEW.approval_context_json, '$.registration.buildReleaseId') IS NOT 'text'
    OR json_type(NEW.approval_context_json, '$.workflow.id') IS NOT 'text'
    OR json_type(NEW.approval_context_json, '$.workflow.version') IS NOT 'text'
    OR json_type(NEW.approval_context_json, '$.workflow.compilerVersion') IS NOT 'text'
    OR json_type(NEW.approval_context_json, '$.actionId') IS NOT 'text'
    OR length(trim(json_extract(NEW.approval_context_json, '$.scope.accountId'))) < 1
    OR length(trim(json_extract(NEW.approval_context_json, '$.scope.accountId'))) > 180
    OR length(trim(json_extract(NEW.approval_context_json, '$.scope.tenantId'))) < 1
    OR length(trim(json_extract(NEW.approval_context_json, '$.scope.tenantId'))) > 180
    OR length(trim(json_extract(NEW.approval_context_json, '$.scope.workspaceAccountId'))) < 1
    OR length(trim(json_extract(NEW.approval_context_json, '$.scope.workspaceAccountId'))) > 180
    OR length(trim(json_extract(NEW.approval_context_json, '$.activation.id'))) < 1
    OR length(trim(json_extract(NEW.approval_context_json, '$.activation.id'))) > 180
    OR length(trim(json_extract(NEW.approval_context_json, '$.registration.buildReleaseId'))) < 1
    OR length(trim(json_extract(NEW.approval_context_json, '$.registration.buildReleaseId'))) > 180
    OR length(trim(json_extract(NEW.approval_context_json, '$.workflow.id'))) < 1
    OR length(trim(json_extract(NEW.approval_context_json, '$.workflow.id'))) > 160
    OR length(trim(json_extract(NEW.approval_context_json, '$.workflow.version'))) < 1
    OR length(trim(json_extract(NEW.approval_context_json, '$.workflow.version'))) > 160
    OR length(trim(json_extract(NEW.approval_context_json, '$.workflow.compilerVersion'))) < 1
    OR length(trim(json_extract(NEW.approval_context_json, '$.workflow.compilerVersion'))) > 160
    OR length(trim(json_extract(NEW.approval_context_json, '$.actionId'))) < 1
    OR length(trim(json_extract(NEW.approval_context_json, '$.actionId'))) > 180
    OR length(json_extract(NEW.approval_context_json, '$.activation.policySha256')) IS NOT 71
    OR substr(json_extract(NEW.approval_context_json, '$.activation.policySha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.approval_context_json, '$.activation.policySha256'), 8) GLOB '*[^0-9a-f]*'
    OR length(json_extract(NEW.approval_context_json, '$.artifactManifestSha256')) IS NOT 71
    OR substr(json_extract(NEW.approval_context_json, '$.artifactManifestSha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.approval_context_json, '$.artifactManifestSha256'), 8) GLOB '*[^0-9a-f]*'
    OR length(json_extract(NEW.approval_context_json, '$.runtimeManifestSha256')) IS NOT 71
    OR substr(json_extract(NEW.approval_context_json, '$.runtimeManifestSha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.approval_context_json, '$.runtimeManifestSha256'), 8) GLOB '*[^0-9a-f]*'
    OR length(json_extract(NEW.approval_context_json, '$.workflow.definitionHash')) IS NOT 71
    OR substr(json_extract(NEW.approval_context_json, '$.workflow.definitionHash'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.approval_context_json, '$.workflow.definitionHash'), 8) GLOB '*[^0-9a-f]*'
    OR length(json_extract(NEW.approval_context_json, '$.evidenceDigest')) IS NOT 71
    OR substr(json_extract(NEW.approval_context_json, '$.evidenceDigest'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.approval_context_json, '$.evidenceDigest'), 8) GLOB '*[^0-9a-f]*'
    OR json_extract(NEW.approval_context_json, '$.registration.buildReleaseId') IS NULL
    OR json_extract(NEW.approval_context_json, '$.registration.contractSha256') IS NULL
    OR json_extract(NEW.approval_context_json, '$.registration.runtimePolicySha256') IS NULL
    OR json_extract(NEW.approval_context_json, '$.runtimeManifestSchema') IS NULL
    OR length(json_extract(NEW.approval_context_json, '$.registration.contractSha256')) IS NOT 71
    OR substr(json_extract(NEW.approval_context_json, '$.registration.contractSha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.approval_context_json, '$.registration.contractSha256'), 8) GLOB '*[^0-9a-f]*'
    OR length(json_extract(NEW.approval_context_json, '$.registration.runtimePolicySha256')) IS NOT 71
    OR substr(json_extract(NEW.approval_context_json, '$.registration.runtimePolicySha256'), 1, 7) IS NOT 'sha256:'
    OR substr(json_extract(NEW.approval_context_json, '$.registration.runtimePolicySha256'), 8) GLOB '*[^0-9a-f]*'
    OR NOT EXISTS (
      SELECT 1
      FROM control_runs parent
      JOIN control_workflow_runtime_runs runtime
        ON runtime.run_id = parent.id
      JOIN control_workflow_runtime_steps step
        ON step.run_id = runtime.run_id
       AND step.step_id = NEW.step_id
      JOIN control_workflow_runtime_receipts receipt
        ON receipt.run_id = runtime.run_id
      WHERE runtime.run_id = NEW.run_id
        AND json_extract(runtime.run_json, '$.schema') = 'workflow_runtime_run.v0.2'
        AND parent.account_id = json_extract(NEW.approval_context_json, '$.scope.accountId')
        AND parent.tenant_id = json_extract(NEW.approval_context_json, '$.scope.tenantId')
        AND parent.workspace_account_id =
          json_extract(NEW.approval_context_json, '$.scope.workspaceAccountId')
        AND parent.activation_id = json_extract(NEW.approval_context_json, '$.activation.id')
        AND parent.activation_version = json_extract(NEW.approval_context_json, '$.activation.version')
        AND 'sha256:' || json_extract(parent.activation_json, '$.policySha256') =
          json_extract(NEW.approval_context_json, '$.activation.policySha256')
        AND json_extract(runtime.run_json, '$.registration.buildReleaseId') =
          json_extract(NEW.approval_context_json, '$.registration.buildReleaseId')
        AND json_extract(runtime.run_json, '$.registration.contractSha256') =
          json_extract(NEW.approval_context_json, '$.registration.contractSha256')
        AND json_extract(runtime.run_json, '$.registration.runtimePolicySha256') =
          json_extract(NEW.approval_context_json, '$.registration.runtimePolicySha256')
        AND json_extract(runtime.run_json, '$.runtimeManifestSchema') =
          json_extract(NEW.approval_context_json, '$.runtimeManifestSchema')
        AND json_extract(runtime.run_json, '$.artifactManifestSha256') =
          json_extract(NEW.approval_context_json, '$.artifactManifestSha256')
        AND json_extract(runtime.run_json, '$.runtimeManifestSha256') =
          json_extract(NEW.approval_context_json, '$.runtimeManifestSha256')
        AND receipt.created_at = NEW.created_at
        AND json_extract(receipt.receipt_json, '$.schema') =
          'create-something/control-run-receipt@3'
        AND json_extract(receipt.receipt_json, '$.eventType') = 'wait_created'
        AND json_extract(receipt.receipt_json, '$.stepId') = NEW.step_id
        AND json_extract(receipt.receipt_json, '$.attemptId') IS NULL
        AND json_extract(receipt.receipt_json, '$.runVersion') =
          json_extract(NEW.approval_context_json, '$.runVersion')
        AND json_extract(receipt.receipt_json, '$.stepVersion') =
          json_extract(NEW.approval_context_json, '$.stepVersion')
        AND step.version = json_extract(NEW.approval_context_json, '$.stepVersion')
        AND json_extract(step.step_json, '$.approval.id') = NEW.approval_id
        AND json_extract(step.step_json, '$.approval.bindingSha256') = NEW.binding_sha256
        AND json_extract(step.step_json, '$.approval.policyId') =
          json_extract(NEW.approval_json, '$.policyId')
        AND json_extract(step.step_json, '$.approval.expiresAt') =
          json_extract(NEW.approval_json, '$.expiresAt')
        AND json_extract(receipt.receipt_json, '$.activationId') =
          json_extract(NEW.approval_context_json, '$.activation.id')
        AND json_extract(receipt.receipt_json, '$.activationVersion') =
          json_extract(NEW.approval_context_json, '$.activation.version')
        AND json_extract(receipt.receipt_json, '$.activationPolicySha256') =
          json_extract(NEW.approval_context_json, '$.activation.policySha256')
        AND json_extract(receipt.receipt_json, '$.artifactManifestSha256') =
          json_extract(NEW.approval_context_json, '$.artifactManifestSha256')
        AND json_extract(receipt.receipt_json, '$.runtimeManifestSha256') =
          json_extract(NEW.approval_context_json, '$.runtimeManifestSha256')
        AND json_extract(receipt.receipt_json, '$.buildReleaseId') =
          json_extract(NEW.approval_context_json, '$.registration.buildReleaseId')
        AND json_extract(receipt.receipt_json, '$.contractSha256') =
          json_extract(NEW.approval_context_json, '$.registration.contractSha256')
        AND json_extract(receipt.receipt_json, '$.runtimePolicySha256') =
          json_extract(NEW.approval_context_json, '$.registration.runtimePolicySha256')
        AND json_extract(receipt.receipt_json, '$.runtimeManifestSchema') =
          json_extract(NEW.approval_context_json, '$.runtimeManifestSchema')
        AND json_extract(receipt.receipt_json, '$.workflowId') =
          json_extract(NEW.approval_context_json, '$.workflow.id')
        AND json_extract(receipt.receipt_json, '$.workflowVersion') =
          json_extract(NEW.approval_context_json, '$.workflow.version')
        AND json_extract(receipt.receipt_json, '$.workflowCompilerVersion') =
          json_extract(NEW.approval_context_json, '$.workflow.compilerVersion')
        AND json_extract(receipt.receipt_json, '$.definitionHash') =
          json_extract(NEW.approval_context_json, '$.workflow.definitionHash')
        AND json_extract(receipt.receipt_json, '$.evidenceDigest') =
          json_extract(NEW.approval_context_json, '$.evidenceDigest')
        AND json_extract(receipt.receipt_json, '$.actionId') =
          json_extract(NEW.approval_context_json, '$.actionId')
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Workflow Runtime approval context schema must match its checkpoint');
END;
