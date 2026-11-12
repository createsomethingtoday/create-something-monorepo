import { createExecutionContext, env, runInDurableObject, SELF } from 'cloudflare:test';
import { exports } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudienceReports } from './worker.js';

const windows = {
  current: { start: '2026-11-04T00:00:00.000Z', end: '2026-11-11T00:00:00.000Z' },
  prior: { start: '2026-10-28T00:00:00.000Z', end: '2026-11-04T00:00:00.000Z' }
};
const host = () => env.SCHEDULER.getByName('micah-johnson');
afterEach(() => vi.restoreAllMocks());

async function seed(records: Array<[string, string, string, string, Record<string, unknown>?]>) {
  await runInDurableObject(host(), async (_instance, state) => {
    await state.storage.deleteAlarm();
    state.storage.sql.exec('DROP TABLE IF EXISTS receipts');
    state.storage.sql.exec('CREATE TABLE receipts(receipt_id TEXT PRIMARY KEY,status TEXT NOT NULL,occurred_at TEXT NOT NULL,receipt_json TEXT NOT NULL)');
    for (const [id, status, at, bookingId, extra] of records) {
      state.storage.sql.exec('INSERT INTO receipts VALUES(?,?,?,?)', id, status, at,
        JSON.stringify({ receiptId: id, status, occurredAt: at, bookingId, ...extra }));
    }
  });
}

// The installed pool's same-isolate RPC error wrapper emits duplicate unhandled
// rejections. Catch expected SQL failures inside the real DO instead; success
// still exercises the full named-entrypoint RPC path.
async function readError(): Promise<string | null> {
  return runInDurableObject(host(), async (instance) => {
    try {
      instance.getBookingSummary(windows);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Unexpected error';
    }
  });
}

describe('private scheduler audience report', () => {
  it('reads empty existing receipts through the named entrypoint without creating scheduling schema', async () => {
    await seed([]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const result = await exports.AudienceReports.getBookingSummary(windows);
      expect(result).toEqual({
        source: 'scheduler-receipts',
        current: { committed: 0, rescheduled: 0, cancelled: 0 },
        prior: { committed: 0, rescheduled: 0, cancelled: 0 },
        latestAt: null
      });
      expect(fetchSpy).not.toHaveBeenCalled();
      const after = await runInDurableObject(host(), async (_instance, state) => ({
        tables: state.storage.sql.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").toArray().map(row => row.name),
        alarm: await state.storage.getAlarm()
      }));
      expect(after.tables).toEqual(['receipts']);
      expect(after.alarm).toBeNull();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('counts initial committed IDs, separately from reschedule/cancel receipts, with exact UTC boundaries', async () => {
    await seed([
      ['prior-start', 'committed', '2026-10-28 00:00:00', 'prior-booking'],
      ['replayed-in-current', 'committed', '2026-11-05T10:00:00Z', 'prior-booking'],
      ['current-start', 'committed', '2026-11-04 00:00:00', 'current-booking', {
        context: { source: 'services', warmupNotes: 'Private notes', email: 'private@example.com' },
        actionToken: 'private-action', meetUrl: 'https://meet.google.com/private'
      }],
      ['current-replay', 'committed', '2026-11-04T00:00:00.000Z', 'current-booking'],
      ['current-end', 'committed', '2026-11-11T00:00:00.000Z', 'end-excluded'],
      ['earlier', 'committed', '2026-10-27T23:59:59.999Z', 'earlier-booking'],
      ['earlier-replay', 'committed', '2026-11-07T00:00:00Z', 'earlier-booking'],
      ['prior-reschedule', 'rescheduled', '2026-11-03T23:59:59.999Z', 'prior-booking'],
      ['current-reschedule', 'rescheduled', '2026-11-04T00:00:00.000Z', 'current-booking'],
      ['current-cancel', 'cancelled', '2026-11-06T12:00:00Z', 'current-booking'],
      ['notification', 'notification_sent', '2026-11-08T00:00:00Z', 'current-booking']
    ]);
    const before = await runInDurableObject(host(), async (_instance, state) => {
      await state.storage.setAlarm(Date.parse('2099-01-01T00:00:00Z'));
      return {
        changes: state.storage.sql.exec<{ n: number }>('SELECT total_changes() AS n').toArray()[0]?.n,
        rows: state.storage.sql.exec<{ count: number }>('SELECT COUNT(*) AS count FROM receipts').toArray()[0]?.count,
        alarm: await state.storage.getAlarm()
      };
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await exports.AudienceReports.getBookingSummary(windows);
    expect(result).toEqual({
      source: 'scheduler-receipts',
      current: { committed: 1, rescheduled: 1, cancelled: 1 },
      prior: { committed: 1, rescheduled: 1, cancelled: 0 },
      latestAt: '2026-11-06T12:00:00.000Z'
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/private|bookingId|receiptId|context|actionToken|meetUrl/);
    const after = await runInDurableObject(host(), async (_instance, state) => ({
      changes: state.storage.sql.exec<{ n: number }>('SELECT total_changes() AS n').toArray()[0]?.n,
      rows: state.storage.sql.exec<{ count: number }>('SELECT COUNT(*) AS count FROM receipts').toArray()[0]?.count,
      alarm: await state.storage.getAlarm()
    }));
    expect(after).toEqual(before);
  });

  it('leaves missing receipt storage unavailable and uninitialized', async () => {
    await seed([]);
    await runInDurableObject(host(), async (_instance, state) => {
      state.storage.sql.exec('DROP TABLE IF EXISTS receipts');
    });
    expect(await readError()).toBe('Scheduler receipt report unavailable.');
    const after = await runInDurableObject(host(), async (_instance, state) => ({
      receipts: state.storage.sql.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE name='receipts'").toArray(),
      alarm: await state.storage.getAlarm()
    }));
    expect(after.receipts).toEqual([]);
    expect(after.alarm).toBeNull();
  });

  it('fails unavailable for malformed lifecycle evidence instead of silently undercounting', async () => {
    await seed([]);
    await runInDurableObject(host(), async (_instance, state) => {
      state.storage.sql.exec('INSERT INTO receipts VALUES(?,?,?,?)', 'corrupt', 'committed', '2026-11-05', '{invalid');
    });
    expect(await readError()).toBe('Scheduler receipt report unavailable.');
  });

  it('reads only the fixed first-party host, never another host selected by a caller', async () => {
    await seed([]);
    const other = env.SCHEDULER.getByName(`other-host-${crypto.randomUUID()}`);
    await runInDurableObject(other, async (_instance, state) => {
      state.storage.sql.exec('CREATE TABLE receipts(receipt_id TEXT PRIMARY KEY,status TEXT,occurred_at TEXT,receipt_json TEXT)');
      state.storage.sql.exec('INSERT INTO receipts VALUES(?,?,?,?)', 'foreign', 'committed', '2026-11-05T00:00:00Z',
        JSON.stringify({ status: 'committed', bookingId: 'foreign-booking' }));
    });
    expect((await exports.AudienceReports.getBookingSummary(windows)).current.committed).toBe(0);
  });

  it('fails unavailable when receipt storage exceeds the safety cap instead of reporting a sample', async () => {
    await seed([]);
    await runInDurableObject(host(), async (_instance, state) => {
      state.storage.sql.exec(`WITH RECURSIVE seq(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM seq WHERE n < 50001)
        INSERT INTO receipts SELECT CAST(n AS TEXT),'notification_sent','2026-11-05','{}' FROM seq`);
    });
    expect(await readError()).toBe('Scheduler receipt report unavailable.');
  });

  it('rejects nonadjacent, unequal, partial-day, invalid, future and extra-dimension requests', async () => {
    const invalid = [
      null,
      { ...windows, host: 'another-customer' },
      { ...windows, current: { ...windows.current, email: 'private@example.com' } },
      { ...windows, current: { ...windows.current, start: '2026-11-05T00:00:00Z' } },
      { ...windows, prior: { ...windows.prior, end: '2026-11-03T00:00:00Z' } },
      { ...windows, current: { ...windows.current, start: '2026-11-04T01:00:00Z' } },
      { ...windows, current: { ...windows.current, start: '2026-02-30T00:00:00Z' } },
      { current: { start: '2099-11-04T00:00:00Z', end: '2099-11-11T00:00:00Z' },
        prior: { start: '2099-10-28T00:00:00Z', end: '2099-11-04T00:00:00Z' } }
    ];
    const reports = new AudienceReports(createExecutionContext(), env);
    for (const input of invalid)
      await expect(reports.getBookingSummary(input)).rejects.toThrow();
  });

  it('keeps the capability off public HTTP routes even with a fabricated internal header', async () => {
    const response = await SELF.fetch('https://scheduler.local/api/v1/audience/booking-summary', {
      headers: { 'x-internal': 'true' }
    });
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain('scheduler-receipts');
  });
});
