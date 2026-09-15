import type { WorkflowRuntimeScope } from '@createsomething/workflow-runtime';
import type { WorkflowRuntimeManifestAuthority } from './workflow-runtime-manifest-authority.js';
import { D1WorkflowRuntimeProofReader } from './workflow-runtime-proof-projection.js';
import { D1ControlRunRepository } from './control-store.js';
import { D1ControlSourcePermitAuthority } from './control-source-permit.js';
import { D1TemplateReviewHandoffEvidenceStore, type TemplateReviewHandoffEvidence } from './template-review-handoff-store.js';

const TOOL = 'template_review_observe_handoff';
const RESOURCE = 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp';
type Target = { scope: WorkflowRuntimeScope; runId: string; stepId: string; attemptId: string };
export interface TemplateReviewHandoffSource {
  observe(parameters: { assetId: string; versionId: string }): Promise<unknown>;
}
export type TemplateReviewHandoffGatewayResult =
  | { type: 'observed'; evidence: TemplateReviewHandoffEvidence }
  | { type: 'not_authorized' | 'effect_unknown' };

async function digest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return `sha256:${Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')}`;
}

/** Fixed registered source only. No caller-selected URL, tool, or record pair. */
export class D1TemplateReviewHandoffGateway {
  private readonly proofs: D1WorkflowRuntimeProofReader;
  private readonly parents: D1ControlRunRepository;
  private readonly evidence: D1TemplateReviewHandoffEvidenceStore;
  private readonly registration: Readonly<{
    assetId: string; versionId: string; artifactManifestSha256: string; runtimeManifestSha256: string;
  }>;
  constructor(
    private readonly database: D1Database,
    manifests: WorkflowRuntimeManifestAuthority,
    private readonly permits: D1ControlSourcePermitAuthority,
    private readonly source: TemplateReviewHandoffSource,
    registration: { assetId: string; versionId: string; artifactManifestSha256: string; runtimeManifestSha256: string },
    maximumAgeMs: number,
    private readonly clock: () => string = () => new Date().toISOString(),
    maximumClockSkewMs = 0
  ) {
    if (!Number.isSafeInteger(maximumClockSkewMs) || maximumClockSkewMs < 0 || maximumClockSkewMs > 60_000)
      throw new Error('invalid_handoff_clock_policy');
    if (!Number.isSafeInteger(maximumAgeMs) || maximumAgeMs <= 0)
      throw new Error('invalid_handoff_freshness_policy');
    for (const value of [registration.assetId, registration.versionId])
      if (!/^rec[A-Za-z0-9]{14}$/.test(value)) throw new Error('invalid_handoff_registration');
    for (const value of [registration.artifactManifestSha256, registration.runtimeManifestSha256])
      if (!/^sha256:[0-9a-f]{64}$/.test(value)) throw new Error('invalid_handoff_registration');
    this.registration = Object.freeze({ ...registration });
    this.proofs = new D1WorkflowRuntimeProofReader(database, manifests);
    this.parents = new D1ControlRunRepository(database);
    this.evidence = new D1TemplateReviewHandoffEvidenceStore(database, manifests, maximumAgeMs, maximumClockSkewMs);
  }

  private async authorized(target: Target, requestSha256: string) {
    const proof = await this.proofs.find(target);
    // Parent stop does not mutate the runtime checkpoint: read it last.
    const parent = await this.parents.find(target.scope, target.runId);
    const step = proof?.steps.find(step => step.id === target.stepId);
    const attempt = step?.attempts.find(attempt => attempt.id === target.attemptId);
    if (!parent || parent.status !== 'running' ||
        !parent.requestedTools.includes(TOOL) || !parent.requestedResources.includes(RESOURCE) || !proof || proof.run.status !== 'running' ||
        proof.run.artifactManifestSha256 !== this.registration.artifactManifestSha256 ||
        proof.run.runtimeManifestSha256 !== this.registration.runtimeManifestSha256 ||
        proof.run.activation.id !== parent.activation.id ||
        proof.run.activation.version !== parent.activation.activationVersion ||
        step?.status !== 'running' || attempt?.status !== 'prepared' ||
        attempt.capabilityId !== 'template-review.handoff.observe.v1' ||
        attempt.capabilityParameterSha256 !== requestSha256 ||
        !proof.receipts.some(receipt => receipt.eventType === 'effect_intent' &&
          receipt.stepId === target.stepId && receipt.attemptId === target.attemptId)) return undefined;
    // Repository.find also reads receipts after its run row. Check status/version
    // in one final query so a stop during receipt assembly cannot authorize.
    const current = await this.database.prepare(
      `SELECT p.status, p.version FROM control_runs p
       JOIN control_workflow_runtime_runs r ON r.run_id=p.id
       WHERE p.id = ? AND p.account_id = ? AND p.tenant_id = ? AND p.workspace_account_id = ?
         AND r.version = ? AND r.status = 'running'
         AND EXISTS (SELECT 1 FROM json_each(r.run_json,'$.steps') s,
           json_each(s.value,'$.attempts') a
           WHERE json_extract(s.value,'$.id')=? AND json_extract(s.value,'$.status')='running'
             AND json_extract(a.value,'$.id')=? AND json_extract(a.value,'$.status')='prepared')`
    ).bind(target.runId, target.scope.accountId, target.scope.tenantId, target.scope.workspaceAccountId,
      proof.run.version, target.stepId, target.attemptId)
      .first<{status: string; version: number}>();
    return current?.status === 'running' && current.version === parent.version ? parent : undefined;
  }

  async observe(target: Target): Promise<TemplateReviewHandoffGatewayResult> {
    const registered = await this.proofs.find(target);
    if (!registered || registered.run.artifactManifestSha256 !== this.registration.artifactManifestSha256 ||
        registered.run.runtimeManifestSha256 !== this.registration.runtimeManifestSha256)
      return { type: 'not_authorized' };
    const parameters = { assetId: this.registration.assetId, versionId: this.registration.versionId };
    const requestSha256 = await digest({ schema: 'template-handoff-request@1', ...parameters });
    const replay = await this.evidence.find(target);
    if (replay) return replay.observation.requestSha256 === requestSha256
      ? { type: 'observed', evidence: replay } : { type: 'not_authorized' };
    const parent = await this.authorized(target, requestSha256);
    if (!parent) return { type: 'not_authorized' };
    // Redemption is not replayable. Any uncertainty after this point requires
    // reconciliation of this attempt, never another call to the source.
    try {
      const permit = await this.permits.redeem({ activation: parent.activation,
        runId: target.runId, stepId: target.stepId, attemptId: target.attemptId,
        requestSha256, tool: TOOL, resource: RESOURCE });
      if (!permit) return { type: 'effect_unknown' };
      const sourceInvocationSha256 = await digest({ schema: 'control-handoff-invocation@1',
        permitId: permit.permitId, requestSha256 });
      if (!(await this.authorized(target, requestSha256))) return { type: 'not_authorized' };
      const dispatchedAt = this.clock();
      const observation = await this.source.observe(parameters);
      const receivedAt = this.clock();
      const evidence = await this.evidence.record({ ...target, sourceInvocationSha256,
        dispatchedAt, receivedAt, observation });
      return { type: 'observed', evidence };
    } catch {
      // Source/transport errors can contain credentials or raw records.
      return { type: 'effect_unknown' };
    }
  }
}
