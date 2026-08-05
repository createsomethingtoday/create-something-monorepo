import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, test, vi } from 'vitest';
import worker from '../src/index';

const fetchWorker = (request: Request) => worker.fetch(request, env);

describe('Webflow OAuth installation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('exchanges a state-bound callback without exposing the app token', async () => {
    const start = await fetchWorker(
      new Request('https://preflight.test/v1/oauth/webflow/start')
    );

    expect(start.status).toBe(302);
    const authorization = new URL(start.headers.get('location')!);
    expect(`${authorization.origin}${authorization.pathname}`).toBe(
      'https://webflow.com/oauth/authorize'
    );
    expect(authorization.searchParams.get('response_type')).toBe('code');
    expect(authorization.searchParams.get('client_id')).toBe('webflow-client-id');
    expect(authorization.searchParams.get('scope')).toBe('authorized_user:read');
    expect(authorization.searchParams.get('redirect_uri')).toBe(
      'https://preflight.test/v1/oauth/webflow/callback'
    );
    const state = authorization.searchParams.get('state');
    expect(state).toMatch(/^[a-f0-9]{64}$/);
    const cookie = start.headers.get('set-cookie');
    expect(cookie).toContain(`webflow_oauth_state=${state}`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');

    const outboundFetch = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      if (request.url === 'https://api.webflow.com/oauth/access_token') {
        return Response.json({ access_token: 'server-only-app-token' });
      }
      if (request.url === 'https://api.webflow.com/beta/token/resolve') {
        return Response.json({ id: 'webflow-user-id', siteId: 'webflow-site-id' });
      }
      return Response.json({ error: 'unexpected_outbound_request' }, { status: 500 });
    });
    vi.stubGlobal('fetch', outboundFetch);

    const callback = await fetchWorker(
      new Request(
        `https://preflight.test/v1/oauth/webflow/callback?code=single-use-code&state=${state}`,
        { headers: { cookie: cookie!.split(';', 1)[0]! } }
      )
    );

    expect(callback.status).toBe(303);
    expect(callback.headers.get('location')).toBe(
      'https://preflight.test/v1/oauth/webflow/complete'
    );
    expect(await callback.text()).not.toContain('server-only-app-token');

    const identity = await fetchWorker(
      new Request('https://preflight.test/v1/me', {
        headers: { authorization: 'Bearer designer-id-token' }
      })
    );
    expect(identity.status).toBe(200);
    expect(await identity.json()).toMatchObject({
      user: { id: 'webflow-user-id', siteId: 'webflow-site-id' }
    });
    expect(outboundFetch).toHaveBeenCalledTimes(2);

    const directInstallCallback = await fetchWorker(
      new Request(
        'https://preflight.test/v1/oauth/webflow/callback?code=unused-direct-install-code',
        { headers: { accept: 'text/html' } }
      )
    );
    expect(directInstallCallback.status).toBe(303);
    expect(directInstallCallback.headers.get('location')).toBe(
      'https://preflight.test/v1/oauth/webflow/complete'
    );
    expect(outboundFetch).toHaveBeenCalledTimes(2);
  });

  test('rejects a callback whose browser state does not match', async () => {
    const start = await fetchWorker(
      new Request('https://preflight.test/v1/oauth/webflow/start')
    );
    const authorization = new URL(start.headers.get('location')!);
    const state = authorization.searchParams.get('state')!;

    const callback = await fetchWorker(
      new Request(
        `https://preflight.test/v1/oauth/webflow/callback?code=single-use-code&state=${state}`,
        { headers: { cookie: 'webflow_oauth_state=another-state' } }
      )
    );

    expect(callback.status).toBe(400);
    expect(await callback.json()).toEqual({
      error: 'invalid_webflow_oauth_callback',
      reason: 'state_mismatch'
    });
  });

  test('restarts the secure flow for a browser callback without reusable state', async () => {
    await env.DB.prepare(
      "DELETE FROM webflow_oauth_installations WHERE id = 'active'"
    ).run();

    const callback = await fetchWorker(
      new Request(
        'https://preflight.test/v1/oauth/webflow/callback?code=unused-direct-install-code',
        { headers: { accept: 'text/html' } }
      )
    );

    expect(callback.status).toBe(303);
    expect(callback.headers.get('location')).toBe(
      'https://preflight.test/v1/oauth/webflow/start'
    );
    expect(await callback.text()).not.toContain('unused-direct-install-code');
  });

  test('renders a self-contained Webflow-style completion page', async () => {
    const response = await fetchWorker(
      new Request('https://preflight.test/v1/oauth/webflow/complete')
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toContain(
      "default-src 'none'"
    );
    expect(response.headers.get('content-security-policy')).toContain(
      "style-src 'unsafe-inline'"
    );
    expect(html).toContain('App Review Preflight');
    expect(html).toContain('Connection complete');
    expect(html).toContain('#146ef5');
    expect(html).toContain('https://webflow.com/dashboard');
    expect(html).not.toContain('<script');
  });
});
