import { D1WorkflowArtifactRegistrationReader } from './workflow-artifact-registration.js';
import { admitWorkflowArtifact, type WorkflowArtifactAdmissionPolicy } from './workflow-artifact-admission.js';
import type { ControlScope, FrozenControlActivation } from './control.js';

/** Internal host composition. Publication records verified evidence; source
 * dispatch must still obtain current Agency authority through its own permit. */
export async function publishControlBuildBinding(
  runtimeDb: D1Database, agencyDb: D1Database,
  input: {scope:ControlScope;runId:string},
  artifacts: Parameters<typeof admitWorkflowArtifact>[0],
  policy: WorkflowArtifactAdmissionPolicy
): Promise<void> {
  const request = structuredClone(input);
  const hostPolicy = structuredClone(policy);
  const parent = await runtimeDb.prepare(`SELECT activation_json FROM control_runs
    WHERE id=?1 AND account_id=?2 AND tenant_id=?3 AND workspace_account_id=?4 AND status IN ('queued','running')`)
    .bind(request.runId,request.scope.accountId,request.scope.tenantId,request.scope.workspaceAccountId)
    .first<{activation_json:string}>();
  if (!parent) throw new Error('control_binding_parent_unavailable');
  const activation = JSON.parse(parent.activation_json) as FrozenControlActivation;
  if (!activation || activation.accountId!==request.scope.accountId || activation.tenantId!==request.scope.tenantId ||
      activation.workspaceAccountId!==request.scope.workspaceAccountId) throw new Error('control_binding_scope_mismatch');
  const registry = new D1WorkflowArtifactRegistrationReader(agencyDb);
  const registration = await registry.find(activation);
  if (!registration) throw new Error('control_binding_registration_unavailable');
  const manifest = await admitWorkflowArtifact(artifacts,registration,hostPolicy);
  // Recheck after the potentially slow artifact read. This is not a distributed
  // transaction or permission to invoke a source after subsequent suspension.
  const current = await registry.find(activation);
  if (!current || JSON.stringify(current)!==JSON.stringify(registration)) throw new Error('control_binding_registration_changed');
  const record = {
    run_id:request.runId,registration_version:2,activation_id:activation.id,activation_version:activation.activationVersion,
    account_id:request.scope.accountId,tenant_id:request.scope.tenantId,workspace_account_id:request.scope.workspaceAccountId,
    build_release_id:activation.buildReleaseId,build_manifest_sha256:'sha256:'+registration.buildManifestSha256,
    build_artifact_set_sha256:'sha256:'+registration.buildArtifactSetSha256,binding_sha256:registration.bindingSha256,
    contract_sha256:'sha256:'+activation.contractSha256,runtime_policy_sha256:'sha256:'+activation.policySha256,
    artifact_manifest_sha256:registration.artifactManifestSha256,runtime_manifest_sha256:registration.runtimeManifestSha256,
    definition_hash:manifest.workflow.definitionHash,workflow_id:manifest.workflow.id,workflow_version:manifest.workflow.version,
    compiler_version:manifest.workflow.compilerVersion,runtime_manifest_schema:manifest.schemaVersion,
    attestation_key_id:registration.attestationKeyId,attestation_public_key_fingerprint:registration.attestationPublicKeyFingerprint,
    artifact_prefix:registration.artifactPrefix,verified_at:new Date().toISOString()
  };
  const existing = await runtimeDb.prepare('SELECT * FROM control_workflow_runtime_build_bindings WHERE run_id=?1')
    .bind(request.runId).first<Record<string,unknown>>();
  if (existing) {
    if (Object.entries(record).some(([key,value])=>key!=='verified_at' && existing[key]!==value))
      throw new Error('control_binding_publication_conflict');
    return;
  }
  const values: unknown[] = Object.values(record);
  const placeholders = values.map((_,index)=>`?${index+1}`);
  values.push(request.runId,parent.activation_json);
  const result = await runtimeDb.prepare(`INSERT INTO control_workflow_runtime_build_bindings (${Object.keys(record).join(',')})
    SELECT ${placeholders.join(',')} FROM control_runs WHERE id=?${values.length-1} AND activation_json=?${values.length}
      AND status IN ('queued','running') RETURNING run_id`).bind(...values).first<{run_id:string}>();
  if (!result) throw new Error('control_binding_parent_changed');
}
