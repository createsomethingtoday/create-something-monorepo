import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  ControlActivationAccessError,
  ControlActivationConflictError,
  controlActivationSourceFromBuildInspection,
  createControlActivationLedger,
  createD1ControlActivationRepository
} from '../src/lib/server/control-activation.ts';
import type { CustomerMapScope } from '../src/lib/server/customer-map-workspace.ts';

const migrationRoot = new URL('../migrations/', import.meta.url);

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bindSql(sql: string, values: unknown[]): string {
  let index = 0;
  const bound = sql.replaceAll('?', () => {
    if (index >= values.length) throw new Error(`Missing SQL binding ${index + 1}: ${sql}`);
    return sqlLiteral(values[index++]);
  });
  if (index !== values.length)
    throw new Error(`Unused SQL bindings: expected ${index}, received ${values.length}`);
  return bound;
}

class SqliteD1Statement {
  readonly database: string;
  readonly sql: string;
  readonly values: unknown[];

  constructor(database: string, sql: string, values: unknown[] = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values: unknown[]) {
    return new SqliteD1Statement(this.database, this.sql, values);
  }

  boundSql(): string {
    return bindSql(this.sql, this.values);
  }

  async run() {
    const output = execFileSync('sqlite3', ['-json', this.database], {
      input: `PRAGMA foreign_keys=ON; ${this.boundSql()}; SELECT changes() AS changes;`,
      encoding: 'utf8'
    }).trim();
    const rows = output ? (JSON.parse(output) as Array<{ changes: number }>) : [];
    return { success: true, meta: { changes: Number(rows.at(-1)?.changes ?? 0) } };
  }

  async first<T>() {
    const output = execFileSync('sqlite3', ['-json', this.database], {
      input: `PRAGMA foreign_keys=ON; ${this.boundSql()};`,
      encoding: 'utf8'
    }).trim();
    const rows = output ? (JSON.parse(output) as T[]) : [];
    return rows[0] ?? null;
  }

  async all<T>() {
    const output = execFileSync('sqlite3', ['-json', this.database], {
      input: `PRAGMA foreign_keys=ON; ${this.boundSql()};`,
      encoding: 'utf8'
    }).trim();
    return { success: true, results: output ? (JSON.parse(output) as T[]) : [], meta: {} };
  }
}

function createSqliteD1(database: string): D1Database {
  return {
    prepare(sql: string) {
      return new SqliteD1Statement(database, sql) as unknown as D1PreparedStatement;
    },
    async batch(statements: D1PreparedStatement[]) {
      const sql = statements
        .map((statement) => (statement as unknown as SqliteD1Statement).boundSql())
        .join(';\n');
      execFileSync('sqlite3', ['-bail', database], {
        input: `PRAGMA foreign_keys=ON; BEGIN IMMEDIATE; ${sql}; COMMIT;`,
        encoding: 'utf8'
      });
      return statements.map(() => ({ success: true, meta: { changes: 1 } })) as D1Result<unknown>[];
    }
  } as unknown as D1Database;
}

const scope: CustomerMapScope = {
  authSubject: 'identity|operator',
  accountId: 'acct_a',
  tenantId: 'tenant_a',
  workspaceAccountId: 'workspace_a'
};

function actor(capturedAt = '2026-07-18T01:00:00.000Z', targetScope: CustomerMapScope = scope) {
  return {
    subject: targetScope.authSubject,
    role: 'agency_operator' as const,
    entitlement: {
      schema: 'create-something/control-entitlement-snapshot@1' as const,
      source: 'agency_mcp_entitlements' as const,
      accountId: targetScope.accountId,
      tenantId: targetScope.tenantId,
      workspaceAccountId: targetScope.workspaceAccountId,
      capturedAt,
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

test('D1 adapter atomically versions, suspends, rolls back, and replays tenant-scoped projections', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'control-activation-d1-'));
  const database = join(directory, 'test.sqlite');
  try {
    for (const migration of [
      '0035_customer_map_workspaces.sql',
      '0037_customer_map_handoff_resolution.sql',
      '0039_customer_control_activations.sql'
    ]) {
      execFileSync('sqlite3', [database], {
        input: `PRAGMA foreign_keys=ON; ${readFileSync(new URL(migration, migrationRoot), 'utf8')}`,
        encoding: 'utf8'
      });
    }
    const canvas1 = '{"nodes":[],"edges":[],"version":1}';
    const canvas2 = '{"nodes":[],"edges":[],"version":2}';
    execFileSync('sqlite3', [database], {
      input: `PRAGMA foreign_keys=ON;
			 INSERT INTO customer_maps
			 (id, title, account_id, tenant_id, workspace_account_id, created_by, current_version, review_state, created_at, updated_at)
			 VALUES ('map_a', 'Approved map', 'acct_a', 'tenant_a', 'workspace_a', 'identity|alice', 2, 'approved', '2026-07-18T00:00:00.000Z', '2026-07-18T00:30:00.000Z');
			 INSERT INTO customer_map_versions
			 (id, map_id, account_id, version, canvas_json, message, created_by, created_at)
			 VALUES ('map_version_1', 'map_a', 'acct_a', 1, '${canvas1}', NULL, 'identity|alice', '2026-07-18T00:00:00.000Z');
			 INSERT INTO customer_map_versions
			 (id, map_id, account_id, version, canvas_json, message, created_by, created_at)
			 VALUES ('map_version_2', 'map_a', 'acct_a', 2, '${canvas2}', NULL, 'identity|alice', '2026-07-18T00:30:00.000Z');
			 INSERT INTO customer_map_handoffs
			 (id, map_id, account_id, map_version, status, payload_json, created_by, created_at, accepted_at, resolved_at, resolved_by)
			 VALUES ('handoff_1', 'map_a', 'acct_a', 1, 'accepted', '{}', 'identity|alice', '2026-07-18T00:10:00.000Z', '2026-07-18T00:20:00.000Z', '2026-07-18T00:20:00.000Z', 'identity|operator');
			 INSERT INTO customer_map_handoffs
			 (id, map_id, account_id, map_version, status, payload_json, created_by, created_at, accepted_at, resolved_at, resolved_by)
			 VALUES ('handoff_2', 'map_a', 'acct_a', 2, 'accepted', '{}', 'identity|alice', '2026-07-18T00:40:00.000Z', '2026-07-18T00:50:00.000Z', '2026-07-18T00:50:00.000Z', 'identity|operator');`,
      encoding: 'utf8'
    });

    let id = 0;
    let minute = 0;
    const ledger = createControlActivationLedger({
      repository: createD1ControlActivationRepository(createSqliteD1(database)),
      id: () => `id_${++id}`,
      clock: () => `2026-07-18T02:${String(minute++).padStart(2, '0')}:00.000Z`
    });
    const source = (version: 1 | 2) => ({
      mapId: 'map_a',
      mapVersionId: `map_version_${version}`,
      mapVersion: version,
      mapCanvasSha256: createHash('sha256')
        .update(version === 1 ? canvas1 : canvas2)
        .digest('hex'),
      handoffId: `handoff_${version}`,
      handoffReceiptSha256: 'a'.repeat(64),
      buildReleaseId: `release_${version}`,
      buildManifestSha256: (version === 1 ? 'b' : '7').repeat(64),
      buildArtifactSetSha256: 'c'.repeat(64),
      buildAcceptanceReceiptId: `acceptance_${version}`,
      buildAcceptanceReceiptSha256: (version === 1 ? 'd' : '6').repeat(64),
      buildAcceptanceStatus: 'accepted' as const
    });
    const policy = {
      version: 'policy@1',
      sha256: 'e'.repeat(64),
      allowedTools: ['tool.read'],
      allowedResources: ['resource://map']
    };
    const inspection = (version: 1 | 2) =>
      ({
        manifest: {
          releaseId: `release_${version}`,
          handoff: { receiptSha256: 'a'.repeat(64) },
          acceptance: { receiptSha256: (version === 1 ? 'd' : '6').repeat(64) }
        },
        handoffReceipt: {
          handoffId: `handoff_${version}`,
          mapId: 'map_a',
          mapVersion: version,
          accountId: 'acct_a',
          workspaceAccountId: 'workspace_a',
          status: 'accepted'
        },
        acceptanceReceipt: {
          receiptId: `acceptance_${version}`,
          accountId: 'acct_a',
          workspaceAccountId: 'workspace_a',
          artifactSetSha256: 'c'.repeat(64),
          status: 'accepted'
        },
        verificationReceipts: { staging: {}, uat: {} },
        evidenceValid: true,
        releaseReady: true,
        issues: []
      }) as unknown as Parameters<typeof controlActivationSourceFromBuildInspection>[0];
    for (const version of [1, 2] as const) {
      const buildSource = source(version);
      await ledger.registerBuildEvidence(scope, actor(), {
        inspection: inspection(version),
        manifestSha256: buildSource.buildManifestSha256,
        mapVersionId: buildSource.mapVersionId,
        mapCanvasSha256: buildSource.mapCanvasSha256
      });
    }

    await assert.rejects(
      () =>
        ledger.activate(scope, actor(), {
          idempotencyKey: 'wrong-map-hash',
          source: { ...source(1), mapCanvasSha256: '9'.repeat(64) },
          policy
        }),
      ControlActivationAccessError
    );
    await assert.rejects(
      () =>
        ledger.activate(scope, actor(), {
          idempotencyKey: 'wrong-build-hash',
          source: { ...source(1), buildManifestSha256: '8'.repeat(64) },
          policy
        }),
      ControlActivationAccessError
    );
    const first = await ledger.activate(scope, actor(), {
      idempotencyKey: 'activate-1',
      source: source(1),
      policy
    });
    const replay = await ledger.activate(scope, actor('2026-07-18T01:30:00.000Z'), {
      idempotencyKey: 'activate-1',
      source: source(1),
      policy
    });
    assert.equal(replay.replayed, true);
    assert.equal(replay.activation.id, first.activation.id);

    const second = await ledger.supersede(scope, actor(), {
      idempotencyKey: 'supersede-2',
      predecessorActivationId: `  ${first.activation.id}  `,
      source: source(2),
      policy: { ...policy, version: 'policy@2', sha256: 'f'.repeat(64) }
    });
    const secondReplay = await ledger.supersede(scope, actor(), {
      idempotencyKey: 'supersede-2',
      predecessorActivationId: first.activation.id,
      source: source(2),
      policy: { ...policy, version: 'policy@2', sha256: 'f'.repeat(64) }
    });
    assert.equal(secondReplay.replayed, true);
    assert.equal(secondReplay.activation.id, second.activation.id);
    await ledger.suspend(scope, actor(), {
      idempotencyKey: 'suspend-2',
      activationId: second.activation.id,
      reason: 'Incident review'
    });
    await assert.rejects(
      () =>
        ledger.suspend(scope, actor(), {
          idempotencyKey: 'suspend-2-conflict',
          activationId: second.activation.id,
          reason: 'Different command after suspension'
        }),
      ControlActivationConflictError
    );
    const rolledBack = await ledger.rollback(scope, actor(), {
      idempotencyKey: 'rollback-1',
      predecessorActivationId: `  ${second.activation.id}  `,
      rollbackTargetActivationId: `  ${first.activation.id}  `
    });
    assert.equal(rolledBack.activation.activationVersion, 3);
    assert.equal(rolledBack.activation.mapCanvasSha256, first.activation.mapCanvasSha256);
    const rollbackReplay = await ledger.rollback(scope, actor(), {
      idempotencyKey: 'rollback-1',
      predecessorActivationId: second.activation.id,
      rollbackTargetActivationId: first.activation.id
    });
    assert.equal(rollbackReplay.replayed, true);
    assert.equal(rollbackReplay.activation.id, rolledBack.activation.id);

    const proposedChange = await ledger.proposeChange(scope, actor(), {
      idempotencyKey: 'incident-1',
      activationId: `  ${rolledBack.activation.id}  `,
      kind: 'incident',
      externalReference: 'INC-1',
      target: 'map_revision'
    });
    const proposedChangeReplay = await ledger.proposeChange(scope, actor(), {
      idempotencyKey: 'incident-1',
      activationId: rolledBack.activation.id,
      kind: 'incident',
      externalReference: 'INC-1',
      target: 'map_revision'
    });
    assert.equal(proposedChangeReplay.replayed, true);
    assert.equal(proposedChangeReplay.changeReference?.id, proposedChange.changeReference?.id);
    await ledger.proposeChange(scope, actor(), {
      idempotencyKey: 'incident-2',
      activationId: rolledBack.activation.id,
      kind: 'incident',
      externalReference: 'INC-2',
      target: 'build_change_request'
    });
    await ledger.proposeChange(scope, actor(), {
      idempotencyKey: 'incident-1-earlier-version',
      activationId: first.activation.id,
      kind: 'incident',
      externalReference: 'INC-1',
      target: 'map_revision'
    });
    const events = await ledger.listProjectionEvents(scope, actor());
    assert.equal(events.length, 7);
    const published = await ledger.markProjectionPublished(scope, actor(), events[0]!.id);
    const publishReplay = await ledger.markProjectionPublished(scope, actor(), events[0]!.id);
    assert.equal(publishReplay.publishedAt, published.publishedAt);

    const otherScope = {
      ...scope,
      accountId: 'acct_other',
      tenantId: 'tenant_other',
      workspaceAccountId: 'workspace_other'
    };
    assert.equal((await ledger.list(otherScope, actor(undefined, otherScope))).length, 0);
    await assert.rejects(
      () => ledger.get(otherScope, actor(undefined, otherScope), rolledBack.activation.id),
      ControlActivationAccessError
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
