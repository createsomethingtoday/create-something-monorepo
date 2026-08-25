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
  const database = {
    prepare(query: string) {
      return {
        bind(...values: unknown[]) {
          return { query, values };
        },
      };
    },
    async batch(statements: PersistedStatement[]) {
      if (fail) throw new Error('D1 unavailable');
      batches.push(statements);
      return [];
    },
  };
  return { database, batches };
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
  assert.equal(batches[0].length, 2, 'retention and insert are one D1 batch');
  const insert = batches[0][1];
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

  const receipt = JSON.parse(String(batches[0][1].values[13]));
  assert.equal(batches[0][1].values[8], 'failed');
  assert.deepEqual(receipt, [
    { id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 },
    { id: 'synthetic_completeness', ok: false, code: 'REQUIRED_CHECK_MISSING', durationMs: 0 },
  ]);
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
  assert.equal(batches[0][1].values[8], 'failed');
  assert.match(String(batches[0][1].values[13]), /SOURCE_SHA_INVALID/);
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
