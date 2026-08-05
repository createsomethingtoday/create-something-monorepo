import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$lib/server/kv', () => ({
  SESSION_COOKIE_NAME: 'session',
  SESSION_COOKIE_OPTIONS: {},
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  shouldRefreshSession: vi.fn(() => false)
}));

const { handle } = await import('./hooks.server');

const ORIGIN = 'https://dashboard.example';

function callHandle(
  path: string,
  init: { method?: string; headers?: Record<string, string>; cookie?: string } = {}
) {
  const resolve = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
  const event = {
    url: new URL(`${ORIGIN}${path}`),
    request: new Request(`${ORIGIN}${path}`, {
      method: init.method ?? 'POST',
      headers: init.headers ?? {}
    }),
    cookies: { get: () => init.cookie, set: vi.fn() },
    locals: {},
    platform: { env: { ENVIRONMENT: 'production' } }
  };

  return {
    result: handle({ event, resolve } as unknown as Parameters<typeof handle>[0]),
    resolve
  };
}

describe('CSRF origin protection', () => {
  it('blocks an unauthenticated login POST from an untrusted origin', async () => {
    // The regression this guards: /api/auth/login accepts form-encoded bodies,
    // which browsers send cross-site without a CORS preflight.
    const { result, resolve } = callHandle('/api/auth/login', {
      headers: { origin: 'https://evil.example' }
    });

    expect((await result).status).toBe(403);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('blocks a mutating API request that carries no origin at all', async () => {
    const { result, resolve } = callHandle('/api/auth/verify-token');

    expect((await result).status).toBe(403);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('allows the dashboard’s own origin', async () => {
    const { result, resolve } = callHandle('/api/auth/login', {
      headers: { origin: ORIGIN }
    });

    expect((await result).status).toBe(200);
    expect(resolve).toHaveBeenCalled();
  });

  it('allows an embedding Webflow origin, which needs SameSite=None', async () => {
    const { result, resolve } = callHandle('/api/auth/login', {
      headers: { origin: 'https://webflow.com' }
    });

    expect((await result).status).toBe(200);
    expect(resolve).toHaveBeenCalled();
  });

  it('exempts header-authenticated machine callers, which have no origin', async () => {
    const { result, resolve } = callHandle('/api/internal/machine-operation', {
      headers: { authorization: 'Bearer secret' }
    });

    expect((await result).status).toBe(200);
    expect(resolve).toHaveBeenCalled();
  });

  it('exempts cron routes', async () => {
    const { result, resolve } = callHandle('/api/cron/snapshot');

    expect((await result).status).toBe(200);
    expect(resolve).toHaveBeenCalled();
  });

  it('leaves safe methods alone even from an untrusted origin', async () => {
    const { result, resolve } = callHandle('/api/auth/login', {
      method: 'GET',
      headers: { origin: 'https://evil.example' }
    });

    expect((await result).status).toBe(200);
    expect(resolve).toHaveBeenCalled();
  });
});

describe('trusted embed origins', () => {
  it('allows the production marketplace embed', async () => {
    const { result } = callHandle('/api/assets/rec1', {
      method: 'PUT',
      headers: { origin: 'https://templates.webflow.com' }
    });

    expect((await result).status).not.toBe(403);
  });

  it('allows the marketplace staging embed', async () => {
    const { result } = callHandle('/api/assets/rec1', {
      method: 'PUT',
      headers: { origin: 'https://template-marketplace.webflow.io' }
    });

    expect((await result).status).not.toBe(403);
  });

  it('rejects an unrelated customer site on webflow.io', async () => {
    // Every Webflow customer publishes under *.webflow.io, so the suffix must
    // not be trusted wholesale.
    const { result } = callHandle('/api/assets/rec1', {
      method: 'PUT',
      headers: { origin: 'https://some-customer-site.webflow.io' }
    });

    expect((await result).status).toBe(403);
  });
});
