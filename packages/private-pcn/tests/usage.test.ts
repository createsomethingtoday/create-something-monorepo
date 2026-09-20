import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { deliveryUsage, usagePeriod, withinDeliveryAllowance } from '../src/lib/server/usage';
let db: DatabaseSync;
let env: any;
let remote: any;
function statement(sql: string, values: any[] = []): any {
  return {
    bind: (...args: any[]) => statement(sql, args),
    first: async () => db.prepare(sql).get(...values) || null,
    run: async () => db.prepare(sql).run(...values)
  };
}
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(
    "CREATE TABLE networks(id TEXT PRIMARY KEY); INSERT INTO networks(id) VALUES('alpha'),('bravo')"
  );
  db.exec(readFileSync(new URL('../migrations/0005_delivery_usage.sql', import.meta.url), 'utf8'));
  env = {
    DB: { prepare: statement },
    CLOUDFLARE_ANALYTICS_API_TOKEN: 'fixture',
    CLOUDFLARE_ACCOUNT_ID: 'test-account'
  };
  remote = vi.fn(async () =>
    Response.json({
      data: {
        viewer: {
          accounts: [{ streamMinutesViewedAdaptiveGroups: [{ sum: { minutesViewed: 4999 } }] }]
        }
      },
      errors: null
    })
  );
  vi.stubGlobal('fetch', remote);
});
afterEach(() => {
  db.close();
  vi.unstubAllGlobals();
});
it('queries actual provider delivery for exactly one network and calendar month', async () => {
  expect(await withinDeliveryAllowance(env, 'alpha')).toBe(true);
  const request = JSON.parse(remote.mock.calls[0][1].body);
  expect(request.variables.creator).toBe('alpha');
  expect(request.query).toContain('minutesViewed');
  expect(usagePeriod(new Date('2026-12-31T23:59:59Z'))).toEqual({
    period: '2026-12',
    start: '2026-12-01',
    end: '2027-01-01'
  });
  await deliveryUsage(env, 'alpha');
  expect(remote).toHaveBeenCalledTimes(1);
});
it('stops at the allowance and never lowers prior reported usage', async () => {
  await deliveryUsage(env, 'alpha');
  db.exec('UPDATE network_usage SET checked_at=0');
  remote.mockResolvedValue(
    Response.json({
      data: {
        viewer: {
          accounts: [{ streamMinutesViewedAdaptiveGroups: [{ sum: { minutesViewed: 5000 } }] }]
        }
      },
      errors: null
    })
  );
  expect(await withinDeliveryAllowance(env, 'alpha')).toBe(false);
  db.exec('UPDATE network_usage SET checked_at=0');
  remote.mockResolvedValue(
    Response.json({
      data: {
        viewer: {
          accounts: [{ streamMinutesViewedAdaptiveGroups: [{ sum: { minutesViewed: 100 } }] }]
        }
      },
      errors: null
    })
  );
  expect(await withinDeliveryAllowance(env, 'alpha')).toBe(false);
});
it('fails closed on missing analytics permission, malformed data, or stale cache', async () => {
  await deliveryUsage(env, 'alpha');
  db.exec('UPDATE network_usage SET checked_at=0');
  remote.mockResolvedValue(Response.json({ errors: [{ message: 'Permission denied' }] }));
  await expect(withinDeliveryAllowance(env, 'alpha')).rejects.toThrow('verified');
  remote.mockResolvedValue(Response.json({ data: { viewer: { accounts: [] } } }));
  await expect(withinDeliveryAllowance(env, 'bravo')).rejects.toThrow('verified');
});
