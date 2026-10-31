import { afterEach, expect, it, vi } from 'vitest';
import { handle } from '../src/hooks.server.js';

afterEach(() => vi.unstubAllGlobals());
async function fixture(issuer: string, audience = 'io', email = 'admin@example.test') {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify'
  ]);
  const jwk = {
    ...(await crypto.subtle.exportKey('jwk', pair.publicKey)),
    kid: 'io-fixture',
    alg: 'ES256',
    use: 'sig'
  };
  const now = Math.floor(Date.now() / 1000),
    enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const input = `${enc({ alg: 'ES256', kid: jwk.kid })}.${enc({ sub: 'existing-admin-id', email, iss: issuer, aud: [audience], iat: now, exp: now + 900, kind: 'identity_access_token', session_version: 2, email_verified: true })}`;
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    pair.privateKey,
    new TextEncoder().encode(input)
  );
  return { token: `${input}.${Buffer.from(sig).toString('base64url')}`, jwks: { keys: [jwk] } };
}
function event(path: string, token?: string, issuer = 'https://io-fixture.test', admin = true) {
  const db = {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        first: async () =>
          admin ? { id: 'local-admin', username: 'operator', role: 'admin' } : null
      }))
    }))
  };
  return {
    url: new URL(`https://createsomething.io${path}`),
    cookies: {
      get: (name: string) => (name === 'cs_access_token' ? token : undefined),
      set() {},
      delete() {}
    },
    locals: {} as { user?: unknown },
    platform: {
      env: {
        ENVIRONMENT: 'production',
        CS_IDENTITY_ISSUER: issuer,
        CS_IDENTITY_JWKS_URL: `${issuer}/jwks`,
        CS_IDENTITY_AUDIENCE: 'io',
        DB: db
      }
    },
    db
  };
}
it('IO admin API rejects unsigned claims before any local permission lookup', async () => {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${btoa('{"alg":"none"}')}.${btoa(JSON.stringify({ sub: 'admin', email: 'admin@example.test', exp: now + 900 }))}.fake`;
  const e = event('/api/admin/analytics', unsigned);
  const response = await handle({
    event: e as never,
    resolve: async () => new Response('protected')
  } as never);
  expect(response.status).toBe(401);
  expect(e.db.prepare).not.toHaveBeenCalled();
  expect(e.locals.user).toBeUndefined();
  expect(await response.text()).not.toContain('protected');
});
it('IO user API does not attach an identity from invalid cookie claims', async () => {
  const e = event('/api/user/preferences', 'not-a-jwt');
  await handle({
    event: e as never,
    resolve: async () => new Response('public fallback')
  } as never);
  expect(e.locals.user).toBeUndefined();
});
it('IO admin checks still apply after valid signature verification', async () => {
  const issuer = 'https://io-authorized-fixture.test';
  const value = await fixture(issuer);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(value.jwks))
  );
  const allowed = event('/api/admin/analytics', value.token, issuer);
  expect(
    (
      await handle({
        event: allowed as never,
        resolve: async () => new Response('protected')
      } as never)
    ).status
  ).toBe(200);
  expect(allowed.locals.user).toMatchObject({ id: 'existing-admin-id', role: 'admin' });
  const denied = event('/api/admin/analytics', value.token, issuer, false);
  const result = await handle({
    event: denied as never,
    resolve: async () => new Response('protected')
  } as never);
  expect(result.status).toBe(403);
  expect(await result.text()).not.toContain('protected');
});
it('IO admin rejects a valid signature for another application audience', async () => {
  const issuer = 'https://io-wrong-audience-fixture.test';
  const value = await fixture(issuer, 'ltd');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(value.jwks))
  );
  const e = event('/api/admin/analytics', value.token, issuer);
  expect(
    (await handle({ event: e as never, resolve: async () => new Response('protected') } as never))
      .status
  ).toBe(401);
  expect(e.db.prepare).not.toHaveBeenCalled();
});
