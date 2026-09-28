import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSchedulerReadClient, AvailabilityUnavailableError } from '@create-something/create-something-scheduler/public-read';
import { CloudflareApiClient } from '../forge-pilot/generated/sdk/Client.js';

const query = { from: '2026-10-01', to: '2026-10-02', timezone: 'UTC', durationMinutes: 60 as const };
const available = {
  status: 'available', durationMinutes: 60, timezone: 'UTC', slots: [],
  receiptId: 'test', policyVersion: 'test', occurredAt: '2026-09-28T00:00:00Z', nextActions: []
};

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('public read boundary', () => {
  it('exports only frozen named reads and emits credential-free GETs with bounded queries', async () => {
    const requests: Request[] = [];
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
      requests.push(request);
      return Response.json(request.url.includes('/links/') ? {
        durationMinutes: 30, durationOptionsMinutes: [30, 60], unknownSecret: 'stripped'
      } : available);
    }));
    const client = createSchedulerReadClient();
    expect(Object.keys(client)).toEqual(['getLink', 'listAvailability']);
    expect(Object.isFrozen(client)).toBe(true);
    expect(await client.getLink()).toEqual({ durationMinutes: 30, durationOptionsMinutes: [30, 60] });
    expect(await client.listAvailability(query)).toEqual(available);
    for (const request of requests) {
      expect(request.method).toBe('GET');
      expect(request.credentials).toBe('omit');
      expect(request.redirect).toBe('error');
      expect([...request.headers]).toEqual([['accept', 'application/json']]);
    }
    expect(Object.fromEntries(new URL(requests[1].url).searchParams)).toEqual({ ...query, durationMinutes: '60' });
  });

  it.each([
    { headers: { authorization: 'Bearer forbidden' } }, { fetch: () => {} },
    { baseUrl: 'https://user:password@example.com' }, { baseUrl: 'https://example.com/api/v1/bookings' },
    { baseUrl: 'https://example.com?token=forbidden' }, { baseUrl: 'http://example.com' }
  ])('rejects unsafe constructor options %j', (options) => {
    expect(() => createSchedulerReadClient(options as never)).toThrow();
  });

  it('rejects widened duration and extra query fields before transport', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const client = createSchedulerReadClient();
    for (const input of [{ ...query, durationMinutes: 90 }, { ...query, authorization: 'forbidden' }, { ...query, method: 'POST' }]) {
      await expect(client.listAvailability(input as never)).rejects.toThrow();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['https://schedule.createsomething.agency/api/v1/bookings', { method: 'POST' }],
    ['https://schedule.createsomething.agency/api/v1/operator/status', { method: 'GET' }],
    ['https://other.example/api/v1/availability', { method: 'GET' }],
    ['https://schedule.createsomething.agency/api/v1/availability?token=forbidden', { method: 'GET' }],
    ['https://schedule.createsomething.agency/api/v1/availability', { headers: { authorization: 'Bearer forbidden' } }],
    ['https://schedule.createsomething.agency/api/v1/availability', { headers: { cookie: 'session=forbidden' } }]
  ])('contains an unsafe generated request to %s', async (url, init) => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    // Simulate a future generator regression at its transport boundary. The
    // consumer never receives this internal SDK or its options.
    vi.spyOn(CloudflareApiClient.prototype, 'getLink').mockImplementation(function (this: CloudflareApiClient) {
      const internal = this as unknown as { _options: { fetch: typeof globalThis.fetch } };
      return internal._options.fetch(url, init) as never;
    });
    await expect(createSchedulerReadClient().getLink()).rejects.toThrow('read boundary');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves the retryable 503 lifecycle and never retries it automatically', async () => {
    const retryable = { ...available, status: 'retryable', reason: 'calendar_unavailable' };
    const fetch = vi.fn(async () => Response.json(retryable, { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    const client = createSchedulerReadClient();
    await expect(client.listAvailability(query)).rejects.toMatchObject({ statusCode: 503, body: retryable });
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(client.listAvailability(query)).rejects.toBeInstanceOf(AvailabilityUnavailableError);
  });

  it.each([
    [200, { ...available, durationMinutes: 90 }],
    [200, { ...available, status: 'retryable' }],
    [503, { ...available, status: 'available' }],
    [503, { ...available, status: 'retryable', slots: [{ start: '2026-10-01T00:00:00Z', end: '2026-10-01T01:00:00Z' }] }],
    [503, { code: 'unavailable', message: 'old incorrect schema' }]
  ])('fails closed on invalid status/body %s', async (status, body) => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(body, { status })));
    await expect(createSchedulerReadClient().listAvailability(query)).rejects.toThrow();
  });

  it('does not promote a permanent HTTP failure to retryable availability', async () => {
    const fetch = vi.fn(async () => Response.json({ status: 'rejected' }, { status: 400 }));
    vi.stubGlobal('fetch', fetch);
    await expect(createSchedulerReadClient().listAvailability(query)).rejects.toMatchObject({ statusCode: 400 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
