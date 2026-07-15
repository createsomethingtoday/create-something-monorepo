import { createHash } from 'node:crypto';

import type {
  AgentContractsArtifact,
  ApprovalSurfacesArtifact,
  CompiledWorkflowBundle,
  DecisionInventoryArtifact,
  EvaluationManifestArtifact,
  EventSchemasArtifact,
  ObjectSchemasArtifact,
  RuntimeTargetsArtifact,
  ToolContractsArtifact,
  WorkflowDefinition,
  WorkflowCompilationDiagnostic,
  WorkflowMapEdge,
  WorkflowMapNode,
} from './types.js';

export const WORKFLOW_COMPILER_VERSION = 'workflow-compiler-v0.1';

const REQUIRED_RECEIPT_FIELDS = ['workflow_id', 'action_id', 'correlation_id', 'outcome'];

export class WorkflowCompilationError extends Error {
  readonly diagnostics: WorkflowCompilationDiagnostic[];

  constructor(diagnostics: WorkflowCompilationDiagnostic[]) {
    super(`Workflow compilation failed with ${diagnostics.length} diagnostic(s)`);
    this.name = 'WorkflowCompilationError';
    this.diagnostics = diagnostics;
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function invalidDefinition(
  diagnostics: WorkflowCompilationDiagnostic[],
  path: string,
  message: string,
): void {
  diagnostics.push({ code: 'INVALID_WORKFLOW_DEFINITION', path, message });
}

function requireRecord(
  value: unknown,
  path: string,
  diagnostics: WorkflowCompilationDiagnostic[],
): UnknownRecord | undefined {
  if (isRecord(value)) return value;
  invalidDefinition(diagnostics, path, `${path} must be an object.`);
  return undefined;
}

function requireString(
  record: UnknownRecord,
  key: string,
  path: string,
  diagnostics: WorkflowCompilationDiagnostic[],
): void {
  if (typeof record[key] !== 'string') {
    invalidDefinition(diagnostics, `${path}.${key}`, `${path}.${key} must be a string.`);
  }
}

function requireBoolean(
  record: UnknownRecord,
  key: string,
  path: string,
  diagnostics: WorkflowCompilationDiagnostic[],
): void {
  if (typeof record[key] !== 'boolean') {
    invalidDefinition(diagnostics, `${path}.${key}`, `${path}.${key} must be a boolean.`);
  }
}

function requireStringArray(
  record: UnknownRecord,
  key: string,
  path: string,
  diagnostics: WorkflowCompilationDiagnostic[],
): void {
  if (!Array.isArray(record[key]) || !record[key].every((value) => typeof value === 'string')) {
    invalidDefinition(diagnostics, `${path}.${key}`, `${path}.${key} must be an array of strings.`);
  }
}

function requireEnum(
  record: UnknownRecord,
  key: string,
  path: string,
  values: readonly string[],
  diagnostics: WorkflowCompilationDiagnostic[],
): void {
  if (typeof record[key] !== 'string' || !values.includes(record[key])) {
    invalidDefinition(
      diagnostics,
      `${path}.${key}`,
      `${path}.${key} must be one of: ${values.join(', ')}.`,
    );
  }
}

function requireCollection(
  definition: UnknownRecord,
  key: string,
  diagnostics: WorkflowCompilationDiagnostic[],
): UnknownRecord[] {
  const value = definition[key];
  if (!Array.isArray(value)) {
    invalidDefinition(diagnostics, key, `${key} must be an array.`);
    return [];
  }
  return value.flatMap((entry, index) => {
    const record = requireRecord(entry, `${key}[${index}]`, diagnostics);
    return record ? [record] : [];
  });
}

function validateUniqueIds(
  entries: UnknownRecord[],
  collection: string,
  singular: string,
  diagnostics: WorkflowCompilationDiagnostic[],
): void {
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    if (typeof entry.id !== 'string') return;
    if (seen.has(entry.id)) {
      diagnostics.push({
        code: `DUPLICATE_${singular}_ID`,
        path: `${collection}[${index}].id`,
        message: `${singular} id ${entry.id} must be unique.`,
      });
      return;
    }
    seen.add(entry.id);
  });
}

function validateWorkflowDefinition(input: unknown): WorkflowDefinition {
  const diagnostics: WorkflowCompilationDiagnostic[] = [];
  const definition = requireRecord(input, 'workflow', diagnostics);
  if (!definition) throw new WorkflowCompilationError(diagnostics);

  if (definition.schemaVersion !== 'workflow_definition.v0.1') {
    diagnostics.push({
      code: 'UNSUPPORTED_WORKFLOW_SCHEMA_VERSION',
      path: 'schemaVersion',
      message: 'schemaVersion must be workflow_definition.v0.1.',
    });
  }
  for (const key of ['workflowId', 'version', 'title', 'businessObjective']) {
    requireString(definition, key, 'workflow', diagnostics);
  }
  const owners = requireRecord(definition.owners, 'owners', diagnostics);
  if (owners) {
    for (const key of ['workflow', 'policy', 'technical']) {
      requireString(owners, key, 'owners', diagnostics);
    }
  }

  const systems = requireCollection(definition, 'systems', diagnostics);
  systems.forEach((system, index) => {
    const path = `systems[${index}]`;
    for (const key of ['id', 'title', 'owningSurface']) requireString(system, key, path, diagnostics);
    requireEnum(system, 'tier', path, ['database', 'automation', 'judgment'], diagnostics);
    requireBoolean(system, 'sourceOfTruth', path, diagnostics);
  });

  const objects = requireCollection(definition, 'objects', diagnostics);
  objects.forEach((object, index) => {
    const path = `objects[${index}]`;
    for (const key of ['id', 'title', 'sourceSystemId']) requireString(object, key, path, diagnostics);
    requireStringArray(object, 'requiredFields', path, diagnostics);
  });

  const events = requireCollection(definition, 'events', diagnostics);
  events.forEach((event, index) => {
    const path = `events[${index}]`;
    for (const key of ['id', 'title', 'objectId']) requireString(event, key, path, diagnostics);
    requireStringArray(event, 'requiredEvidence', path, diagnostics);
  });

  const actors = requireCollection(definition, 'actors', diagnostics);
  actors.forEach((actor, index) => {
    const path = `actors[${index}]`;
    for (const key of ['id', 'title']) requireString(actor, key, path, diagnostics);
  });

  const states = requireCollection(definition, 'states', diagnostics);
  states.forEach((state, index) => {
    const path = `states[${index}]`;
    for (const key of ['id', 'title']) requireString(state, key, path, diagnostics);
    if ('terminal' in state && state.terminal !== undefined) requireBoolean(state, 'terminal', path, diagnostics);
  });

  const actions = requireCollection(definition, 'actions', diagnostics);
  actions.forEach((action, index) => {
    const path = `actions[${index}]`;
    for (const key of ['id', 'title', 'authority']) requireString(action, key, path, diagnostics);
    requireEnum(action, 'kind', path, ['read', 'write', 'decision', 'publish'], diagnostics);
    requireEnum(
      action,
      'autonomy',
      path,
      ['auto_allow', 'approval_required', 'manual_only', 'blocked'],
      diagnostics,
    );
    requireStringArray(action, 'systemsTouched', path, diagnostics);
    requireStringArray(action, 'requiredEvidence', path, diagnostics);
    const approval = requireRecord(action.approval, `${path}.approval`, diagnostics);
    if (approval) {
      requireBoolean(approval, 'required', `${path}.approval`, diagnostics);
      if ('owner' in approval && approval.owner !== undefined) {
        requireString(approval, 'owner', `${path}.approval`, diagnostics);
      }
    }
    const receipt = requireRecord(action.receipt, `${path}.receipt`, diagnostics);
    if (receipt) requireStringArray(receipt, 'requiredFields', `${path}.receipt`, diagnostics);
    const recovery = requireRecord(action.recovery, `${path}.recovery`, diagnostics);
    if (recovery) {
      requireEnum(recovery, 'mode', `${path}.recovery`, ['rollback', 'escalate', 'manual_fallback'], diagnostics);
      requireString(recovery, 'owner', `${path}.recovery`, diagnostics);
      requireString(recovery, 'path', `${path}.recovery`, diagnostics);
    }
    if ('tool' in action && action.tool !== undefined) {
      const tool = requireRecord(action.tool, `${path}.tool`, diagnostics);
      if (tool) {
        requireString(tool, 'name', `${path}.tool`, diagnostics);
        requireString(tool, 'targetSystemId', `${path}.tool`, diagnostics);
      }
    }
    if ('agentId' in action && action.agentId !== undefined) {
      requireString(action, 'agentId', path, diagnostics);
    }
  });

  const transitions = requireCollection(definition, 'transitions', diagnostics);
  transitions.forEach((transition, index) => {
    const path = `transitions[${index}]`;
    for (const key of ['id', 'from', 'to', 'actionId']) requireString(transition, key, path, diagnostics);
  });

  const agents = requireCollection(definition, 'agents', diagnostics);
  agents.forEach((agent, index) => {
    const path = `agents[${index}]`;
    for (const key of ['id', 'title', 'purpose', 'escalationOwner']) {
      requireString(agent, key, path, diagnostics);
    }
    requireStringArray(agent, 'allowedActionIds', path, diagnostics);
  });

  const evaluations = requireCollection(definition, 'evaluations', diagnostics);
  evaluations.forEach((evaluation, index) => {
    const path = `evaluations[${index}]`;
    for (const key of ['id', 'title', 'actionId']) requireString(evaluation, key, path, diagnostics);
    requireEnum(evaluation, 'expectedOutcome', path, ['pass', 'approval_required', 'blocked'], diagnostics);
    requireStringArray(evaluation, 'requiredEvidence', path, diagnostics);
  });

  validateUniqueIds(systems, 'systems', 'SYSTEM', diagnostics);
  validateUniqueIds(objects, 'objects', 'OBJECT', diagnostics);
  validateUniqueIds(events, 'events', 'EVENT', diagnostics);
  validateUniqueIds(actors, 'actors', 'ACTOR', diagnostics);
  validateUniqueIds(states, 'states', 'STATE', diagnostics);
  validateUniqueIds(actions, 'actions', 'ACTION', diagnostics);
  validateUniqueIds(transitions, 'transitions', 'TRANSITION', diagnostics);
  validateUniqueIds(agents, 'agents', 'AGENT', diagnostics);
  validateUniqueIds(evaluations, 'evaluations', 'EVALUATION', diagnostics);

  const routes = new Set<string>();
  transitions.forEach((transition, index) => {
    if (typeof transition.from !== 'string' || typeof transition.actionId !== 'string') return;
    const route = JSON.stringify([transition.from, transition.actionId]);
    if (routes.has(route)) {
      diagnostics.push({
        code: 'AMBIGUOUS_TRANSITION_ROUTE',
        path: `transitions[${index}]`,
        message: `Transition route (${transition.from}, ${transition.actionId}) must identify one target state.`,
      });
      return;
    }
    routes.add(route);
  });

  if (diagnostics.length > 0) throw new WorkflowCompilationError(diagnostics);
  return input as WorkflowDefinition;
}

function byId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function byActionId<T extends { actionId: string }>(left: T, right: T): number {
  return left.actionId.localeCompare(right.actionId);
}

function sorted(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function definitionHash(definition: WorkflowDefinition): string {
  const canonical = JSON.stringify(canonicalize(definition));
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

function artifactHeader(definition: WorkflowDefinition, hash: string) {
  return {
    workflowId: definition.workflowId,
    workflowVersion: definition.version,
    definitionHash: hash,
  };
}

function validateGovernance(definition: WorkflowDefinition): WorkflowCompilationDiagnostic[] {
  const diagnostics: WorkflowCompilationDiagnostic[] = [];

  definition.actions.forEach((action, index) => {
    if (action.kind === 'read') return;

    const path = `actions[${index}]`;
    if (action.systemsTouched.length === 0) {
      diagnostics.push({
        code: 'CONSEQUENTIAL_ACTION_MISSING_SYSTEM',
        path: `${path}.systemsTouched`,
        message: `Consequential action ${action.id} must name at least one owning system.`,
      });
    }
    if (action.requiredEvidence.length === 0) {
      diagnostics.push({
        code: 'CONSEQUENTIAL_ACTION_MISSING_EVIDENCE',
        path: `${path}.requiredEvidence`,
        message: `Consequential action ${action.id} must declare required evidence.`,
      });
    }
    if (
      action.autonomy === 'approval_required' &&
      (!action.approval.required || !action.approval.owner?.trim())
    ) {
      diagnostics.push({
        code: 'APPROVAL_CONTRACT_REQUIRED',
        path: `${path}.approval`,
        message: `Approval-required action ${action.id} must name an approval owner.`,
      });
    }
    if (!REQUIRED_RECEIPT_FIELDS.every((field) => action.receipt.requiredFields.includes(field))) {
      diagnostics.push({
        code: 'RECEIPT_FIELDS_REQUIRED',
        path: `${path}.receipt.requiredFields`,
        message: `Consequential action ${action.id} must emit the base receipt fields.`,
      });
    }
    if (!action.recovery.owner.trim()) {
      diagnostics.push({
        code: 'RECOVERY_OWNER_REQUIRED',
        path: `${path}.recovery.owner`,
        message: `Consequential action ${action.id} must name a recovery owner.`,
      });
    }
    if (!action.recovery.path.trim()) {
      diagnostics.push({
        code: 'RECOVERY_PATH_REQUIRED',
        path: `${path}.recovery.path`,
        message: `Consequential action ${action.id} must provide a recovery path.`,
      });
    }
  });

  return diagnostics;
}

function validateReferences(definition: WorkflowDefinition): WorkflowCompilationDiagnostic[] {
  const diagnostics: WorkflowCompilationDiagnostic[] = [];
  const actorIds = new Set(definition.actors.map((actor) => actor.id));
  const systemIds = new Set(definition.systems.map((system) => system.id));
  const objectIds = new Set(definition.objects.map((object) => object.id));
  const stateIds = new Set(definition.states.map((state) => state.id));
  const actionIds = new Set(definition.actions.map((action) => action.id));
  const agentIds = new Set(definition.agents.map((agent) => agent.id));

  definition.objects.forEach((object, index) => {
    if (!systemIds.has(object.sourceSystemId)) {
      diagnostics.push({
        code: 'UNKNOWN_OBJECT_SOURCE_SYSTEM',
        path: `objects[${index}].sourceSystemId`,
        message: `Object ${object.id} references unknown system ${object.sourceSystemId}.`,
      });
    }
  });
  definition.events.forEach((event, index) => {
    if (!objectIds.has(event.objectId)) {
      diagnostics.push({
        code: 'UNKNOWN_EVENT_OBJECT',
        path: `events[${index}].objectId`,
        message: `Event ${event.id} references unknown object ${event.objectId}.`,
      });
    }
  });
  definition.actions.forEach((action, index) => {
    if (!actorIds.has(action.authority)) {
      diagnostics.push({
        code: 'UNKNOWN_ACTION_AUTHORITY',
        path: `actions[${index}].authority`,
        message: `Action ${action.id} references unknown authority ${action.authority}.`,
      });
    }
    action.systemsTouched.forEach((systemId, systemIndex) => {
      if (!systemIds.has(systemId)) {
        diagnostics.push({
          code: 'UNKNOWN_ACTION_SYSTEM',
          path: `actions[${index}].systemsTouched[${systemIndex}]`,
          message: `Action ${action.id} references unknown system ${systemId}.`,
        });
      }
    });
    if (action.tool && !systemIds.has(action.tool.targetSystemId)) {
      diagnostics.push({
        code: 'UNKNOWN_TOOL_TARGET_SYSTEM',
        path: `actions[${index}].tool.targetSystemId`,
        message: `Tool ${action.tool.name} references unknown system ${action.tool.targetSystemId}.`,
      });
    }
    if (action.agentId && !agentIds.has(action.agentId)) {
      diagnostics.push({
        code: 'UNKNOWN_ACTION_AGENT',
        path: `actions[${index}].agentId`,
        message: `Action ${action.id} references unknown agent ${action.agentId}.`,
      });
    }
  });
  definition.transitions.forEach((transition, index) => {
    if (!stateIds.has(transition.from)) {
      diagnostics.push({
        code: 'UNKNOWN_TRANSITION_FROM_STATE',
        path: `transitions[${index}].from`,
        message: `Transition ${transition.id} references unknown state ${transition.from}.`,
      });
    }
    if (!stateIds.has(transition.to)) {
      diagnostics.push({
        code: 'UNKNOWN_TRANSITION_TO_STATE',
        path: `transitions[${index}].to`,
        message: `Transition ${transition.id} references unknown state ${transition.to}.`,
      });
    }
    if (!actionIds.has(transition.actionId)) {
      diagnostics.push({
        code: 'UNKNOWN_TRANSITION_ACTION',
        path: `transitions[${index}].actionId`,
        message: `Transition ${transition.id} references unknown action ${transition.actionId}.`,
      });
    }
  });
  definition.agents.forEach((agent, index) => {
    agent.allowedActionIds.forEach((actionId, actionIndex) => {
      if (!actionIds.has(actionId)) {
        diagnostics.push({
          code: 'UNKNOWN_AGENT_ACTION',
          path: `agents[${index}].allowedActionIds[${actionIndex}]`,
          message: `Agent ${agent.id} references unknown action ${actionId}.`,
        });
      }
    });
  });
  definition.evaluations.forEach((evaluation, index) => {
    if (!actionIds.has(evaluation.actionId)) {
      diagnostics.push({
        code: 'UNKNOWN_EVALUATION_ACTION',
        path: `evaluations[${index}].actionId`,
        message: `Evaluation ${evaluation.id} references unknown action ${evaluation.actionId}.`,
      });
    }
  });

  return diagnostics;
}

export function compileWorkflowDefinition(input: unknown): CompiledWorkflowBundle {
  const definition = validateWorkflowDefinition(input);
  const diagnostics = [...validateGovernance(definition), ...validateReferences(definition)];
  if (diagnostics.length > 0) throw new WorkflowCompilationError(diagnostics);

  const hash = definitionHash(definition);
  const header = artifactHeader(definition, hash);

  const nodes: WorkflowMapNode[] = [
    ...definition.actors.map((actor) => ({
      id: `actor:${actor.id}`,
      kind: 'actor' as const,
      title: actor.title,
    })),
    ...definition.states.map((state) => ({
      id: `state:${state.id}`,
      kind: 'state' as const,
      title: state.title,
    })),
    ...definition.actions.map((action) => ({
      id: `action:${action.id}`,
      kind: 'action' as const,
      title: action.title,
    })),
  ].sort(byId);

  const edges: WorkflowMapEdge[] = [
    ...definition.actions.map((action) => ({
      id: `authority:${action.authority}:${action.id}`,
      kind: 'authorizes' as const,
      from: `actor:${action.authority}`,
      to: `action:${action.id}`,
    })),
    ...definition.transitions.flatMap((transition) => [
      {
        id: `transition:${transition.id}:action`,
        kind: 'transitions' as const,
        from: `state:${transition.from}`,
        to: `action:${transition.actionId}`,
      },
      {
        id: `transition:${transition.id}:state`,
        kind: 'transitions' as const,
        from: `action:${transition.actionId}`,
        to: `state:${transition.to}`,
      },
    ]),
  ].sort(byId);

  const runtimeTargets: RuntimeTargetsArtifact = {
    schemaVersion: 'runtime_targets.v0.1',
    ...header,
    systems: [...definition.systems].sort(byId),
  };
  const objectSchemas: ObjectSchemasArtifact = {
    schemaVersion: 'object_schemas.v0.1',
    ...header,
    objects: definition.objects
      .map((object) => ({ ...object, requiredFields: sorted(object.requiredFields) }))
      .sort(byId),
  };
  const eventSchemas: EventSchemasArtifact = {
    schemaVersion: 'event_schemas.v0.1',
    ...header,
    events: definition.events
      .map((event) => ({ ...event, requiredEvidence: sorted(event.requiredEvidence) }))
      .sort(byId),
  };
  const decisionInventory: DecisionInventoryArtifact = {
    schemaVersion: 'decision_inventory.v0.1',
    ...header,
    decisions: definition.actions
      .map((action) => ({
        actionId: action.id,
        title: action.title,
        kind: action.kind,
        authority: action.authority,
        autonomy: action.autonomy,
        systemsTouched: sorted(action.systemsTouched),
        requiredEvidence: sorted(action.requiredEvidence),
        ...(action.approval.owner ? { approvalOwner: action.approval.owner } : {}),
        receiptFields: sorted(action.receipt.requiredFields),
        recovery: { ...action.recovery },
      }))
      .sort(byActionId),
  };
  const toolContracts: ToolContractsArtifact = {
    schemaVersion: 'tool_contracts.v0.1',
    ...header,
    tools: definition.actions
      .filter((action) => action.tool)
      .map((action) => ({
        actionId: action.id,
        name: action.tool!.name,
        targetSystemId: action.tool!.targetSystemId,
        authority: action.authority,
        autonomy: action.autonomy,
        requiredEvidence: sorted(action.requiredEvidence),
        receiptFields: sorted(action.receipt.requiredFields),
      }))
      .sort(byActionId),
  };
  const actionsById = new Map(definition.actions.map((action) => [action.id, action]));
  const agentContracts: AgentContractsArtifact = {
    schemaVersion: 'agent_contracts.v0.1',
    ...header,
    agents: definition.agents
      .map((agent) => ({
        ...agent,
        allowedActionIds: sorted(agent.allowedActionIds),
        actionAutonomy: agent.allowedActionIds
          .map((actionId) => ({
            actionId,
            autonomy: actionsById.get(actionId)?.autonomy ?? 'blocked',
          }))
          .sort(byActionId),
      }))
      .sort(byId),
  };
  const approvalSurfaces: ApprovalSurfacesArtifact = {
    schemaVersion: 'approval_surfaces.v0.1',
    ...header,
    actions: definition.actions
      .filter((action) => action.autonomy !== 'auto_allow')
      .map((action) => ({
        actionId: action.id,
        title: action.title,
        mode: action.autonomy as Exclude<typeof action.autonomy, 'auto_allow'>,
        owner: action.approval.owner ?? action.recovery.owner,
        requiredEvidence: sorted(action.requiredEvidence),
        recovery: { ...action.recovery },
      }))
      .sort(byActionId),
  };
  const evaluationManifest: EvaluationManifestArtifact = {
    schemaVersion: 'evaluation_manifest.v0.1',
    ...header,
    evaluations: definition.evaluations
      .map((evaluation) => ({
        ...evaluation,
        requiredEvidence: sorted(evaluation.requiredEvidence),
      }))
      .sort(byId),
  };

  return {
    schemaVersion: 'compiled_workflow_bundle.v0.1',
    compilerVersion: WORKFLOW_COMPILER_VERSION,
    workflowId: definition.workflowId,
    workflowVersion: definition.version,
    title: definition.title,
    businessObjective: definition.businessObjective,
    owners: { ...definition.owners },
    definitionHash: hash,
    workflowMap: {
      schemaVersion: 'workflow_map.v0.1',
      workflowId: definition.workflowId,
      workflowVersion: definition.version,
      nodes,
      edges,
    },
    runtimeTargets,
    objectSchemas,
    eventSchemas,
    decisionInventory,
    toolContracts,
    agentContracts,
    approvalSurfaces,
    evaluationManifest,
  };
}
