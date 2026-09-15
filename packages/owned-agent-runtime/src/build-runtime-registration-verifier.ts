/** Operator-side filesystem verifier. Do not import into the hosted Worker.
 * The owning writer must load/revalidate activation from Agency before INSERT;
 * this candidate does not authorize registration, activation, or source access. */
import { inspectBuildReleasePackage } from '@create-something/delivery-schema/build-release';
import { admitWorkflowArtifact, type WorkflowArtifactAdmissionPolicy } from './workflow-artifact-admission.js';
import type { FrozenControlActivation } from './control.js';

export async function verifyBuildRuntimeRegistration(
  manifestPath: string,
  activationInput: FrozenControlActivation,
  reader: Parameters<typeof admitWorkflowArtifact>[0],
  policyInput: WorkflowArtifactAdmissionPolicy
) {
  const activation = structuredClone(activationInput);
  const policy = structuredClone(policyInput);
  const inspection = inspectBuildReleasePackage(manifestPath);
  const {manifest, runtimeBinding: binding, handoffReceipt: handoff, acceptanceReceipt: acceptance} = inspection;
  const reject = (): never => { throw new Error('build_runtime_registration_not_verified'); };
  if (activation.status !== 'active' || !inspection.releaseReady || !inspection.evidenceValid || inspection.issues.length ||
      !manifest || !binding || !handoff || !acceptance || !inspection.manifestSha256 ||
      manifest.schema !== 'create-something/build-release-manifest@2' || !manifest.artifacts.runtime_binding ||
      handoff.status !== 'accepted' || acceptance.status !== 'accepted') return reject();
  const expected: Partial<FrozenControlActivation> = {
    accountId: handoff.accountId,
    workspaceAccountId: handoff.workspaceAccountId,
    mapId: handoff.mapId,
    mapVersion: handoff.mapVersion,
    handoffId: handoff.handoffId,
    handoffReceiptSha256: manifest.handoff.receiptSha256,
    buildReleaseId: manifest.releaseId,
    buildManifestSha256: inspection.manifestSha256,
    buildArtifactSetSha256: acceptance.artifactSetSha256,
    buildAcceptanceReceiptId: acceptance.receiptId,
    buildAcceptanceReceiptSha256: manifest.acceptance.receiptSha256,
    contractSha256: binding.contractSha256.slice(7),
    policySha256: binding.runtimePolicySha256.slice(7)
  };
  for (const key of Object.keys(expected) as (keyof FrozenControlActivation)[])
    if (activation[key] !== expected[key]) return reject();
  // Admission verifies the inventory/signature and re-derives runtime policy.
  // It never substitutes the compiler inventory digest for the delivery digest.
  await admitWorkflowArtifact(reader, binding, policy);
  return Object.freeze({
    schema: 'create-something/verified-build-runtime-registration@1' as const,
    activationId: activation.id,
    activationVersion: activation.activationVersion,
    accountId: activation.accountId,
    tenantId: activation.tenantId,
    workspaceAccountId: activation.workspaceAccountId,
    buildManifestSha256: inspection.manifestSha256,
    buildArtifactSetSha256: acceptance.artifactSetSha256,
    bindingSha256: `sha256:${manifest.artifacts.runtime_binding.sha256}`,
    binding
  });
}
