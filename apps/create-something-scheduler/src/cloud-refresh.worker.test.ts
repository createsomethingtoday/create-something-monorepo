import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './worker.js';
import { DurableOAuthStore } from './auth/durable-oauth-store.js';

afterEach(() => vi.restoreAllMocks());

async function seed() {
  const stub = env.SCHEDULER.getByName('micah-johnson');
  await runInDurableObject(stub, async (_instance, state) => {
    await new DurableOAuthStore(state, 'controlled-oauth-encryption-secret').write({
      accessToken: 'controlled-access-token', refreshToken: 'controlled-refresh-token',
      expiresAt: '2099-01-01T00:00:00Z',
      grantedScopes: ['https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.freebusy',
        'https://www.googleapis.com/auth/calendar.calendarlist.readonly']
    });
    state.storage.kv.put('projection:webflow-google-calendar', { sentinel: 'unchanged' });
  });
  return stub;
}

describe('cloud Webflow refresh', () => {
  it('accepts busy periods crossing the query boundaries without losing their overlap', async () => {
    const stub = await seed();
    let from = '';
    let to = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const query = JSON.parse(String(init?.body));
      from = query.timeMin;
      to = query.timeMax;
      return Response.json({ calendars: { 'micah@webflow.com': { busy: [
        { start: new Date(Date.parse(from) - 3600_000).toISOString(), end: new Date(Date.parse(from) + 3600_000).toISOString() },
        { start: new Date(Date.parse(to) - 3600_000).toISOString(), end: new Date(Date.parse(to) + 3600_000).toISOString() }
      ] } } });
    });
    await worker.scheduled({} as ScheduledController, env);
    await runInDurableObject(stub, async (_instance, state) => {
      const projection = state.storage.kv.get<any>('projection:webflow-google-calendar');
      expect(projection.intervals.map((i: { start: string; end: string }) => [Date.parse(i.start), Date.parse(i.end)]))
        .toEqual([[Date.parse(from), Date.parse(from) + 3600_000], [Date.parse(to) - 3600_000, Date.parse(to)]]);
      expect(state.storage.kv.get('projection:webflow-cloud-refresh')).toMatchObject({ status: 'accepted', trigger: 'cron' });
      expect(Date.parse(projection.expiresAt) - Date.parse(projection.observedAt)).toBe(45 * 60_000);
    });
  });

  it.each(['reversed', 'empty'])('preserves prior projection when a provider interval is %s', async (kind) => {
    const stub = await seed();
    const start = new Date(Date.now() + 3600_000).toISOString();
    const end = new Date(Date.parse(start) - (kind === 'reversed' ? 3600_000 : 0)).toISOString();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ calendars: { 'micah@webflow.com': { busy: [{ start, end }] } } }));
    await expect(worker.scheduled({} as ScheduledController, env)).rejects.toThrow('webflow_cloud_refresh_failed');
    await runInDurableObject(stub, async (_instance, state) => {
      expect(state.storage.kv.get('projection:webflow-google-calendar')).toEqual({ sentinel: 'unchanged' });
    });
  });

  it('publishes busy-only coverage via the scheduled handler and records cron provenance', async () => {
    const stub = await seed();
    const start = new Date(Date.now() + 3600_000).toISOString();
    const end = new Date(Date.now() + 5400_000).toISOString();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      expect(String(input)).toBe('https://www.googleapis.com/calendar/v3/freeBusy');
      expect(JSON.parse(String(init?.body)).items).toEqual([{ id: 'micah@webflow.com' }]);
      return Response.json({ calendars: { 'micah@webflow.com': {
        busy: [{ start, end }], summary: 'discarded provider metadata'
      } } });
    });
    await worker.scheduled({} as ScheduledController, env);
    await runInDurableObject(stub, async (_instance, state) => {
      const projection = state.storage.kv.get<any>('projection:webflow-google-calendar');
      expect(projection.intervals.map((interval: { start: string; end: string }) => ({ start: Date.parse(interval.start), end: Date.parse(interval.end) }))).toEqual([{ start: Date.parse(start), end: Date.parse(end) }]);
      expect(JSON.stringify(projection)).not.toContain('discarded');
      expect(Date.parse(projection.expiresAt) - Date.parse(projection.observedAt)).toBe(45 * 60_000);
      expect(Date.parse(projection.rangeEnd) - Date.parse(projection.observedAt)).toBe(42 * 86400_000);
      expect(state.storage.kv.get('projection:webflow-cloud-refresh')).toMatchObject({ status: 'accepted', trigger: 'cron' });
    });
  });

  it.each(['notFound', 'http_503'])('preserves prior projection and fails the cron on %s', async (failure) => {
    const stub = await seed();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(failure === 'http_503'
      ? new Response('', { status: 503 })
      : Response.json({ calendars: { 'micah@webflow.com': { busy: [], errors: [{ reason: 'notFound' }] } } }));
    await expect(worker.scheduled({} as ScheduledController, env)).rejects.toThrow('webflow_cloud_refresh_failed');
    await runInDurableObject(stub, async (_instance, state) => {
      expect(state.storage.kv.get('projection:webflow-google-calendar')).toEqual({ sentinel: 'unchanged' });
      expect(state.storage.kv.get('projection:webflow-cloud-refresh')).toMatchObject({ status: 'retryable', trigger: 'cron' });
    });
  });

  it('requires operator authorization and explicit intent for manual cloud refresh', async () => {
    const url = 'https://scheduler.local/api/v1/operator/conflict-projections/webflow-google-calendar/refresh';
    const unauthorized = await SELF.fetch(url, { method: 'POST' });
    expect(unauthorized.status).toBe(403);
    const noIntent = await SELF.fetch(url, { method: 'POST', headers: { authorization: 'Bearer controlled-operator-token', 'content-type': 'application/json' }, body: '{}' });
    expect(noIntent.status).toBe(428);
  });
});
