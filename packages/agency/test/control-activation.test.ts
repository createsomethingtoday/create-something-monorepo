import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTROL_ACTIVATION_API_OPERATIONS,
  CONTROL_ACTIVATION_MCP_OPERATIONS,
  ControlActivationAccessError,
  ControlActivationConflictError,
  ControlActivationValidationError,
  controlActivationSourceFromBuildInspection,
  createControlActivationApiHandler,
  createControlActivationLedger,
  createControlActivationMcpHandler,
  type ControlActivationMutationResult,
  type ControlActivationRecord,
  type ControlActivationRepository,
  type ControlChangeReference,
  type ControlProjectionEvent
} from '../src/lib/server/control-activation.ts';
import { controlActivationHttpErrorStatus } from '../src/lib/server/control-activation-http.ts';
import {
  deriveControlActivationRole,
  deriveControlCredentialRole
} from '../src/lib/server/control-activation-role.ts';
import type { CustomerMapScope } from '../src/lib/server/customer-map-workspace.ts';
import { findControlSchedulerActivationScope } from '../src/lib/server/control-scheduler-scope.ts';

const scopeA: CustomerMapScope = {
  authSubject: 'identity|operator',
  accountId: 'acct_a',
  tenantId: 'tenant_a',
  workspaceAccountId: 'workspace_a'
};

const scopeB: CustomerMapScope = {
  ...scopeA,
  accountId: 'acct_b',
  tenantId: 'tenant_b',
  workspaceAccountId: 'workspace_b'
};

function actor(
  scope = scopeA,
  role: 'agency_operator' | 'account_owner' | 'account_reader' = 'agency_operator'
) {
  return {
    subject: scope.authSubject,
    role,
    entitlement: {
      schema: 'create-something/control-entitlement-snapshot@1' as const,
      source: 'agency_mcp_entitlements' as const,
      accountId: scope.accountId,
      tenantId: scope.tenantId,
      workspaceAccountId: scope.workspaceAccountId,
      capturedAt: '2026-07-18T01:00:00.000Z',
      allowed: true,
      reason: 'allowed',
      snapshot: {
        service_tier: 'policy_os_core' as const,
        managed_bearer_allowed: true,
        org_membership_active: true,
        service_entitled: true,
        policy_accepted: true,
        contract_active: true,
        billing_active: true,
        approved_exception: {
          present: false,
          type: null,
          allowed_scope: null,
          graduation_target: null,
          review_by: null
        }
      }
    }
  };
}

function source(suffix: string) {
  return {
    mapId: 'map_a',
    mapVersionId: `map_version_${suffix}`,
    mapVersion: Number(suffix),
    mapCanvasSha256: suffix.repeat(64).slice(0, 64),
    handoffId: `handoff_${suffix}`,
    handoffReceiptSha256: 'a'.repeat(64),
    buildReleaseId: `release_${suffix}`,
    buildManifestSha256: 'b'.repeat(64),
    buildArtifactSetSha256: 'c'.repeat(64),
    buildAcceptanceReceiptId: `acceptance_${suffix}`,
    buildAcceptanceReceiptSha256: 'd'.repeat(64),
    buildAcceptanceStatus: 'accepted' as const
  };
}

const policy = {
  version: 'policy@1',
  sha256: 'e'.repeat(64),
  allowedTools: ['tool.write', 'tool.read', 'tool.read'],
  allowedResources: ['resource://map']
};

function createMemoryRepository(): ControlActivationRepository {
  const records = new Map<string, ControlActivationRecord>();
  const events = new Map<string, ControlProjectionEvent>();
  const changes = new Map<string, ControlChangeReference>();
  const commands = new Map<string, { sha256: string; result: ControlActivationMutationResult }>();
  const belongs = (
    scope: CustomerMapScope,
    value: { accountId: string; tenantId: string; workspaceAccountId: string }
  ) =>
    value.accountId === scope.accountId &&
    value.tenantId === scope.tenantId &&
    value.workspaceAccountId === scope.workspaceAccountId;

  return {
    async recordAcceptedBuildEvidence() {},
    async verifyAcceptedSource() {
      return true;
    },
    async apply(scope, command) {
      const commandKey = `${scope.accountId}:${scope.tenantId}:${scope.workspaceAccountId}:${command.idempotencyKey}`;
      const replay = commands.get(commandKey);
      if (replay) {
        if (replay.sha256 !== command.commandSha256)
          throw new ControlActivationConflictError('Idempotency key was reused');
        return structuredClone({ ...replay.result, replayed: true });
      }

      let result: ControlActivationMutationResult;
      if (command.type === 'create_version') {
        const current = [...records.values()].find(
          (record) =>
            belongs(scope, record) && (record.status === 'active' || record.status === 'suspended')
        );
        if (command.activationKind === 'initial' && current)
          throw new ControlActivationConflictError('Activation already exists');
        if (command.activationKind !== 'initial') {
          if (!current || current.id !== command.predecessorActivationId) {
            throw new ControlActivationConflictError('Activation predecessor changed');
          }
          records.set(current.id, {
            ...current,
            status: 'superseded',
            supersededAt: command.record.activatedAt
          });
        }
        records.set(command.record.id, structuredClone(command.record));
        events.set(command.event.id, structuredClone(command.event));
        result = {
          replayed: false,
          activation: structuredClone(command.record),
          event: structuredClone(command.event),
          changeReference: null
        };
      } else if (command.type === 'suspend') {
        const current = records.get(command.activationId);
        if (!current || !belongs(scope, current)) throw new ControlActivationAccessError();
        if (current.status !== 'active')
          throw new ControlActivationConflictError('Activation is not active');
        const suspended = {
          ...current,
          status: 'suspended' as const,
          suspendedAt: command.suspendedAt
        };
        records.set(current.id, suspended);
        events.set(command.event.id, structuredClone(command.event));
        result = {
          replayed: false,
          activation: suspended,
          event: structuredClone(command.event),
          changeReference: null
        };
      } else {
        const activation = records.get(command.reference.activationId);
        if (!activation || !belongs(scope, activation)) throw new ControlActivationAccessError();
        changes.set(command.reference.id, structuredClone(command.reference));
        events.set(command.event.id, structuredClone(command.event));
        result = {
          replayed: false,
          activation: structuredClone(activation),
          event: structuredClone(command.event),
          changeReference: structuredClone(command.reference)
        };
      }
      commands.set(commandKey, { sha256: command.commandSha256, result: structuredClone(result) });
      return result;
    },
    async find(scope, activationId) {
      const value = records.get(activationId);
      return value && belongs(scope, value) ? structuredClone(value) : null;
    },
    async list(scope) {
      return [...records.values()]
        .filter((value) => belongs(scope, value))
        .map((value) => structuredClone(value));
    },
    async listProjectionEvents(scope) {
      return [...events.values()]
        .filter((value) => belongs(scope, value))
        .map((value) => structuredClone(value));
    },
    async markProjectionPublished(scope, eventId, publishedAt) {
      const event = events.get(eventId);
      if (!event || !belongs(scope, event)) return null;
      if (event.publishedAt) return structuredClone(event);
      const published = { ...event, publishedAt };
      events.set(eventId, published);
      return structuredClone(published);
    }
  };
}

test('Control activation contract keeps API and MCP operations in parity', () => {
  assert.deepEqual(CONTROL_ACTIVATION_API_OPERATIONS, CONTROL_ACTIVATION_MCP_OPERATIONS);
  assert.equal(createControlActivationApiHandler, createControlActivationMcpHandler);
  assert.deepEqual(CONTROL_ACTIVATION_API_OPERATIONS, [
    'get',
    'list',
    'activate',
    'supersede',
    'suspend',
    'rollback',
    'propose_change',
    'list_projection_events',
    'mark_projection_published'
  ]);
});

test('Control transport derives roles from first-party state and maps client errors', () => {
  assert.equal(
    deriveControlActivationRole({
      email: 'operator@example.com',
      metadataJson: '{}',
      operatorEmails: 'operator@example.com'
    }),
    'agency_operator'
  );
  assert.equal(
    deriveControlActivationRole({
      email: 'owner@example.com',
      metadataJson: '{"control_role":"account_owner"}'
    }),
    'account_owner'
  );
  assert.equal(
    deriveControlActivationRole({
      email: 'reader@example.com',
      metadataJson: '{"control_role":"agency_operator"}'
    }),
    'account_reader'
  );
  assert.equal(
    deriveControlCredentialRole({
      email: 'legacy@example.com',
      metadataJson: '{}'
    }),
    null
  );
  assert.equal(
    deriveControlCredentialRole({
      email: 'owner@example.com',
      metadataJson: '{"control_role":"account_owner"}'
    }),
    'account_owner'
  );
  assert.equal(
    deriveControlCredentialRole({
      email: 'current-operator@example.com',
      metadataJson: '{}',
      operatorEmails: 'current-operator@example.com'
    }),
    'agency_operator'
  );
  assert.equal(
    controlActivationHttpErrorStatus(new ControlActivationValidationError('bad request')),
    400
  );
  assert.equal(controlActivationHttpErrorStatus(new ControlActivationAccessError()), 404);
  assert.equal(controlActivationHttpErrorStatus(new Error('unexpected')), null);
});

test('legacy entitlements do not silently gain new Control credential authority', () => {
  assert.equal(
    deriveControlActivationRole({ email: 'legacy@example.com', metadataJson: '{}' }),
    'account_reader'
  );
  assert.equal(
    deriveControlCredentialRole({ email: 'legacy@example.com', metadataJson: '{}' }),
    null
  );
});

test('scheduler authority requires the run frozen activation in its exact scope', async () => {
  const requested = ['activation-a', 'account-a', 'tenant-a', 'workspace-a'];
  const db = {
    prepare(sql: string) {
      assert.match(sql, /WHERE id = \?/);
      assert.doesNotMatch(sql, /status = 'active'/);
      return {
        bind(...values: string[]) {
          assert.deepEqual(values, requested);
          return { async first() { return { id: 'activation-a' }; } };
        }
      };
    }
  } as unknown as D1Database;
  assert.deepEqual(
    await findControlSchedulerActivationScope(db, {
      activationId: requested[0],
      accountId: requested[1],
      tenantId: requested[2],
      workspaceAccountId: requested[3]
    }),
    { allowed: true, activation_id: 'activation-a' }
  );
  const empty = {
    prepare() {
      return { bind() { return { async first() { return null; } }; } };
    }
  } as unknown as D1Database;
  assert.deepEqual(
    await findControlSchedulerActivationScope(empty, {
      activationId: requested[0],
      accountId: requested[1],
      tenantId: requested[2],
      workspaceAccountId: requested[3]
    }),
    { allowed: false, reason: 'control_activation_scope_required' }
  );
});

test('Control source is derived and registered only from a strict ready Build inspection', async () => {
  const inspection = {
    manifest: {
      releaseId: 'release_1',
      handoff: { receiptSha256: 'a'.repeat(64) },
      acceptance: { receiptSha256: 'b'.repeat(64) }
    },
    handoffReceipt: {
      handoffId: 'handoff_1',
      mapId: 'map_a',
      mapVersion: 1,
      accountId: 'acct_a',
      workspaceAccountId: 'workspace_a',
      status: 'accepted'
    },
    acceptanceReceipt: {
      receiptId: 'acceptance_1',
      accountId: 'acct_a',
      workspaceAccountId: 'workspace_a',
      artifactSetSha256: 'c'.repeat(64),
      status: 'accepted'
    },
    verificationReceipts: { staging: {}, uat: {} },
    evidenceValid: true,
    releaseReady: true,
    issues: []
  } as unknown as Parameters<typeof controlActivationSourceFromBuildInspection>[0];
  const derived = controlActivationSourceFromBuildInspection(inspection, {
    manifestSha256: 'd'.repeat(64),
    mapVersionId: 'map_version_1',
    mapCanvasSha256: 'e'.repeat(64)
  });
  assert.equal(derived.buildReleaseId, 'release_1');
  assert.equal(derived.handoffReceiptSha256, 'a'.repeat(64));
  assert.equal(derived.buildArtifactSetSha256, 'c'.repeat(64));
  assert.throws(
    () =>
      controlActivationSourceFromBuildInspection(
        { ...inspection, releaseReady: false },
        {
          manifestSha256: 'd'.repeat(64),
          mapVersionId: 'map_version_1',
          mapCanvasSha256: 'e'.repeat(64)
        }
      ),
    ControlActivationValidationError
  );
  const ledger = createControlActivationLedger({
    repository: createMemoryRepository(),
    clock: () => '2026-07-18T02:00:00.000Z',
    id: () => 'build_evidence_1'
  });
  const registration = {
    inspection,
    manifestSha256: 'd'.repeat(64),
    mapVersionId: 'map_version_1',
    mapCanvasSha256: 'e'.repeat(64)
  };
  await ledger.registerBuildEvidence(scopeA, actor(), registration);
  await assert.rejects(
    () => ledger.registerBuildEvidence(scopeA, actor(scopeA, 'account_owner'), registration),
    ControlActivationAccessError
  );
  await assert.rejects(
    () =>
      ledger.registerBuildEvidence(scopeA, actor(), {
        ...registration,
        inspection: {
          ...inspection,
          handoffReceipt: { ...inspection.handoffReceipt!, accountId: 'acct_other' }
        }
      }),
    ControlActivationAccessError
  );
});

test('activation is tenant scoped, accepted-source only, and idempotent', async () => {
  let id = 0;
  const ledger = createControlActivationLedger({
    repository: createMemoryRepository(),
    clock: () => '2026-07-18T02:00:00.000Z',
    id: () => `id_${++id}`
  });
  const first = await ledger.activate(scopeA, actor(), {
    idempotencyKey: 'activate-a',
    source: source('1'),
    policy
  });
  assert.equal(first.activation.activationVersion, 1);
  assert.deepEqual(first.activation.allowedTools, ['tool.read', 'tool.write']);
  assert.equal(first.event.eventType, 'activated');
  const refreshedActor = actor();
  refreshedActor.entitlement.capturedAt = '2026-07-18T01:30:00.000Z';
  const replay = await ledger.activate(scopeA, refreshedActor, {
    idempotencyKey: 'activate-a',
    source: source('1'),
    policy
  });
  assert.equal(replay.replayed, true);
  assert.equal(replay.activation.id, first.activation.id);
  await assert.rejects(
    () => ledger.get(scopeB, actor(scopeB), first.activation.id),
    ControlActivationAccessError
  );

  await assert.rejects(
    () =>
      ledger.activate(scopeA, actor(), {
        idempotencyKey: 'activate-rejected',
        source: { ...source('2'), buildAcceptanceStatus: 'rejected' as const },
        policy
      }),
    ControlActivationValidationError
  );
  await assert.rejects(
    () =>
      ledger.activate(scopeA, actor(scopeA, 'account_reader'), {
        idempotencyKey: 'reader-write',
        source: source('2'),
        policy
      }),
    ControlActivationAccessError
  );
});

test('supersession, suspension, rollback, change links, and projection replay preserve history', async () => {
  let id = 0;
  let minute = 0;
  const ledger = createControlActivationLedger({
    repository: createMemoryRepository(),
    clock: () => `2026-07-18T03:${String(minute++).padStart(2, '0')}:00.000Z`,
    id: () => `id_${++id}`
  });
  const first = await ledger.activate(scopeA, actor(), {
    idempotencyKey: 'initial',
    source: source('1'),
    policy
  });
  const second = await ledger.supersede(scopeA, actor(), {
    idempotencyKey: 'supersede',
    predecessorActivationId: first.activation.id,
    source: source('2'),
    policy: { ...policy, version: 'policy@2', sha256: 'f'.repeat(64) }
  });
  assert.equal(second.activation.activationVersion, 2);
  assert.equal((await ledger.get(scopeA, actor(), first.activation.id)).status, 'superseded');
  const supersessionReplay = await ledger.supersede(scopeA, actor(), {
    idempotencyKey: 'supersede',
    predecessorActivationId: first.activation.id,
    source: source('2'),
    policy: { ...policy, version: 'policy@2', sha256: 'f'.repeat(64) }
  });
  assert.equal(supersessionReplay.replayed, true);
  assert.equal(supersessionReplay.activation.id, second.activation.id);

  const suspended = await ledger.suspend(scopeA, actor(), {
    idempotencyKey: 'suspend',
    activationId: second.activation.id,
    reason: 'Incident review'
  });
  assert.equal(suspended.activation.status, 'suspended');
  const suspensionReplay = await ledger.suspend(scopeA, actor(), {
    idempotencyKey: 'suspend',
    activationId: second.activation.id,
    reason: 'Incident review'
  });
  assert.equal(suspensionReplay.replayed, true);

  const rollback = await ledger.rollback(scopeA, actor(), {
    idempotencyKey: 'rollback',
    predecessorActivationId: second.activation.id,
    rollbackTargetActivationId: first.activation.id
  });
  assert.equal(rollback.activation.activationVersion, 3);
  assert.equal(rollback.activation.activationKind, 'rollback');
  assert.equal(rollback.activation.mapVersion, first.activation.mapVersion);
  assert.equal(rollback.activation.policySha256, first.activation.policySha256);
  assert.equal(rollback.activation.predecessorActivationId, second.activation.id);
  assert.equal(rollback.activation.rollbackTargetActivationId, first.activation.id);
  const rollbackReplay = await ledger.rollback(scopeA, actor(), {
    idempotencyKey: 'rollback',
    predecessorActivationId: second.activation.id,
    rollbackTargetActivationId: first.activation.id
  });
  assert.equal(rollbackReplay.replayed, true);
  assert.equal(rollbackReplay.activation.id, rollback.activation.id);

  const change = await ledger.proposeChange(scopeA, actor(), {
    idempotencyKey: 'incident-link',
    activationId: rollback.activation.id,
    kind: 'incident',
    externalReference: 'INC-42',
    target: 'map_revision'
  });
  assert.equal(change.changeReference?.status, 'proposed');
  assert.equal(
    (await ledger.get(scopeA, actor(), rollback.activation.id)).mapVersion,
    first.activation.mapVersion
  );

  const events = await ledger.listProjectionEvents(scopeA, actor());
  assert.equal(events.length, 5);
  const published = await ledger.markProjectionPublished(scopeA, actor(), events[0]!.id);
  const replayedPublish = await ledger.markProjectionPublished(scopeA, actor(), events[0]!.id);
  assert.equal(published.publishedAt, replayedPublish.publishedAt);
  await assert.rejects(
    () => ledger.markProjectionPublished(scopeA, actor(scopeA, 'account_owner'), events[1]!.id),
    ControlActivationAccessError
  );
  assert.equal((await ledger.listProjectionEvents(scopeB, actor(scopeB))).length, 0);
});
