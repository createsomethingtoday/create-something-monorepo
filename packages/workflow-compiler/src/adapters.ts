import type {
  CompiledToolContract,
  CompiledWorkflowBundle,
  McpToolCallPlan,
  OpenAIResponsesFunctionTool,
  OpenAIResponsesRequestPlan,
  WorkflowAdapterDiagnostic,
  WorkflowAdapterPlan,
  WorkflowReplayCase,
  WorkflowReplayResult,
  WorkflowReplayResultV0_1,
  WorkflowReplayResultV0_2
} from './types.js';
import { parseWorkflowReplayManifest } from './input.js';
import { replayWorkflow } from './replay.js';

export type WorkflowAdapterErrorCode = 'INVALID_ADAPTER_CONFIGURATION' | 'INVALID_ADAPTER_INPUT';

export class WorkflowAdapterError extends Error {
  readonly code: WorkflowAdapterErrorCode;

  constructor(code: WorkflowAdapterErrorCode, message: string) {
    super(message);
    this.name = 'WorkflowAdapterError';
    this.code = code;
  }
}

function evaluateReplayCase(
  bundle: CompiledWorkflowBundle,
  input: unknown
): { replayCase: WorkflowReplayCase; result: WorkflowReplayResult } {
  let snapshot: unknown;
  try {
    snapshot = structuredClone(input);
  } catch {
    throw new WorkflowAdapterError(
      'INVALID_ADAPTER_INPUT',
      'Workflow adapter input must be detachable structured data.'
    );
  }
  const manifest = parseWorkflowReplayManifest({
    schemaVersion: 'workflow_replay_manifest.v0.1',
    workflowId: bundle.workflowId,
    cases: [snapshot]
  });
  const { report } = replayWorkflow(bundle, manifest);
  return { replayCase: manifest.cases[0], result: report.cases[0] };
}

function disposition(
  result: WorkflowReplayResult
): Pick<WorkflowAdapterPlan, 'disposition' | 'reasonCode'> {
  if (result.observedOutcome === 'pass') {
    return { disposition: 'pass', reasonCode: 'TOOL_CALL_READY' };
  }
  if (result.observedOutcome === 'approval_required') {
    return { disposition: 'wait', reasonCode: 'APPROVAL_REQUIRED' };
  }
  return { disposition: 'stop', reasonCode: 'GOVERNANCE_BLOCKED' };
}

function basePlan(
  adapter: WorkflowAdapterPlan['adapter'],
  bundle: CompiledWorkflowBundle,
  result: WorkflowReplayResult
): WorkflowAdapterPlan {
  const mapped = disposition(result);
  const common = {
    adapter,
    workflowId: bundle.workflowId,
    workflowVersion: bundle.workflowVersion,
    definitionHash: bundle.definitionHash,
    caseId: result.caseId,
    actionId: result.actionId,
    ...mapped,
    governanceOutcome: result.observedOutcome,
    canInvoke: false,
    authority: result.authority,
    owner: result.owner,
    recovery: result.recovery,
    receipt: result.receipt,
    diagnostics: []
  };
  if (bundle.schemaVersion === 'compiled_workflow_bundle.v0.2') {
    return {
      schemaVersion: 'workflow_adapter_plan.v0.2',
      ...common,
      governanceReasonCode: result.reasonCode as WorkflowReplayResultV0_2['reasonCode']
    };
  }
  return {
    schemaVersion: 'workflow_adapter_plan.v0.1',
    ...common,
    governanceReasonCode: result.reasonCode as WorkflowReplayResultV0_1['reasonCode']
  };
}

function toolContract(
  bundle: CompiledWorkflowBundle,
  result: WorkflowReplayResult
): CompiledToolContract | undefined {
  return bundle.toolContracts.tools.find((tool) => tool.actionId === result.actionId);
}

function toolArguments(
  tool: CompiledToolContract & { parameters: NonNullable<CompiledToolContract['parameters']> },
  evidence: Record<string, unknown>
): {
  arguments: Record<string, string | number | boolean>;
  diagnostics: WorkflowAdapterDiagnostic[];
} {
  const diagnostics: WorkflowAdapterDiagnostic[] = [];
  const entries: Array<[string, string | number | boolean]> = [];

  for (const parameter of tool.parameters) {
    const value = evidence[parameter.name];
    if (value === undefined || value === null || value === '') {
      diagnostics.push({
        code: 'MISSING_TOOL_ARGUMENT',
        path: `$.evidence.${parameter.name}`,
        message: `Required tool argument ${parameter.name} is missing.`
      });
      continue;
    }
    if (typeof value !== parameter.type || (typeof value === 'number' && !Number.isFinite(value))) {
      diagnostics.push({
        code: 'INVALID_TOOL_ARGUMENT_TYPE',
        path: `$.evidence.${parameter.name}`,
        message: `Tool argument ${parameter.name} must be a finite ${parameter.type}.`
      });
      continue;
    }
    entries.push([parameter.name, value as string | number | boolean]);
  }

  return { arguments: Object.fromEntries(entries), diagnostics };
}

function readyToolPlan(
  adapter: WorkflowAdapterPlan['adapter'],
  bundle: CompiledWorkflowBundle,
  input: unknown
): {
  plan: WorkflowAdapterPlan;
  tool?: CompiledToolContract;
  arguments?: Record<string, string | number | boolean>;
} {
  const { replayCase, result } = evaluateReplayCase(bundle, input);
  const plan = basePlan(adapter, bundle, result);
  if (plan.disposition !== 'pass') return { plan };

  const decision = bundle.decisionInventory.decisions.find(
    (entry) => entry.actionId === result.actionId
  );
  if (decision?.autonomy === 'approval_required' || decision?.autonomy === 'manual_only') {
    return {
      plan: {
        ...plan,
        disposition: 'wait',
        reasonCode: 'AUTHENTICATED_APPROVAL_REQUIRED'
      }
    };
  }

  const tool = toolContract(bundle, result);
  if (!tool) {
    return {
      plan: {
        ...plan,
        disposition: 'stop',
        reasonCode: 'MISSING_TOOL_CONTRACT'
      }
    };
  }

  if (!tool.parameters) {
    return {
      plan: {
        ...plan,
        disposition: 'stop',
        reasonCode: 'MISSING_TOOL_PARAMETER_CONTRACT'
      },
      tool
    };
  }

  const declaredTool = { ...tool, parameters: tool.parameters };
  const compiledArguments = toolArguments(declaredTool, replayCase.evidence);
  if (compiledArguments.diagnostics.length > 0) {
    return {
      plan: {
        ...plan,
        disposition: 'stop',
        reasonCode: 'INVALID_TOOL_ARGUMENTS',
        diagnostics: compiledArguments.diagnostics
      },
      tool: declaredTool
    };
  }

  return {
    plan: { ...plan, canInvoke: true },
    tool: declaredTool,
    arguments: compiledArguments.arguments
  };
}

export function createMcpToolCallPlan(
  bundle: CompiledWorkflowBundle,
  replayCase: unknown
): McpToolCallPlan {
  const ready = readyToolPlan('mcp', bundle, replayCase);
  const plan = ready.plan as McpToolCallPlan;
  if (!plan.canInvoke || !ready.tool || !ready.arguments) return plan;

  return {
    ...plan,
    invocation: {
      operation: 'tools/call',
      targetSystemId: ready.tool.targetSystemId,
      tool: {
        name: ready.tool.name,
        arguments: ready.arguments
      }
    }
  };
}

function openAIFunctionTool(
  bundle: CompiledWorkflowBundle,
  contract: CompiledToolContract & { parameters: NonNullable<CompiledToolContract['parameters']> },
  arguments_: Record<string, string | number | boolean>
): OpenAIResponsesFunctionTool {
  const decision = bundle.decisionInventory.decisions.find(
    (entry) => entry.actionId === contract.actionId
  );
  const properties = Object.fromEntries(
    contract.parameters.map((parameter) => [
      parameter.name,
      {
        type: parameter.type,
        description: parameter.description,
        enum: [arguments_[parameter.name]] as [string | number | boolean]
      }
    ])
  );
  return {
    type: 'function',
    name: contract.name,
    description: `${decision?.title ?? contract.actionId} through ${contract.targetSystemId}. Returns receipt fields: ${contract.receiptFields.join(', ')}. Tool errors must be returned without retrying side effects.`,
    parameters: {
      type: 'object',
      properties,
      required: contract.parameters.map((parameter) => parameter.name),
      additionalProperties: false
    },
    strict: true
  };
}

export function createOpenAIResponsesRequestPlan(
  bundle: CompiledWorkflowBundle,
  replayCase: unknown,
  options: { model: string }
): OpenAIResponsesRequestPlan {
  if (!options || typeof options.model !== 'string' || !options.model.trim()) {
    throw new WorkflowAdapterError(
      'INVALID_ADAPTER_CONFIGURATION',
      'OpenAI Responses adapter requires a caller-selected model.'
    );
  }
  const model = options.model.trim();

  const ready = readyToolPlan('openai.responses', bundle, replayCase);
  const plan = ready.plan as OpenAIResponsesRequestPlan;
  if (!plan.canInvoke || !ready.tool || !ready.arguments) return plan;
  if (!ready.tool.parameters) return plan;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(ready.tool.name)) {
    return {
      ...plan,
      disposition: 'stop',
      reasonCode: 'INCOMPATIBLE_TOOL_NAME',
      canInvoke: false
    };
  }

  const context = JSON.stringify({
    workflow_id: bundle.workflowId,
    action_id: plan.actionId,
    correlation_id: plan.caseId,
    arguments: ready.arguments
  });
  const tool = openAIFunctionTool(
    bundle,
    ready.tool as CompiledToolContract & {
      parameters: NonNullable<CompiledToolContract['parameters']>;
    },
    ready.arguments
  );
  return {
    ...plan,
    expectedArguments: ready.arguments,
    request: {
      model,
      instructions: `Call exactly ${ready.tool.name} with the supplied governed arguments. Do not add, remove, or substitute an action. Return tool errors to the caller without retrying a side effect.`,
      input: context,
      tools: [tool],
      tool_choice: { type: 'function', name: ready.tool.name },
      parallel_tool_calls: false,
      store: false
    }
  };
}
