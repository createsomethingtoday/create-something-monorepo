import type { WorkflowRuntimeScope } from '@createsomething/workflow-runtime';
import { D1WorkflowRuntimeSourceBindings, type WorkflowRuntimeSourceBinding } from './workflow-runtime-source-binding.js';
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
  maximumClockSkewMs: number;
  agePolicyVersion: 1 | 2;
  observation: TemplateReviewHandoffObservation;
  sourceBinding?: WorkflowRuntimeSourceBinding;
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
  maximum_clock_skew_ms: number;
  age_policy_version: 1 | 2;
  source_binding_version?: 1 | 2;
};

/** Stores results from the trusted source gateway; never authorizes dispatch or
 * advances a checkpoint. Late evidence remains readable after an operator stop.
 */
export class D1TemplateReviewHandoffEvidenceStore {
  private readonly proofs: D1WorkflowRuntimeProofReader;
  private readonly sourceBindings?: D1WorkflowRuntimeSourceBindings;
  constructor(
    private readonly database: D1Database,
    manifests: WorkflowRuntimeManifestAuthority,
    private readonly maximumAgeMs: number,
    private readonly maximumClockSkewMs = 0,
    mappedSource = false
  ) {
    this.proofs = new D1WorkflowRuntimeProofReader(database, manifests);
    if (mappedSource) this.sourceBindings = new D1WorkflowRuntimeSourceBindings(database, manifests);
  }

  private async attempt(target: Target) {
    const proof = await this.proofs.find({ scope: target.scope, runId: target.runId });
    const attempt = proof?.steps
      .find((step) => step.id === target.stepId)
      ?.attempts.find((attempt) => attempt.id === target.attemptId);
    const binding = this.sourceBindings ? await this.sourceBindings.find(target.scope, target.runId, target.stepId) : undefined;
    if (
      !attempt ||
      (this.sourceBindings
        ? !binding || attempt.capabilityId !== binding.capability_id || attempt.capabilityParameterSha256 !== binding.capability_parameter_sha256
        : attempt.capabilityId !== 'template-review.handoff.observe.v1') ||
      !proof?.receipts.some(
        (receipt) =>
          receipt.eventType === 'effect_intent' &&
          receipt.stepId === target.stepId &&
          receipt.attemptId === target.attemptId
      )
    )
      return undefined;
    return { ...attempt, sourceBinding: binding };
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
    return parseTemplateReviewHandoffEvidence(row, attempt, attempt.sourceBinding);
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
    const maximumClockSkewMs = replay?.maximumClockSkewMs ?? this.maximumClockSkewMs;
    const agePolicyVersion = replay?.agePolicyVersion ?? 2;
    const observation = validateTemplateReviewHandoffObservation(input.observation, {
      requestSha256: attempt.sourceBinding?.request_sha256 ?? attempt.capabilityParameterSha256,
      dispatchedAt: input.dispatchedAt,
      receivedAt: input.receivedAt,
      maximumAgeMs,
      maximumClockSkewMs,
      agePolicyVersion
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
      maximumClockSkewMs,
      agePolicyVersion,
      observation,
      ...(attempt.sourceBinding ? { sourceBinding: attempt.sourceBinding } : {})
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
        (run_id,step_id,attempt_id,request_sha256,source_invocation_sha256,observed_at,observation_state,reason,next_action,evidence_sha256,dispatched_at,received_at,maximum_age_ms,maximum_clock_skew_ms,age_policy_version${attempt.sourceBinding ? ',source_binding_version' : ''})
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15${attempt.sourceBinding ? ',2' : ''})`
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
            maximumAgeMs,
            maximumClockSkewMs,
            agePolicyVersion
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
  attempt: { capabilityParameterSha256: string; createdAt: string },
  sourceBinding?: WorkflowRuntimeSourceBinding
): TemplateReviewHandoffEvidence {
    if (sourceBinding ? row.source_binding_version !== 2 || sourceBinding.run_id !== row.run_id ||
        sourceBinding.step_id !== row.step_id || sourceBinding.capability_parameter_sha256 !== attempt.capabilityParameterSha256
      : (row.source_binding_version ?? 1) !== 1) throw new Error('handoff_source_binding_invalid');
    if (row.age_policy_version !== 1 && row.age_policy_version !== 2)
      throw new Error('handoff_age_policy_invalid');
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
        requestSha256: sourceBinding?.request_sha256 ?? attempt.capabilityParameterSha256,
        dispatchedAt: row.dispatched_at,
        receivedAt: row.received_at,
        maximumAgeMs: row.maximum_age_ms,
        maximumClockSkewMs: row.maximum_clock_skew_ms,
        agePolicyVersion: row.age_policy_version
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
      maximumClockSkewMs: row.maximum_clock_skew_ms,
      agePolicyVersion: row.age_policy_version,
      observation,
      ...(sourceBinding ? { sourceBinding } : {})
    };
}
