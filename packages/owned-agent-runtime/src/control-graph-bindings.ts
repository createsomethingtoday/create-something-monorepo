import type { RuntimeDigest } from '@createsomething/workflow-runtime';
import type { ControlScope } from './control.js';

export interface ControlGraphBindingRequest {
  readonly scope: Readonly<ControlScope>;
  readonly workflowId: string;
  readonly workflowVersion: string;
  readonly runtimeManifestSha256: RuntimeDigest;
  readonly artifactManifestSha256: RuntimeDigest;
  readonly buildReleaseId: string;
  readonly contractSha256: RuntimeDigest;
  readonly runtimePolicySha256: RuntimeDigest;
}

/** A fixed host declaration, not proof of source state, identity, or permission. */
export interface ControlGraphBinding extends ControlGraphBindingRequest {
  readonly schema: 'create-something/control-graph-binding@1';
  readonly linearIssueId: string;
  readonly linearIdentifier: string;
  readonly substrateNodeId: string;
  readonly stepOwners: ReadonlyArray<
    Readonly<{
      stepId: string;
      actionId: string;
      ownerId: string;
    }>
  >;
}

/** Sources and registrations belong to host composition, never request JSON. */
export interface ControlGraphBindingAuthority {
  find(input: ControlGraphBindingRequest): Promise<ControlGraphBinding | undefined>;
}

const REQUEST_KEYS = [
  'scope',
  'workflowId',
  'workflowVersion',
  'runtimeManifestSha256',
  'artifactManifestSha256',
  'buildReleaseId',
  'contractSha256',
  'runtimePolicySha256'
] as const;
const BINDING_KEYS = [
  ...REQUEST_KEYS,
  'schema',
  'linearIssueId',
  'linearIdentifier',
  'substrateNodeId',
  'stepOwners'
] as const;
const HASH_KEYS = [
  'runtimeManifestSha256',
  'artifactManifestSha256',
  'contractSha256',
  'runtimePolicySha256'
] as const;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

function exact(
  value: unknown,
  keys: readonly string[],
  label: string
): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new TypeError(`${label} has unknown or missing fields`);
  }
}

function text(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 256) {
    throw new TypeError(`${label} must be bounded nonempty canonical text`);
  }
}

function identity(input: unknown, isBinding = false): asserts input is ControlGraphBindingRequest {
  exact(input, isBinding ? BINDING_KEYS : REQUEST_KEYS, 'Control graph binding');
  exact(input.scope, ['accountId', 'tenantId', 'workspaceAccountId'], 'Control graph scope');
  for (const [key, value] of Object.entries(input.scope)) text(value, key);
  for (const key of ['workflowId', 'workflowVersion', 'buildReleaseId'] as const)
    text(input[key], key);
  for (const key of HASH_KEYS) {
    if (typeof input[key] !== 'string' || !SHA256.test(input[key] as string)) {
      throw new TypeError(`${key} must be a lowercase sha256 digest`);
    }
  }
}

function requestKey(input: ControlGraphBindingRequest): string {
  return JSON.stringify([
    input.scope.accountId,
    input.scope.tenantId,
    input.scope.workspaceAccountId,
    input.workflowId,
    input.workflowVersion,
    input.runtimeManifestSha256,
    input.artifactManifestSha256,
    input.buildReleaseId,
    input.contractSha256,
    input.runtimePolicySha256
  ]);
}

function registration(value: unknown): ControlGraphBinding {
  identity(value, true);
  const record = value as ControlGraphBinding;
  if (record.schema !== 'create-something/control-graph-binding@1') {
    throw new TypeError('Unknown Control graph binding schema');
  }
  text(record.linearIssueId, 'linearIssueId');
  text(record.linearIdentifier, 'linearIdentifier');
  text(record.substrateNodeId, 'substrateNodeId');
  if (!UUID.test(record.linearIssueId))
    throw new TypeError('linearIssueId must be a canonical UUID');
  if (!/^[A-Z][A-Z0-9]+-[1-9][0-9]*$/.test(record.linearIdentifier)) {
    throw new TypeError('linearIdentifier must be a canonical issue identifier');
  }
  if (!/^substrate:[A-Za-z0-9._:/-]+$/.test(record.substrateNodeId)) {
    throw new TypeError('substrateNodeId must be a canonical Substrate source ID');
  }
  if (
    !Array.isArray(record.stepOwners) ||
    record.stepOwners.length === 0 ||
    record.stepOwners.length > 256
  ) {
    throw new TypeError('stepOwners must contain between one and 256 records');
  }
  const steps = new Set<string>();
  for (const owner of record.stepOwners) {
    exact(owner, ['stepId', 'actionId', 'ownerId'], 'Control graph step owner');
    text(owner.stepId, 'stepId');
    text(owner.actionId, 'actionId');
    text(owner.ownerId, 'ownerId');
    if (steps.has(owner.stepId)) throw new TypeError('Duplicate Control graph step ID');
    steps.add(owner.stepId);
  }
  // Reconstruct in a fixed order for equivalent registration deduplication.
  return Object.freeze({
    schema: record.schema,
    scope: Object.freeze({
      accountId: record.scope.accountId,
      tenantId: record.scope.tenantId,
      workspaceAccountId: record.scope.workspaceAccountId
    }),
    workflowId: record.workflowId,
    workflowVersion: record.workflowVersion,
    runtimeManifestSha256: record.runtimeManifestSha256,
    artifactManifestSha256: record.artifactManifestSha256,
    buildReleaseId: record.buildReleaseId,
    contractSha256: record.contractSha256,
    runtimePolicySha256: record.runtimePolicySha256,
    linearIssueId: record.linearIssueId,
    linearIdentifier: record.linearIdentifier,
    substrateNodeId: record.substrateNodeId,
    stepOwners: Object.freeze(
      [...record.stepOwners]
        .sort((left, right) =>
          left.stepId < right.stepId ? -1 : left.stepId > right.stepId ? 1 : 0
        )
        .map((owner) =>
          Object.freeze({ stepId: owner.stepId, actionId: owner.actionId, ownerId: owner.ownerId })
        )
    )
  });
}

/** Immutable, bounded host registrations; no source lookup, persistence or command port. */
export class RegisteredControlGraphBindings implements ControlGraphBindingAuthority {
  private readonly records = new Map<string, ControlGraphBinding>();

  constructor(values: readonly ControlGraphBinding[]) {
    if (!Array.isArray(values) || values.length > 256) {
      throw new TypeError('Control graph registrations must be an array of at most 256 records');
    }
    for (const input of structuredClone(values)) {
      const record = registration(input);
      const key = requestKey(record);
      const existing = this.records.get(key);
      if (existing && JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new TypeError('Conflicting Control graph binding identity');
      }
      this.records.set(key, record);
    }
  }

  async find(input: ControlGraphBindingRequest): Promise<ControlGraphBinding | undefined> {
    identity(input);
    return this.records.get(requestKey(input));
  }
}
