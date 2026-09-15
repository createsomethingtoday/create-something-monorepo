/** Operator-side entry point; database and policy are trusted host configuration.
 * No hosted endpoint or source authority is granted by this function. */
import { D1ControlActivationAuthority } from './control-store.js';
import { activationColumns } from './control-activation-binding.js';
import { verifyBuildRuntimeRegistration } from './build-runtime-registration-verifier.js';
import type { ControlScope } from './control.js';
import type { WorkflowArtifactAdmissionPolicy, admitWorkflowArtifact } from './workflow-artifact-admission.js';

export async function registerVerifiedBuildRuntime(
  database: D1Database,
  input: { manifestPath: string; scope: ControlScope; activationId: string; verifiedBy: string },
  reader: Parameters<typeof admitWorkflowArtifact>[0],
  policy: WorkflowArtifactAdmissionPolicy
) {
  const request = structuredClone(input);
  const hostPolicy = structuredClone(policy);
  if (!request.verifiedBy.trim() || request.verifiedBy !== request.verifiedBy.trim()) throw new Error('invalid_registration_operator');
  const activation = await new D1ControlActivationAuthority(database).findActive(request.scope,request.activationId);
  if (!activation) throw new Error('runtime_registration_activation_unavailable');
  const verified = await verifyBuildRuntimeRegistration(request.manifestPath,activation,reader,hostPolicy);
  const binding = verified.binding;
  const record = {
    registration_version:2,
    activation_id:activation.id, activation_version:activation.activationVersion,
    account_id:activation.accountId,tenant_id:activation.tenantId,workspace_account_id:activation.workspaceAccountId,
    build_release_id:binding.buildReleaseId,
    build_manifest_sha256:verified.buildManifestSha256,build_artifact_set_sha256:verified.buildArtifactSetSha256,
    binding_sha256:verified.bindingSha256,
    contract_sha256:binding.contractSha256.slice(7),runtime_policy_sha256:binding.runtimePolicySha256.slice(7),
    workflow_id:binding.workflowId,workflow_version:binding.workflowVersion,compiler_version:binding.compilerVersion,
    runtime_manifest_schema:binding.runtimeManifestSchema,definition_hash:binding.definitionHash,
    artifact_manifest_sha256:binding.artifactManifestSha256,runtime_manifest_sha256:binding.runtimeManifestSha256,
    attestation_public_key_fingerprint:binding.attestationPublicKeyFingerprint,attestation_key_id:binding.attestationKeyId,
    artifact_prefix:binding.artifactPrefix,verified_by:request.verifiedBy,verified_at:new Date().toISOString()
  };
  const values: unknown[] = Object.values(record);
  const placeholders = values.map((_,index)=>`?${index+1}`);
  const matches = Object.entries(activationColumns).map(([key,column])=>{
    const value = activation[key as keyof typeof activation];
    values.push(Array.isArray(value)?JSON.stringify(value):value);
    return `a.${column}=?${values.length}`;
  });
  // A suspension or changed activation during artifact verification yields zero
  // inserted rows. The schema independently guards scope/version/immutability.
  const result = await database.prepare(`INSERT INTO customer_control_runtime_registrations
    (${Object.keys(record).join(',')}) SELECT ${placeholders.join(',')}
    FROM customer_control_activations a WHERE ${matches.join(' AND ')}
    RETURNING activation_id AS activationId`).bind(...values).first<{activationId:string}>();
  if (!result || result.activationId !== activation.id) throw new Error('runtime_registration_activation_changed');
  return verified;
}
