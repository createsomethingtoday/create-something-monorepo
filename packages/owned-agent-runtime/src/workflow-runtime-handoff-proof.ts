import type { WorkflowRuntimeScope } from '@createsomething/workflow-runtime';
import type { WorkflowRuntimeManifestAuthority } from './workflow-runtime-manifest-authority.js';
import {
  D1WorkflowRuntimeProofReader,
  type WorkflowRuntimeProofProjection
} from './workflow-runtime-proof-projection.js';
import {
  parseTemplateReviewHandoffEvidence,
  type TemplateReviewHandoffEvidenceRow,
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
  constructor(
    private readonly database: D1Database,
    manifests: WorkflowRuntimeManifestAuthority,
    _maximumAgeMs: number
  ) {
    this.runtime = new D1WorkflowRuntimeProofReader(database, manifests);
  }
  private async read(input: {
    scope: WorkflowRuntimeScope;
    runId: string;
  }): Promise<WorkflowRuntimeHandoffProof | undefined> {
    const runtime = await this.runtime.find(input);
    if (!runtime) return undefined;
    const rows = await this.database.prepare(`
      SELECT evidence.* FROM control_workflow_runtime_handoff_observations evidence
      JOIN control_runs parent ON parent.id = evidence.run_id
      WHERE evidence.run_id = ?1 AND parent.account_id = ?2 AND parent.tenant_id = ?3
        AND parent.workspace_account_id = ?4
      ORDER BY evidence.step_id, evidence.attempt_id
    `).bind(input.runId, input.scope.accountId, input.scope.tenantId,
      input.scope.workspaceAccountId).all<TemplateReviewHandoffEvidenceRow>();
    const byAttempt = new Map(rows.results.map(row => [JSON.stringify([row.step_id, row.attempt_id]), row]));
    const intents = new Set(runtime.receipts.filter(receipt => receipt.eventType === 'effect_intent')
      .map(receipt => JSON.stringify([receipt.stepId, receipt.attemptId])));
    const observations: TemplateReviewHandoffEvidence[] = [];
    for (const step of runtime.steps) {
      for (const attempt of step.attempts) {
        if (attempt.capabilityId !== 'template-review.handoff.observe.v1') continue;
        const key = JSON.stringify([step.id, attempt.id]);
        const row = byAttempt.get(key);
        if (row) {
          if (!intents.has(key)) throw new Error('handoff_evidence_attempt_mismatch');
          observations.push(parseTemplateReviewHandoffEvidence(row, attempt));
          byAttempt.delete(key);
        } else if (attempt.status === 'succeeded') throw new Error('handoff_success_without_evidence');
      }
    }
    if (byAttempt.size) throw new Error('handoff_evidence_attempt_mismatch');
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
