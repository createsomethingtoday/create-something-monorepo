import {
  verifyWorkflowRuntimeRun,
  type WorkflowRuntimeCheckpointStore,
  type WorkflowRuntimeManifest,
  type WorkflowRuntimeScope,
  type ZeroWriteWorkflowRuntimeHost
} from '@createsomething/workflow-runtime';
import type { ControlRunExecutorOutcome } from './control.js';
import type { D1TemplateReviewHandoffGateway } from './template-review-handoff-gateway.js';
import type { D1TemplateReviewHandoffEvidenceStore } from './template-review-handoff-store.js';

/** Drives an already admitted, verified release inside one claimed Control operation.
 * Admission, current activation authority and exact approval are owned by the caller.
 * A prepared attempt discovered on entry is never dispatched automatically.
 */
export async function driveTemplateReviewRuntime(input: {
  scope: WorkflowRuntimeScope;
  runId: string;
  manifest: WorkflowRuntimeManifest;
  host: Pick<ZeroWriteWorkflowRuntimeHost, 'plan' | 'transition'>;
  storage: Pick<WorkflowRuntimeCheckpointStore, 'find'>;
  gateway: Pick<D1TemplateReviewHandoffGateway, 'observe'>;
  evidence: Pick<D1TemplateReviewHandoffEvidenceStore, 'find'>;
  schedulerSubject: string;
  clock: () => string;
}): Promise<ControlRunExecutorOutcome> {
  const failed = (reason: string): ControlRunExecutorOutcome => ({ type: 'failed', reason, retryable: false });
  // The fixed observation lane is small. Refuse larger manifests before effects.
  if (input.manifest.steps.length > 32) return failed('runtime_execution_bound_exceeded');
  const effects = input.manifest.steps.filter(step => step.disposition === 'pass');
  if (effects.length !== 1 || effects[0].disposition !== 'pass' ||
      effects[0].capability.id !== 'template-review.handoff.observe.v1')
    return failed('runtime_capability_not_supported');
  const runHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(input.runId))), byte => byte.toString(16).padStart(2, '0')).join('');
  for (let iteration = 0; iteration <= input.manifest.steps.length; iteration++) {
    const run = await input.storage.find(input.scope, input.runId);
    if (!run) return failed('runtime_checkpoint_missing');
    await verifyWorkflowRuntimeRun(input.manifest, run);
    if (run.status === 'completed') {
      let observations = 0;
      for (const step of run.steps) for (const attempt of step.attempts) {
        if (attempt.status !== 'succeeded') continue;
        const evidence = await input.evidence.find({ scope: input.scope, runId: run.id,
          stepId: step.id, attemptId: attempt.id });
        if (!evidence || evidence.observation.state !== 'confirmed' ||
            !run.receipts.some(receipt => receipt.eventType === 'step_succeeded' &&
              receipt.stepId === step.id && receipt.attemptId === attempt.id &&
              receipt.verifier === evidence.observation.evidenceSha256))
          return failed('runtime_source_evidence_mismatch');
        observations++;
      }
      if (observations !== 1) return failed('runtime_observation_count_mismatch');
      return { type: 'completed', outcome: 'handoff_reconciled',
        verifier: run.receipts.at(-1)!.receiptSha256 };
    }
    if (run.status === 'waiting_for_approval') {
      const waiting = run.steps.filter(step => step.status === 'waiting_for_approval');
      if (waiting.length !== 1 || !waiting[0].approval) return failed('runtime_approval_missing');
      // The digest is a routing marker only; the approval route must verify the
      // full run/step/approval/version tuple against the persisted checkpoint.
      return { type: 'waiting_for_approval', reason: 'runtime_bound_approval_required',
        approvalKind: `workflow-runtime:${waiting[0].approval.bindingSha256}` };
    }
    if (run.status !== 'queued') return failed(`runtime_requires_reconciliation_${run.status}`);
    const plan = await input.host.plan(input.scope, run.id);
    const command = `runtime-driver:${runHash}:${run.version}`;
    if (plan.type === 'wait') {
      await input.host.transition(input.scope, run.id, run.version,
        { type: 'wait_created', stepId: plan.stepId, approval: plan.approval,
          observedAt: input.clock() }, `${command}:wait`, '');
      continue;
    }
    if (plan.type === 'stop') {
      await input.host.transition(input.scope, run.id, run.version,
        { type: 'stop_requested', stepId: plan.stepId, reason: plan.reason,
          actorSubject: input.schedulerSubject, observedAt: input.clock() }, `${command}:stop`, '');
      return failed('runtime_policy_stop');
    }
    if (plan.type !== 'pass' || plan.capability.id !== 'template-review.handoff.observe.v1')
      return failed('runtime_capability_not_supported');
    const attemptId = `handoff-attempt-${run.version}`;
    const prepared = await input.host.transition(input.scope, run.id, run.version,
      { type: 'effect_intent', stepId: plan.stepId, attemptId, capability: plan.capability,
        observedAt: input.clock() }, `${command}:intent`, '');
    const result = await input.gateway.observe({ scope: input.scope, runId: run.id,
      stepId: plan.stepId, attemptId });
    // Preserve prepared/ambiguous state for explicit reconciliation. Never
    // turn transport uncertainty into a retry or a success checkpoint.
    if (result.type !== 'observed') return failed(`handoff_${result.type}`);
    if (result.evidence.observation.state !== 'confirmed')
      return { type: 'dependency_failed', reason: result.evidence.observation.reason,
        fallback: result.evidence.observation.nextAction };
    await input.host.transition(input.scope, run.id, prepared.version,
      { type: 'step_succeeded', stepId: plan.stepId, attemptId,
        verifier: result.evidence.observation.evidenceSha256, observedAt: input.clock() },
      `${command}:success`, '');
  }
  return failed('runtime_execution_bound_exceeded');
}
