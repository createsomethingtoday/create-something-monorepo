import type { WorkflowRuntimeScope } from '@createsomething/workflow-runtime';
import type { WorkflowRuntimeManifestAuthority } from './workflow-runtime-manifest-authority.js';
import { D1WorkflowRuntimeProofReader } from './workflow-runtime-proof-projection.js';
import {
  validateTemplateReviewHandoffObservation,
  type TemplateReviewHandoffObservation
} from './template-review-handoff-observation.js';

type Target = { scope: WorkflowRuntimeScope; runId: string; stepId: string; attemptId: string };
export type TemplateReviewHandoffEvidence = {
  runId: string;
  stepId: string;
  attemptId: string;
  sourceInvocationSha256: string;
  dispatchedAt: string;
  receivedAt: string;
  maximumAgeMs: number;
  observation: TemplateReviewHandoffObservation;
};
export type TemplateReviewHandoffEvidenceRow = {
  run_id: string;
  step_id: string;
  attempt_id: string;
  request_sha256: string;
  source_invocation_sha256: string;
  observed_at: string;
  observation_state: string;
  reason: string;
  next_action: string;
  evidence_sha256: string;
  dispatched_at: string;
  received_at: string;
  maximum_age_ms: number;
};

/** Stores results from the trusted source gateway; never authorizes dispatch or
 * advances a checkpoint. Late evidence remains readable after an operator stop.
 */
export class D1TemplateReviewHandoffEvidenceStore {
  private readonly proofs: D1WorkflowRuntimeProofReader;
  constructor(
    private readonly database: D1Database,
    manifests: WorkflowRuntimeManifestAuthority,
    private readonly maximumAgeMs: number
  ) {
    this.proofs = new D1WorkflowRuntimeProofReader(database, manifests);
  }

  private async attempt(target: Target) {
    const proof = await this.proofs.find({ scope: target.scope, runId: target.runId });
    const attempt = proof?.steps
      .find((step) => step.id === target.stepId)
      ?.attempts.find((attempt) => attempt.id === target.attemptId);
    if (
      !attempt ||
      attempt.capabilityId !== 'template-review.handoff.observe.v1' ||
      !proof?.receipts.some(
        (receipt) =>
          receipt.eventType === 'effect_intent' &&
          receipt.stepId === target.stepId &&
          receipt.attemptId === target.attemptId
      )
    )
      return undefined;
    return attempt;
  }

  async find(target: Target): Promise<TemplateReviewHandoffEvidence | undefined> {
    const attempt = await this.attempt(target);
    if (!attempt) return undefined;
    const row = await this.database
      .prepare(
        `SELECT evidence.* FROM control_workflow_runtime_handoff_observations evidence
      JOIN control_runs parent ON parent.id=evidence.run_id
      WHERE evidence.run_id=?1 AND evidence.step_id=?2 AND evidence.attempt_id=?3
      AND parent.account_id=?4 AND parent.tenant_id=?5 AND parent.workspace_account_id=?6`
      )
      .bind(
        target.runId,
        target.stepId,
        target.attemptId,
        target.scope.accountId,
        target.scope.tenantId,
        target.scope.workspaceAccountId
      )
      .first<TemplateReviewHandoffEvidenceRow>();
    if (!row) return undefined;
    return parseTemplateReviewHandoffEvidence(row, attempt);
  }

  async record(
    input: Target & {
      sourceInvocationSha256: string;
      dispatchedAt: string;
      receivedAt: string;
      observation: unknown;
    }
  ): Promise<TemplateReviewHandoffEvidence> {
    const attempt = await this.attempt(input);
    if (!attempt) throw new Error('handoff_attempt_unavailable');
    if (!/^sha256:[a-f0-9]{64}$/.test(input.sourceInvocationSha256))
      throw new Error('handoff_invocation_invalid');
    const replay = await this.find(input);
    const maximumAgeMs = replay?.maximumAgeMs ?? this.maximumAgeMs;
    const observation = validateTemplateReviewHandoffObservation(input.observation, {
      requestSha256: attempt.capabilityParameterSha256,
      dispatchedAt: input.dispatchedAt,
      receivedAt: input.receivedAt,
      maximumAgeMs
    });
    if (Date.parse(input.dispatchedAt) < Date.parse(attempt.createdAt))
      throw new Error('handoff_evidence_predates_intent');
    const expected: TemplateReviewHandoffEvidence = {
      runId: input.runId,
      stepId: input.stepId,
      attemptId: input.attemptId,
      sourceInvocationSha256: input.sourceInvocationSha256,
      dispatchedAt: input.dispatchedAt,
      receivedAt: input.receivedAt,
      maximumAgeMs,
      observation
    };
    if (replay) {
      if (JSON.stringify(replay) !== JSON.stringify(expected))
        throw new Error('handoff_evidence_conflict');
      return replay;
    }
    try {
      await this.database.batch([
        this.database
          .prepare(
            `INSERT INTO control_workflow_runtime_handoff_observations
        (run_id,step_id,attempt_id,request_sha256,source_invocation_sha256,observed_at,observation_state,reason,next_action,evidence_sha256,dispatched_at,received_at,maximum_age_ms)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)`
          )
          .bind(
            input.runId,
            input.stepId,
            input.attemptId,
            observation.requestSha256,
            input.sourceInvocationSha256,
            observation.observedAt,
            observation.state,
            observation.reason,
            observation.nextAction,
            observation.evidenceSha256,
            input.dispatchedAt,
            input.receivedAt,
            maximumAgeMs
          )
      ]);
    } catch {
      const concurrent = await this.find(input);
      if (concurrent && JSON.stringify(concurrent) === JSON.stringify(expected)) return concurrent;
      throw new Error('handoff_evidence_not_persisted');
    }
    const saved = await this.find(input);
    if (!saved || JSON.stringify(saved) !== JSON.stringify(expected))
      throw new Error('handoff_evidence_not_persisted');
    return saved;
  }
}

/** Validate a stored row against its already verified effect-intent attempt. */
export function parseTemplateReviewHandoffEvidence(
  row: TemplateReviewHandoffEvidenceRow,
  attempt: { capabilityParameterSha256: string; createdAt: string }
): TemplateReviewHandoffEvidence {
    const observation = validateTemplateReviewHandoffObservation(
      {
        schema: 'create-something/template-handoff-observation@1',
        dataClassification: 'minimized_status_evidence',
        requestSha256: row.request_sha256,
        observedAt: row.observed_at,
        state: row.observation_state,
        reason: row.reason,
        nextAction: row.next_action,
        evidenceSha256: row.evidence_sha256
      },
      {
        requestSha256: attempt.capabilityParameterSha256,
        dispatchedAt: row.dispatched_at,
        receivedAt: row.received_at,
        maximumAgeMs: row.maximum_age_ms
      }
    );
    if (Date.parse(row.dispatched_at) < Date.parse(attempt.createdAt))
      throw new Error('handoff_evidence_predates_intent');
    return {
      runId: row.run_id,
      stepId: row.step_id,
      attemptId: row.attempt_id,
      sourceInvocationSha256: row.source_invocation_sha256,
      dispatchedAt: row.dispatched_at,
      receivedAt: row.received_at,
      maximumAgeMs: row.maximum_age_ms,
      observation
    };
}
