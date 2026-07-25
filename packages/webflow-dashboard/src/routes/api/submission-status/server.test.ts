import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/submission-status', () => {
  it('returns a non-error local fallback when the legacy service has no user row', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            userExists: false,
            hasError: true,
            message: 'User not found in our system.'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const response = await POST({
      request: new Request('https://dashboard.example/api/submission-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }),
      locals: { user: { email: 'creator@example.com' } },
      platform: undefined
    } as Parameters<typeof POST>[0]);
    const payload = (await response.json()) as {
      assetsSubmitted30: number;
      hasError: boolean;
      useLocalCalculation: boolean;
      fallbackReason: string;
      message: string;
    };

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      assetsSubmitted30: 0,
      hasError: false,
      useLocalCalculation: true,
      fallbackReason: 'legacy_user_not_found'
    });
    expect(payload.message).not.toContain('server unavailable');
  });

  it('rejects unauthenticated callers without contacting the legacy service', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST({
      request: new Request('https://dashboard.example/api/submission-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'victim@example.com' })
      }),
      locals: {},
      platform: undefined
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queries the session email and ignores an attacker-supplied body email', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ assetsSubmitted30: 1, hasError: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await POST({
      request: new Request('https://dashboard.example/api/submission-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'victim@example.com' })
      }),
      locals: { user: { email: 'creator@example.com' } },
      platform: undefined
    } as Parameters<typeof POST>[0]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(JSON.stringify({ email: 'creator@example.com' }));
  });
});
