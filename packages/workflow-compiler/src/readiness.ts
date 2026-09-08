import type { CompiledWorkflowBundle } from './types.js';

export interface WorkflowAdapterReadiness {
  schemaVersion: 'workflow_adapter_readiness.v0.1';
  actions: Array<{
    actionId: string;
    status: 'contract_declared' | 'wait' | 'stop';
    reasonCode:
      | 'TOOL_CONTRACT_DECLARED'
      | 'AUTHENTICATED_APPROVAL_REQUIRED'
      | 'POLICY_BLOCKED'
      | 'MISSING_TOOL_CONTRACT'
      | 'MISSING_TOOL_PARAMETER_CONTRACT';
    canInvoke: false;
    nextStep: string;
  }>;
}

/** Documentation of contract completeness only; never an invocation or approval. */
export function createWorkflowAdapterReadiness(
  bundle: CompiledWorkflowBundle
): WorkflowAdapterReadiness {
  return {
    schemaVersion: 'workflow_adapter_readiness.v0.1',
    actions: bundle.decisionInventory.decisions.map((decision) => {
      const common = { actionId: decision.actionId, canInvoke: false as const };
      if (decision.autonomy === 'blocked')
        return {
          ...common,
          status: 'stop',
          reasonCode: 'POLICY_BLOCKED',
          nextStep: 'Follow the declared recovery path. Policy blocks this action.'
        };
      if (decision.autonomy === 'approval_required' || decision.autonomy === 'manual_only')
        return {
          ...common,
          status: 'wait',
          reasonCode: 'AUTHENTICATED_APPROVAL_REQUIRED',
          nextStep:
            'The owning runtime must obtain authenticated approval or manual execution. Replay approvals do not authorize a tool call.'
        };
      const tool = bundle.toolContracts.tools.find((entry) => entry.actionId === decision.actionId);
      if (!tool)
        return {
          ...common,
          status: 'stop',
          reasonCode: 'MISSING_TOOL_CONTRACT',
          nextStep:
            'Declare a tool contract with a target in systemsTouched and parameters bound to governed evidence.'
        };
      if (!tool.parameters)
        return {
          ...common,
          status: 'stop',
          reasonCode: 'MISSING_TOOL_PARAMETER_CONTRACT',
          nextStep:
            'Declare the tool parameter contract, including an explicit empty list for a tool with no arguments.'
        };
      return {
        ...common,
        status: 'contract_declared',
        reasonCode: 'TOOL_CONTRACT_DECLARED',
        nextStep:
          'Build an adapter plan with the current governed evidence. A declared contract alone does not authorize invocation; an authenticated execution host is still required.'
      };
    })
  };
}
