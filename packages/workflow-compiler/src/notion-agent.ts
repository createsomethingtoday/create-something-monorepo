import { isCompilerOwnedBundle } from './compiled-bundle-provenance.js';

import type {
  CompiledToolContract,
  CompiledWorkflowBundle,
  NotionCustomAgentBlueprint,
  NotionCustomAgentBlueprintInput,
  NotionCustomAgentConfigurationReceipt,
  NotionCustomAgentInstallationEvaluation,
  NotionCustomAgentOperationalEvaluation,
  NotionCustomAgentOperationalReceipts,
  NotionCustomAgentResourceAccess,
  NotionCustomAgentToolBindingInput,
  NotionCustomAgentTrigger
} from './types.js';

export type NotionCustomAgentBlueprintErrorCode =
  | 'INVALID_BLUEPRINT_INPUT'
  | 'UNVERIFIED_COMPILED_BUNDLE'
  | 'UNKNOWN_BLUEPRINT_AGENT'
  | 'ACTION_NOT_ALLOWED_FOR_BLUEPRINT_AGENT'
  | 'UNKNOWN_BLUEPRINT_TOOL_ACTION'
  | 'BLUEPRINT_TOOL_KEY_MISMATCH'
  | 'MUTATING_RESOURCE_ACCESS_REQUIRES_WRITE_ACTION'
  | 'UNVERIFIED_NOTION_CUSTOM_AGENT_BLUEPRINT';

export class NotionCustomAgentBlueprintError extends Error {
  readonly code: NotionCustomAgentBlueprintErrorCode;

  constructor(code: NotionCustomAgentBlueprintErrorCode, message: string) {
    super(message);
    this.name = 'NotionCustomAgentBlueprintError';
    this.code = code;
  }
}

const RESOURCE_KINDS = new Set(['notion_page', 'notion_data_source', 'connected_app']);
const RESOURCE_ACCESS_LEVELS = new Set(['can_view', 'can_comment', 'can_edit']);
const TRIGGER_KINDS = new Set(['manual', 'schedule', 'notion_event', 'connected_app_event']);
const TOOL_RUNTIMES = new Set(['notion_worker', 'create_something_mcp']);
const INPUT_KEYS = new Set([
  'schemaVersion',
  'blueprintId',
  'agentId',
  'instructions',
  'resourceAccess',
  'triggers',
  'toolBindings'
]);
const RECEIPT_KEYS = new Set([
  'schemaVersion',
  'blueprintId',
  'agentRef',
  'workflowDefinitionHash',
  'instructionsSha256',
  'resourceAccess',
  'triggers',
  'toolBindings'
]);
const OPERATIONAL_RECEIPT_KEYS = new Set([
  'schemaVersion',
  'blueprintId',
  'activationReceipt',
  'runReceipt',
  'toolReceipts',
  'mutationReceipts'
]);
const TOOL_CONFIRMATION_STATES = new Set(['not_required', 'confirmed', 'not_confirmed']);
const compilerOwnedBlueprints = new WeakSet<NotionCustomAgentBlueprint>();
const compilerOwnedMatchedInstallations = new WeakSet<NotionCustomAgentInstallationEvaluation>();
const compilerOwnedInstallationBlueprints = new WeakMap<
  NotionCustomAgentInstallationEvaluation,
  NotionCustomAgentBlueprint
>();

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object') return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const nested of Object.values(object)) deepFreeze(nested, seen);
  return Object.freeze(object) as T;
}

function requireCompilerOwnedBlueprint(blueprint: NotionCustomAgentBlueprint): void {
  if (!compilerOwnedBlueprints.has(blueprint)) {
    throw new NotionCustomAgentBlueprintError(
      'UNVERIFIED_NOTION_CUSTOM_AGENT_BLUEPRINT',
      'Notion Custom Agent evaluation requires the frozen blueprint returned by createNotionCustomAgentBlueprint.'
    );
  }
}

function finalizeInstallationEvaluation(
  blueprint: NotionCustomAgentBlueprint,
  evaluation: NotionCustomAgentInstallationEvaluation
): NotionCustomAgentInstallationEvaluation {
  const frozen = deepFreeze(evaluation);
  if (frozen.disposition === 'pass') {
    compilerOwnedMatchedInstallations.add(frozen);
    compilerOwnedInstallationBlueprints.set(frozen, blueprint);
  }
  return frozen;
}

function invalidInput(message: string): never {
  throw new NotionCustomAgentBlueprintError('INVALID_BLUEPRINT_INPUT', message);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invalidInput(`${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) invalidInput(`${path} must be a non-empty string.`);
  return value;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) invalidInput(`${path} must be an array.`);
  return value;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], path: string): void {
  const allowed = new Set(keys);
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = keys.filter((key) => !(key in value));
  if (unexpected.length || missing.length) {
    invalidInput(
      `${path} must contain exactly ${keys.join(', ')}; unexpected: ${unexpected.join(', ') || 'none'}, missing: ${missing.join(', ') || 'none'}.`
    );
  }
}

function unique(values: string[], path: string): void {
  if (new Set(values).size !== values.length) invalidInput(`${path} entries must be unique.`);
}

function parseResourceAccess(value: unknown, index: number): NotionCustomAgentResourceAccess {
  const path = `resourceAccess[${index}]`;
  const entry = record(value, path);
  exactKeys(entry, ['resourceRef', 'kind', 'level', 'purpose'], path);
  const kind = text(entry.kind, `${path}.kind`);
  const level = text(entry.level, `${path}.level`);
  if (!RESOURCE_KINDS.has(kind)) invalidInput(`${path}.kind must be a supported resource kind.`);
  if (!RESOURCE_ACCESS_LEVELS.has(level)) invalidInput(`${path}.level must be a supported resource access level.`);
  return {
    resourceRef: text(entry.resourceRef, `${path}.resourceRef`),
    kind: kind as NotionCustomAgentResourceAccess['kind'],
    level: level as NotionCustomAgentResourceAccess['level'],
    purpose: text(entry.purpose, `${path}.purpose`)
  };
}

function parseTrigger(value: unknown, index: number): NotionCustomAgentTrigger {
  const path = `triggers[${index}]`;
  const entry = record(value, path);
  exactKeys(entry, ['triggerId', 'kind', 'intent'], path);
  const kind = text(entry.kind, `${path}.kind`);
  if (!TRIGGER_KINDS.has(kind)) invalidInput(`${path}.kind must be a supported trigger kind.`);
  return {
    triggerId: text(entry.triggerId, `${path}.triggerId`),
    kind: kind as NotionCustomAgentTrigger['kind'],
    intent: text(entry.intent, `${path}.intent`)
  };
}

function parseToolBinding(value: unknown, index: number): NotionCustomAgentToolBindingInput {
  const path = `toolBindings[${index}]`;
  const entry = record(value, path);
  exactKeys(entry, ['actionId', 'key', 'runtime', 'contractRef'], path);
  const runtime = text(entry.runtime, `${path}.runtime`);
  if (!TOOL_RUNTIMES.has(runtime)) invalidInput(`${path}.runtime must be a supported tool runtime.`);
  return {
    actionId: text(entry.actionId, `${path}.actionId`),
    key: text(entry.key, `${path}.key`),
    runtime: runtime as NotionCustomAgentToolBindingInput['runtime'],
    contractRef: text(entry.contractRef, `${path}.contractRef`)
  };
}

export function parseNotionCustomAgentBlueprintInput(input: unknown): NotionCustomAgentBlueprintInput {
  let snapshot: unknown;
  try {
    snapshot = structuredClone(input);
  } catch {
    invalidInput('Notion Custom Agent blueprint input must be detachable structured data.');
  }

  const source = record(snapshot, '$');
  exactKeys(source, [...INPUT_KEYS], '$');
  if (source.schemaVersion !== 'notion_custom_agent_blueprint_input.v0.1') {
    invalidInput('$.schemaVersion must be notion_custom_agent_blueprint_input.v0.1.');
  }
  const instructions = record(source.instructions, '$.instructions');
  exactKeys(instructions, ['sourceRef', 'sha256'], '$.instructions');
  const resourceAccess = array(source.resourceAccess, '$.resourceAccess').map(parseResourceAccess);
  const triggers = array(source.triggers, '$.triggers').map(parseTrigger);
  const toolBindings = array(source.toolBindings, '$.toolBindings').map(parseToolBinding);

  if (resourceAccess.length === 0) invalidInput('$.resourceAccess must not be empty.');
  if (triggers.length === 0) invalidInput('$.triggers must not be empty.');
  if (toolBindings.length === 0) invalidInput('$.toolBindings must not be empty.');
  unique(resourceAccess.map((entry) => entry.resourceRef), '$.resourceAccess');
  unique(triggers.map((entry) => entry.triggerId), '$.triggers');
  unique(toolBindings.map((entry) => entry.actionId), '$.toolBindings');

  return {
    schemaVersion: 'notion_custom_agent_blueprint_input.v0.1',
    blueprintId: text(source.blueprintId, '$.blueprintId'),
    agentId: text(source.agentId, '$.agentId'),
    instructions: {
      sourceRef: text(instructions.sourceRef, '$.instructions.sourceRef'),
      sha256: text(instructions.sha256, '$.instructions.sha256')
    },
    resourceAccess,
    triggers,
    toolBindings
  };
}

function parseReceiptResourceAccess(
  value: unknown,
  index: number
): NotionCustomAgentConfigurationReceipt['resourceAccess'][number] {
  const path = `resourceAccess[${index}]`;
  const entry = record(value, path);
  exactKeys(entry, ['resourceRef', 'kind', 'level'], path);
  const kind = text(entry.kind, `${path}.kind`);
  const level = text(entry.level, `${path}.level`);
  if (!RESOURCE_KINDS.has(kind)) invalidInput(`${path}.kind must be a supported resource kind.`);
  if (!RESOURCE_ACCESS_LEVELS.has(level)) invalidInput(`${path}.level must be a supported resource access level.`);
  return {
    resourceRef: text(entry.resourceRef, `${path}.resourceRef`),
    kind: kind as NotionCustomAgentResourceAccess['kind'],
    level: level as NotionCustomAgentResourceAccess['level']
  };
}

function parseReceiptTrigger(
  value: unknown,
  index: number
): NotionCustomAgentConfigurationReceipt['triggers'][number] {
  const path = `triggers[${index}]`;
  const entry = record(value, path);
  exactKeys(entry, ['triggerId', 'kind'], path);
  const kind = text(entry.kind, `${path}.kind`);
  if (!TRIGGER_KINDS.has(kind)) invalidInput(`${path}.kind must be a supported trigger kind.`);
  return {
    triggerId: text(entry.triggerId, `${path}.triggerId`),
    kind: kind as NotionCustomAgentTrigger['kind']
  };
}

export function parseNotionCustomAgentConfigurationReceipt(
  input: unknown
): NotionCustomAgentConfigurationReceipt {
  let snapshot: unknown;
  try {
    snapshot = structuredClone(input);
  } catch {
    invalidInput('Notion Custom Agent configuration receipt must be detachable structured data.');
  }
  const source = record(snapshot, '$');
  exactKeys(source, [...RECEIPT_KEYS], '$');
  if (source.schemaVersion !== 'notion_custom_agent_configuration_receipt.v0.1') {
    invalidInput('$.schemaVersion must be notion_custom_agent_configuration_receipt.v0.1.');
  }
  const resourceAccess = array(source.resourceAccess, '$.resourceAccess').map(parseReceiptResourceAccess);
  const triggers = array(source.triggers, '$.triggers').map(parseReceiptTrigger);
  const toolBindings = array(source.toolBindings, '$.toolBindings').map(parseToolBinding);
  unique(resourceAccess.map((entry) => entry.resourceRef), '$.resourceAccess');
  unique(triggers.map((entry) => entry.triggerId), '$.triggers');
  unique(toolBindings.map((entry) => entry.actionId), '$.toolBindings');
  return {
    schemaVersion: 'notion_custom_agent_configuration_receipt.v0.1',
    blueprintId: text(source.blueprintId, '$.blueprintId'),
    agentRef: text(source.agentRef, '$.agentRef'),
    workflowDefinitionHash: text(source.workflowDefinitionHash, '$.workflowDefinitionHash'),
    instructionsSha256: text(source.instructionsSha256, '$.instructionsSha256'),
    resourceAccess,
    triggers,
    toolBindings
  };
}

function parseOperationalToolReceipt(
  value: unknown,
  index: number
): NotionCustomAgentOperationalReceipts['toolReceipts'][number] {
  const path = `toolReceipts[${index}]`;
  const entry = record(value, path);
  exactKeys(entry, ['actionId', 'runRef', 'toolInvocationRef', 'confirmationState'], path);
  const confirmationState = text(entry.confirmationState, `${path}.confirmationState`);
  if (!TOOL_CONFIRMATION_STATES.has(confirmationState)) {
    invalidInput(`${path}.confirmationState must be a supported confirmation state.`);
  }
  return {
    actionId: text(entry.actionId, `${path}.actionId`),
    runRef: text(entry.runRef, `${path}.runRef`),
    toolInvocationRef: text(entry.toolInvocationRef, `${path}.toolInvocationRef`),
    confirmationState: confirmationState as NotionCustomAgentOperationalReceipts['toolReceipts'][number]['confirmationState']
  };
}

function parseMutationReceipt(
  value: unknown,
  index: number
): NotionCustomAgentOperationalReceipts['mutationReceipts'][number] {
  const path = `mutationReceipts[${index}]`;
  const entry = record(value, path);
  exactKeys(entry, ['actionId', 'runRef', 'mutationRef'], path);
  return {
    actionId: text(entry.actionId, `${path}.actionId`),
    runRef: text(entry.runRef, `${path}.runRef`),
    mutationRef: text(entry.mutationRef, `${path}.mutationRef`)
  };
}

export function parseNotionCustomAgentOperationalReceipts(
  input: unknown
): NotionCustomAgentOperationalReceipts {
  let snapshot: unknown;
  try {
    snapshot = structuredClone(input);
  } catch {
    invalidInput('Notion Custom Agent operational receipts must be detachable structured data.');
  }
  const source = record(snapshot, '$');
  exactKeys(
    source,
    [...OPERATIONAL_RECEIPT_KEYS, ...(source.agentRef === undefined ? [] : ['agentRef'])],
    '$'
  );
  if (source.schemaVersion !== 'notion_custom_agent_operational_receipts.v0.1') {
    invalidInput('$.schemaVersion must be notion_custom_agent_operational_receipts.v0.1.');
  }
  const activation = record(source.activationReceipt, '$.activationReceipt');
  exactKeys(activation, ['triggerId', 'runRef', 'activationRef'], '$.activationReceipt');
  const run = record(source.runReceipt, '$.runReceipt');
  exactKeys(run, ['runRef'], '$.runReceipt');
  const toolReceipts = array(source.toolReceipts, '$.toolReceipts').map(parseOperationalToolReceipt);
  const mutationReceipts = array(source.mutationReceipts, '$.mutationReceipts').map(parseMutationReceipt);
  unique(toolReceipts.map((entry) => entry.actionId), '$.toolReceipts');
  unique(toolReceipts.map((entry) => entry.toolInvocationRef), '$.toolReceipts.toolInvocationRef');
  unique(mutationReceipts.map((entry) => entry.actionId), '$.mutationReceipts');
  unique(mutationReceipts.map((entry) => entry.mutationRef), '$.mutationReceipts.mutationRef');
  return {
    schemaVersion: 'notion_custom_agent_operational_receipts.v0.1',
    blueprintId: text(source.blueprintId, '$.blueprintId'),
    ...(source.agentRef === undefined ? {} : { agentRef: text(source.agentRef, '$.agentRef') }),
    activationReceipt: {
      triggerId: text(activation.triggerId, '$.activationReceipt.triggerId'),
      runRef: text(activation.runRef, '$.activationReceipt.runRef'),
      activationRef: text(activation.activationRef, '$.activationReceipt.activationRef')
    },
    runReceipt: {
      runRef: text(run.runRef, '$.runReceipt.runRef')
    },
    toolReceipts,
    mutationReceipts
  };
}

function byActionId<T extends { actionId: string }>(left: T, right: T): number {
  return left.actionId.localeCompare(right.actionId);
}

function byResourceRef<T extends { resourceRef: string }>(left: T, right: T): number {
  return left.resourceRef.localeCompare(right.resourceRef);
}

function byTriggerId<T extends { triggerId: string }>(left: T, right: T): number {
  return left.triggerId.localeCompare(right.triggerId);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function requiredOperationalReceipts(
  toolBindings: NotionCustomAgentBlueprint['toolBindings']
): NotionCustomAgentInstallationEvaluation['requiredOperationalReceipts'] {
  return [
    'activation',
    'run',
    'tool',
    ...(toolBindings.some((binding) => binding.kind === 'write' || binding.kind === 'publish')
      ? ['mutation' as const]
      : [])
  ];
}

function requiredInstallationReceipts(
  toolBindings: NotionCustomAgentBlueprint['toolBindings']
): NotionCustomAgentBlueprint['installation']['requiredReceipts'] {
  return [
    'configuration',
    'activation',
    'run',
    'tool',
    ...(toolBindings.some((binding) => binding.kind === 'write' || binding.kind === 'publish')
      ? ['mutation' as const]
      : [])
  ];
}

function toolContractFor(
  contracts: readonly CompiledToolContract[],
  actionId: string
): CompiledToolContract | undefined {
  return contracts.find((contract) => contract.actionId === actionId);
}

export function createNotionCustomAgentBlueprint(
  bundle: CompiledWorkflowBundle,
  input: unknown
): NotionCustomAgentBlueprint {
  if (!isCompilerOwnedBundle(bundle)) {
    throw new NotionCustomAgentBlueprintError(
      'UNVERIFIED_COMPILED_BUNDLE',
      'Notion Custom Agent blueprints require the frozen bundle returned by compileWorkflowDefinition.'
    );
  }
  const blueprint = parseNotionCustomAgentBlueprintInput(input);
  const agent = bundle.agentContracts.agents.find((candidate) => candidate.id === blueprint.agentId);
  if (!agent) {
    throw new NotionCustomAgentBlueprintError(
      'UNKNOWN_BLUEPRINT_AGENT',
      `Blueprint ${blueprint.blueprintId} references unknown agent ${blueprint.agentId}.`
    );
  }

  const toolBindings = blueprint.toolBindings
    .map((binding) => {
      if (!agent.allowedActionIds.includes(binding.actionId)) {
        throw new NotionCustomAgentBlueprintError(
          'ACTION_NOT_ALLOWED_FOR_BLUEPRINT_AGENT',
          `Blueprint agent ${agent.id} is not allowed to bind action ${binding.actionId}.`
        );
      }
      const contract = toolContractFor(bundle.toolContracts.tools, binding.actionId);
      const decision = bundle.decisionInventory.decisions.find(
        (candidate) => candidate.actionId === binding.actionId
      );
      if (!contract || !decision) {
        throw new NotionCustomAgentBlueprintError(
          'UNKNOWN_BLUEPRINT_TOOL_ACTION',
          `Blueprint action ${binding.actionId} must have a compiled tool contract and decision.`
        );
      }
      if (binding.key !== contract.name) {
        throw new NotionCustomAgentBlueprintError(
          'BLUEPRINT_TOOL_KEY_MISMATCH',
          `Blueprint tool key ${binding.key} must match compiled tool ${contract.name} for action ${binding.actionId}.`
        );
      }
      return {
        ...binding,
        targetSystemId: contract.targetSystemId,
        kind: decision.kind,
        authority: decision.authority,
        autonomy: decision.autonomy,
        ...(contract.parameters ? { parameters: [...contract.parameters] } : {}),
        requiredEvidence: [...contract.requiredEvidence],
        receiptFields: [...contract.receiptFields],
        recovery: { ...decision.recovery },
        readOnlyHint: decision.kind === 'read'
      };
    })
    .sort(byActionId);

  if (
    blueprint.resourceAccess.some((resource) => resource.level !== 'can_view') &&
    !toolBindings.some((binding) => binding.kind === 'write' || binding.kind === 'publish')
  ) {
    throw new NotionCustomAgentBlueprintError(
      'MUTATING_RESOURCE_ACCESS_REQUIRES_WRITE_ACTION',
      'Notion comment or edit access requires a compiled write or publish action.'
    );
  }

  const compiledBlueprint: NotionCustomAgentBlueprint = {
    schemaVersion: 'notion_agent_blueprint.v0.1',
    workflowId: bundle.workflowId,
    workflowVersion: bundle.workflowVersion,
    definitionHash: bundle.definitionHash,
    blueprintId: blueprint.blueprintId,
    host: 'notion_custom_agent',
    agent: {
      id: agent.id,
      title: agent.title,
      purpose: agent.purpose,
      instructions: { ...blueprint.instructions },
      escalationOwner: agent.escalationOwner
    },
    resourceAccess: [...blueprint.resourceAccess].sort(byResourceRef),
    triggers: [...blueprint.triggers].sort(byTriggerId),
    toolBindings,
    installation: {
      disposition: 'wait',
      reasonCode: 'CONFIGURATION_RECEIPT_REQUIRED',
      requiredReceipts: requiredInstallationReceipts(toolBindings)
    }
  };
  compilerOwnedBlueprints.add(compiledBlueprint);
  return deepFreeze(compiledBlueprint);
}

export function evaluateNotionCustomAgentInstallation(
  blueprint: NotionCustomAgentBlueprint,
  receiptInput?: unknown
): NotionCustomAgentInstallationEvaluation {
  requireCompilerOwnedBlueprint(blueprint);
  if (receiptInput === undefined) {
    return finalizeInstallationEvaluation(blueprint, {
      schemaVersion: 'notion_custom_agent_installation_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      disposition: 'wait',
      reasonCode: 'CONFIGURATION_RECEIPT_REQUIRED',
      requiredOperationalReceipts: requiredOperationalReceipts(blueprint.toolBindings)
    });
  }
  const receipt = parseNotionCustomAgentConfigurationReceipt(receiptInput);
  const mismatches: string[] = [];
  if (receipt.blueprintId !== blueprint.blueprintId) mismatches.push('blueprintId');
  if (receipt.workflowDefinitionHash !== blueprint.definitionHash) {
    mismatches.push('workflowDefinitionHash');
  }
  if (receipt.instructionsSha256 !== blueprint.agent.instructions.sha256) {
    mismatches.push('instructionsSha256');
  }
  const expectedResources = blueprint.resourceAccess
    .map(({ resourceRef, kind, level }) => ({ resourceRef, kind, level }))
    .sort(byResourceRef);
  const actualResources = [...receipt.resourceAccess].sort(byResourceRef);
  if (canonical(actualResources) !== canonical(expectedResources)) mismatches.push('resourceAccess');
  const expectedTriggers = blueprint.triggers
    .map(({ triggerId, kind }) => ({ triggerId, kind }))
    .sort(byTriggerId);
  const actualTriggers = [...receipt.triggers].sort(byTriggerId);
  if (canonical(actualTriggers) !== canonical(expectedTriggers)) mismatches.push('triggers');
  const expectedBindings = blueprint.toolBindings
    .map(({ actionId, key, runtime, contractRef }) => ({ actionId, key, runtime, contractRef }))
    .sort(byActionId);
  const actualBindings = [...receipt.toolBindings].sort(byActionId);
  if (canonical(actualBindings) !== canonical(expectedBindings)) mismatches.push('toolBindings');

  if (mismatches.length) {
    return finalizeInstallationEvaluation(blueprint, {
      schemaVersion: 'notion_custom_agent_installation_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      agentRef: receipt.agentRef,
      disposition: 'stop',
      reasonCode: 'CONFIGURATION_RECEIPT_MISMATCH',
      mismatchFields: mismatches,
      requiredOperationalReceipts: requiredOperationalReceipts(blueprint.toolBindings)
    });
  }
  return finalizeInstallationEvaluation(blueprint, {
    schemaVersion: 'notion_custom_agent_installation_evaluation.v0.1',
    blueprintId: blueprint.blueprintId,
    agentRef: receipt.agentRef,
    disposition: 'pass',
    reasonCode: 'CONFIGURATION_RECEIPT_MATCHED',
    requiredOperationalReceipts: requiredOperationalReceipts(blueprint.toolBindings)
  });
}

export function evaluateNotionCustomAgentOperationalReceipts(
  blueprint: NotionCustomAgentBlueprint,
  receiptInput?: unknown,
  installationEvaluation?: NotionCustomAgentInstallationEvaluation
): NotionCustomAgentOperationalEvaluation {
  requireCompilerOwnedBlueprint(blueprint);
  if (receiptInput === undefined) {
    return {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      disposition: 'wait',
      reasonCode: 'OPERATIONAL_RECEIPTS_REQUIRED'
    };
  }
  const receipts = parseNotionCustomAgentOperationalReceipts(receiptInput);
  if (
    receipts.blueprintId !== blueprint.blueprintId ||
    receipts.activationReceipt.runRef !== receipts.runReceipt.runRef ||
    !blueprint.triggers.some((trigger) => trigger.triggerId === receipts.activationReceipt.triggerId)
  ) {
    return {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      disposition: 'stop',
      reasonCode: 'OPERATIONAL_RECEIPT_MISMATCH'
    };
  }
  if (!receipts.agentRef || installationEvaluation === undefined) {
    return {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      disposition: 'wait',
      reasonCode: 'MATCHED_INSTALLATION_EVALUATION_REQUIRED'
    };
  }
  if (
    !compilerOwnedMatchedInstallations.has(installationEvaluation) ||
    compilerOwnedInstallationBlueprints.get(installationEvaluation) !== blueprint ||
    installationEvaluation.blueprintId !== blueprint.blueprintId ||
    installationEvaluation.agentRef !== receipts.agentRef
  ) {
    return {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      disposition: 'stop',
      reasonCode: 'OPERATIONAL_RECEIPT_INSTALLATION_MISMATCH'
    };
  }
  const toolReceipts = new Map(receipts.toolReceipts.map((receipt) => [receipt.actionId, receipt]));
  const mutationReceipts = new Map(
    receipts.mutationReceipts.map((receipt) => [receipt.actionId, receipt])
  );
  const declaredActionIds = new Set(blueprint.toolBindings.map((binding) => binding.actionId));
  const unexpectedActionIds = [...new Set([...toolReceipts.keys(), ...mutationReceipts.keys()])]
    .filter((actionId) => !declaredActionIds.has(actionId))
    .sort((left, right) => left.localeCompare(right));
  if (unexpectedActionIds.length) {
    return {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      disposition: 'stop',
      reasonCode: 'UNDECLARED_RECEIPT_ACTION',
      unexpectedActionIds
    };
  }
  const mutatingActionIds = new Set(
    blueprint.toolBindings
      .filter((binding) => binding.kind === 'write' || binding.kind === 'publish')
      .map((binding) => binding.actionId)
  );
  const unexpectedMutationActionIds = [...mutationReceipts.keys()]
    .filter((actionId) => !mutatingActionIds.has(actionId))
    .sort((left, right) => left.localeCompare(right));
  if (unexpectedMutationActionIds.length) {
    return {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      disposition: 'stop',
      reasonCode: 'NON_MUTATING_ACTION_MUTATION_RECEIPT',
      unexpectedMutationActionIds
    };
  }
  const matchesRun = (receipt: { runRef: string } | undefined): boolean =>
    receipt?.runRef === receipts.runReceipt.runRef;
  const blockedToolActionIds = blueprint.toolBindings
    .filter((binding) => binding.autonomy === 'blocked')
    .map((binding) => binding.actionId)
    .sort((left, right) => left.localeCompare(right));
  if (blockedToolActionIds.length) {
    return {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      disposition: 'stop',
      reasonCode: 'CONSEQUENTIAL_TOOL_AUTONOMY_VIOLATION',
      missingActionIds: blockedToolActionIds
    };
  }
  const writeActionsMissingProof = blueprint.toolBindings
    .filter((binding) => {
      const toolReceipt = toolReceipts.get(binding.actionId);
      const mutationReceipt = mutationReceipts.get(binding.actionId);
      if (binding.kind !== 'write' && binding.kind !== 'publish') return false;
      if (!toolReceipt) return true;
      return (
        toolReceipt.confirmationState !== 'confirmed' ||
        !matchesRun(toolReceipt) ||
        !matchesRun(mutationReceipt)
      );
    })
    .map((binding) => binding.actionId)
    .sort((left, right) => left.localeCompare(right));
  if (writeActionsMissingProof.length) {
    return {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      disposition: 'stop',
      reasonCode: 'WRITE_CONFIRMATION_OR_MUTATION_RECEIPT_REQUIRED',
      missingActionIds: writeActionsMissingProof
    };
  }
  const consequentialToolAutonomyViolations = blueprint.toolBindings
    .filter((binding) => {
      if (binding.kind === 'write' || binding.kind === 'publish') return false;
      if (binding.autonomy === 'blocked') return true;
      if (binding.autonomy === 'auto_allow') return false;
      const toolReceipt = toolReceipts.get(binding.actionId);
      return Boolean(
        toolReceipt &&
          (toolReceipt.confirmationState !== 'confirmed' || !matchesRun(toolReceipt))
      );
    })
    .map((binding) => binding.actionId)
    .sort((left, right) => left.localeCompare(right));
  if (consequentialToolAutonomyViolations.length) {
    return {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      disposition: 'stop',
      reasonCode: 'CONSEQUENTIAL_TOOL_AUTONOMY_VIOLATION',
      missingActionIds: consequentialToolAutonomyViolations
    };
  }
  const readActionsMissingToolReceipt = blueprint.toolBindings
    .filter(
      (binding) =>
        binding.kind !== 'write' &&
        binding.kind !== 'publish' &&
        !matchesRun(toolReceipts.get(binding.actionId))
    )
    .map((binding) => binding.actionId)
    .sort((left, right) => left.localeCompare(right));
  if (readActionsMissingToolReceipt.length) {
    return {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: blueprint.blueprintId,
      disposition: 'wait',
      reasonCode: 'OPERATIONAL_RECEIPTS_REQUIRED',
      missingActionIds: readActionsMissingToolReceipt
    };
  }
  return {
    schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
    blueprintId: blueprint.blueprintId,
    disposition: 'pass',
    reasonCode: 'OPERATIONAL_RECEIPTS_MATCHED'
  };
}
