import { RuntimeValidationError, type ZeroWriteWorkflowRuntimeHost } from '@createsomething/workflow-runtime';
import { ControlRunConflictError, type ControlRuntimeApprovalAuthority } from './control.js';

type Decision = Parameters<ControlRuntimeApprovalAuthority['decide']>[0];

/** The resolver must bind the host's Identity port to this authenticated actor
 * and resolve the parent's exact registered release in verified-build-v2 mode.
 */
export class WorkflowRuntimeBoundApprovalAuthority implements ControlRuntimeApprovalAuthority {
  constructor(
    private readonly resolve: (input: Decision) => Promise<Pick<ZeroWriteWorkflowRuntimeHost, 'transition'>>,
    private readonly clock: () => string
  ) {}

  async decide(input: Decision): Promise<void> {
    const host = await this.resolve(input);
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({
      runId: input.run.id, idempotencyKey: input.idempotencyKey, decision: input.decision
    })));
    const key = `runtime-approval:${Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')}`;
    try { await host.transition(input.scope, input.run.id, input.binding.checkpoint_version, {
      type: 'approval_decided', stepId: input.binding.step_id,
      approvalId: input.binding.approval_id,
      approvalBindingSha256: input.binding.binding_sha256 as `sha256:${string}`,
      decision: input.decision, actorSubject: input.actor.subject, observedAt: this.clock()
    }, key, ''); } catch (error) {
      if (error instanceof RuntimeValidationError)
        throw new ControlRunConflictError('Runtime approval does not match the current checkpoint');
      throw error;
    }
  }
}
