import { createHash } from 'node:crypto';

import { parseWorkflowDefinition, WorkflowInputValidationError } from './input.js';

import type {
  AgentContractsArtifact,
  ApprovalSurfacesArtifact,
  CompiledWorkflowBundle,
  DecisionInventoryArtifactV0_1,
  DecisionInventoryArtifactV0_2,
  EvaluationManifestArtifact,
  EventSchemasArtifact,
  GovernedInteractionBundleV0_1,
  GovernedInteractionBundleV0_2,
  ObjectSchemasArtifact,
  RuntimeTargetsArtifact,
  ToolContractsArtifact,
  WorkflowDefinition,
  WorkflowCompilationDiagnostic,
  WorkflowEvidenceMatcher,
  WorkflowEvidenceValue,
  WorkflowMapEdge,
  WorkflowMapNode
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

function byId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function byActionId<T extends { actionId: string }>(left: T, right: T): number {
  return left.actionId.localeCompare(right.actionId);
}

function byName<T extends { name: string }>(left: T, right: T): number {
  return left.name.localeCompare(right.name);
}

function sorted(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sortedEvidenceValues(
  values: Record<string, WorkflowEvidenceValue>
): Record<string, WorkflowEvidenceValue> {
  return Object.fromEntries(
    Object.entries(values).sort(([left], [right]) => left.localeCompare(right))
  );
}

function sortedEvidenceMatchers(
  matchers: Record<string, WorkflowEvidenceMatcher>
): Record<string, WorkflowEvidenceMatcher> {
  return Object.fromEntries(
    Object.entries(matchers)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([field, matcher]) => [field, { ...matcher, values: sorted(matcher.values) }])
  );
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
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
    definitionHash: hash
  };
}

function validateGovernance(definition: WorkflowDefinition): WorkflowCompilationDiagnostic[] {
  const diagnostics: WorkflowCompilationDiagnostic[] = [];

  definition.actions.forEach((action, index) => {
    const path = `actions[${index}]`;
    Object.keys(action.requiredEvidenceValues ?? {}).forEach((field) => {
      if (!action.requiredEvidence.includes(field)) {
        diagnostics.push({
          code: 'EVIDENCE_VALUE_CONSTRAINT_MISSING_REQUIRED_EVIDENCE',
          path: `${path}.requiredEvidenceValues.${field}`,
          message: `Evidence-value constraint ${field} for action ${action.id} must also be required evidence.`
        });
      }
    });
    Object.keys(action.requiredEvidenceMatchers ?? {}).forEach((field) => {
      if (!action.requiredEvidence.includes(field)) {
        diagnostics.push({
          code: 'EVIDENCE_MATCHER_MISSING_REQUIRED_EVIDENCE',
          path: `${path}.requiredEvidenceMatchers.${field}`,
          message: `Evidence matcher ${field} for action ${action.id} must also be required evidence.`
        });
      }
    });
    if (action.kind === 'read') return;

    if (action.systemsTouched.length === 0) {
      diagnostics.push({
        code: 'CONSEQUENTIAL_ACTION_MISSING_SYSTEM',
        path: `${path}.systemsTouched`,
        message: `Consequential action ${action.id} must name at least one owning system.`
      });
    }
    if (action.requiredEvidence.length === 0) {
      diagnostics.push({
        code: 'CONSEQUENTIAL_ACTION_MISSING_EVIDENCE',
        path: `${path}.requiredEvidence`,
        message: `Consequential action ${action.id} must declare required evidence.`
      });
    }
    if (
      action.autonomy === 'approval_required' &&
      (!action.approval.required || !action.approval.owner?.trim())
    ) {
      diagnostics.push({
        code: 'APPROVAL_CONTRACT_REQUIRED',
        path: `${path}.approval`,
        message: `Approval-required action ${action.id} must name an approval owner.`
      });
    }
    if (!REQUIRED_RECEIPT_FIELDS.every((field) => action.receipt.requiredFields.includes(field))) {
      diagnostics.push({
        code: 'RECEIPT_FIELDS_REQUIRED',
        path: `${path}.receipt.requiredFields`,
        message: `Consequential action ${action.id} must emit the base receipt fields.`
      });
    }
    if (!action.recovery.owner.trim()) {
      diagnostics.push({
        code: 'RECOVERY_OWNER_REQUIRED',
        path: `${path}.recovery.owner`,
        message: `Consequential action ${action.id} must name a recovery owner.`
      });
    }
    if (!action.recovery.path.trim()) {
      diagnostics.push({
        code: 'RECOVERY_PATH_REQUIRED',
        path: `${path}.recovery.path`,
        message: `Consequential action ${action.id} must provide a recovery path.`
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
  const actionsById = new Map(definition.actions.map((action) => [action.id, action]));
  const agentsById = new Map(definition.agents.map((agent) => [agent.id, agent]));

  definition.objects.forEach((object, index) => {
    if (!systemIds.has(object.sourceSystemId)) {
      diagnostics.push({
        code: 'UNKNOWN_OBJECT_SOURCE_SYSTEM',
        path: `objects[${index}].sourceSystemId`,
        message: `Object ${object.id} references unknown system ${object.sourceSystemId}.`
      });
    }
  });
  definition.events.forEach((event, index) => {
    if (!objectIds.has(event.objectId)) {
      diagnostics.push({
        code: 'UNKNOWN_EVENT_OBJECT',
        path: `events[${index}].objectId`,
        message: `Event ${event.id} references unknown object ${event.objectId}.`
      });
    }
  });
  definition.actions.forEach((action, index) => {
    if (!actorIds.has(action.authority)) {
      diagnostics.push({
        code: 'UNKNOWN_ACTION_AUTHORITY',
        path: `actions[${index}].authority`,
        message: `Action ${action.id} references unknown authority ${action.authority}.`
      });
    }
    action.systemsTouched.forEach((systemId, systemIndex) => {
      if (!systemIds.has(systemId)) {
        diagnostics.push({
          code: 'UNKNOWN_ACTION_SYSTEM',
          path: `actions[${index}].systemsTouched[${systemIndex}]`,
          message: `Action ${action.id} references unknown system ${systemId}.`
        });
      }
    });
    if (action.tool && !systemIds.has(action.tool.targetSystemId)) {
      diagnostics.push({
        code: 'UNKNOWN_TOOL_TARGET_SYSTEM',
        path: `actions[${index}].tool.targetSystemId`,
        message: `Tool ${action.tool.name} references unknown system ${action.tool.targetSystemId}.`
      });
    }
    if (action.tool && !action.systemsTouched.includes(action.tool.targetSystemId)) {
      diagnostics.push({
        code: 'TOOL_TARGET_NOT_DECLARED_SYSTEM_TOUCH',
        path: `actions[${index}].tool.targetSystemId`,
        message: `Tool ${action.tool.name} target ${action.tool.targetSystemId} must be declared in systemsTouched for action ${action.id}.`
      });
    }
    action.tool?.parameters?.forEach((parameter, parameterIndex) => {
      if (!action.requiredEvidence.includes(parameter.name)) {
        diagnostics.push({
          code: 'TOOL_PARAMETER_MISSING_EVIDENCE_CONTRACT',
          path: `actions[${index}].tool.parameters[${parameterIndex}].name`,
          message: `Tool parameter ${parameter.name} must be backed by required evidence for action ${action.id}.`
        });
      }
    });
    if (action.agentId && !agentIds.has(action.agentId)) {
      diagnostics.push({
        code: 'UNKNOWN_ACTION_AGENT',
        path: `actions[${index}].agentId`,
        message: `Action ${action.id} references unknown agent ${action.agentId}.`
      });
    } else if (
      action.agentId &&
      !agentsById.get(action.agentId)?.allowedActionIds.includes(action.id)
    ) {
      diagnostics.push({
        code: 'ACTION_NOT_ALLOWED_FOR_AGENT',
        path: `actions[${index}].agentId`,
        message: `Action ${action.id} assigns agent ${action.agentId} but is absent from that agent allowlist.`
      });
    }
  });
  definition.transitions.forEach((transition, index) => {
    if (!stateIds.has(transition.from)) {
      diagnostics.push({
        code: 'UNKNOWN_TRANSITION_FROM_STATE',
        path: `transitions[${index}].from`,
        message: `Transition ${transition.id} references unknown state ${transition.from}.`
      });
    }
    if (!stateIds.has(transition.to)) {
      diagnostics.push({
        code: 'UNKNOWN_TRANSITION_TO_STATE',
        path: `transitions[${index}].to`,
        message: `Transition ${transition.id} references unknown state ${transition.to}.`
      });
    }
    if (!actionIds.has(transition.actionId)) {
      diagnostics.push({
        code: 'UNKNOWN_TRANSITION_ACTION',
        path: `transitions[${index}].actionId`,
        message: `Transition ${transition.id} references unknown action ${transition.actionId}.`
      });
    }
  });
  definition.agents.forEach((agent, index) => {
    agent.allowedActionIds.forEach((actionId, actionIndex) => {
      if (!actionIds.has(actionId)) {
        diagnostics.push({
          code: 'UNKNOWN_AGENT_ACTION',
          path: `agents[${index}].allowedActionIds[${actionIndex}]`,
          message: `Agent ${agent.id} references unknown action ${actionId}.`
        });
      } else if (actionsById.get(actionId)?.agentId !== agent.id) {
        diagnostics.push({
          code: 'AGENT_ACTION_ASSIGNMENT_MISMATCH',
          path: `agents[${index}].allowedActionIds[${actionIndex}]`,
          message: `Agent ${agent.id} allowlists action ${actionId}, but that action is not assigned to the agent.`
        });
      }
    });
  });
  definition.evaluations.forEach((evaluation, index) => {
    if (!actionIds.has(evaluation.actionId)) {
      diagnostics.push({
        code: 'UNKNOWN_EVALUATION_ACTION',
        path: `evaluations[${index}].actionId`,
        message: `Evaluation ${evaluation.id} references unknown action ${evaluation.actionId}.`
      });
    }
  });

  return diagnostics;
}

export function compileWorkflowDefinition(input: unknown): CompiledWorkflowBundle {
  let snapshot: unknown;
  try {
    snapshot = structuredClone(input);
  } catch {
    throw new WorkflowInputValidationError([
      {
        code: 'INVALID_VALUE',
        path: '$',
        message: 'Workflow definition must be detachable structured data.'
      }
    ]);
  }
  const definition = parseWorkflowDefinition(snapshot);
  const diagnostics = [...validateGovernance(definition), ...validateReferences(definition)];
  if (diagnostics.length > 0) throw new WorkflowCompilationError(diagnostics);

  const hash = definitionHash(definition);
  const header = artifactHeader(definition, hash);

  const nodes: WorkflowMapNode[] = [
    ...definition.actors.map((actor) => ({
      id: `actor:${actor.id}`,
      kind: 'actor' as const,
      title: actor.title
    })),
    ...definition.states.map((state) => ({
      id: `state:${state.id}`,
      kind: 'state' as const,
      title: state.title
    })),
    ...definition.actions.map((action) => ({
      id: `action:${action.id}`,
      kind: 'action' as const,
      title: action.title
    }))
  ].sort(byId);

  const edges: WorkflowMapEdge[] = [
    ...definition.actions.map((action) => ({
      id: `authority:${action.authority}:${action.id}`,
      kind: 'authorizes' as const,
      from: `actor:${action.authority}`,
      to: `action:${action.id}`
    })),
    ...definition.transitions.flatMap((transition) => [
      {
        id: `transition:${transition.id}:action`,
        kind: 'transitions' as const,
        from: `state:${transition.from}`,
        to: `action:${transition.actionId}`
      },
      {
        id: `transition:${transition.id}:state`,
        kind: 'transitions' as const,
        from: `action:${transition.actionId}`,
        to: `state:${transition.to}`
      }
    ])
  ].sort(byId);

  const runtimeTargets: RuntimeTargetsArtifact = {
    schemaVersion: 'runtime_targets.v0.1',
    ...header,
    systems: [...definition.systems].sort(byId)
  };
  const objectSchemas: ObjectSchemasArtifact = {
    schemaVersion: 'object_schemas.v0.1',
    ...header,
    objects: definition.objects
      .map((object) => ({ ...object, requiredFields: sorted(object.requiredFields) }))
      .sort(byId)
  };
  const eventSchemas: EventSchemasArtifact = {
    schemaVersion: 'event_schemas.v0.1',
    ...header,
    events: definition.events
      .map((event) => ({ ...event, requiredEvidence: sorted(event.requiredEvidence) }))
      .sort(byId)
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
        ...(action.tool!.parameters
          ? { parameters: [...action.tool!.parameters].sort(byName) }
          : {})
      }))
      .sort(byActionId)
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
            autonomy: actionsById.get(actionId)?.autonomy ?? 'blocked'
          }))
          .sort(byActionId)
      }))
      .sort(byId)
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
        recovery: { ...action.recovery }
      }))
      .sort(byActionId)
  };
  const evaluationManifest: EvaluationManifestArtifact = {
    schemaVersion: 'evaluation_manifest.v0.1',
    ...header,
    evaluations: definition.evaluations
      .map((evaluation) => ({
        ...evaluation,
        requiredEvidence: sorted(evaluation.requiredEvidence)
      }))
      .sort(byId)
  };
  const common = {
    compilerVersion: WORKFLOW_COMPILER_VERSION,
    workflowId: definition.workflowId,
    workflowVersion: definition.version,
    title: definition.title,
    businessObjective: definition.businessObjective,
    owners: { ...definition.owners },
    definitionHash: hash,
    workflowMap: {
      schemaVersion: 'workflow_map.v0.1' as const,
      workflowId: definition.workflowId,
      workflowVersion: definition.version,
      nodes,
      edges
    },
    runtimeTargets,
    objectSchemas,
    eventSchemas,
    toolContracts,
    agentContracts,
    approvalSurfaces,
    evaluationManifest
  };

  if (definition.schemaVersion === 'workflow_definition.v0.2') {
    const decisionInventory: DecisionInventoryArtifactV0_2 = {
      schemaVersion: 'decision_inventory.v0.2',
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
          ...(action.requiredEvidenceValues
            ? { requiredEvidenceValues: sortedEvidenceValues(action.requiredEvidenceValues) }
            : {}),
          ...(action.requiredEvidenceMatchers
            ? { requiredEvidenceMatchers: sortedEvidenceMatchers(action.requiredEvidenceMatchers) }
            : {}),
          ...(action.approval.owner ? { approvalOwner: action.approval.owner } : {}),
          receiptFields: sorted(action.receipt.requiredFields),
          recovery: { ...action.recovery }
        }))
        .sort(byActionId)
    };
    const governedInteraction: GovernedInteractionBundleV0_2 = {
      schemaVersion: 'governed_interaction_bundle.v0.2',
      language: 'create-something/control',
      runtimeVersion: '0.1.0',
      ...header,
      entrySurfaceId: 'operator-console',
      capabilities: ['interaction.select', 'receipt.inspect', 'replay.inspect', 'workflow.inspect'],
      surfaces: [
        {
          id: 'operator-console',
          title: definition.title,
          kind: 'workflow_overview',
          operations: [{ kind: 'select_replay_case' }]
        }
      ],
      actions: decisionInventory.decisions
    };
    return {
      schemaVersion: 'compiled_workflow_bundle.v0.2',
      ...common,
      decisionInventory,
      governedInteraction
    };
  }

  const decisionInventory: DecisionInventoryArtifactV0_1 = {
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
        recovery: { ...action.recovery }
      }))
      .sort(byActionId)
  };
  const governedInteraction: GovernedInteractionBundleV0_1 = {
    schemaVersion: 'governed_interaction_bundle.v0.1',
    language: 'create-something/control',
    runtimeVersion: '0.1.0',
    ...header,
    entrySurfaceId: 'operator-console',
    capabilities: ['interaction.select', 'receipt.inspect', 'replay.inspect', 'workflow.inspect'],
    surfaces: [
      {
        id: 'operator-console',
        title: definition.title,
        kind: 'workflow_overview',
        operations: [{ kind: 'select_replay_case' }]
      }
    ],
    actions: decisionInventory.decisions
  };
  return {
    schemaVersion: 'compiled_workflow_bundle.v0.1',
    ...common,
    decisionInventory,
    governedInteraction
  };
}
