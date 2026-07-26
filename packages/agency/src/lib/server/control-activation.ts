import type { AgencyEntitlementSnapshot } from './mcp-entitlements.js';
import type { CustomerMapScope } from './customer-map-workspace.js';
import type { BuildReleaseInspection } from '@create-something/delivery-schema/build-release';

export const CONTROL_ACTIVATION_API_OPERATIONS = Object.freeze([
  'get',
  'list',
  'activate',
  'supersede',
  'suspend',
  'rollback',
  'propose_change',
  'list_projection_events',
  'mark_projection_published'
] as const);

// API and MCP adapters must consume this same command contract. Keeping the
// second export explicit makes accidental transport drift visible in tests.
export const CONTROL_ACTIVATION_MCP_OPERATIONS = Object.freeze([
  ...CONTROL_ACTIVATION_API_OPERATIONS
] as const);

export type ControlActivationActorRole = 'agency_operator' | 'account_owner' | 'account_reader';
export type ControlActivationStatus = 'active' | 'suspended' | 'superseded';
export type ControlActivationKind = 'initial' | 'supersession' | 'rollback';

export interface ControlEntitlementEvidence {
  schema: 'create-something/control-entitlement-snapshot@1';
  source: 'agency_mcp_entitlements';
  accountId: string;
  tenantId: string;
  workspaceAccountId: string;
  capturedAt: string;
  allowed: boolean;
  reason: string;
  snapshot: AgencyEntitlementSnapshot;
}

export interface ControlActivationActor {
  subject: string;
  role: ControlActivationActorRole;
  entitlement: ControlEntitlementEvidence;
}

export interface ControlActivationSource {
  mapId: string;
  mapVersionId: string;
  mapVersion: number;
  mapCanvasSha256: string;
  handoffId: string;
  handoffReceiptSha256: string;
  buildReleaseId: string;
  buildManifestSha256: string;
  buildArtifactSetSha256: string;
  buildAcceptanceReceiptId: string;
  buildAcceptanceReceiptSha256: string;
  buildAcceptanceStatus: 'accepted' | 'rejected';
}

export interface ControlVerifiedBuildEvidence extends ControlActivationSource {
  id: string;
  accountId: string;
  tenantId: string;
  workspaceAccountId: string;
  buildAcceptanceStatus: 'accepted';
  verifiedBy: string;
  verifiedAt: string;
}

export interface ControlActivationPolicy {
  version: string;
  sha256: string;
  allowedTools: string[];
  allowedResources: string[];
}

export interface ControlActivationRecord extends Omit<
  ControlActivationSource,
  'buildAcceptanceStatus'
> {
  id: string;
  activationVersion: number;
  accountId: string;
  tenantId: string;
  workspaceAccountId: string;
  buildAcceptanceStatus: 'accepted';
  policyVersion: string;
  policySha256: string;
  allowedTools: string[];
  allowedResources: string[];
  contractSha256: string;
  entitlementSnapshot: ControlEntitlementEvidence;
  entitlementSnapshotSha256: string;
  actorSubject: string;
  actorRole: ControlActivationActorRole;
  status: ControlActivationStatus;
  activationKind: ControlActivationKind;
  predecessorActivationId: string | null;
  rollbackTargetActivationId: string | null;
  idempotencyKey: string;
  commandSha256: string;
  activatedAt: string;
  suspendedAt: string | null;
  supersededAt: string | null;
  createdAt: string;
}

export type ControlProjectionEventType =
  | 'activated'
  | 'superseded'
  | 'suspended'
  | 'rolled_back'
  | 'change_proposed';

export interface ControlProjectionEvent {
  id: string;
  activationId: string;
  accountId: string;
  tenantId: string;
  workspaceAccountId: string;
  eventType: ControlProjectionEventType;
  eventVersion: number;
  payload: Record<string, unknown>;
  payloadSha256: string;
  commandId: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface ControlChangeReference {
  id: string;
  activationId: string;
  accountId: string;
  tenantId: string;
  workspaceAccountId: string;
  kind: 'runtime_drift' | 'incident';
  externalReference: string;
  target: 'map_revision' | 'build_change_request';
  status: 'proposed';
  createdBy: string;
  commandId: string;
  createdAt: string;
}

interface ControlCommandIdentity {
  commandId: string;
  idempotencyKey: string;
  commandSha256: string;
}

export interface ControlCreateVersionCommand extends ControlCommandIdentity {
  type: 'create_version';
  activationKind: ControlActivationKind;
  predecessorActivationId: string | null;
  record: ControlActivationRecord;
  event: ControlProjectionEvent;
}

export interface ControlSuspendCommand extends ControlCommandIdentity {
  type: 'suspend';
  activationId: string;
  suspendedAt: string;
  reason: string;
  actorSubject: string;
  actorRole: ControlActivationActorRole;
  event: ControlProjectionEvent;
}

export interface ControlProposeChangeCommand extends ControlCommandIdentity {
  type: 'propose_change';
  reference: ControlChangeReference;
  event: ControlProjectionEvent;
}

export type ControlActivationCommand =
  | ControlCreateVersionCommand
  | ControlSuspendCommand
  | ControlProposeChangeCommand;

export interface ControlActivationMutationResult {
  replayed: boolean;
  activation: ControlActivationRecord;
  event: ControlProjectionEvent;
  changeReference: ControlChangeReference | null;
}

export interface ControlActivationRepository {
  recordAcceptedBuildEvidence(
    scope: CustomerMapScope,
    evidence: ControlVerifiedBuildEvidence
  ): Promise<void>;
  verifyAcceptedSource(scope: CustomerMapScope, source: ControlActivationSource): Promise<boolean>;
  apply(
    scope: CustomerMapScope,
    command: ControlActivationCommand
  ): Promise<ControlActivationMutationResult>;
  find(scope: CustomerMapScope, activationId: string): Promise<ControlActivationRecord | null>;
  list(scope: CustomerMapScope): Promise<ControlActivationRecord[]>;
  listProjectionEvents(scope: CustomerMapScope): Promise<ControlProjectionEvent[]>;
  markProjectionPublished(
    scope: CustomerMapScope,
    eventId: string,
    publishedAt: string
  ): Promise<ControlProjectionEvent | null>;
}

interface ControlActivationLedgerOptions {
  repository: ControlActivationRepository;
  clock?: () => string;
  id?: () => string;
  digest?: (value: string) => Promise<string>;
}

export class ControlActivationAccessError extends Error {
  readonly code = 'control_activation_access_denied';

  constructor(message = 'Control activation not found in this workspace') {
    super(message);
    this.name = 'ControlActivationAccessError';
  }
}

export class ControlActivationConflictError extends Error {
  readonly code = 'control_activation_conflict';

  constructor(message: string) {
    super(message);
    this.name = 'ControlActivationConflictError';
  }
}

export class ControlActivationValidationError extends Error {
  readonly code = 'control_activation_invalid';

  constructor(message: string) {
    super(message);
    this.name = 'ControlActivationValidationError';
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function requireText(value: string, label: string, max = 240): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) throw new ControlActivationValidationError(`${label} is required`);
  if (normalized.length > max)
    throw new ControlActivationValidationError(`${label} must be ${max} characters or fewer`);
  return normalized;
}

function requireHash(value: string, label: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new ControlActivationValidationError(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function requireTimestamp(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new ControlActivationValidationError(`${label} must be a UTC timestamp`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed))
    throw new ControlActivationValidationError(`${label} must be a valid timestamp`);
  const canonical = new Date(parsed).toISOString();
  if (canonical !== (value.includes('.') ? value : value.replace('Z', '.000Z'))) {
    throw new ControlActivationValidationError(`${label} must be a real calendar timestamp`);
  }
  return value;
}

function normalizeSet(values: string[], label: string): string[] {
  if (!Array.isArray(values))
    throw new ControlActivationValidationError(`${label} must be an array`);
  return [...new Set(values.map((value) => requireText(value, label, 300)))].sort();
}

function authorize(
  scope: CustomerMapScope,
  actor: ControlActivationActor,
  options: { write: boolean }
): void {
  for (const [key, value] of Object.entries(scope)) requireText(value, `scope.${key}`);
  if (actor.subject !== scope.authSubject)
    throw new ControlActivationAccessError(
      'First-party actor does not match the authenticated scope'
    );
  if (options.write && actor.role !== 'agency_operator' && actor.role !== 'account_owner') {
    throw new ControlActivationAccessError(
      'Control activation writes require an operator or account owner role'
    );
  }
  const evidence = actor.entitlement;
  if (
    evidence.accountId !== scope.accountId ||
    evidence.tenantId !== scope.tenantId ||
    evidence.workspaceAccountId !== scope.workspaceAccountId
  ) {
    throw new ControlActivationAccessError(
      'Entitlement snapshot belongs to a different account or workspace'
    );
  }
  requireTimestamp(evidence.capturedAt, 'entitlement capturedAt');
  const snapshot = evidence.snapshot;
  const checks = [
    snapshot.managed_bearer_allowed,
    snapshot.org_membership_active,
    snapshot.service_entitled,
    snapshot.policy_accepted,
    snapshot.contract_active,
    snapshot.billing_active
  ];
  if (!evidence.allowed || evidence.reason !== 'allowed' || checks.some((check) => !check)) {
    throw new ControlActivationAccessError('Control entitlement is not active');
  }
  if (snapshot.service_tier === 'mcp_only') {
    throw new ControlActivationAccessError('MCP-only entitlement cannot activate Control');
  }
}

function normalizeSource(source: ControlActivationSource): ControlActivationSource {
  if (source.buildAcceptanceStatus !== 'accepted') {
    throw new ControlActivationValidationError(
      'Only an accepted Build release can activate Control'
    );
  }
  if (!Number.isInteger(source.mapVersion) || source.mapVersion < 1) {
    throw new ControlActivationValidationError('Map version must be a positive integer');
  }
  return {
    mapId: requireText(source.mapId, 'Map ID'),
    mapVersionId: requireText(source.mapVersionId, 'Map version ID'),
    mapVersion: source.mapVersion,
    mapCanvasSha256: requireHash(source.mapCanvasSha256, 'Map canvas hash'),
    handoffId: requireText(source.handoffId, 'Handoff ID'),
    handoffReceiptSha256: requireHash(source.handoffReceiptSha256, 'Handoff receipt hash'),
    buildReleaseId: requireText(source.buildReleaseId, 'Build release ID'),
    buildManifestSha256: requireHash(source.buildManifestSha256, 'Build manifest hash'),
    buildArtifactSetSha256: requireHash(source.buildArtifactSetSha256, 'Build artifact-set hash'),
    buildAcceptanceReceiptId: requireText(
      source.buildAcceptanceReceiptId,
      'Build acceptance receipt ID'
    ),
    buildAcceptanceReceiptSha256: requireHash(
      source.buildAcceptanceReceiptSha256,
      'Build acceptance receipt hash'
    ),
    buildAcceptanceStatus: 'accepted'
  };
}

export function controlActivationSourceFromBuildInspection(
  inspection: BuildReleaseInspection,
  input: { manifestSha256: string; mapVersionId: string; mapCanvasSha256: string }
): ControlActivationSource {
  if (
    !inspection.evidenceValid ||
    !inspection.releaseReady ||
    inspection.issues.length > 0 ||
    !inspection.manifest ||
    !inspection.handoffReceipt ||
    !inspection.acceptanceReceipt
  ) {
    throw new ControlActivationValidationError(
      'Control activation requires a verified, ready Build release package'
    );
  }
  const { manifest, handoffReceipt, acceptanceReceipt } = inspection;
  if (handoffReceipt.status !== 'accepted' || acceptanceReceipt.status !== 'accepted') {
    throw new ControlActivationValidationError(
      'Control activation requires accepted Map and Build receipts'
    );
  }
  return normalizeSource({
    mapId: handoffReceipt.mapId,
    mapVersionId: input.mapVersionId,
    mapVersion: handoffReceipt.mapVersion,
    mapCanvasSha256: input.mapCanvasSha256,
    handoffId: handoffReceipt.handoffId,
    handoffReceiptSha256: manifest.handoff.receiptSha256,
    buildReleaseId: manifest.releaseId,
    buildManifestSha256: input.manifestSha256,
    buildArtifactSetSha256: acceptanceReceipt.artifactSetSha256,
    buildAcceptanceReceiptId: acceptanceReceipt.receiptId,
    buildAcceptanceReceiptSha256: manifest.acceptance.receiptSha256,
    buildAcceptanceStatus: acceptanceReceipt.status
  });
}

function normalizePolicy(policy: ControlActivationPolicy): ControlActivationPolicy {
  return {
    version: requireText(policy.version, 'Policy version'),
    sha256: requireHash(policy.sha256, 'Policy hash'),
    allowedTools: normalizeSet(policy.allowedTools, 'Allowed tool'),
    allowedResources: normalizeSet(policy.allowedResources, 'Allowed resource')
  };
}

function eventPayload(record: ControlActivationRecord): Record<string, unknown> {
  return {
    schema: 'create-something/control-activation-projection@1',
    activationId: record.id,
    activationVersion: record.activationVersion,
    activationKind: record.activationKind,
    status: record.status,
    accountId: record.accountId,
    tenantId: record.tenantId,
    workspaceAccountId: record.workspaceAccountId,
    mapId: record.mapId,
    mapVersionId: record.mapVersionId,
    mapVersion: record.mapVersion,
    mapCanvasSha256: record.mapCanvasSha256,
    handoffId: record.handoffId,
    handoffReceiptSha256: record.handoffReceiptSha256,
    buildReleaseId: record.buildReleaseId,
    buildManifestSha256: record.buildManifestSha256,
    buildArtifactSetSha256: record.buildArtifactSetSha256,
    buildAcceptanceReceiptId: record.buildAcceptanceReceiptId,
    buildAcceptanceReceiptSha256: record.buildAcceptanceReceiptSha256,
    buildAcceptanceStatus: record.buildAcceptanceStatus,
    policyVersion: record.policyVersion,
    policySha256: record.policySha256,
    allowedTools: record.allowedTools,
    allowedResources: record.allowedResources,
    contractSha256: record.contractSha256,
    entitlementSnapshotSha256: record.entitlementSnapshotSha256,
    predecessorActivationId: record.predecessorActivationId,
    rollbackTargetActivationId: record.rollbackTargetActivationId
  };
}

export function createControlActivationLedger(options: ControlActivationLedgerOptions) {
  const now = options.clock ?? (() => new Date().toISOString());
  const newId = options.id ?? (() => crypto.randomUUID());
  const digest = options.digest ?? sha256;

  async function requireActivation(
    scope: CustomerMapScope,
    actor: ControlActivationActor,
    activationId: string,
    write = false
  ): Promise<ControlActivationRecord> {
    authorize(scope, actor, { write });
    const activation = await options.repository.find(
      scope,
      requireText(activationId, 'Activation ID')
    );
    if (!activation) throw new ControlActivationAccessError();
    return activation;
  }

  async function buildRecord(input: {
    scope: CustomerMapScope;
    actor: ControlActivationActor;
    idempotencyKey: string;
    source: ControlActivationSource;
    policy: ControlActivationPolicy;
    activationVersion: number;
    activationKind: ControlActivationKind;
    predecessorActivationId: string | null;
    rollbackTargetActivationId: string | null;
    at: string;
    commandSha256: string;
  }): Promise<ControlActivationRecord> {
    const source = normalizeSource(input.source);
    const policy = normalizePolicy(input.policy);
    const entitlementSnapshotSha256 = await digest(canonicalJson(input.actor.entitlement));
    const contractSha256 = await digest(canonicalJson({ source, policy }));
    return {
      id: newId(),
      activationVersion: input.activationVersion,
      accountId: input.scope.accountId,
      tenantId: input.scope.tenantId,
      workspaceAccountId: input.scope.workspaceAccountId,
      mapId: source.mapId,
      mapVersionId: source.mapVersionId,
      mapVersion: source.mapVersion,
      mapCanvasSha256: source.mapCanvasSha256,
      handoffId: source.handoffId,
      handoffReceiptSha256: source.handoffReceiptSha256,
      buildReleaseId: source.buildReleaseId,
      buildManifestSha256: source.buildManifestSha256,
      buildArtifactSetSha256: source.buildArtifactSetSha256,
      buildAcceptanceReceiptId: source.buildAcceptanceReceiptId,
      buildAcceptanceReceiptSha256: source.buildAcceptanceReceiptSha256,
      buildAcceptanceStatus: 'accepted',
      policyVersion: policy.version,
      policySha256: policy.sha256,
      allowedTools: policy.allowedTools,
      allowedResources: policy.allowedResources,
      contractSha256,
      entitlementSnapshot: structuredClone(input.actor.entitlement),
      entitlementSnapshotSha256,
      actorSubject: input.actor.subject,
      actorRole: input.actor.role,
      status: 'active',
      activationKind: input.activationKind,
      predecessorActivationId: input.predecessorActivationId,
      rollbackTargetActivationId: input.rollbackTargetActivationId,
      idempotencyKey: input.idempotencyKey,
      commandSha256: input.commandSha256,
      activatedAt: input.at,
      suspendedAt: null,
      supersededAt: null,
      createdAt: input.at
    };
  }

  async function createVersion(input: {
    scope: CustomerMapScope;
    actor: ControlActivationActor;
    idempotencyKey: string;
    source: ControlActivationSource;
    policy: ControlActivationPolicy;
    activationVersion: number;
    activationKind: ControlActivationKind;
    predecessorActivationId: string | null;
    rollbackTargetActivationId: string | null;
  }): Promise<ControlActivationMutationResult> {
    authorize(input.scope, input.actor, { write: true });
    const idempotencyKey = requireText(input.idempotencyKey, 'Idempotency key', 180);
    const timestamp = requireTimestamp(now(), 'Activation time');
    const normalizedSource = normalizeSource(input.source);
    const normalizedPolicy = normalizePolicy(input.policy);
    if (!(await options.repository.verifyAcceptedSource(input.scope, normalizedSource))) {
      throw new ControlActivationAccessError(
        'Exact accepted Map and verified Build evidence could not be matched'
      );
    }
    const commandSha256 = await digest(
      canonicalJson({
        operation: input.activationKind,
        scope: input.scope,
        actor: { subject: input.actor.subject, role: input.actor.role },
        idempotencyKey,
        source: normalizedSource,
        policy: normalizedPolicy,
        predecessorActivationId: input.predecessorActivationId,
        rollbackTargetActivationId: input.rollbackTargetActivationId
      })
    );
    const commandId = newId();
    const record = await buildRecord({
      ...input,
      idempotencyKey,
      source: normalizedSource,
      policy: normalizedPolicy,
      at: timestamp,
      commandSha256
    });
    const payload = eventPayload(record);
    const eventType: ControlProjectionEventType =
      input.activationKind === 'initial'
        ? 'activated'
        : input.activationKind === 'rollback'
          ? 'rolled_back'
          : 'superseded';
    const event: ControlProjectionEvent = {
      id: newId(),
      activationId: record.id,
      accountId: input.scope.accountId,
      tenantId: input.scope.tenantId,
      workspaceAccountId: input.scope.workspaceAccountId,
      eventType,
      eventVersion: record.activationVersion,
      payload,
      payloadSha256: await digest(canonicalJson(payload)),
      commandId,
      createdAt: timestamp,
      publishedAt: null
    };
    return options.repository.apply(input.scope, {
      type: 'create_version',
      commandId,
      idempotencyKey,
      commandSha256,
      activationKind: input.activationKind,
      predecessorActivationId: input.predecessorActivationId,
      record,
      event
    });
  }

  return {
    async registerBuildEvidence(
      scope: CustomerMapScope,
      actor: ControlActivationActor,
      input: {
        inspection: BuildReleaseInspection;
        manifestSha256: string;
        mapVersionId: string;
        mapCanvasSha256: string;
      }
    ) {
      authorize(scope, actor, { write: true });
      if (actor.role !== 'agency_operator') {
        throw new ControlActivationAccessError(
          'Only the Build verification operator can register release evidence'
        );
      }
      const source = controlActivationSourceFromBuildInspection(input.inspection, input);
      if (
        input.inspection.handoffReceipt?.accountId !== scope.accountId ||
        input.inspection.handoffReceipt.workspaceAccountId !== scope.workspaceAccountId ||
        input.inspection.acceptanceReceipt?.accountId !== scope.accountId ||
        input.inspection.acceptanceReceipt.workspaceAccountId !== scope.workspaceAccountId
      ) {
        throw new ControlActivationAccessError(
          'Verified Build package belongs to a different account or workspace'
        );
      }
      const evidence: ControlVerifiedBuildEvidence = {
        id: newId(),
        accountId: scope.accountId,
        tenantId: scope.tenantId,
        workspaceAccountId: scope.workspaceAccountId,
        ...source,
        buildAcceptanceStatus: 'accepted',
        verifiedBy: actor.subject,
        verifiedAt: requireTimestamp(now(), 'Build verification time')
      };
      await options.repository.recordAcceptedBuildEvidence(scope, evidence);
      return evidence;
    },

    async activate(
      scope: CustomerMapScope,
      actor: ControlActivationActor,
      input: {
        idempotencyKey: string;
        source: ControlActivationSource;
        policy: ControlActivationPolicy;
      }
    ) {
      return createVersion({
        scope,
        actor,
        ...input,
        activationVersion: 1,
        activationKind: 'initial',
        predecessorActivationId: null,
        rollbackTargetActivationId: null
      });
    },

    async supersede(
      scope: CustomerMapScope,
      actor: ControlActivationActor,
      input: {
        idempotencyKey: string;
        predecessorActivationId: string;
        source: ControlActivationSource;
        policy: ControlActivationPolicy;
      }
    ) {
      const predecessor = await requireActivation(
        scope,
        actor,
        input.predecessorActivationId,
        true
      );
      return createVersion({
        scope,
        actor,
        ...input,
        predecessorActivationId: predecessor.id,
        activationVersion: predecessor.activationVersion + 1,
        activationKind: 'supersession',
        rollbackTargetActivationId: null
      });
    },

    async suspend(
      scope: CustomerMapScope,
      actor: ControlActivationActor,
      input: { idempotencyKey: string; activationId: string; reason: string }
    ) {
      const activation = await requireActivation(scope, actor, input.activationId, true);
      const idempotencyKey = requireText(input.idempotencyKey, 'Idempotency key', 180);
      const reason = requireText(input.reason, 'Suspension reason');
      const timestamp = requireTimestamp(now(), 'Suspension time');
      const commandSha256 = await digest(
        canonicalJson({
          operation: 'suspend',
          scope,
          actor: { subject: actor.subject, role: actor.role },
          idempotencyKey,
          activationId: activation.id,
          reason
        })
      );
      const commandId = newId();
      const payload = {
        schema: 'create-something/control-activation-projection@1',
        activationId: activation.id,
        activationVersion: activation.activationVersion,
        status: 'suspended',
        reason,
        contractSha256: activation.contractSha256
      };
      const event: ControlProjectionEvent = {
        id: newId(),
        activationId: activation.id,
        accountId: scope.accountId,
        tenantId: scope.tenantId,
        workspaceAccountId: scope.workspaceAccountId,
        eventType: 'suspended',
        eventVersion: activation.activationVersion,
        payload,
        payloadSha256: await digest(canonicalJson(payload)),
        commandId,
        createdAt: timestamp,
        publishedAt: null
      };
      return options.repository.apply(scope, {
        type: 'suspend',
        commandId,
        idempotencyKey,
        commandSha256,
        activationId: activation.id,
        suspendedAt: timestamp,
        reason,
        actorSubject: actor.subject,
        actorRole: actor.role,
        event
      });
    },

    async rollback(
      scope: CustomerMapScope,
      actor: ControlActivationActor,
      input: {
        idempotencyKey: string;
        predecessorActivationId: string;
        rollbackTargetActivationId: string;
      }
    ) {
      const [predecessor, target] = await Promise.all([
        requireActivation(scope, actor, input.predecessorActivationId, true),
        requireActivation(scope, actor, input.rollbackTargetActivationId, true)
      ]);
      if (target.activationVersion >= predecessor.activationVersion) {
        throw new ControlActivationValidationError(
          'Rollback target must be an earlier activation version'
        );
      }
      return createVersion({
        scope,
        actor,
        idempotencyKey: input.idempotencyKey,
        activationVersion: predecessor.activationVersion + 1,
        activationKind: 'rollback',
        predecessorActivationId: predecessor.id,
        rollbackTargetActivationId: target.id,
        source: {
          mapId: target.mapId,
          mapVersionId: target.mapVersionId,
          mapVersion: target.mapVersion,
          mapCanvasSha256: target.mapCanvasSha256,
          handoffId: target.handoffId,
          handoffReceiptSha256: target.handoffReceiptSha256,
          buildReleaseId: target.buildReleaseId,
          buildManifestSha256: target.buildManifestSha256,
          buildArtifactSetSha256: target.buildArtifactSetSha256,
          buildAcceptanceReceiptId: target.buildAcceptanceReceiptId,
          buildAcceptanceReceiptSha256: target.buildAcceptanceReceiptSha256,
          buildAcceptanceStatus: 'accepted'
        },
        policy: {
          version: target.policyVersion,
          sha256: target.policySha256,
          allowedTools: target.allowedTools,
          allowedResources: target.allowedResources
        }
      });
    },

    async proposeChange(
      scope: CustomerMapScope,
      actor: ControlActivationActor,
      input: {
        idempotencyKey: string;
        activationId: string;
        kind: 'runtime_drift' | 'incident';
        externalReference: string;
        target: 'map_revision' | 'build_change_request';
      }
    ) {
      const activation = await requireActivation(scope, actor, input.activationId, true);
      const idempotencyKey = requireText(input.idempotencyKey, 'Idempotency key', 180);
      const externalReference = requireText(input.externalReference, 'External reference');
      const timestamp = requireTimestamp(now(), 'Change proposal time');
      const commandSha256 = await digest(
        canonicalJson({
          operation: 'propose_change',
          scope,
          actor: { subject: actor.subject, role: actor.role },
          idempotencyKey,
          activationId: activation.id,
          kind: input.kind,
          externalReference,
          target: input.target
        })
      );
      const commandId = newId();
      const reference: ControlChangeReference = {
        id: newId(),
        activationId: activation.id,
        accountId: scope.accountId,
        tenantId: scope.tenantId,
        workspaceAccountId: scope.workspaceAccountId,
        kind: input.kind,
        externalReference,
        target: input.target,
        status: 'proposed',
        createdBy: actor.subject,
        commandId,
        createdAt: timestamp
      };
      const payload = {
        schema: 'create-something/control-change-projection@1',
        activationId: activation.id,
        contractSha256: activation.contractSha256,
        referenceId: reference.id,
        kind: reference.kind,
        externalReference,
        target: reference.target,
        status: reference.status
      };
      const event: ControlProjectionEvent = {
        id: newId(),
        activationId: activation.id,
        accountId: scope.accountId,
        tenantId: scope.tenantId,
        workspaceAccountId: scope.workspaceAccountId,
        eventType: 'change_proposed',
        eventVersion: activation.activationVersion,
        payload,
        payloadSha256: await digest(canonicalJson(payload)),
        commandId,
        createdAt: timestamp,
        publishedAt: null
      };
      return options.repository.apply(scope, {
        type: 'propose_change',
        commandId,
        idempotencyKey,
        commandSha256,
        reference,
        event
      });
    },

    async get(scope: CustomerMapScope, actor: ControlActivationActor, activationId: string) {
      return requireActivation(scope, actor, activationId);
    },

    async list(scope: CustomerMapScope, actor: ControlActivationActor) {
      authorize(scope, actor, { write: false });
      return options.repository.list(scope);
    },

    async listProjectionEvents(scope: CustomerMapScope, actor: ControlActivationActor) {
      authorize(scope, actor, { write: false });
      return options.repository.listProjectionEvents(scope);
    },

    async markProjectionPublished(
      scope: CustomerMapScope,
      actor: ControlActivationActor,
      eventId: string
    ) {
      authorize(scope, actor, { write: true });
      if (actor.role !== 'agency_operator') {
        throw new ControlActivationAccessError(
          'Only the Control projection operator can publish runtime receipts'
        );
      }
      const published = await options.repository.markProjectionPublished(
        scope,
        requireText(eventId, 'Projection event ID'),
        requireTimestamp(now(), 'Projection publish time')
      );
      if (!published)
        throw new ControlActivationAccessError('Projection event not found in this workspace');
      return published;
    }
  };
}

export type ControlActivationTransportRequest =
  | { operation: 'get'; activationId: string }
  | { operation: 'list' }
  | {
      operation: 'activate';
      input: {
        idempotencyKey: string;
        source: ControlActivationSource;
        policy: ControlActivationPolicy;
      };
    }
  | {
      operation: 'supersede';
      input: {
        idempotencyKey: string;
        predecessorActivationId: string;
        source: ControlActivationSource;
        policy: ControlActivationPolicy;
      };
    }
  | {
      operation: 'suspend';
      input: { idempotencyKey: string; activationId: string; reason: string };
    }
  | {
      operation: 'rollback';
      input: {
        idempotencyKey: string;
        predecessorActivationId: string;
        rollbackTargetActivationId: string;
      };
    }
  | {
      operation: 'propose_change';
      input: {
        idempotencyKey: string;
        activationId: string;
        kind: 'runtime_drift' | 'incident';
        externalReference: string;
        target: 'map_revision' | 'build_change_request';
      };
    }
  | { operation: 'list_projection_events' }
  | { operation: 'mark_projection_published'; eventId: string };

export function createControlActivationTransportHandler(
  ledger: ReturnType<typeof createControlActivationLedger>
) {
  return async (
    context: { scope: CustomerMapScope; actor: ControlActivationActor },
    request: ControlActivationTransportRequest
  ): Promise<unknown> => {
    switch (request.operation) {
      case 'get':
        return ledger.get(context.scope, context.actor, request.activationId);
      case 'list':
        return ledger.list(context.scope, context.actor);
      case 'activate':
        return ledger.activate(context.scope, context.actor, request.input);
      case 'supersede':
        return ledger.supersede(context.scope, context.actor, request.input);
      case 'suspend':
        return ledger.suspend(context.scope, context.actor, request.input);
      case 'rollback':
        return ledger.rollback(context.scope, context.actor, request.input);
      case 'propose_change':
        return ledger.proposeChange(context.scope, context.actor, request.input);
      case 'list_projection_events':
        return ledger.listProjectionEvents(context.scope, context.actor);
      case 'mark_projection_published':
        return ledger.markProjectionPublished(context.scope, context.actor, request.eventId);
    }
  };
}

// Both transport packages adapt their wire format into this exact handler.
// Authorization remains in the ledger so neither adapter can weaken it.
export const createControlActivationApiHandler = createControlActivationTransportHandler;
export const createControlActivationMcpHandler = createControlActivationTransportHandler;

interface ControlActivationRow {
  id: string;
  activation_version: number;
  account_id: string;
  tenant_id: string;
  workspace_account_id: string;
  map_id: string;
  map_version_id: string;
  map_version: number;
  map_canvas_sha256: string;
  handoff_id: string;
  handoff_receipt_sha256: string;
  build_release_id: string;
  build_manifest_sha256: string;
  build_artifact_set_sha256: string;
  build_acceptance_receipt_id: string;
  build_acceptance_receipt_sha256: string;
  build_acceptance_status: 'accepted';
  policy_version: string;
  policy_sha256: string;
  allowed_tools_json: string;
  allowed_resources_json: string;
  contract_sha256: string;
  entitlement_snapshot_json: string;
  entitlement_snapshot_sha256: string;
  actor_subject: string;
  actor_role: ControlActivationActorRole;
  status: ControlActivationStatus;
  activation_kind: ControlActivationKind;
  predecessor_activation_id: string | null;
  rollback_target_activation_id: string | null;
  idempotency_key: string;
  command_sha256: string;
  activated_at: string;
  suspended_at: string | null;
  superseded_at: string | null;
  created_at: string;
}

interface ControlProjectionEventRow {
  id: string;
  activation_id: string;
  account_id: string;
  tenant_id: string;
  workspace_account_id: string;
  event_type: ControlProjectionEventType;
  event_version: number;
  payload_json: string;
  payload_sha256: string;
  command_id: string;
  created_at: string;
  published_at: string | null;
}

function fromActivationRow(row: ControlActivationRow): ControlActivationRecord {
  return {
    id: row.id,
    activationVersion: row.activation_version,
    accountId: row.account_id,
    tenantId: row.tenant_id,
    workspaceAccountId: row.workspace_account_id,
    mapId: row.map_id,
    mapVersionId: row.map_version_id,
    mapVersion: row.map_version,
    mapCanvasSha256: row.map_canvas_sha256,
    handoffId: row.handoff_id,
    handoffReceiptSha256: row.handoff_receipt_sha256,
    buildReleaseId: row.build_release_id,
    buildManifestSha256: row.build_manifest_sha256,
    buildArtifactSetSha256: row.build_artifact_set_sha256,
    buildAcceptanceReceiptId: row.build_acceptance_receipt_id,
    buildAcceptanceReceiptSha256: row.build_acceptance_receipt_sha256,
    buildAcceptanceStatus: row.build_acceptance_status,
    policyVersion: row.policy_version,
    policySha256: row.policy_sha256,
    allowedTools: JSON.parse(row.allowed_tools_json) as string[],
    allowedResources: JSON.parse(row.allowed_resources_json) as string[],
    contractSha256: row.contract_sha256,
    entitlementSnapshot: JSON.parse(row.entitlement_snapshot_json) as ControlEntitlementEvidence,
    entitlementSnapshotSha256: row.entitlement_snapshot_sha256,
    actorSubject: row.actor_subject,
    actorRole: row.actor_role,
    status: row.status,
    activationKind: row.activation_kind,
    predecessorActivationId: row.predecessor_activation_id,
    rollbackTargetActivationId: row.rollback_target_activation_id,
    idempotencyKey: row.idempotency_key,
    commandSha256: row.command_sha256,
    activatedAt: row.activated_at,
    suspendedAt: row.suspended_at,
    supersededAt: row.superseded_at,
    createdAt: row.created_at
  };
}

function fromEventRow(row: ControlProjectionEventRow): ControlProjectionEvent {
  return {
    id: row.id,
    activationId: row.activation_id,
    accountId: row.account_id,
    tenantId: row.tenant_id,
    workspaceAccountId: row.workspace_account_id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    payloadSha256: row.payload_sha256,
    commandId: row.command_id,
    createdAt: row.created_at,
    publishedAt: row.published_at
  };
}

function bindings(scope: CustomerMapScope): [string, string, string] {
  return [scope.accountId, scope.tenantId, scope.workspaceAccountId];
}

export function createD1ControlActivationRepository(db: D1Database): ControlActivationRepository {
  async function replay(
    scope: CustomerMapScope,
    command: ControlActivationCommand
  ): Promise<ControlActivationMutationResult | null> {
    const row = await db
      .prepare(
        `SELECT command_sha256, result_json FROM customer_control_activation_commands
				 WHERE account_id = ? AND tenant_id = ? AND workspace_account_id = ? AND idempotency_key = ?
				 LIMIT 1`
      )
      .bind(...bindings(scope), command.idempotencyKey)
      .first<{ command_sha256: string; result_json: string | null }>();
    if (!row) return null;
    if (row.command_sha256 !== command.commandSha256) {
      throw new ControlActivationConflictError(
        'Idempotency key was reused for a different Control command'
      );
    }
    if (!row.result_json)
      throw new ControlActivationConflictError('Control command is still pending');
    return { ...(JSON.parse(row.result_json) as ControlActivationMutationResult), replayed: true };
  }

  async function applyBatch(
    scope: CustomerMapScope,
    command: ControlActivationCommand,
    statements: D1PreparedStatement[],
    result: ControlActivationMutationResult
  ): Promise<ControlActivationMutationResult> {
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO customer_control_activation_commands
						 (id, account_id, tenant_id, workspace_account_id, idempotency_key, command_type, command_sha256, result_json, created_at)
						 VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`
          )
          .bind(
            command.commandId,
            ...bindings(scope),
            command.idempotencyKey,
            command.type,
            command.commandSha256,
            command.event.createdAt
          ),
        ...statements,
        db
          .prepare(
            `UPDATE customer_control_activation_commands SET result_json = ?
						 WHERE id = ? AND account_id = ? AND tenant_id = ? AND workspace_account_id = ?`
          )
          .bind(JSON.stringify(result), command.commandId, ...bindings(scope))
      ]);
      return result;
    } catch (cause) {
      const existing = await replay(scope, command);
      if (existing) return existing;
      const message = cause instanceof Error ? cause.message : String(cause);
      if (
        /Control activation requires verified accepted Map and Build evidence|foreign key constraint failed|not found/i.test(
          message
        )
      ) {
        throw new ControlActivationAccessError();
      }
      throw new ControlActivationConflictError(message);
    }
  }

  function insertEvent(event: ControlProjectionEvent): D1PreparedStatement {
    return db
      .prepare(
        `INSERT INTO customer_control_activation_outbox
				 (id, activation_id, account_id, tenant_id, workspace_account_id, event_type, event_version,
				  payload_json, payload_sha256, command_id, created_at, published_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
      )
      .bind(
        event.id,
        event.activationId,
        event.accountId,
        event.tenantId,
        event.workspaceAccountId,
        event.eventType,
        event.eventVersion,
        JSON.stringify(event.payload),
        event.payloadSha256,
        event.commandId,
        event.createdAt
      );
  }

  return {
    async recordAcceptedBuildEvidence(scope, evidence) {
      const mapSource = await db
        .prepare(
          `SELECT v.canvas_json
						 FROM customer_map_handoffs h
						 INNER JOIN customer_maps m ON m.id = h.map_id AND m.account_id = h.account_id
						 INNER JOIN customer_map_versions v
						   ON v.id = ? AND v.map_id = h.map_id AND v.account_id = h.account_id AND v.version = h.map_version
						 WHERE h.id = ? AND h.map_id = ? AND h.map_version = ? AND h.status = 'accepted'
						   AND h.resolved_at IS NOT NULL
						   AND m.account_id = ? AND m.tenant_id = ? AND m.workspace_account_id = ?
						 LIMIT 1`
        )
        .bind(
          evidence.mapVersionId,
          evidence.handoffId,
          evidence.mapId,
          evidence.mapVersion,
          ...bindings(scope)
        )
        .first<{ canvas_json: string }>();
      if (!mapSource || (await sha256(mapSource.canvas_json)) !== evidence.mapCanvasSha256) {
        throw new ControlActivationAccessError(
          'Verified Build evidence does not match the accepted Map source'
        );
      }
      try {
        await db
          .prepare(
            `INSERT INTO customer_control_build_evidence (
							 id, account_id, tenant_id, workspace_account_id,
							 map_id, map_version_id, map_version, map_canvas_sha256, handoff_id, handoff_receipt_sha256,
							 build_release_id, build_manifest_sha256, build_artifact_set_sha256,
							 build_acceptance_receipt_id, build_acceptance_receipt_sha256, build_acceptance_status,
							 verified_by, verified_at
							) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted', ?, ?)`
          )
          .bind(
            evidence.id,
            evidence.accountId,
            evidence.tenantId,
            evidence.workspaceAccountId,
            evidence.mapId,
            evidence.mapVersionId,
            evidence.mapVersion,
            evidence.mapCanvasSha256,
            evidence.handoffId,
            evidence.handoffReceiptSha256,
            evidence.buildReleaseId,
            evidence.buildManifestSha256,
            evidence.buildArtifactSetSha256,
            evidence.buildAcceptanceReceiptId,
            evidence.buildAcceptanceReceiptSha256,
            evidence.verifiedBy,
            evidence.verifiedAt
          )
          .run();
      } catch (cause) {
        const existing = await db
          .prepare(
            `SELECT * FROM customer_control_build_evidence
							 WHERE account_id = ? AND tenant_id = ? AND workspace_account_id = ? AND build_release_id = ?
							 LIMIT 1`
          )
          .bind(...bindings(scope), evidence.buildReleaseId)
          .first<Record<string, unknown>>();
        if (
          existing &&
          existing.map_id === evidence.mapId &&
          existing.map_version_id === evidence.mapVersionId &&
          existing.map_version === evidence.mapVersion &&
          existing.map_canvas_sha256 === evidence.mapCanvasSha256 &&
          existing.handoff_id === evidence.handoffId &&
          existing.handoff_receipt_sha256 === evidence.handoffReceiptSha256 &&
          existing.build_manifest_sha256 === evidence.buildManifestSha256 &&
          existing.build_artifact_set_sha256 === evidence.buildArtifactSetSha256 &&
          existing.build_acceptance_receipt_id === evidence.buildAcceptanceReceiptId &&
          existing.build_acceptance_receipt_sha256 === evidence.buildAcceptanceReceiptSha256
        )
          return;
        throw new ControlActivationConflictError(
          cause instanceof Error ? cause.message : String(cause)
        );
      }
    },

    async verifyAcceptedSource(scope, source) {
      const row = await db
        .prepare(
          `SELECT v.canvas_json
						 FROM customer_map_handoffs h
						 INNER JOIN customer_maps m ON m.id = h.map_id AND m.account_id = h.account_id
						 INNER JOIN customer_map_versions v
						   ON v.id = ? AND v.map_id = h.map_id AND v.account_id = h.account_id AND v.version = h.map_version
						 INNER JOIN customer_control_build_evidence evidence
						   ON evidence.account_id = m.account_id
						  AND evidence.tenant_id = m.tenant_id
						  AND evidence.workspace_account_id = m.workspace_account_id
						  AND evidence.map_id = h.map_id
						  AND evidence.map_version_id = v.id
						  AND evidence.map_version = h.map_version
						  AND evidence.map_canvas_sha256 = ?
						  AND evidence.handoff_id = h.id
						  AND evidence.handoff_receipt_sha256 = ?
						  AND evidence.build_release_id = ?
						  AND evidence.build_manifest_sha256 = ?
						  AND evidence.build_artifact_set_sha256 = ?
						  AND evidence.build_acceptance_receipt_id = ?
						  AND evidence.build_acceptance_receipt_sha256 = ?
						  AND evidence.build_acceptance_status = 'accepted'
						 WHERE h.id = ? AND h.map_id = ? AND h.map_version = ? AND h.status = 'accepted'
						   AND h.resolved_at IS NOT NULL
						   AND m.account_id = ? AND m.tenant_id = ? AND m.workspace_account_id = ?
					 LIMIT 1`
        )
        .bind(
          source.mapVersionId,
          source.mapCanvasSha256,
          source.handoffReceiptSha256,
          source.buildReleaseId,
          source.buildManifestSha256,
          source.buildArtifactSetSha256,
          source.buildAcceptanceReceiptId,
          source.buildAcceptanceReceiptSha256,
          source.handoffId,
          source.mapId,
          source.mapVersion,
          ...bindings(scope)
        )
        .first<{ canvas_json: string }>();
      return Boolean(row && (await sha256(row.canvas_json)) === source.mapCanvasSha256);
    },

    async apply(scope, command) {
      const existing = await replay(scope, command);
      if (existing) return existing;
      if (command.type === 'create_version') {
        const record = command.record;
        const statements: D1PreparedStatement[] = [];
        if (command.predecessorActivationId) {
          statements.push(
            db
              .prepare(
                `UPDATE customer_control_activations
								 SET status = 'superseded', superseded_at = ?, superseded_by_command_id = ?
								 WHERE id = ? AND account_id = ? AND tenant_id = ? AND workspace_account_id = ?
								   AND status IN ('active', 'suspended')`
              )
              .bind(
                record.activatedAt,
                command.commandId,
                command.predecessorActivationId,
                ...bindings(scope)
              )
          );
        }
        statements.push(
          db
            .prepare(
              `INSERT INTO customer_control_activations (
							 id, activation_version, account_id, tenant_id, workspace_account_id,
							 map_id, map_version_id, map_version, map_canvas_sha256, handoff_id, handoff_receipt_sha256,
							 build_release_id, build_manifest_sha256, build_artifact_set_sha256,
							 build_acceptance_receipt_id, build_acceptance_receipt_sha256, build_acceptance_status,
							 policy_version, policy_sha256, allowed_tools_json, allowed_resources_json, contract_sha256,
							 entitlement_snapshot_json, entitlement_snapshot_sha256, actor_subject, actor_role,
							 status, activation_kind, predecessor_activation_id, rollback_target_activation_id,
							 idempotency_key, command_sha256, command_id, activated_at, suspended_at, superseded_at, created_at
							) VALUES (
							 ?, ?, ?, ?, ?,
							 ?, ?, ?, ?, ?, ?,
							 ?, ?, ?,
							 ?, ?, ?,
							 ?, ?, ?, ?, ?,
							 ?, ?, ?, ?,
							 ?, ?, ?, ?,
							 ?, ?, ?, ?, NULL, NULL, ?
							)`
            )
            .bind(
              record.id,
              record.activationVersion,
              record.accountId,
              record.tenantId,
              record.workspaceAccountId,
              record.mapId,
              record.mapVersionId,
              record.mapVersion,
              record.mapCanvasSha256,
              record.handoffId,
              record.handoffReceiptSha256,
              record.buildReleaseId,
              record.buildManifestSha256,
              record.buildArtifactSetSha256,
              record.buildAcceptanceReceiptId,
              record.buildAcceptanceReceiptSha256,
              record.buildAcceptanceStatus,
              record.policyVersion,
              record.policySha256,
              JSON.stringify(record.allowedTools),
              JSON.stringify(record.allowedResources),
              record.contractSha256,
              JSON.stringify(record.entitlementSnapshot),
              record.entitlementSnapshotSha256,
              record.actorSubject,
              record.actorRole,
              record.status,
              record.activationKind,
              record.predecessorActivationId,
              record.rollbackTargetActivationId,
              record.idempotencyKey,
              record.commandSha256,
              command.commandId,
              record.activatedAt,
              record.createdAt
            ),
          insertEvent(command.event)
        );
        return applyBatch(scope, command, statements, {
          replayed: false,
          activation: record,
          event: command.event,
          changeReference: null
        });
      }

      if (command.type === 'suspend') {
        const current = await this.find(scope, command.activationId);
        if (!current) throw new ControlActivationAccessError();
        const activation: ControlActivationRecord = {
          ...current,
          status: 'suspended',
          suspendedAt: command.suspendedAt
        };
        return applyBatch(
          scope,
          command,
          [
            db
              .prepare(
                `UPDATE customer_control_activations
								 SET status = 'suspended', suspended_at = ?, suspended_by_command_id = ?
								 WHERE id = ? AND account_id = ? AND tenant_id = ? AND workspace_account_id = ? AND status = 'active'`
              )
              .bind(
                command.suspendedAt,
                command.commandId,
                command.activationId,
                ...bindings(scope)
              ),
            insertEvent(command.event)
          ],
          { replayed: false, activation, event: command.event, changeReference: null }
        );
      }

      const current = await this.find(scope, command.reference.activationId);
      if (!current) throw new ControlActivationAccessError();
      return applyBatch(
        scope,
        command,
        [
          db
            .prepare(
              `INSERT INTO customer_control_change_references
							 (id, activation_id, account_id, tenant_id, workspace_account_id, kind, external_reference,
							  target, status, created_by, command_id, created_at)
							 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'proposed', ?, ?, ?)`
            )
            .bind(
              command.reference.id,
              command.reference.activationId,
              command.reference.accountId,
              command.reference.tenantId,
              command.reference.workspaceAccountId,
              command.reference.kind,
              command.reference.externalReference,
              command.reference.target,
              command.reference.createdBy,
              command.commandId,
              command.reference.createdAt
            ),
          insertEvent(command.event)
        ],
        {
          replayed: false,
          activation: current,
          event: command.event,
          changeReference: command.reference
        }
      );
    },

    async find(scope, activationId) {
      const row = await db
        .prepare(
          `SELECT * FROM customer_control_activations
					 WHERE id = ? AND account_id = ? AND tenant_id = ? AND workspace_account_id = ?
					 LIMIT 1`
        )
        .bind(activationId, ...bindings(scope))
        .first<ControlActivationRow>();
      return row ? fromActivationRow(row) : null;
    },

    async list(scope) {
      const rows = await db
        .prepare(
          `SELECT * FROM customer_control_activations
					 WHERE account_id = ? AND tenant_id = ? AND workspace_account_id = ?
					 ORDER BY activation_version DESC, id ASC`
        )
        .bind(...bindings(scope))
        .all<ControlActivationRow>();
      return rows.results.map(fromActivationRow);
    },

    async listProjectionEvents(scope) {
      const rows = await db
        .prepare(
          `SELECT * FROM customer_control_activation_outbox
					 WHERE account_id = ? AND tenant_id = ? AND workspace_account_id = ?
					 ORDER BY created_at ASC, id ASC`
        )
        .bind(...bindings(scope))
        .all<ControlProjectionEventRow>();
      return rows.results.map(fromEventRow);
    },

    async markProjectionPublished(scope, eventId, publishedAt) {
      await db
        .prepare(
          `UPDATE customer_control_activation_outbox SET published_at = COALESCE(published_at, ?)
					 WHERE id = ? AND account_id = ? AND tenant_id = ? AND workspace_account_id = ?`
        )
        .bind(publishedAt, eventId, ...bindings(scope))
        .run();
      const row = await db
        .prepare(
          `SELECT * FROM customer_control_activation_outbox
					 WHERE id = ? AND account_id = ? AND tenant_id = ? AND workspace_account_id = ? LIMIT 1`
        )
        .bind(eventId, ...bindings(scope))
        .first<ControlProjectionEventRow>();
      return row ? fromEventRow(row) : null;
    }
  };
}
