import assert from 'node:assert/strict';
import test from 'node:test';

import { createIdentityRoutes } from '../src/lib/cloudflare/identity-routes.js';

test('identity routes serve a credential form without protected workspace data', async () => {
  const routes = createIdentityRoutes({
    identityApiUrl: 'https://id.createsomething.space',
    fetch: async () => {
      throw new Error('identity fetch not expected');
    }
  });

  const response = await routes.fetch(
    new Request('https://workspace.createsomething.space/sign-in')
  );
  const body = await response!.text();
  assert.equal(response!.status, 200);
  assert.match(body, /Sign in to Client Workspace/);
  assert.match(body, /name="email"/);
  assert.match(body, /--color-performance-paper/);
  assert.match(body, /var\(--font-performance-interface\)/);
  assert.match(body, /var\(--color-performance-signal\)/);
  assert.equal(body.includes('Demo frontend'), false);
});

test('identity routes exchange credentials server-side and set host-only secure cookies', async () => {
  const requests: Array<{ url: string; body: unknown }> = [];
  const routes = createIdentityRoutes({
    identityApiUrl: 'https://id.createsomething.space/',
    async fetch(url, init) {
      requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return Response.json({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 900,
        user: { email: 'micah@createsomething.io' }
      });
    }
  });

  const response = await routes.fetch(
    new Request('https://workspace.createsomething.space/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'micah@createsomething.io', password: 'private' })
    })
  );

  assert.equal(response!.status, 200);
  assert.deepEqual(requests, [
    {
      url: 'https://id.createsomething.space/v1/auth/login',
      body: { email: 'micah@createsomething.io', password: 'private' }
    }
  ]);
  const cookies = response!.headers.get('set-cookie') ?? '';
  assert.match(cookies, /cs_access_token=access-token/);
  assert.match(cookies, /cs_refresh_token=refresh-token/);
  assert.match(cookies, /HttpOnly/);
  assert.match(cookies, /Secure/);
  assert.equal(cookies.includes('Domain='), false);
  assert.deepEqual(await response!.json(), { success: true });
});

test('identity routes preserve login failure status and clear sessions on logout', async () => {
  const routes = createIdentityRoutes({
    identityApiUrl: 'https://id.createsomething.space',
    fetch: async () => Response.json({ error: 'invalid_credentials' }, { status: 401 })
  });

  const failed = await routes.fetch(
    new Request('https://workspace.createsomething.space/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'micah@createsomething.io', password: 'wrong' })
    })
  );
  assert.equal(failed!.status, 401);
  assert.deepEqual(await failed!.json(), { error: 'invalid_credentials' });
  assert.equal(failed!.headers.has('set-cookie'), false);

  const logout = await routes.fetch(
    new Request('https://workspace.createsomething.space/api/auth/logout', { method: 'POST' })
  );
  assert.equal(logout!.status, 200);
  const cookies = logout!.headers.get('set-cookie') ?? '';
  assert.match(cookies, /cs_access_token=;/);
  assert.match(cookies, /cs_refresh_token=;/);
  assert.match(cookies, /Max-Age=0/);
});

test('identity routes invoke fetch with the Workers global receiver', async () => {
  const receiverSensitiveFetch = async function (this: unknown) {
    assert.equal(this, globalThis);
    return Response.json({ error: 'invalid_credentials' }, { status: 401 });
  } as typeof globalThis.fetch;
  const routes = createIdentityRoutes({
    identityApiUrl: 'https://id.createsomething.space',
    fetch: receiverSensitiveFetch
  });

  const response = await routes.fetch(
    new Request('https://workspace.createsomething.io/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'incorrect' })
    })
  );

  assert.equal(response!.status, 401);
  assert.deepEqual(await response!.json(), { error: 'invalid_credentials' });
});

test('identity routes contain upstream login transport failures', async () => {
  const routes = createIdentityRoutes({
    identityApiUrl: 'https://id.createsomething.space',
    fetch: async () => {
      throw new Error('identity transport unavailable');
    }
  });

  const response = await routes.fetch(
    new Request('https://workspace.createsomething.io/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'incorrect' })
    })
  );

  assert.equal(response!.status, 503);
  assert.deepEqual(await response!.json(), { error: 'identity_unavailable' });
  assert.equal(response!.headers.has('set-cookie'), false);
});

test('identity routes return null for non-auth paths', async () => {
  const routes = createIdentityRoutes({
    identityApiUrl: 'https://id.createsomething.space',
    fetch: async () => new Response()
  });
  assert.equal(
    await routes.fetch(new Request('https://workspace.createsomething.space/api/workspaces')),
    null
  );
});

test('identity routes rotate a host-only refresh session for access retry', async () => {
  const routes = createIdentityRoutes({
    identityApiUrl: 'https://id.createsomething.space',
    async fetch(url, init) {
      assert.equal(String(url), 'https://id.createsomething.space/v1/auth/refresh');
      assert.deepEqual(JSON.parse(String(init?.body)), { refresh_token: 'old-refresh' });
      return Response.json({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 900
      });
    }
  });

  const refreshed = await routes.refreshAccess(
    new Request('https://workspace.createsomething.space/', {
      headers: { cookie: 'cs_access_token=expired; cs_refresh_token=old-refresh; other=value' }
    })
  );

  assert.ok(refreshed);
  assert.match(refreshed.request.headers.get('cookie') ?? '', /cs_access_token=new-access/);
  assert.match(refreshed.request.headers.get('cookie') ?? '', /cs_refresh_token=new-refresh/);
  assert.equal((refreshed.request.headers.get('cookie') ?? '').includes('expired'), false);
  assert.equal(refreshed.setCookies.length, 2);
  assert.match(refreshed.setCookies.join(';'), /HttpOnly/);
  assert.match(refreshed.setCookies.join(';'), /Secure/);
  assert.equal(refreshed.setCookies.join(';').includes('Domain='), false);
});
