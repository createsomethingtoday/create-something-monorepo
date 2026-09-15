import { ZeroWriteWorkflowRuntimeHost, type RuntimeDigest, type WorkflowRuntimeHostPorts } from '@createsomething/workflow-runtime';
import { activationColumns } from './control-activation-binding.js';
import { publishControlBuildBinding } from './control-build-binding-publication.js';
import type { ControlActor, ControlRunExecutor, FrozenControlActivation } from './control.js';
import { D1ControlSourcePermitAuthority } from './control-source-permit.js';
import { RegisteredWorkflowManifestAuthority } from './registered-workflow-manifest-authority.js';
import { D1TemplateReviewHandoffGateway, type TemplateReviewHandoffSource } from './template-review-handoff-gateway.js';
import { D1TemplateReviewHandoffEvidenceStore } from './template-review-handoff-store.js';
import { driveTemplateReviewRuntime } from './template-review-runtime-driver.js';
import type { admitWorkflowArtifact, WorkflowArtifactAdmissionPolicy } from './workflow-artifact-admission.js';
import { D1WorkflowArtifactRegistrationReader } from './workflow-artifact-registration.js';
import { WorkflowRuntimeBoundApprovalAuthority } from './workflow-runtime-approval-authority.js';
import { D1WorkflowRuntimeHandoffProofReader } from './workflow-runtime-handoff-proof.js';
import { D1WorkflowRuntimeCheckpointStore } from './workflow-runtime-store.js';
import { D1WorkflowRuntimeSourceBindings } from './workflow-runtime-source-binding.js';
import { D1VerifiedWorkflowRuntimeReceiptSink } from './workflow-runtime-receipt-sink.js';

/** Internal, fixed-release composition. All configuration and ports come from
 * the owning Worker, never from Control request parameters. This does not itself
 * activate a release, supply credentials, or schedule untracked continuations.
 */
export async function createTemplateReviewHost(input: {
  runtimeDb: D1Database;
  agencyDb: D1Database;
  activation: FrozenControlActivation;
  policy: WorkflowArtifactAdmissionPolicy;
  artifacts: Parameters<typeof admitWorkflowArtifact>[0];
  source: TemplateReviewHandoffSource;
  parameters: { assetId: string; versionId: string };
  observationStep: { stepId: string; capabilityId: string; capabilityParameterSha256: RuntimeDigest };
  maximumAgeMs: number;
  maximumClockSkewMs: number;
  schedulerSubject: string;
  clock: () => string;
  identity: (actor: ControlActor | null) => WorkflowRuntimeHostPorts['identity'];
  queue: WorkflowRuntimeHostPorts['queue'];
}) {
  const activation = structuredClone(input.activation);
  const policy = structuredClone(input.policy);
  const sourceConfiguration = structuredClone({ ...input.observationStep, ...input.parameters });
  const registry = new D1WorkflowArtifactRegistrationReader(input.agencyDb);
  const registration = await registry.find(activation);
  if (!registration) throw new Error('runtime_registration_unavailable');
  const supports = (candidate: FrozenControlActivation) =>
    (Object.keys(activationColumns) as Array<keyof FrozenControlActivation>)
      .every(key => JSON.stringify(candidate[key]) === JSON.stringify(activation[key]));
  const manifests = new RegisteredWorkflowManifestAuthority(input.artifacts, [{ registration, policy }]);
  const storage = new D1WorkflowRuntimeCheckpointStore(input.runtimeDb, manifests,
    manifests.approvalSurfaces, 'verified-build-v2');
  const sourceBindings = new D1WorkflowRuntimeSourceBindings(input.runtimeDb, manifests);
  const receiptSink = new D1VerifiedWorkflowRuntimeReceiptSink(input.runtimeDb, manifests, {
    accountId: activation.accountId, tenantId: activation.tenantId, workspaceAccountId: activation.workspaceAccountId
  });
  const evidence = new D1TemplateReviewHandoffEvidenceStore(input.runtimeDb, manifests,
    input.maximumAgeMs, input.maximumClockSkewMs, true);
  const gateway = new D1TemplateReviewHandoffGateway(input.runtimeDb, manifests,
    new D1ControlSourcePermitAuthority(input.agencyDb), input.source,
    { ...input.parameters, artifactManifestSha256: registration.artifactManifestSha256,
      runtimeManifestSha256: registration.runtimeManifestSha256 },
    input.maximumAgeMs, input.clock, input.maximumClockSkewMs, 'verified-build-v2', true);
  async function resolve(actor: ControlActor | null) {
    const current = await registry.find(activation);
    if (!current || JSON.stringify(current) !== JSON.stringify(registration))
      throw new Error('runtime_registration_changed');
    const manifest = await manifests.findByRuntimeManifestSha256(registration!.runtimeManifestSha256 as RuntimeDigest);
    if (!manifest) throw new Error('runtime_manifest_unavailable');
    const host = new ZeroWriteWorkflowRuntimeHost(manifest, { storage, clock: input.clock,
      identity: input.identity(actor), queue: input.queue, receiptSink,
      executor: undefined as never });
    return { manifest, host };
  }
  const executor: ControlRunExecutor = {
    supports,
    async execute({ run, activation: frozen }) {
      if (!supports(frozen) || !supports(run.activation)) throw new Error('runtime_activation_mismatch');
      const scope = { accountId: activation.accountId, tenantId: activation.tenantId,
        workspaceAccountId: activation.workspaceAccountId };
      await publishControlBuildBinding(input.runtimeDb, input.agencyDb, { scope, runId: run.id }, input.artifacts, policy);
      const { manifest, host } = await resolve(null);
      const admissionWakes: Array<{runId:string;expectedVersion:number}> = [];
      if (!(await storage.find(scope, run.id))) {
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
          new TextEncoder().encode(run.id))), byte => byte.toString(16).padStart(2, '0')).join('');
        const admissionHost = new ZeroWriteWorkflowRuntimeHost(manifest, {
          storage, clock: input.clock, identity: input.identity(null), receiptSink,
          queue: { async enqueue(message) { admissionWakes.push(message); } }, executor: undefined as never
        });
        await admissionHost.admit(scope, { runId: run.id,
          activation: { id: activation.id, version: activation.activationVersion,
            policySha256: `sha256:${activation.policySha256}` },
          registration: { buildReleaseId: activation.buildReleaseId,
            contractSha256: `sha256:${activation.contractSha256}`,
            runtimePolicySha256: `sha256:${activation.policySha256}` },
          artifactManifestSha256: registration.artifactManifestSha256 as RuntimeDigest,
          runtimeManifestSha256: registration.runtimeManifestSha256 as RuntimeDigest,
          clock: input.clock() }, `runtime-admit:${hash}`, '');
      }
      await sourceBindings.publish({ scope, runId: run.id, ...sourceConfiguration });
      // No consumer sees a newly admitted checkpoint before its fixed request
      // mapping exists. Durable queued state permits recovery of a lost send.
      for (const wake of admissionWakes) await input.queue.enqueue(wake);
      return driveTemplateReviewRuntime({ scope, runId: run.id, manifest, host, storage,
        gateway, evidence, sourceBindings, schedulerSubject: input.schedulerSubject, clock: input.clock });
    }
  };
  const runtimeApprovals = new WorkflowRuntimeBoundApprovalAuthority(async decision => {
    if (!supports(decision.run.activation) || decision.scope.accountId !== activation.accountId ||
        decision.scope.tenantId !== activation.tenantId || decision.scope.workspaceAccountId !== activation.workspaceAccountId)
      throw new Error('runtime_approval_scope_mismatch');
    return (await resolve(decision.actor)).host;
  }, input.clock);
  return { executor, runtimeApprovals,
    proofs: new D1WorkflowRuntimeHandoffProofReader(input.runtimeDb, manifests, input.maximumAgeMs, 'verified-build-v2', true) };
}
