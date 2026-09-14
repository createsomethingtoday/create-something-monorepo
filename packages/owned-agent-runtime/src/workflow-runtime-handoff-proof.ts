import type { WorkflowRuntimeScope } from '@createsomething/workflow-runtime';
import type { WorkflowRuntimeManifestAuthority } from './workflow-runtime-manifest-authority.js';
import {
  D1WorkflowRuntimeProofReader,
  type WorkflowRuntimeProofProjection
} from './workflow-runtime-proof-projection.js';
import {
  D1TemplateReviewHandoffEvidenceStore,
  type TemplateReviewHandoffEvidence
} from './template-review-handoff-store.js';

export interface WorkflowRuntimeHandoffProof {
  schema: 'create-something/control-reconciliation-proof@1';
  runtime: WorkflowRuntimeProofProjection;
  handoffObservations: TemplateReviewHandoffEvidence[];
}
export interface WorkflowRuntimeHandoffProofReader {
  find(input: {
    scope: WorkflowRuntimeScope;
    runId: string;
  }): Promise<WorkflowRuntimeHandoffProof | undefined>;
}

/** A read-only projection over the same Control ledger, not another state owner. */
export class D1WorkflowRuntimeHandoffProofReader implements WorkflowRuntimeHandoffProofReader {
  private readonly runtime: D1WorkflowRuntimeProofReader;
  private readonly evidence: D1TemplateReviewHandoffEvidenceStore;
  constructor(
    private readonly database: D1Database,
    manifests: WorkflowRuntimeManifestAuthority,
    maximumAgeMs: number
  ) {
    this.runtime = new D1WorkflowRuntimeProofReader(database, manifests);
    this.evidence = new D1TemplateReviewHandoffEvidenceStore(database, manifests, maximumAgeMs);
  }
  private async read(input: {
    scope: WorkflowRuntimeScope;
    runId: string;
  }): Promise<WorkflowRuntimeHandoffProof | undefined> {
    const runtime = await this.runtime.find(input);
    if (!runtime) return undefined;
    const observations: TemplateReviewHandoffEvidence[] = [];
    for (const step of runtime.steps) {
      for (const attempt of step.attempts) {
        if (attempt.capabilityId !== 'template-review.handoff.observe.v1') continue;
        const observation = await this.evidence.find({
          ...input,
          stepId: step.id,
          attemptId: attempt.id
        });
        if (observation) observations.push(observation);
        else if (attempt.status === 'succeeded')
          throw new Error('handoff_success_without_evidence');
      }
    }
    const count = await this.database
      .prepare(
        `SELECT count(*) AS count FROM control_workflow_runtime_handoff_observations WHERE run_id=?1`
      )
      .bind(input.runId)
      .first<{ count: number }>();
    if (count?.count !== observations.length) throw new Error('handoff_evidence_attempt_mismatch');
    return {
      schema: 'create-something/control-reconciliation-proof@1',
      runtime,
      handoffObservations: observations
    };
  }
  async find(input: {
    scope: WorkflowRuntimeScope;
    runId: string;
  }): Promise<WorkflowRuntimeHandoffProof | undefined> {
    const initial = await this.read(input);
    if (!initial) return undefined;
    // Dispatch verification and immutable evidence inserts do not advance the
    // run version. Compare both complete reads, including their evidence sets.
    const current = await this.read(input);
    if (JSON.stringify(current) !== JSON.stringify(initial))
      throw new Error('handoff_proof_changed_during_read');
    return initial;
  }

}
