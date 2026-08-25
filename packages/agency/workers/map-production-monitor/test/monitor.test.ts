import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
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
  const storedReceipts = new Map<string, Record<string, unknown>>();
  const database = {
    prepare(query: string) {
      return {
        bind(...values: unknown[]) {
          return {
            query,
            values,
            async all() {
              if (
                query.includes('FROM map_production_monitor_receipts') &&
                query.includes("WHERE trigger = 'scheduled' AND scheduled_at = ?")
              ) {
                const receipt = storedReceipts.get(String(values[0]));
                return { results: receipt ? [receipt] : [] };
              }
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
      const receiptInsert = statements.find((statement) =>
        statement.query.includes('INSERT OR IGNORE INTO map_production_monitor_receipts'),
      );
      if (receiptInsert && !storedReceipts.has(String(receiptInsert.values[3]))) {
        storedReceipts.set(String(receiptInsert.values[3]), {
          receipt_id: receiptInsert.values[0],
          schema_version: receiptInsert.values[1],
          trigger: receiptInsert.values[2],
          scheduled_at: receiptInsert.values[3],
          completed_at: receiptInsert.values[4],
          source_sha: receiptInsert.values[5],
          worker_version: receiptInsert.values[6],
          base_url: receiptInsert.values[7],
          status: receiptInsert.values[8],
          complete: receiptInsert.values[9],
          customer_data_used: receiptInsert.values[10],
          agent_mutation_used: receiptInsert.values[11],
          booking_submitted: receiptInsert.values[12],
          checks_json: receiptInsert.values[13],
        });
      }
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
  assert.equal(batches[0].length, 4, 'receipt, alert retention, and streak resolution are one D1 batch');
  const insert = batches[0][2];
  assert.match(insert.query, /INSERT OR IGNORE INTO map_production_monitor_receipts/);
  assert.equal(insert.values[8], 'passed');
  assert.deepEqual(JSON.parse(String(insert.values[13])), receipt.checks);
});

test('receipt retention keeps undelivered operator escalations until they are delivered', async () => {
  const { database, batches } = createDatabase();
  await runScheduledMapMonitor({
    scheduledAt: '2026-08-25T18:10:00.000Z',
    env: env(database),
    executeSynthetic: async () => ({
      checks: REQUIRED_MAP_CHECK_IDS.map((id) => ({ id, ok: true, durationMs: 1 })),
    }),
    now: () => new Date('2026-08-25T18:10:20.000Z'),
  });

  const alertCleanup = batches[0][1];
  assert.match(alertCleanup.query, /delivery_status = 'delivered'/);
  assert.match(alertCleanup.query, /streak_resolved_at IS NOT NULL/);
});

test('scheduled monitor records completion only after browser work finishes', async () => {
  const { database } = createDatabase();
  let syntheticFinished = false;
  const receipt = await runScheduledMapMonitor({
    scheduledAt: '2026-08-25T18:14:00.000Z',
    env: env(database),
    executeSynthetic: async () => {
      syntheticFinished = true;
      return {
        checks: REQUIRED_MAP_CHECK_IDS.map((id) => ({ id, ok: true, durationMs: 1 })),
      };
    },
    now: () => {
      assert.equal(syntheticFinished, true, 'completion time must be read after browser work');
      return new Date('2026-08-25T18:14:20.000Z');
    },
  });

  assert.equal(receipt.completedAt, '2026-08-25T18:14:20.000Z');
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

test('a duplicate scheduled invocation honors its canonical stored failure without new side effects', async () => {
  const { database, batches } = createDatabase();
  const storedReceipt = {
    schema_version: 1,
    receipt_id: 'map-20260825182200-aaaaaaaaaaaa',
    trigger: 'scheduled',
    scheduled_at: '2026-08-25T18:22:00.000Z',
    completed_at: '2026-08-25T18:22:20.000Z',
    source_sha: SOURCE_SHA,
    worker_version: 'worker-version',
    base_url: 'https://createsomething.agency',
    status: 'failed',
    complete: 1,
    customer_data_used: 0,
    agent_mutation_used: 0,
    booking_submitted: 0,
    checks_json: JSON.stringify([
      { id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 },
    ]),
  };
  const duplicateDatabase = {
    ...database,
    prepare(query: string) {
      const statement = database.prepare(query);
      return {
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          if (query.includes("WHERE trigger = 'scheduled' AND scheduled_at = ?")) {
            return { ...bound, all: async () => ({ results: [storedReceipt] }) };
          }
          return bound;
        },
      };
    },
  };
  let ranSynthetic = false;

  await assert.rejects(
    () =>
      runScheduledMapMonitor({
        scheduledAt: storedReceipt.scheduled_at,
        env: env(duplicateDatabase),
        executeSynthetic: async () => {
          ranSynthetic = true;
          return {
            checks: REQUIRED_MAP_CHECK_IDS.map((id) => ({ id, ok: true, durationMs: 1 })),
          };
        },
      }),
    new RegExp(storedReceipt.receipt_id),
  );

  assert.equal(ranSynthetic, false);
  assert.equal(batches.length, 0);
});

test('a conflicting concurrent result honors the stored canonical outcome and guards alert mutation', async () => {
  const { database, batches } = createDatabase();
  const scheduledAt = '2026-08-25T18:22:00.000Z';
  const canonicalReceipt = {
    schema_version: 1,
    receipt_id: 'map-20260825182200-aaaaaaaaaaaa',
    trigger: 'scheduled',
    scheduled_at: scheduledAt,
    completed_at: '2026-08-25T18:22:20.000Z',
    source_sha: SOURCE_SHA,
    worker_version: 'worker-version',
    base_url: 'https://createsomething.agency',
    status: 'passed',
    complete: 1,
    customer_data_used: 0,
    agent_mutation_used: 0,
    booking_submitted: 0,
    checks_json: JSON.stringify(
      REQUIRED_MAP_CHECK_IDS.map((id) => ({ id, ok: true, durationMs: 1 })),
    ),
  };
  const priorFailure = {
    receipt_id: 'map-20260825180700-aaaaaaaaaaaa',
    scheduled_at: '2026-08-25T18:07:00.000Z',
    checks_json: JSON.stringify([
      { id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 },
    ]),
  };
  let receiptReads = 0;
  const concurrentDatabase = {
    ...database,
    prepare(query: string) {
      const statement = database.prepare(query);
      return {
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          if (query.includes("WHERE trigger = 'scheduled' AND scheduled_at = ?")) {
            receiptReads += 1;
            return {
              ...bound,
              all: async () => ({ results: receiptReads === 1 ? [] : [canonicalReceipt] }),
            };
          }
          if (query.includes('latest_passing_receipt')) {
            return { ...bound, all: async () => ({ results: [priorFailure] }) };
          }
          if (query.includes('streak_resolved_at IS NULL')) {
            return { ...bound, all: async () => ({ results: [] }) };
          }
          return bound;
        },
      };
    },
  };

  const receipt = await runScheduledMapMonitor({
    scheduledAt,
    env: env(concurrentDatabase),
    executeSynthetic: async () => ({
      checks: [{ id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 }],
    }),
    now: () => new Date('2026-08-25T18:22:20.000Z'),
  });

  assert.equal(receipt.status, 'passed');
  const alertInsert = batches[0].find((statement) =>
    statement.query.includes('INSERT OR IGNORE INTO map_production_monitor_alerts'),
  );
  if (!alertInsert) throw new Error('expected a guarded alert insert');
  assert.match(alertInsert.query, /WHERE EXISTS \(\s*SELECT 1 FROM map_production_monitor_receipts/s);
  assert.deepEqual(alertInsert.values.slice(-6, -3), [
    'map-20260825182200-aaaaaaaaaaaa',
    'scheduled',
    scheduledAt,
  ]);
  assert.equal(alertInsert.values.at(-3), 'failed');
});

test('a passing receipt resolves only failure streaks that began before its scheduled timestamp', async () => {
  const { database, batches } = createDatabase();
  const scheduledAt = '2026-08-25T18:22:00.000Z';

  await runScheduledMapMonitor({
    scheduledAt,
    env: env(database),
    executeSynthetic: async () => ({
      checks: REQUIRED_MAP_CHECK_IDS.map((id) => ({ id, ok: true, durationMs: 1 })),
    }),
    now: () => new Date('2026-08-25T18:22:20.000Z'),
  });

  const resolution = batches[0].find((statement) =>
    statement.query.includes('SET streak_resolved_at = ?'),
  );
  if (!resolution) throw new Error('expected a guarded alert resolution');
  assert.match(resolution.query, /failure_streak_started_at < \?/);
  assert.equal(resolution.values.at(-1), scheduledAt);
});

test('a concurrent booking-context failure merges its SEV-2 evidence into a created alert', async () => {
  const { database, batches } = createDatabase();
  const scheduledAt = '2026-08-25T18:22:00.000Z';
  const priorFailure = {
    receipt_id: 'map-20260825180700-aaaaaaaaaaaa',
    scheduled_at: '2026-08-25T18:07:00.000Z',
    checks_json: JSON.stringify([
      { id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 },
    ]),
  };
  const concurrentDatabase = {
    ...database,
    prepare(query: string) {
      const statement = database.prepare(query);
      return {
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          if (query.includes('latest_passing_receipt')) {
            return { ...bound, all: async () => ({ results: [priorFailure] }) };
          }
          if (query.includes('streak_resolved_at IS NULL')) {
            return { ...bound, all: async () => ({ results: [] }) };
          }
          return bound;
        },
      };
    },
  };

  await assert.rejects(
    () =>
      runScheduledMapMonitor({
        scheduledAt,
        env: env(concurrentDatabase),
        executeSynthetic: async () => ({
          checks: [
            {
              id: 'desktop_starter_booking_context',
              ok: false,
              code: 'BOOKING_CONTEXT_MISMATCH',
              durationMs: 9,
            },
          ],
        }),
        now: () => new Date('2026-08-25T18:22:20.000Z'),
      }),
    /failed/,
  );

  const merge = batches[0].find((statement) =>
    statement.query.includes('json_valid(failed_check_codes_json)'),
  );
  if (!merge) throw new Error('expected a conflict-aware alert merge');
  assert.match(merge.query, /severity = 'SEV-2' OR \? = 'SEV-2'/);
  assert.match(merge.query, /json_each\(\?\)/);
  assert.equal(merge.values[1], 'SEV-2');
  assert.deepEqual(JSON.parse(String(merge.values[2])), [
    'HTTP_503',
    'BOOKING_CONTEXT_MISMATCH',
    'REQUIRED_CHECK_MISSING',
  ]);
});

test('two consecutive scheduled failures deliver one idempotent CRE-1289 operator escalation', async () => {
  const { database, batches, runs } = createDatabase();
  let alert: unknown = null;
  const failureStreak = [
    {
      receipt_id: 'map-20260825180700-aaaaaaaaaaaa',
      scheduled_at: '2026-08-25T18:07:00.000Z',
      checks_json: JSON.stringify([
        {
          id: 'desktop_starter_booking_context',
          ok: false,
          code: 'BOOKING_CONTEXT_MISMATCH',
          durationMs: 9,
        },
      ]),
    },
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
          if (query.includes('streak_resolved_at IS NULL')) {
            return { ...bound, all: async () => ({ results: [] }) };
          }
          if (query.includes("delivery_status = 'pending'")) {
            return {
              ...bound,
              all: async () => ({
                results: [
                  {
                    alert_id: 'map-monitor-escalation-map-20260825180700-aaaaaaaaaaaa',
                    failure_streak_started_at: '2026-08-25T18:07:00.000Z',
                    threshold_receipt_id: 'map-20260825182200-aaaaaaaaaaaa',
                    source_sha: SOURCE_SHA,
                    severity: 'SEV-2',
                    notification_revision: 1,
                    failed_check_codes_json: JSON.stringify([
                      'BOOKING_CONTEXT_MISMATCH',
                      'HTTP_503',
                      'REQUIRED_CHECK_MISSING',
                    ]),
                  },
                ],
              }),
            };
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
    severity: 'SEV-2',
    failedCheckCodes: ['BOOKING_CONTEXT_MISMATCH', 'HTTP_503', 'REQUIRED_CHECK_MISSING'],
    notificationRevision: 1,
  });
  assert.ok(
    batches[0].some((statement) => statement.query.includes('map_production_monitor_receipts')) &&
      batches[0].some((statement) => statement.query.includes('INSERT OR IGNORE INTO map_production_monitor_alerts')),
    'the threshold receipt and its alert marker must be one D1 batch',
  );
  const alertInsert = batches[0].find((statement) => statement.query.includes('INSERT OR IGNORE INTO map_production_monitor_alerts'));
  assert.ok(alertInsert);
  assert.equal(alertInsert.values[5], 'SEV-2');
  assert.deepEqual(JSON.parse(String(alertInsert.values[6])), [
    'BOOKING_CONTEXT_MISMATCH',
    'HTTP_503',
    'REQUIRED_CHECK_MISSING',
  ]);
  assert.ok(runs.some((statement) => statement.query.includes("delivery_status = 'delivered'")));
});

test('an unresolved alert retains its identity after older receipt retention expires', async () => {
  const { database, batches } = createDatabase();
  const retainedFailure = {
    receipt_id: 'map-20260716180700-aaaaaaaaaaaa',
    scheduled_at: '2026-07-16T18:07:00.000Z',
    checks_json: JSON.stringify([
      { id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 },
    ]),
  };
  const activeAlert = {
    alert_id: 'map-monitor-escalation-map-20260716180700-aaaaaaaaaaaa',
    failure_streak_started_at: retainedFailure.scheduled_at,
    threshold_receipt_id: 'map-20260716182200-aaaaaaaaaaaa',
    source_sha: SOURCE_SHA,
    severity: 'SEV-3',
    failed_check_codes_json: JSON.stringify(['HTTP_503', 'REQUIRED_CHECK_MISSING']),
    delivery_status: 'delivered',
    notification_revision: 1,
  };
  const activeDatabase = {
    ...database,
    prepare(query: string) {
      const statement = database.prepare(query);
      return {
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          if (query.includes('latest_passing_receipt')) {
            return { ...bound, all: async () => ({ results: [retainedFailure] }) };
          }
          if (query.includes('streak_resolved_at IS NULL')) {
            return { ...bound, all: async () => ({ results: [activeAlert] }) };
          }
          if (query.includes("delivery_status = 'pending'")) {
            return { ...bound, all: async () => ({ results: [] }) };
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
        env: env(activeDatabase),
        executeSynthetic: async () => ({
          checks: [{ id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 }],
        }),
        now: () => new Date('2026-08-25T18:22:20.000Z'),
      }),
    /failed/,
  );

  assert.equal(
    batches[0].filter((statement) => statement.query.includes('INSERT OR IGNORE INTO map_production_monitor_alerts')).length,
    0,
    'a retained unresolved alert is the durable streak identity, even when prior receipt rows expire',
  );
});

test('raises a delivered active streak to SEV-2 in an atomically staged alert revision', async () => {
  const { database, batches } = createDatabase();
  let notification: unknown = null;
  const priorFailure = {
    receipt_id: 'map-20260825180700-aaaaaaaaaaaa',
    scheduled_at: '2026-08-25T18:07:00.000Z',
    checks_json: JSON.stringify([
      { id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 },
    ]),
  };
  const activeDatabase = {
    ...database,
    prepare(query: string) {
      const statement = database.prepare(query);
      return {
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          if (query.includes('latest_passing_receipt')) {
            return { ...bound, all: async () => ({ results: [priorFailure] }) };
          }
          if (query.includes('streak_resolved_at IS NULL')) {
            return {
              ...bound,
              all: async () => ({
                results: [
                  {
                    alert_id: 'map-monitor-escalation-map-20260825180700-aaaaaaaaaaaa',
                    failure_streak_started_at: priorFailure.scheduled_at,
                    threshold_receipt_id: 'map-20260825182200-aaaaaaaaaaaa',
                    source_sha: SOURCE_SHA,
                    severity: 'SEV-3',
                    failed_check_codes_json: JSON.stringify(['HTTP_503']),
                    delivery_status: 'delivered',
                    notification_revision: 1,
                  },
                ],
              }),
            };
          }
          if (query.includes("delivery_status = 'pending'")) {
            return {
              ...bound,
              all: async () => ({
                results: [
                  {
                    alert_id: 'map-monitor-escalation-map-20260825180700-aaaaaaaaaaaa',
                    failure_streak_started_at: priorFailure.scheduled_at,
                    threshold_receipt_id: 'map-20260825182200-aaaaaaaaaaaa',
                    source_sha: SOURCE_SHA,
                    severity: 'SEV-2',
                    failed_check_codes_json: JSON.stringify([
                      'HTTP_503',
                      'BOOKING_CONTEXT_MISMATCH',
                      'REQUIRED_CHECK_MISSING',
                    ]),
                    notification_revision: 2,
                  },
                ],
              }),
            };
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
        env: env(activeDatabase),
        executeSynthetic: async () => ({
          checks: [
            {
              id: 'desktop_starter_booking_context',
              ok: false,
              code: 'BOOKING_CONTEXT_MISMATCH',
              durationMs: 9,
            },
          ],
        }),
        notifyOperator: async (escalation) => {
          notification = escalation;
        },
      }),
    /failed/,
  );

  const requeue = batches[0].find((statement) =>
    statement.query.includes('notification_revision = notification_revision + 1'),
  );
  if (!requeue) throw new Error('expected a current-state-fenced alert requeue');
  assert.ok(requeue.query.includes("delivery_status = 'pending'"));
  assert.match(requeue.query, /severity = 'SEV-3' AND \? = 'SEV-2'/);
  const merge = batches[0].find((statement) =>
    statement.query.includes('json_valid(failed_check_codes_json)'),
  );
  if (!merge) throw new Error('expected an active alert conflict-aware merge');
  assert.equal(merge.values[0], SOURCE_SHA);
  assert.equal(merge.values[1], 'SEV-2');
  assert.deepEqual(notification, {
    alertId: 'map-monitor-escalation-map-20260825180700-aaaaaaaaaaaa',
    consecutiveFailures: 2,
    failureStreakStartedAt: priorFailure.scheduled_at,
    thresholdReceiptId: 'map-20260825182200-aaaaaaaaaaaa',
    sourceSha: SOURCE_SHA,
    severity: 'SEV-2',
    failedCheckCodes: ['HTTP_503', 'BOOKING_CONTEXT_MISMATCH', 'REQUIRED_CHECK_MISSING'],
    notificationRevision: 2,
  });
});

test('an availability-only stale update cannot downgrade a concurrently promoted alert', async () => {
  const { database, batches } = createDatabase();
  const scheduledAt = '2026-08-25T18:22:00.000Z';
  const priorFailure = {
    receipt_id: 'map-20260825180700-aaaaaaaaaaaa',
    scheduled_at: '2026-08-25T18:07:00.000Z',
    checks_json: JSON.stringify([
      { id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 },
    ]),
  };
  const staleSnapshot = {
    alert_id: 'map-monitor-escalation-map-20260825180700-aaaaaaaaaaaa',
    failure_streak_started_at: priorFailure.scheduled_at,
    threshold_receipt_id: 'map-20260825182200-aaaaaaaaaaaa',
    source_sha: SOURCE_SHA,
    severity: 'SEV-3',
    failed_check_codes_json: JSON.stringify(['HTTP_503']),
    delivery_status: 'delivered',
    notification_revision: 1,
  };
  const concurrentDatabase = {
    ...database,
    prepare(query: string) {
      const statement = database.prepare(query);
      return {
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          if (query.includes('latest_passing_receipt')) {
            return { ...bound, all: async () => ({ results: [priorFailure] }) };
          }
          if (query.includes('streak_resolved_at IS NULL')) {
            return { ...bound, all: async () => ({ results: [staleSnapshot] }) };
          }
          if (query.includes("delivery_status = 'pending'")) {
            return { ...bound, all: async () => ({ results: [] }) };
          }
          return bound;
        },
      };
    },
  };

  await assert.rejects(
    () =>
      runScheduledMapMonitor({
        scheduledAt,
        env: env(concurrentDatabase),
        executeSynthetic: async () => ({
          checks: [{ id: 'desktop_map_health', ok: false, code: 'HTTP_503', durationMs: 9 }],
        }),
        now: () => new Date('2026-08-25T18:22:20.000Z'),
      }),
    /failed/,
  );

  const merge = batches[0].find((statement) =>
    statement.query.includes('json_valid(failed_check_codes_json)'),
  );
  if (!merge) throw new Error('expected an active alert conflict-aware merge');
  const mergeValues = merge.values.map((value) => String(value));
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec(`
      CREATE TABLE map_production_monitor_receipts (
        receipt_id TEXT, trigger TEXT, scheduled_at TEXT, status TEXT, source_sha TEXT, checks_json TEXT
      );
      CREATE TABLE map_production_monitor_alerts (
        alert_id TEXT, source_sha TEXT, severity TEXT, failed_check_codes_json TEXT,
        streak_resolved_at TEXT
      );
    `);
    sqlite
      .prepare('INSERT INTO map_production_monitor_receipts VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        mergeValues[4],
        mergeValues[5],
        mergeValues[6],
        mergeValues[7],
        mergeValues[8],
        mergeValues[9],
      );
    sqlite
      .prepare('INSERT INTO map_production_monitor_alerts VALUES (?, ?, ?, ?, NULL)')
      .run(
        staleSnapshot.alert_id,
        SOURCE_SHA,
        'SEV-2',
        JSON.stringify(['BOOKING_CONTEXT_MISMATCH']),
      );
    sqlite.prepare(merge.query).run(...mergeValues);
    const current = sqlite
      .prepare('SELECT severity, failed_check_codes_json FROM map_production_monitor_alerts')
      .get() as { severity: string; failed_check_codes_json: string };
    assert.equal(current.severity, 'SEV-2');
    assert.deepEqual(JSON.parse(current.failed_check_codes_json), [
      'BOOKING_CONTEXT_MISMATCH',
      'HTTP_503',
      'REQUIRED_CHECK_MISSING',
    ]);
  } finally {
    sqlite.close();
  }
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

test('retries a pending escalation on a later green scheduled receipt', async () => {
  const { database, runs } = createDatabase();
  let alert: unknown = null;
  const pendingEscalation = {
    alert_id: 'map-monitor-escalation-map-20260825180700-aaaaaaaaaaaa',
    failure_streak_started_at: '2026-08-25T18:07:00.000Z',
    threshold_receipt_id: 'map-20260825182200-aaaaaaaaaaaa',
    source_sha: SOURCE_SHA,
    severity: 'SEV-3',
    notification_revision: 1,
    failed_check_codes_json: JSON.stringify(['HTTP_503', 'REQUIRED_CHECK_MISSING']),
  };
  const retryDatabase = {
    ...database,
    prepare(query: string) {
      const statement = database.prepare(query);
      return {
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          if (query.includes('SELECT') && query.includes('map_production_monitor_alerts') && query.includes("delivery_status = 'pending'")) {
            return { ...bound, all: async () => ({ results: [pendingEscalation] }) };
          }
          return bound;
        },
      };
    },
  };

  const receipt = await runScheduledMapMonitor({
    scheduledAt: '2026-08-25T18:37:00.000Z',
    env: env(retryDatabase),
    executeSynthetic: async () => ({
      checks: REQUIRED_MAP_CHECK_IDS.map((id) => ({ id, ok: true, durationMs: 1 })),
    }),
    notifyOperator: async (input) => {
      alert = input;
    },
    now: () => new Date('2026-08-25T18:37:20.000Z'),
  });

  assert.equal(receipt.status, 'passed');
  assert.deepEqual(alert, {
    alertId: pendingEscalation.alert_id,
    consecutiveFailures: 2,
    failureStreakStartedAt: pendingEscalation.failure_streak_started_at,
    thresholdReceiptId: pendingEscalation.threshold_receipt_id,
    sourceSha: SOURCE_SHA,
    severity: 'SEV-3',
    failedCheckCodes: ['HTTP_503', 'REQUIRED_CHECK_MISSING'],
    notificationRevision: 1,
  });
  assert.ok(runs.some((statement) => statement.query.includes("delivery_status = 'delivered'")));
});

test('reclaims an expired delivering escalation on a later scheduled receipt', async () => {
  const { database, runs } = createDatabase();
  let alert: unknown = null;
  const interruptedEscalation = {
    alert_id: 'map-monitor-escalation-map-20260825180700-aaaaaaaaaaaa',
    failure_streak_started_at: '2026-08-25T18:07:00.000Z',
    threshold_receipt_id: 'map-20260825182200-aaaaaaaaaaaa',
    source_sha: SOURCE_SHA,
    severity: 'SEV-3',
    failed_check_codes_json: JSON.stringify(['HTTP_503', 'REQUIRED_CHECK_MISSING']),
  };
  const retryDatabase = {
    ...database,
    prepare(query: string) {
      const statement = database.prepare(query);
      return {
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          if (query.includes('SELECT') && query.includes('map_production_monitor_alerts')) {
            return { ...bound, all: async () => ({ results: [interruptedEscalation] }) };
          }
          if (query.includes("SET delivery_status = 'delivering'")) {
            return query.includes('delivery_lease_expires_at')
              ? bound
              : { ...bound, run: async () => ({ meta: { changes: 0 } }) };
          }
          return bound;
        },
      };
    },
  };

  const receipt = await runScheduledMapMonitor({
    scheduledAt: '2026-08-25T18:52:00.000Z',
    env: env(retryDatabase),
    executeSynthetic: async () => ({
      checks: REQUIRED_MAP_CHECK_IDS.map((id) => ({ id, ok: true, durationMs: 1 })),
    }),
    notifyOperator: async (input) => {
      alert = input;
    },
    now: () => new Date('2026-08-25T18:52:20.000Z'),
  });

  assert.equal(receipt.status, 'passed');
  assert.equal((alert as { alertId: string } | null)?.alertId, interruptedEscalation.alert_id);
  const claim = runs.find((statement) => statement.query.includes("SET delivery_status = 'delivering'"));
  assert.ok(claim?.query.includes('delivery_lease_expires_at'));
});

test('stale delivery claimant cannot reset a reclaimed escalation after its notifier fails', async () => {
  const { database, runs } = createDatabase();
  const queries: string[] = [];
  const interruptedEscalation = {
    alert_id: 'map-monitor-escalation-map-20260825180700-aaaaaaaaaaaa',
    failure_streak_started_at: '2026-08-25T18:07:00.000Z',
    threshold_receipt_id: 'map-20260825182200-aaaaaaaaaaaa',
    source_sha: SOURCE_SHA,
    severity: 'SEV-3',
    failed_check_codes_json: JSON.stringify(['HTTP_503', 'REQUIRED_CHECK_MISSING']),
  };
  const racedDatabase = {
    ...database,
    prepare(query: string) {
      queries.push(query);
      const statement = database.prepare(query);
      return {
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          if (query.includes('SELECT') && query.includes('map_production_monitor_alerts')) {
            return { ...bound, all: async () => ({ results: [interruptedEscalation] }) };
          }
          if (query.includes("SET delivery_status = 'pending'")) {
            return query.includes('delivery_claim_token')
              ? { ...bound, run: async () => ({ meta: { changes: 0 } }) }
              : bound;
          }
          return bound;
        },
      };
    },
  };

  const receipt = await runScheduledMapMonitor({
    scheduledAt: '2026-08-25T19:07:00.000Z',
    env: env(racedDatabase),
    executeSynthetic: async () => ({
      checks: REQUIRED_MAP_CHECK_IDS.map((id) => ({ id, ok: true, durationMs: 1 })),
    }),
    notifyOperator: async () => {
      throw new Error('stale claimant lost the lease');
    },
    now: () => new Date('2026-08-25T19:07:20.000Z'),
  });

  assert.equal(receipt.status, 'passed');
  assert.ok(runs.some((statement) => statement.query.includes("SET delivery_status = 'delivering'")));
  const reset = queries.find((query) => query.includes("SET delivery_status = 'pending'"));
  assert.ok(reset?.includes('delivery_claim_token'));
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
