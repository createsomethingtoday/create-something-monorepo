import { createControlRunService, ControlRunAccessError, type ControlActorRole } from './control.js';
import type { ControlRequestContext } from './control-identity.js';
import { D1ControlActivationAuthority, D1ControlRunRepository } from './control-store.js';
import { createTemplateReviewHost } from './template-review-host.js';
import { workflowRuntimeIdentity } from './workflow-runtime-identity.js';
import { WorkflowRuntimeQueue, type WorkflowRuntimeWake } from './workflow-runtime-queue.js';
import { D1WorkflowRuntimeWakeReconciler } from './workflow-runtime-wake-reconciler.js';

type HostInput = Parameters<typeof createTemplateReviewHost>[0];

/** One request/consumer invocation, composed only after FirstPartyControlIdentity
 * verifies its credential. No mutable context is shared across invocations.
 */
export async function composeTemplateReviewControl(input: Omit<HostInput,
  'identity' | 'queue' | 'schedulerSubject'> & {
  context: ControlRequestContext;
  approvalPolicies: Readonly<Record<string, readonly ControlActorRole[]>>;
  send(message: WorkflowRuntimeWake): Promise<void>;
}) {
  const context = structuredClone(input.context);
  const scope = { accountId: input.activation.accountId, tenantId: input.activation.tenantId,
    workspaceAccountId: input.activation.workspaceAccountId };
  if (context.scope.accountId !== scope.accountId || context.scope.tenantId !== scope.tenantId ||
      context.scope.workspaceAccountId !== scope.workspaceAccountId)
    throw new ControlRunAccessError('Runtime deployment scope mismatch');
  const identity = workflowRuntimeIdentity({ context, activationId: input.activation.id,
    approvalPolicies: input.approvalPolicies });
  const repository = new D1ControlRunRepository(input.runtimeDb);
  // Closures are invoked only after composition completes; no work is dispatched
  // while the host and service are being assembled.
  const queue: WorkflowRuntimeQueue = new WorkflowRuntimeQueue({ scope, parents: repository,
    checkpoints: { find: (requestedScope, runId) => host.checkpoints.find(requestedScope, runId) },
    send: input.send,
    process: (runId, key) => service.process(context.scope, context.actor, runId, key,
      context.schedulerActivationId) });
  const host = await createTemplateReviewHost({ ...input, queue,
    schedulerSubject: context.actor.subject,
    identity(actor) {
      if (actor && (actor.subject !== context.actor.subject || actor.role !== context.actor.role))
        throw new ControlRunAccessError('Runtime decision actor differs from verified Identity');
      return identity;
    } });
  const service = createControlRunService({ repository,
    activations: new D1ControlActivationAuthority(input.agencyDb),
    executor: host.executor, runtimeApprovals: host.runtimeApprovals, runtimeRecovery: host.runtimeRecovery,
    clock: () => new Date(input.clock()) });
  const reconciler = new D1WorkflowRuntimeWakeReconciler(input.runtimeDb, input.activation, queue);
  return { service, proofs: host.proofs,
    async consume(message: unknown) {
      await identity.assert(scope, null, null);
      return queue.consume(message);
    },
    async reconcile() {
      await identity.assert(scope, null, null);
      return reconciler.reconcile();
    }
  };
}
