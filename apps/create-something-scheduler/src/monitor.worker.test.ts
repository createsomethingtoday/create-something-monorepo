import { env, SELF, runInDurableObject } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from './monitor-worker.js';

afterEach(() => vi.restoreAllMocks());
beforeEach(async () => {
  await runInDurableObject(env.MONITOR.getByName('scheduler-sync'), async (_instance, state) => { await state.storage.deleteAll(); });
});
const healthy = () => ({ ready: true, webflowProjectionFresh: true, webflowProjectionHorizonCovered: true,
  webflowProjectionExpiresAt: new Date(Date.now() + 45 * 60_000).toISOString(),
  webflowCloudRefresh: { status: 'accepted', observedAt: new Date().toISOString() } });
const failed = () => ({ ...healthy(), webflowCloudRefresh: { status: 'retryable' } });
const headers = { authorization: 'Bearer controlled-operator-token', 'content-type': 'application/json' };

describe('independent cloud sync monitor', () => {
  it('sends one warning across repeated failures and one recovery, without changing the scheduler', async () => {
    let current: unknown = healthy();
    const messages: Array<{ subject: string; text: string }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).includes('/operator/status')) {
        expect(init?.method).toBeUndefined();
        return Response.json(current);
      }
      expect(String(input)).toBe('https://api.resend.com/emails');
      messages.push(JSON.parse(String(init?.body)));
      return Response.json({ id: `mail-${messages.length}` });
    });
    const stub = env.MONITOR.getByName('scheduler-sync');
    await worker.scheduled({} as ScheduledController, env);
    expect(messages).toHaveLength(0);
    expect((await stub.status()).lastCheck).toMatchObject({ healthy: true, trigger: 'cron' });
    current = failed();
    await Promise.all([stub.check(), stub.check(), stub.check()]);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.subject).toContain('Action needed');
    current = healthy();
    await stub.check(); await stub.check();
    expect(messages).toHaveLength(2);
    expect(messages[1]?.subject).toContain('Recovered');
    expect((await stub.status()).incidentOpen).toBe(false);
  });

  it('retries an uncertain provider send with identical persisted content and idempotency key', async () => {
    const sends: Array<{ body: string; key: string }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).includes('/operator/status')) return Response.json(failed());
      sends.push({ body: String(init?.body), key: new Headers(init?.headers).get('idempotency-key')! });
      if (sends.length === 1) throw new Error('ambiguous transport failure');
      return Response.json({ id: 'reconciled-mail' });
    });
    const stub = env.MONITOR.getByName('scheduler-sync');
    expect(await stub.check()).toMatchObject({ notificationDelivered: false });
    await stub.check(); await stub.check();
    expect(sends).toHaveLength(2);
    expect(sends[0]).toEqual(sends[1]);
  });

  it('alerts on an unreachable scheduler using an independent sender', async () => {
    let emails = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('/operator/status')) throw new Error('scheduler down');
      emails++; return Response.json({ id: 'outage-alert' });
    });
    const result = await env.MONITOR.getByName('scheduler-sync').check();
    expect(result).toMatchObject({ healthy: false, reason: 'scheduler_status_unavailable' });
    expect(emails).toBe(1);
  });

  it('stops uncertain-send retries before the provider dedupe window expires', async () => {
    const stub = env.MONITOR.getByName('scheduler-sync');
    await runInDurableObject(stub, async (_instance, state) => {
      state.storage.kv.put('sync-monitor:incident', { id: 'old', openedAt: '2020-01-01T00:00:00Z', alert: {
        idempotencyKey: 'old-warning', to: 'controlled@example.com', subject: 'old', text: 'old', createdAt: '2020-01-01T00:00:00Z'
      } });
    });
    const send = vi.spyOn(globalThis, 'fetch');
    expect(await stub.check()).toMatchObject({ notificationDelivered: false });
    expect((await stub.status()).lastDelivery).toMatchObject({ status: 'reconciliation_required' });
    expect(send).not.toHaveBeenCalled();
  });

  it('authenticates test delivery, requires intent, and sends an explicitly labelled test only once', async () => {
    const send = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ id: 'test-delivery' }));
    expect((await SELF.fetch('https://monitor.local/status')).status).toBe(403);
    expect((await SELF.fetch('https://monitor.local/test', { method: 'POST', headers, body: '{}' })).status).toBe(428);
    const request = () => SELF.fetch('https://monitor.local/test', { method: 'POST', headers,
      body: JSON.stringify({ explicitIntent: true, idempotencyKey: 'controlled-alert-test' }) });
    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(send.mock.calls[0]?.[1]?.body));
    expect(body.subject).toContain('[TEST]');
    expect(body.text).toContain('TEST ONLY');
  });
});
