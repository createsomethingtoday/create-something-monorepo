import type { WorkflowDefinition, WorkflowReplayManifest } from './types.js';

export interface WorkflowInputDiagnostic {
  code:
    | 'INVALID_TYPE'
    | 'INVALID_VALUE'
    | 'REQUIRED_FIELD'
    | 'DUPLICATE_IDENTIFIER'
    | 'UNSUPPORTED_SCHEMA_VERSION'
    | 'WORKFLOW_ID_MISMATCH';
  path: string;
  message: string;
}

export class WorkflowInputValidationError extends Error {
  readonly code = 'INVALID_WORKFLOW_DEFINITION';
  readonly diagnostics: WorkflowInputDiagnostic[];

  constructor(diagnostics: WorkflowInputDiagnostic[]) {
    super(`Workflow definition input failed with ${diagnostics.length} diagnostic(s)`);
    this.name = 'WorkflowInputValidationError';
    this.diagnostics = diagnostics;
  }
}

export class ReplayInputValidationError extends Error {
  readonly code = 'INVALID_REPLAY_MANIFEST';
  readonly diagnostics: WorkflowInputDiagnostic[];

  constructor(diagnostics: WorkflowInputDiagnostic[]) {
    super(`Workflow replay input failed with ${diagnostics.length} diagnostic(s)`);
    this.name = 'ReplayInputValidationError';
    this.diagnostics = diagnostics;
  }
}

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

class Validator {
  readonly diagnostics: WorkflowInputDiagnostic[] = [];

  record(value: unknown, path: string): RecordValue | undefined {
    if (isRecord(value)) return value;
    this.diagnostics.push({
      code: value === undefined ? 'REQUIRED_FIELD' : 'INVALID_TYPE',
      path,
      message: 'Expected an object.'
    });
    return undefined;
  }

  array(value: unknown, path: string): unknown[] | undefined {
    if (Array.isArray(value)) return value;
    this.diagnostics.push({
      code: value === undefined ? 'REQUIRED_FIELD' : 'INVALID_TYPE',
      path,
      message: 'Expected an array.'
    });
    return undefined;
  }

  string(value: unknown, path: string): void {
    if (typeof value === 'string') return;
    this.diagnostics.push({
      code: value === undefined ? 'REQUIRED_FIELD' : 'INVALID_TYPE',
      path,
      message: 'Expected a string.'
    });
  }

  optionalString(value: unknown, path: string): void {
    if (value === undefined) return;
    this.string(value, path);
  }

  boolean(value: unknown, path: string, optional = false): void {
    if ((optional && value === undefined) || typeof value === 'boolean') return;
    this.diagnostics.push({
      code: value === undefined ? 'REQUIRED_FIELD' : 'INVALID_TYPE',
      path,
      message: 'Expected a boolean.'
    });
  }

  evidenceValue(value: unknown, path: string): void {
    if (
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
    ) {
      return;
    }
    this.diagnostics.push({
      code: value === undefined ? 'REQUIRED_FIELD' : 'INVALID_TYPE',
      path,
      message: 'Expected a string, finite number, or boolean.'
    });
  }

  enumeration(value: unknown, allowed: readonly string[], path: string): void {
    if (typeof value === 'string' && allowed.includes(value)) return;
    this.diagnostics.push({
      code: value === undefined ? 'REQUIRED_FIELD' : 'INVALID_VALUE',
      path,
      message: `Expected one of: ${allowed.join(', ')}.`
    });
  }

  stringArray(value: unknown, path: string): void {
    const entries = this.array(value, path);
    entries?.forEach((entry, index) => this.string(entry, `${path}[${index}]`));
  }

  records(value: unknown[], path: string, visit: (entry: RecordValue, path: string) => void): void {
    value.forEach((entry, index) => {
      const entryPath = `${path}[${index}]`;
      const record = this.record(entry, entryPath);
      if (record) visit(record, entryPath);
    });
  }

  uniqueIdentifiers(value: unknown[], path: string, field = 'id'): void {
    const firstPaths = new Map<string, string>();
    value.forEach((entry, index) => {
      if (!isRecord(entry) || typeof entry[field] !== 'string') return;
      const identifier = entry[field];
      const identifierPath = `${path}[${index}].${field}`;
      const firstPath = firstPaths.get(identifier);
      if (firstPath) {
        this.diagnostics.push({
          code: 'DUPLICATE_IDENTIFIER',
          path: identifierPath,
          message: `Duplicate identifier ${identifier}; first declared at ${firstPath}.`
        });
        return;
      }
      firstPaths.set(identifier, identifierPath);
    });
  }
}

function requireTopLevelCollections(input: RecordValue): Record<string, unknown[]> {
  const validator = new Validator();
  const collections: Record<string, unknown[]> = {};
  for (const key of [
    'actions',
    'systems',
    'objects',
    'events',
    'actors',
    'states',
    'transitions',
    'agents',
    'evaluations'
  ]) {
    const collection = validator.array(input[key], `$.${key}`);
    if (!collection) throw new WorkflowInputValidationError(validator.diagnostics);
    collections[key] = collection;
  }
  return collections;
}

export function parseWorkflowDefinition(input: unknown): WorkflowDefinition {
  if (!isRecord(input)) {
    throw new WorkflowInputValidationError([
      { code: 'INVALID_TYPE', path: '$', message: 'Expected an object.' }
    ]);
  }

  const collections = requireTopLevelCollections(input);
  const validator = new Validator();

  if (input.schemaVersion !== 'workflow_definition.v0.1') {
    validator.diagnostics.push({
      code: input.schemaVersion === undefined ? 'REQUIRED_FIELD' : 'UNSUPPORTED_SCHEMA_VERSION',
      path: '$.schemaVersion',
      message: 'Expected workflow_definition.v0.1.'
    });
  }
  validator.string(input.workflowId, '$.workflowId');
  validator.string(input.version, '$.version');
  validator.string(input.title, '$.title');
  validator.string(input.businessObjective, '$.businessObjective');

  const owners = validator.record(input.owners, '$.owners');
  if (owners) {
    validator.string(owners.workflow, '$.owners.workflow');
    validator.string(owners.policy, '$.owners.policy');
    validator.string(owners.technical, '$.owners.technical');
  }

  validator.records(collections.systems, '$.systems', (system, path) => {
    validator.string(system.id, `${path}.id`);
    validator.string(system.title, `${path}.title`);
    validator.enumeration(system.tier, ['database', 'automation', 'judgment'], `${path}.tier`);
    validator.string(system.owningSurface, `${path}.owningSurface`);
    validator.boolean(system.sourceOfTruth, `${path}.sourceOfTruth`);
  });
  validator.records(collections.objects, '$.objects', (object, path) => {
    validator.string(object.id, `${path}.id`);
    validator.string(object.title, `${path}.title`);
    validator.string(object.sourceSystemId, `${path}.sourceSystemId`);
    validator.stringArray(object.requiredFields, `${path}.requiredFields`);
  });
  validator.records(collections.events, '$.events', (event, path) => {
    validator.string(event.id, `${path}.id`);
    validator.string(event.title, `${path}.title`);
    validator.string(event.objectId, `${path}.objectId`);
    validator.stringArray(event.requiredEvidence, `${path}.requiredEvidence`);
  });
  validator.records(collections.actors, '$.actors', (actor, path) => {
    validator.string(actor.id, `${path}.id`);
    validator.string(actor.title, `${path}.title`);
  });
  validator.records(collections.states, '$.states', (state, path) => {
    validator.string(state.id, `${path}.id`);
    validator.string(state.title, `${path}.title`);
    validator.boolean(state.terminal, `${path}.terminal`, true);
  });
  validator.records(collections.actions, '$.actions', (action, path) => {
    validator.string(action.id, `${path}.id`);
    validator.string(action.title, `${path}.title`);
    validator.enumeration(action.kind, ['read', 'write', 'decision', 'publish'], `${path}.kind`);
    validator.string(action.authority, `${path}.authority`);
    validator.enumeration(
      action.autonomy,
      ['auto_allow', 'approval_required', 'manual_only', 'blocked'],
      `${path}.autonomy`
    );
    validator.stringArray(action.systemsTouched, `${path}.systemsTouched`);
    validator.stringArray(action.requiredEvidence, `${path}.requiredEvidence`);
    if (action.requiredEvidenceValues !== undefined) {
      const requiredEvidenceValues = validator.record(
        action.requiredEvidenceValues,
        `${path}.requiredEvidenceValues`
      );
      if (requiredEvidenceValues) {
        Object.entries(requiredEvidenceValues).forEach(([field, value]) => {
          if (!field.trim()) {
            validator.diagnostics.push({
              code: 'INVALID_VALUE',
              path: `${path}.requiredEvidenceValues`,
              message: 'Evidence-value constraint fields must not be empty.'
            });
          }
          validator.evidenceValue(value, `${path}.requiredEvidenceValues.${field}`);
        });
      }
    }

    const approval = validator.record(action.approval, `${path}.approval`);
    if (approval) {
      validator.boolean(approval.required, `${path}.approval.required`);
      validator.optionalString(approval.owner, `${path}.approval.owner`);
    }
    const receipt = validator.record(action.receipt, `${path}.receipt`);
    if (receipt) validator.stringArray(receipt.requiredFields, `${path}.receipt.requiredFields`);
    const recovery = validator.record(action.recovery, `${path}.recovery`);
    if (recovery) {
      validator.enumeration(
        recovery.mode,
        ['rollback', 'escalate', 'manual_fallback'],
        `${path}.recovery.mode`
      );
      validator.string(recovery.owner, `${path}.recovery.owner`);
      validator.string(recovery.path, `${path}.recovery.path`);
    }
    if (action.tool !== undefined) {
      const tool = validator.record(action.tool, `${path}.tool`);
      if (tool) {
        validator.string(tool.name, `${path}.tool.name`);
        validator.string(tool.targetSystemId, `${path}.tool.targetSystemId`);
        if (tool.parameters !== undefined) {
          const parameters = validator.array(tool.parameters, `${path}.tool.parameters`);
          if (!parameters) return;
          validator.records(parameters, `${path}.tool.parameters`, (parameter, parameterPath) => {
            validator.string(parameter.name, `${parameterPath}.name`);
            validator.enumeration(
              parameter.type,
              ['string', 'number', 'boolean'],
              `${parameterPath}.type`
            );
            validator.string(parameter.description, `${parameterPath}.description`);
          });
          validator.uniqueIdentifiers(parameters, `${path}.tool.parameters`, 'name');
        }
      }
    }
    validator.optionalString(action.agentId, `${path}.agentId`);
  });
  validator.records(collections.transitions, '$.transitions', (transition, path) => {
    validator.string(transition.id, `${path}.id`);
    validator.string(transition.from, `${path}.from`);
    validator.string(transition.to, `${path}.to`);
    validator.string(transition.actionId, `${path}.actionId`);
  });
  validator.records(collections.agents, '$.agents', (agent, path) => {
    validator.string(agent.id, `${path}.id`);
    validator.string(agent.title, `${path}.title`);
    validator.string(agent.purpose, `${path}.purpose`);
    validator.stringArray(agent.allowedActionIds, `${path}.allowedActionIds`);
    validator.string(agent.escalationOwner, `${path}.escalationOwner`);
  });
  validator.records(collections.evaluations, '$.evaluations', (evaluation, path) => {
    validator.string(evaluation.id, `${path}.id`);
    validator.string(evaluation.title, `${path}.title`);
    validator.string(evaluation.actionId, `${path}.actionId`);
    validator.enumeration(
      evaluation.expectedOutcome,
      ['pass', 'approval_required', 'blocked'],
      `${path}.expectedOutcome`
    );
    validator.stringArray(evaluation.requiredEvidence, `${path}.requiredEvidence`);
  });
  for (const [collection, entries] of Object.entries(collections)) {
    validator.uniqueIdentifiers(entries, `$.${collection}`);
  }

  if (validator.diagnostics.length > 0) {
    throw new WorkflowInputValidationError(validator.diagnostics);
  }
  return input as unknown as WorkflowDefinition;
}

export function parseWorkflowReplayManifest(input: unknown): WorkflowReplayManifest {
  if (!isRecord(input)) {
    throw new ReplayInputValidationError([
      { code: 'INVALID_TYPE', path: '$', message: 'Expected an object.' }
    ]);
  }

  const validator = new Validator();
  const cases = validator.array(input.cases, '$.cases');
  if (!cases) throw new ReplayInputValidationError(validator.diagnostics);

  if (input.schemaVersion !== 'workflow_replay_manifest.v0.1') {
    validator.diagnostics.push({
      code: input.schemaVersion === undefined ? 'REQUIRED_FIELD' : 'UNSUPPORTED_SCHEMA_VERSION',
      path: '$.schemaVersion',
      message: 'Expected workflow_replay_manifest.v0.1.'
    });
  }
  validator.string(input.workflowId, '$.workflowId');
  validator.records(cases, '$.cases', (replayCase, path) => {
    validator.string(replayCase.caseId, `${path}.caseId`);
    validator.string(replayCase.title, `${path}.title`);
    validator.string(replayCase.initialState, `${path}.initialState`);
    validator.string(replayCase.actionId, `${path}.actionId`);
    validator.string(replayCase.actorId, `${path}.actorId`);
    validator.record(replayCase.evidence, `${path}.evidence`);
    validator.stringArray(replayCase.approvals, `${path}.approvals`);
    validator.enumeration(
      replayCase.expectedOutcome,
      ['pass', 'approval_required', 'blocked'],
      `${path}.expectedOutcome`
    );
    validator.string(replayCase.expectedState, `${path}.expectedState`);
  });
  validator.uniqueIdentifiers(cases, '$.cases', 'caseId');

  if (validator.diagnostics.length > 0) {
    throw new ReplayInputValidationError(validator.diagnostics);
  }
  return input as unknown as WorkflowReplayManifest;
}
