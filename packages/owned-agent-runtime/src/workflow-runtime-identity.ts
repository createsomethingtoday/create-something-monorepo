import type { WorkflowRuntimeHostPorts } from '@createsomething/workflow-runtime';
import { ControlRunAccessError, type ControlActorRole } from './control.js';
import type { ControlRequestContext } from './control-identity.js';

/** Input must be the owning FirstPartyControlIdentity result, never request
 * JSON. Policy-to-role mappings are immutable host configuration.
 */
export function workflowRuntimeIdentity(input: {
  context: ControlRequestContext;
  activationId: string;
  approvalPolicies: Readonly<Record<string, readonly ControlActorRole[]>>;
}): WorkflowRuntimeHostPorts['identity'] {
  const { context, activationId, approvalPolicies } = structuredClone(input);
  return {
    async assert(scope, subject, requiredPolicy) {
      if (scope.accountId !== context.scope.accountId || scope.tenantId !== context.scope.tenantId ||
          scope.workspaceAccountId !== context.scope.workspaceAccountId || !context.actor.subject.trim())
        throw new ControlRunAccessError('Runtime Identity scope mismatch');
      if (subject === null) {
        if (context.actor.role !== 'control_scheduler' || context.schedulerActivationId !== activationId || requiredPolicy !== null)
          throw new ControlRunAccessError('Runtime automatic transition requires activation-bound scheduler');
        return null;
      }
      if (subject !== context.actor.subject || context.actor.role === 'account_reader')
        throw new ControlRunAccessError('Runtime actor mismatch');
      if (context.actor.role === 'control_scheduler' && context.schedulerActivationId !== activationId)
        throw new ControlRunAccessError('Runtime scheduler activation mismatch');
      if (requiredPolicy !== null &&
          (!Object.hasOwn(approvalPolicies, requiredPolicy) ||
            !approvalPolicies[requiredPolicy].includes(context.actor.role) ||
            !['account_owner', 'agency_operator'].includes(context.actor.role)))
        throw new ControlRunAccessError('Runtime approval policy does not authorize actor');
      return { ...context.actor };
    }
  };
}
