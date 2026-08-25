import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REQUIRED_MAP_CHECK_IDS,
  runScheduledMapMonitor,
  type MapMonitorEnv,
  type PersistedStatement,
} from '../src/monitor.ts';

const SOURCE_SHA = 'a'.repeat(40);

function createDatabase({ fail = false }: { fail?: boolean } = {}) {
  const batches: PersistedStatement[][] = [];
  const runs: PersistedStatement[] = [];
  const database = {
    prepare(query: string) {
      return {
        bind(...values: unknown[]) {
          return {
            query,
            values,
            async all() {
              return { results: [] };
            },
            async run() {
              runs.push({ query, values });
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
    async batch(statements: PersistedStatement[]) {
      if (fail) throw new Error('D1 unavailable');
      batches.push(statements);
      return [];
    },
  };
  return { database, batches, runs };
}

function env(database: unknown, sourceSha = SOURCE_SHA): MapMonitorEnv {
  return {
    DB: database as D1Database,
    BROWSER: {} as Fetcher,
    MAP_MONITOR_SOURCE_SHA: sourceSha,
    MAP_MONITOR_BASE_URL: 'https://createsomething.agency',
    MAP_MONITOR_RECEIPT_RETENTION_DAYS: '30',
    CF_VERSION_METADATA: { id: 'worker-version', tag: 'production', timestamp: '2026-08-25T00:00:00Z' },
  };
}

test('scheduled monitor writes a complete sanitized passing receipt', async () => {
  const { database, batches } = createDatabase();
  const receipt = await runScheduledMapMonitor({
    scheduledAt: '2026-08-25T18:07:00.000Z',
    env: env(database),
    executeSynthetic: async () => ({
      checks: REQUIRED_MAP_CHECK_IDS.map((id, index) => ({ id, ok: true, durationMs: index + 1 })),
    }),
    now: () => new Date('2026-08-25T18:07:20.000Z'),
  });

  assert.equal(receipt.status, 'passed');
  assert.equal(receipt.complete, true);
  assert.equal(receipt.sourceSha, SOURCE_SHA);
  assert.equal(receipt.customerDataUsed, false);
  assert.equal(receipt.agentMutationUsed, false);
  assert.equal(receipt.bookingSubmitted, false);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 3, 'receipt and alert retention plus insert are one D1 batch');
  const insert = batches[0][2];
  assert.match(insert.query, /INSERT OR IGNORE INTO map_production_monitor_receipts/);
  assert.equal(insert.values[8], 'passed');
  assert.deepEqual(JSON.parse(String(insert.values[13])), receipt.checks);
});

test('scheduled monitor records a red receipt and rejects when a required check fails', async () => {
  const { database, batches } = createDatabase();
  await assert.rejects(
    () =>
      runScheduledMapMonitor({
        scheduledAt: '2026-08-25T18:22:00.000Z',
        env: env(database),
        executeSynthetic: async () => ({
          checks: [
            {
              id: 'desktop_map_health',
              ok: false,
              code: 'HTTP_503',
              durationMs: 9,
            },
          ],
        }),
        now: () => new Date('2026-08-25T18:22:20.000Z'),
      }),
    /failed/
  );

  const receipt = JSON.parse(String(batches[0][2].values[13]));
  assert.equal(batches[0][2].values[8], 'failed');
  assert.deepEqual(receipt, [
    { id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 },
    { id: 'synthetic_completeness', ok: false, code: 'REQUIRED_CHECK_MISSING', durationMs: 0 },
  ]);
});

test('two consecutive scheduled failures deliver one idempotent CRE-1289 operator escalation', async () => {
  const { database, runs } = createDatabase();
  let alert: unknown = null;
  const failureStreak = [
    { receipt_id: 'map-20260825180700-aaaaaaaaaaaa', scheduled_at: '2026-08-25T18:07:00.000Z' },
    { receipt_id: 'map-20260825182200-aaaaaaaaaaaa', scheduled_at: '2026-08-25T18:22:00.000Z' },
  ];
  const streakDatabase = {
    ...database,
    prepare(query: string) {
      const statement = database.prepare(query);
      return {
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          if (query.includes('latest_passing_receipt')) {
            return { ...bound, all: async () => ({ results: failureStreak }) };
          }
          return bound;
        },
      };
    },
  };

  await assert.rejects(
    () =>
      runScheduledMapMonitor({
        scheduledAt: '2026-08-25T18:22:00.000Z',
        env: env(streakDatabase),
        executeSynthetic: async () => ({
          checks: [{ id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 }],
        }),
        notifyOperator: async (input) => {
          alert = input;
        },
        now: () => new Date('2026-08-25T18:22:20.000Z'),
      }),
    /failed/
  );

  assert.deepEqual(alert, {
    alertId: 'map-monitor-escalation-map-20260825180700-aaaaaaaaaaaa',
    consecutiveFailures: 2,
    failureStreakStartedAt: '2026-08-25T18:07:00.000Z',
    thresholdReceiptId: 'map-20260825182200-aaaaaaaaaaaa',
    sourceSha: SOURCE_SHA,
    severity: 'SEV-3',
    failedCheckCodes: ['HTTP_503', 'REQUIRED_CHECK_MISSING'],
  });
  assert.ok(runs.some((statement) => statement.query.includes('INSERT OR IGNORE INTO map_production_monitor_alerts')));
  assert.ok(runs.some((statement) => statement.query.includes("delivery_status = 'delivered'")));
});

test('already-delivered two-failure escalation is not sent again', async () => {
  const { database } = createDatabase();
  let deliveryCount = 0;
  const failureStreak = [
    { receipt_id: 'map-20260825180700-aaaaaaaaaaaa', scheduled_at: '2026-08-25T18:07:00.000Z' },
    { receipt_id: 'map-20260825182200-aaaaaaaaaaaa', scheduled_at: '2026-08-25T18:22:00.000Z' },
  ];
  const deliveredDatabase = {
    ...database,
    prepare(query: string) {
      const statement = database.prepare(query);
      return {
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          if (query.includes('latest_passing_receipt')) {
            return { ...bound, all: async () => ({ results: failureStreak }) };
          }
          if (query.includes("delivery_status = 'delivering'")) {
            return { ...bound, run: async () => ({ meta: { changes: 0 } }) };
          }
          return bound;
        },
      };
    },
  };

  await assert.rejects(
    () =>
      runScheduledMapMonitor({
        scheduledAt: '2026-08-25T18:22:00.000Z',
        env: env(deliveredDatabase),
        executeSynthetic: async () => ({
          checks: [{ id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 }],
        }),
        notifyOperator: async () => {
          deliveryCount += 1;
        },
      }),
    /failed/
  );

  assert.equal(deliveryCount, 0);
});

test('invalid source provenance produces a persisted red receipt before browser work', async () => {
  const { database, batches } = createDatabase();
  let ranSynthetic = false;
  await assert.rejects(
    () =>
      runScheduledMapMonitor({
        scheduledAt: '2026-08-25T18:37:00.000Z',
        env: env(database, 'not-a-commit'),
        executeSynthetic: async () => {
          ranSynthetic = true;
          return { checks: [] };
        },
        now: () => new Date('2026-08-25T18:37:20.000Z'),
      }),
    /failed/
  );
  assert.equal(ranSynthetic, false);
  assert.equal(batches[0][2].values[8], 'failed');
  assert.match(String(batches[0][2].values[13]), /SOURCE_SHA_INVALID/);
});

test('a receipt-store failure rejects rather than allowing an unrecorded green', async () => {
  const { database } = createDatabase({ fail: true });
  await assert.rejects(
    () =>
      runScheduledMapMonitor({
        scheduledAt: '2026-08-25T18:52:00.000Z',
        env: env(database),
        executeSynthetic: async () => ({
          checks: REQUIRED_MAP_CHECK_IDS.map((id) => ({ id, ok: true, durationMs: 1 })),
        }),
        now: () => new Date('2026-08-25T18:52:20.000Z'),
      }),
    /D1 unavailable/
  );
});
