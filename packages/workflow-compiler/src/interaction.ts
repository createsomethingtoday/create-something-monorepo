import type {
  ActionKind,
  AutonomyClass,
  WorkflowEvidenceMatcher,
  WorkflowEvidenceValue,
  GovernedInteractionBundle,
  GovernedInteractionBundleV0_1,
  GovernedInteractionBundleV0_2,
  GovernedInteractionBundleV0_3,
  GovernedInteractionDecision,
  GovernedInteractionDecisionV0_1,
  GovernedInteractionDecisionV0_2,
  GovernedInteractionDecisionV0_3,
  GovernedInteractionCapability,
  GovernedInteractionOperation,
  GovernedInteractionSurface,
} from './types.js';

export type GovernedInteractionValidationCode =
  | 'DUPLICATE_IDENTIFIER'
  | 'INVALID_ACTION_GOVERNANCE'
  | 'INVALID_BUNDLE'
  | 'INVALID_REFERENCE'
  | 'UNKNOWN_CAPABILITY'
  | 'UNKNOWN_LANGUAGE'
  | 'UNKNOWN_OPERATION'
  | 'UNKNOWN_RUNTIME_VERSION'
  | 'UNKNOWN_SCHEMA_VERSION';

export class GovernedInteractionValidationError extends Error {
  readonly code: GovernedInteractionValidationCode;
  readonly path: string;

  constructor(code: GovernedInteractionValidationCode, path: string, message: string) {
    super(message);
    this.name = 'GovernedInteractionValidationError';
    this.code = code;
    this.path = path;
  }
}

type JsonObject = Record<string, unknown>;

export type GovernedInteractionCompatibilityErrorCodeV0_1 =
  | 'DEFINITION_HASH_MISMATCH'
  | 'UNSUPPORTED_CAPABILITY'
  | 'UNSUPPORTED_LANGUAGE'
  | 'UNSUPPORTED_OPERATION'
  | 'UNSUPPORTED_RUNTIME_VERSION';

export type GovernedInteractionCompatibilityErrorCodeV0_2 =
  | GovernedInteractionCompatibilityErrorCodeV0_1
  | 'UNSUPPORTED_SCHEMA_VERSION';

export type GovernedInteractionCompatibilityErrorCode =
  GovernedInteractionCompatibilityErrorCodeV0_2;

export interface GovernedInteractionHostContract {
  hostId: string;
  language: GovernedInteractionBundle['language'];
  /**
   * An omitted allowlist preserves the v0.1 public host contract. New hosts
   * must explicitly list every schema they support.
   */
  schemaVersions?: Array<GovernedInteractionBundle['schemaVersion']>;
  runtimeVersions: Array<GovernedInteractionBundle['runtimeVersion']>;
  capabilities: GovernedInteractionCapability[];
  operations: Array<GovernedInteractionOperation['kind']>;
  definitionHashes?: Record<string, string>;
}

interface GovernedInteractionCompatibilityDecisionBase<
  TSchemaVersion extends string,
  TErrorCode extends GovernedInteractionCompatibilityErrorCode,
> {
  schemaVersion: TSchemaVersion;
  compatible: boolean;
  hostId: string;
  language: GovernedInteractionBundle['language'];
  runtimeVersion: GovernedInteractionBundle['runtimeVersion'];
  requiredCapabilities: GovernedInteractionCapability[];
  requiredOperations: Array<GovernedInteractionOperation['kind']>;
  errors: Array<{
    code: TErrorCode;
    value: string;
  }>;
}

export interface GovernedInteractionCompatibilityDecisionV0_1
  extends GovernedInteractionCompatibilityDecisionBase<
    'governed_interaction_compatibility.v0.1',
    GovernedInteractionCompatibilityErrorCodeV0_1
  > {}

export interface GovernedInteractionCompatibilityDecisionV0_2
  extends GovernedInteractionCompatibilityDecisionBase<
    'governed_interaction_compatibility.v0.2',
    GovernedInteractionCompatibilityErrorCodeV0_2
  > {}

export type GovernedInteractionCompatibilityDecision =
  | GovernedInteractionCompatibilityDecisionV0_1
  | GovernedInteractionCompatibilityDecisionV0_2;

const CAPABILITIES: readonly GovernedInteractionCapability[] = [
  'interaction.select',
  'receipt.inspect',
  'replay.inspect',
  'workflow.inspect',
];

const ACTION_KINDS: readonly ActionKind[] = ['read', 'write', 'decision', 'publish'];
const AUTONOMY_CLASSES: readonly AutonomyClass[] = [
  'auto_allow',
  'approval_required',
  'manual_only',
  'blocked',
];

function invalid(path: string, message: string): never {
  throw new GovernedInteractionValidationError('INVALID_BUNDLE', path, message);
}

function object(value: unknown, path: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return invalid(path, `${path} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return invalid(path, `${path} must be an object.`);
  }
  return value as JsonObject;
}

function exactFields(
  value: JsonObject,
  required: readonly string[],
  optional: readonly string[],
  path: string,
): void {
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = required.filter((key) => !(key in value));
  if (unknown.length || missing.length) {
    invalid(
      path,
      `${path} fields do not match the contract (missing: ${missing.join(', ') || 'none'}; unknown: ${unknown.join(', ') || 'none'}).`,
    );
  }
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') return invalid(path, `${path} must be a string.`);
  return value;
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) return invalid(path, `${path} must be an array.`);
  return value.map((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (typeof entry !== 'string' || entry.trim() === '') {
      return invalid(entryPath, `${entryPath} must be a non-empty string.`);
    }
    return entry;
  });
}

function evidenceValue(value: unknown, path: string): WorkflowEvidenceValue {
  if (
    (typeof value === 'string' && value.trim() !== '') ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value;
  }
  return invalid(path, `${path} must be a non-empty string, finite number, or boolean.`);
}

function evidenceValues(value: unknown, path: string): Record<string, WorkflowEvidenceValue> {
  const values = object(value, path);
  return Object.fromEntries(
    Object.entries(values).map(([field, expected]) => {
      if (!field.trim()) return invalid(path, `${path} fields must not be empty.`);
      return [field, evidenceValue(expected, `${path}.${field}`)];
    }),
  );
}

function evidenceMatcher(
  value: unknown,
  path: string,
  supportsExactEnum: boolean,
): WorkflowEvidenceMatcher {
  const matcher = object(value, path);
  exactFields(matcher, ['kind', 'values'], [], path);
  if (
    matcher.kind !== 'contains_case_insensitive' &&
    (!supportsExactEnum || matcher.kind !== 'equals_one_of')
  ) {
    return invalid(`${path}.kind`, `${path}.kind is not supported.`);
  }
  const values = stringArray(matcher.values, `${path}.values`);
  if (values.length === 0) {
    return invalid(`${path}.values`, `${path}.values must contain at least one string.`);
  }
  unique(values, `${path}.values`);
  return { kind: matcher.kind, values };
}

function evidenceMatchers(
  value: unknown,
  path: string,
  supportsExactEnum: boolean,
): Record<string, WorkflowEvidenceMatcher> {
  const matchers = object(value, path);
  return Object.fromEntries(
    Object.entries(matchers).map(([field, matcher]) => {
      if (!field.trim()) return invalid(path, `${path} fields must not be empty.`);
      return [field, evidenceMatcher(matcher, `${path}.${field}`, supportsExactEnum)];
    }),
  );
}

function matchesEvidenceMatcher(
  value: WorkflowEvidenceValue,
  matcher: WorkflowEvidenceMatcher,
): boolean {
  switch (matcher.kind) {
    case 'contains_case_insensitive':
      return (
        typeof value === 'string' &&
        matcher.values.some((candidate) =>
          value.toLowerCase().includes(candidate.toLowerCase()),
        )
      );
    case 'equals_one_of':
      return typeof value === 'string' && matcher.values.includes(value);
  }
}

function unique(values: string[], path: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new GovernedInteractionValidationError(
        'DUPLICATE_IDENTIFIER',
        path,
        `${path} contains duplicate identifier ${value}.`,
      );
    }
    seen.add(value);
  }
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    return invalid(path, `${path} is not supported.`);
  }
  return value as T;
}

function parseOperation(value: unknown, path: string): GovernedInteractionOperation {
  const operation = object(value, path);
  exactFields(operation, ['kind'], [], path);
  if (operation.kind !== 'select_replay_case') {
    throw new GovernedInteractionValidationError(
      'UNKNOWN_OPERATION',
      `${path}.kind`,
      `Unknown governed interaction operation ${String(operation.kind)}.`,
    );
  }
  return { kind: 'select_replay_case' };
}

function parseSurface(value: unknown, path: string): GovernedInteractionSurface {
  const surface = object(value, path);
  exactFields(surface, ['id', 'title', 'kind', 'operations'], [], path);
  if (surface.kind !== 'workflow_overview') {
    return invalid(`${path}.kind`, `${path}.kind is not supported.`);
  }
  if (!Array.isArray(surface.operations)) {
    return invalid(`${path}.operations`, `${path}.operations must be an array.`);
  }
  return {
    id: string(surface.id, `${path}.id`),
    title: string(surface.title, `${path}.title`),
    kind: 'workflow_overview',
    operations: surface.operations.map((operation, index) =>
      parseOperation(operation, `${path}.operations[${index}]`),
    ),
  };
}

function parseDecision(
  value: unknown,
  path: string,
  schemaVersion: GovernedInteractionBundle['schemaVersion'],
): GovernedInteractionDecision {
  const decision = object(value, path);
  exactFields(
    decision,
    [
      'actionId',
      'title',
      'kind',
      'authority',
      'autonomy',
      'systemsTouched',
      'requiredEvidence',
      'receiptFields',
      'recovery',
    ],
    schemaVersion !== 'governed_interaction_bundle.v0.1'
      ? ['approvalOwner', 'requiredEvidenceMatchers', 'requiredEvidenceValues']
      : ['approvalOwner'],
    path,
  );
  const recovery = object(decision.recovery, `${path}.recovery`);
  exactFields(recovery, ['mode', 'owner', 'path'], [], `${path}.recovery`);
  const autonomy = enumValue(decision.autonomy, AUTONOMY_CLASSES, `${path}.autonomy`);
  const approvalOwner =
    decision.approvalOwner === undefined
      ? undefined
      : string(decision.approvalOwner, `${path}.approvalOwner`);
  if (autonomy === 'approval_required' && !approvalOwner) {
    throw new GovernedInteractionValidationError(
      'INVALID_ACTION_GOVERNANCE',
      `${path}.approvalOwner`,
      `Approval-required action ${String(decision.actionId)} must name an approval owner.`,
    );
  }
  const systemsTouched = stringArray(decision.systemsTouched, `${path}.systemsTouched`);
  const requiredEvidence = stringArray(decision.requiredEvidence, `${path}.requiredEvidence`);
  const requiredEvidenceValues =
    decision.requiredEvidenceValues === undefined
      ? undefined
      : evidenceValues(decision.requiredEvidenceValues, `${path}.requiredEvidenceValues`);
  const requiredEvidenceMatchers =
    decision.requiredEvidenceMatchers === undefined
      ? undefined
      : evidenceMatchers(
          decision.requiredEvidenceMatchers,
          `${path}.requiredEvidenceMatchers`,
          schemaVersion === 'governed_interaction_bundle.v0.3',
        );
  const receiptFields = stringArray(decision.receiptFields, `${path}.receiptFields`);
  unique(systemsTouched, `${path}.systemsTouched`);
  unique(requiredEvidence, `${path}.requiredEvidence`);
  unique(receiptFields, `${path}.receiptFields`);
  Object.keys(requiredEvidenceValues ?? {}).forEach((field) => {
    if (!requiredEvidence.includes(field)) {
      throw new GovernedInteractionValidationError(
        'INVALID_ACTION_GOVERNANCE',
        `${path}.requiredEvidenceValues.${field}`,
        `Evidence-value constraint ${field} for action ${String(decision.actionId)} must also be required evidence.`,
      );
    }
  });
  Object.keys(requiredEvidenceMatchers ?? {}).forEach((field) => {
    if (!requiredEvidence.includes(field)) {
      throw new GovernedInteractionValidationError(
        'INVALID_ACTION_GOVERNANCE',
        `${path}.requiredEvidenceMatchers.${field}`,
        `Evidence matcher ${field} for action ${String(decision.actionId)} must also be required evidence.`,
      );
    }
  });
  Object.entries(requiredEvidenceValues ?? {}).forEach(([field, value]) => {
    const matcher = requiredEvidenceMatchers?.[field];
    if (matcher && !matchesEvidenceMatcher(value, matcher)) {
      throw new GovernedInteractionValidationError(
        'INVALID_ACTION_GOVERNANCE',
        `${path}.requiredEvidenceValues.${field}`,
        `Exact evidence value for ${field} must satisfy its matcher for action ${String(decision.actionId)}.`,
      );
    }
  });
  return {
    actionId: string(decision.actionId, `${path}.actionId`),
    title: string(decision.title, `${path}.title`),
    kind: enumValue(decision.kind, ACTION_KINDS, `${path}.kind`),
    authority: string(decision.authority, `${path}.authority`),
    autonomy,
    systemsTouched,
    requiredEvidence,
    ...(requiredEvidenceMatchers ? { requiredEvidenceMatchers } : {}),
    ...(requiredEvidenceValues ? { requiredEvidenceValues } : {}),
    ...(approvalOwner ? { approvalOwner } : {}),
    receiptFields,
    recovery: {
      mode: enumValue(
        recovery.mode,
        ['rollback', 'escalate', 'manual_fallback'] as const,
        `${path}.recovery.mode`,
      ),
      owner: string(recovery.owner, `${path}.recovery.owner`),
      path: string(recovery.path, `${path}.recovery.path`),
    },
  };
}

export function parseGovernedInteractionBundle(input: unknown): GovernedInteractionBundle {
  const bundle = object(input, 'bundle');
  exactFields(
    bundle,
    [
      'schemaVersion',
      'language',
      'runtimeVersion',
      'workflowId',
      'workflowVersion',
      'definitionHash',
      'entrySurfaceId',
      'capabilities',
      'surfaces',
      'actions',
    ],
    [],
    'bundle',
  );
  if (
    bundle.schemaVersion !== 'governed_interaction_bundle.v0.1' &&
    bundle.schemaVersion !== 'governed_interaction_bundle.v0.2' &&
    bundle.schemaVersion !== 'governed_interaction_bundle.v0.3'
  ) {
    throw new GovernedInteractionValidationError(
      'UNKNOWN_SCHEMA_VERSION',
      'bundle.schemaVersion',
      `Unsupported governed interaction schema ${String(bundle.schemaVersion)}.`,
    );
  }
  const schemaVersion = bundle.schemaVersion;
  if (bundle.language !== 'create-something/control') {
    throw new GovernedInteractionValidationError(
      'UNKNOWN_LANGUAGE',
      'bundle.language',
      `Unsupported governed interaction language ${String(bundle.language)}.`,
    );
  }
  if (bundle.runtimeVersion !== '0.1.0') {
    throw new GovernedInteractionValidationError(
      'UNKNOWN_RUNTIME_VERSION',
      'bundle.runtimeVersion',
      `Unsupported governed interaction runtime ${String(bundle.runtimeVersion)}.`,
    );
  }
  if (!Array.isArray(bundle.capabilities)) {
    return invalid('bundle.capabilities', 'bundle.capabilities must be an array.');
  }
  const capabilities = bundle.capabilities.map((capability, index) => {
    if (typeof capability !== 'string' || !CAPABILITIES.includes(capability as GovernedInteractionCapability)) {
      throw new GovernedInteractionValidationError(
        'UNKNOWN_CAPABILITY',
        `bundle.capabilities[${index}]`,
        `Unknown governed interaction capability ${String(capability)}.`,
      );
    }
    return capability as GovernedInteractionCapability;
  });
  unique(capabilities, 'bundle.capabilities');
  if (!Array.isArray(bundle.surfaces) || bundle.surfaces.length === 0) {
    return invalid('bundle.surfaces', 'bundle.surfaces must contain at least one surface.');
  }
  if (!Array.isArray(bundle.actions)) {
    return invalid('bundle.actions', 'bundle.actions must be an array.');
  }
  const surfaces = bundle.surfaces.map((surface, index) =>
    parseSurface(surface, `bundle.surfaces[${index}]`),
  );
  const actions = bundle.actions.map((action, index) =>
    parseDecision(action, `bundle.actions[${index}]`, schemaVersion),
  );
  unique(surfaces.map((surface) => surface.id), 'bundle.surfaces');
  unique(actions.map((action) => action.actionId), 'bundle.actions');
  const entrySurfaceId = string(bundle.entrySurfaceId, 'bundle.entrySurfaceId');
  if (!surfaces.some((surface) => surface.id === entrySurfaceId)) {
    throw new GovernedInteractionValidationError(
      'INVALID_REFERENCE',
      'bundle.entrySurfaceId',
      `Entry surface ${entrySurfaceId} does not exist.`,
    );
  }
  const common = {
    language: 'create-something/control' as const,
    runtimeVersion: '0.1.0' as const,
    workflowId: string(bundle.workflowId, 'bundle.workflowId'),
    workflowVersion: string(bundle.workflowVersion, 'bundle.workflowVersion'),
    definitionHash: string(bundle.definitionHash, 'bundle.definitionHash'),
    entrySurfaceId,
    capabilities,
    surfaces,
  };
  if (schemaVersion === 'governed_interaction_bundle.v0.2') {
    return {
      schemaVersion,
      ...common,
      actions: actions as GovernedInteractionDecisionV0_2[],
    };
  }
  if (schemaVersion === 'governed_interaction_bundle.v0.3') {
    return {
      schemaVersion,
      ...common,
      actions: actions as GovernedInteractionDecisionV0_3[],
    };
  }
  return {
    schemaVersion,
    ...common,
    actions: actions as GovernedInteractionDecisionV0_1[],
  };
}

export function migrateGovernedInteractionBundle(
  input: unknown,
): GovernedInteractionBundleV0_2 {
  const bundle = parseGovernedInteractionBundle(input);
  if (bundle.schemaVersion === 'governed_interaction_bundle.v0.3') {
    throw new GovernedInteractionValidationError(
      'INVALID_BUNDLE',
      'bundle.schemaVersion',
      'governed_interaction_bundle.v0.3 cannot be downgraded; use migrateGovernedInteractionBundleToV0_3 for a detached v0.3 copy.',
    );
  }
  return {
    ...structuredClone(bundle),
    schemaVersion: 'governed_interaction_bundle.v0.2',
    actions: bundle.actions as GovernedInteractionDecisionV0_2[]
  };
}

export function migrateGovernedInteractionBundleToV0_3(
  input: unknown,
): GovernedInteractionBundleV0_3 {
  const bundle = parseGovernedInteractionBundle(input);
  return {
    ...structuredClone(bundle),
    schemaVersion: 'governed_interaction_bundle.v0.3',
    actions: bundle.actions as GovernedInteractionDecisionV0_3[],
  };
}

export function evaluateGovernedInteractionCompatibility(
  input: unknown,
  host: GovernedInteractionHostContract,
): GovernedInteractionCompatibilityDecisionV0_2 {
  const bundle = parseGovernedInteractionBundle(input);
  const requiredCapabilities = [...bundle.capabilities].sort();
  const requiredOperations = [
    ...new Set(
      bundle.surfaces.flatMap((surface) =>
        surface.operations.map((operation) => operation.kind),
      ),
    ),
  ].sort();
  const errors: GovernedInteractionCompatibilityDecisionV0_2['errors'] = [];
  const supportedSchemaVersions = host.schemaVersions ?? ['governed_interaction_bundle.v0.1'];

  if (host.language !== bundle.language) {
    errors.push({ code: 'UNSUPPORTED_LANGUAGE', value: bundle.language });
  }
  if (!supportedSchemaVersions.includes(bundle.schemaVersion)) {
    errors.push({ code: 'UNSUPPORTED_SCHEMA_VERSION', value: bundle.schemaVersion });
  }
  if (!host.runtimeVersions.includes(bundle.runtimeVersion)) {
    errors.push({ code: 'UNSUPPORTED_RUNTIME_VERSION', value: bundle.runtimeVersion });
  }
  const expectedDefinitionHash = host.definitionHashes?.[bundle.workflowId];
  if (expectedDefinitionHash && expectedDefinitionHash !== bundle.definitionHash) {
    errors.push({ code: 'DEFINITION_HASH_MISMATCH', value: bundle.definitionHash });
  }
  for (const capability of requiredCapabilities) {
    if (!host.capabilities.includes(capability)) {
      errors.push({ code: 'UNSUPPORTED_CAPABILITY', value: capability });
    }
  }
  for (const operation of requiredOperations) {
    if (!host.operations.includes(operation)) {
      errors.push({ code: 'UNSUPPORTED_OPERATION', value: operation });
    }
  }

  return {
    schemaVersion: 'governed_interaction_compatibility.v0.2',
    compatible: errors.length === 0,
    hostId: host.hostId,
    language: bundle.language,
    runtimeVersion: bundle.runtimeVersion,
    requiredCapabilities,
    requiredOperations,
    errors,
  };
}
