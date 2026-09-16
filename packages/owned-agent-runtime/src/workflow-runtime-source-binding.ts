import type { RuntimeDigest, WorkflowRuntimeScope } from '@createsomething/workflow-runtime';
import type { WorkflowRuntimeManifestAuthority } from './workflow-runtime-manifest-authority.js';
import { D1VerifiedBuildWorkflowRuntimeProofReader } from './workflow-runtime-proof-projection.js';

export interface WorkflowRuntimeSourceBinding {
  run_id: string;
  step_id: string;
  binding_version: 1;
  runtime_manifest_sha256: RuntimeDigest;
  capability_id: string;
  capability_parameter_sha256: RuntimeDigest;
  source_tool: 'template_review_observe_handoff';
  source_resource: 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp';
  asset_id: string;
  version_id: string;
  request_sha256: RuntimeDigest;
}

export async function handoffRequestDigest(assetId: string, versionId: string): Promise<RuntimeDigest> {
  if (![assetId, versionId].every(value => /^rec[A-Za-z0-9]{14}$/.test(value)))
    throw new Error('runtime_source_pair_invalid');
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({
    schema: 'template-handoff-request@1', assetId, versionId
  })));
  return `sha256:${Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

/** One Control-owned relation; caller inputs must come from fixed host policy.
 * Reads revalidate both signed capability identity and concrete request digest.
 */
export class D1WorkflowRuntimeSourceBindings {
  private readonly proofs: D1VerifiedBuildWorkflowRuntimeProofReader;
  constructor(private readonly database: D1Database, private readonly manifests: WorkflowRuntimeManifestAuthority) {
    this.proofs = new D1VerifiedBuildWorkflowRuntimeProofReader(database, manifests);
  }

  private async capability(scope: WorkflowRuntimeScope, runId: string, stepId: string) {
    const proof = await this.proofs.find({ scope, runId });
    if (!proof) throw new Error('runtime_source_checkpoint_unavailable');
    const manifest = await this.manifests.findByRuntimeManifestSha256(proof.run.runtimeManifestSha256);
    const step = manifest?.steps.find(step => step.id === stepId);
    if (!step || step.disposition !== 'pass') throw new Error('runtime_source_capability_unavailable');
    return { digest: proof.run.runtimeManifestSha256, capability: step.capability };
  }

  async find(scope: WorkflowRuntimeScope, runId: string, stepId: string): Promise<WorkflowRuntimeSourceBinding | undefined> {
    const signed = await this.capability(scope, runId, stepId);
    const row = await this.database.prepare(`SELECT * FROM control_workflow_runtime_source_bindings
      WHERE run_id=?1 AND step_id=?2`).bind(runId, stepId).first<WorkflowRuntimeSourceBinding>();
    if (!row) return undefined;
    if (row.binding_version !== 1 || row.runtime_manifest_sha256 !== signed.digest ||
        row.capability_id !== signed.capability.id || row.capability_parameter_sha256 !== signed.capability.parameterDigest ||
        row.source_tool !== 'template_review_observe_handoff' ||
        row.source_resource !== 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp' ||
        row.request_sha256 !== await handoffRequestDigest(row.asset_id, row.version_id))
      throw new Error('runtime_source_binding_invalid');
    return Object.freeze({ ...row });
  }

  async publish(input: { scope: WorkflowRuntimeScope; runId: string; stepId: string;
    capabilityId: string; capabilityParameterSha256: RuntimeDigest; assetId: string; versionId: string }) {
    const frozen = structuredClone(input);
    const signed = await this.capability(frozen.scope, frozen.runId, frozen.stepId);
    if (signed.capability.id !== frozen.capabilityId || signed.capability.parameterDigest !== frozen.capabilityParameterSha256)
      throw new Error('runtime_source_compiled_capability_mismatch');
    const record: WorkflowRuntimeSourceBinding = {
      run_id: frozen.runId, step_id: frozen.stepId, binding_version: 1, runtime_manifest_sha256: signed.digest,
      capability_id: frozen.capabilityId, capability_parameter_sha256: frozen.capabilityParameterSha256,
      source_tool: 'template_review_observe_handoff',
      source_resource: 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp',
      asset_id: frozen.assetId, version_id: frozen.versionId,
      request_sha256: await handoffRequestDigest(frozen.assetId, frozen.versionId)
    };
    const existing = await this.find(frozen.scope, frozen.runId, frozen.stepId);
    if (existing) {
      if (Object.entries(record).some(([key, value]) => existing[key as keyof WorkflowRuntimeSourceBinding] !== value))
        throw new Error('runtime_source_binding_conflict');
      return existing;
    }
    await this.database.prepare(`INSERT INTO control_workflow_runtime_source_bindings
      (${Object.keys(record).join(',')}) VALUES (${Object.values(record).map((_, index) => `?${index + 1}`).join(',')}) RETURNING run_id`)
      .bind(...Object.values(record)).first();
    const saved = await this.find(frozen.scope, frozen.runId, frozen.stepId);
    if (!saved) throw new Error('runtime_source_binding_not_persisted');
    return saved;
  }
}
