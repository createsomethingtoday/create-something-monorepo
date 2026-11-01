// Current-token compatibility: unchanged Identity issuer/mint/rotation with local D1 only.
import { beforeAll, afterAll, afterEach, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { handle } from '../src/hooks.server.js';
import { clearJWKSCache } from '@create-something/canon/auth/server';
import { POST as adminLogin } from '../src/routes/api/auth/login/+server.js';
import { load as ioLayout } from '../src/routes/+layout.server.js';
import { load as ioLogin } from '../src/routes/login/+page.server.js';
import {
  createSessionManager,
  identitySessionVerification,
  handleLogout,
  createLayoutServerLoader,
  createAccountPageLoader,
  getAuth0Config
} from '@create-something/canon/auth';
import {
  generateTokens,
  refreshTokens,
  getJWKS,
  createSignedToken
} from '../../identity-worker/src/services/tokens';
import { hashPassword, hashToken } from '../../identity-worker/src/services/crypto';
import { findUserById } from '../../identity-worker/src/db/queries';
import worker from '../../identity-worker/src/index';
import { verifyAgencyIdentitySession } from '../../agency/src/lib/server/agency-identity-session';
const require = createRequire(new URL('../../identity-worker/package.json', import.meta.url));
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const issuer = 'https://id.createsomething.space';
let runtime: any, db: any, ioDb: any, user: any;
const requestCounts = { refresh: 0, logout: 0, legacy: 0 };
const values = () => new Map<string, string>();
function jar(entries: Map<string, string>) {
  const writes: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  return {
    get: (name: string) => entries.get(name),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      entries.set(name, value);
      writes.push({ name, value, options });
    },
    delete: (name: string) => {
      entries.delete(name);
    },
    writes
  };
}
function cookieHeader(entries: Map<string, string>) {
  return [...entries]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}
const providerEnv: any = {
  ENVIRONMENT: 'production',
  ALLOWED_ORIGINS: 'https://createsomething.io'
};
async function syntheticFetch(input: any, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url === `${issuer}/.well-known/jwks.json`) return Response.json(await getJWKS(db));
  if (url === `${issuer}/v1/auth/login`)
    return worker.fetch(new Request(url, init), { ...providerEnv, DB: db } as never);
  if (url === `${issuer}/v1/auth/refresh`) {
    requestCounts.refresh++;
    const body = JSON.parse(String(init?.body));
    const result = await refreshTokens(db, body.refresh_token);
    return result
      ? Response.json({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          expires_in: result.expiresIn,
          token_type: 'Bearer'
        })
      : Response.json({ error: 'invalid_refresh' }, { status: 401 });
  }
  if (url === `${issuer}/v1/auth/logout`) {
    requestCounts.logout++;
    return worker.fetch(new Request(url, init), { ...providerEnv, DB: db } as never);
  }
  if (url.startsWith('https://retired.synthetic.test')) {
    requestCounts.legacy++;
    throw Error('retired provider must not receive an owned credential');
  }
  throw Error(`Unexpected synthetic fixture egress: ${url}`);
}
beforeAll(async () => {
  runtime = new Miniflare({
    modules: true,
    host: '127.0.0.1',
    script: 'export default {fetch(){return new Response("synthetic")}}',
    compatibilityDate: '2024-12-01',
    d1Databases: ['IDENTITY_DB', 'IO_DB'],
    d1Persist: false
  });
  db = await runtime.getD1Database('IDENTITY_DB');
  ioDb = await runtime.getD1Database('IO_DB');
  for (const file of readdirSync(new URL('../../identity-worker/migrations/', import.meta.url))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const statements = readFileSync(
      new URL(`../../identity-worker/migrations/${file}`, import.meta.url),
      'utf8'
    )
      .replace(/^\s*--.*$/gm, '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    await db.batch(statements.map((s) => db.prepare(s)));
  }
  await db
    .prepare(
      'INSERT INTO users(id,email,password_hash,source,email_verified,tier) VALUES(?,?,?,?,1,?)'
    )
    .bind(
      'existing-user',
      'existing@example.test',
      await hashPassword('synthetic-existing-password'),
      'io',
      'agency'
    )
    .run();
  user = await findUserById(db, 'existing-user');
  await ioDb.exec(
    'CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,username TEXT,role TEXT,analytics_opt_out INTEGER)'
  );
  await ioDb
    .prepare('INSERT INTO users VALUES(?,?,?,?,1)')
    .bind(user.id, user.email, 'existing-admin', 'admin')
    .run();
  await generateTokens(db, user, 'io'); // establish the existing signing key before fixture concurrency.
}, 20000);
afterAll(async () => runtime?.dispose());
afterEach(() => vi.unstubAllGlobals());
function event(path: string, cookies: ReturnType<typeof jar>) {
  return {
    url: new URL(`https://createsomething.io${path}`),
    request: new Request(`https://createsomething.io${path}`),
    cookies,
    locals: {} as { user?: unknown },
    platform: { env: { ENVIRONMENT: 'production', DB: ioDb } }
  };
}
it('existing password login, admin access, reload and logout work without a new cookie or token format', async () => {
  vi.stubGlobal('fetch', syntheticFetch);
  const entries = values(),
    cookies = jar(entries);
  const e = event('/api/auth/login', cookies);
  const response = await adminLogin({
    ...e,
    request: new Request(e.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'synthetic-existing-password' })
    })
  } as never);
  expect(response.status).toBe(200);
  expect([...entries.keys()].sort()).toEqual(['cs_access_token', 'cs_refresh_token']);
  const claims = JSON.parse(
    Buffer.from(entries.get('cs_access_token')!.split('.')[1], 'base64url').toString()
  );
  expect(claims).toMatchObject({
    sub: user.id,
    iss: issuer,
    aud: ['io'],
    kind: 'identity_access_token',
    session_version: 2,
    email_verified: true
  });
  const admin = event('/api/admin/analytics', cookies);
  expect(
    (
      await handle({
        event: admin as never,
        resolve: async () => new Response('authorized')
      } as never)
    ).status
  ).toBe(200);
  expect(admin.locals.user).toMatchObject({ id: user.id, role: 'admin' });
  expect(await ioLayout(event('/account', cookies) as never)).toMatchObject({
    user: { id: user.id, email: user.email }
  });
  await expect(ioLogin(event('/login', cookies) as never)).rejects.toMatchObject({ status: 302 });
  for (const write of cookies.writes)
    expect(write.options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax' });
  const logout = await handleLogout(
    new Request('https://createsomething.io/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: cookieHeader(entries) }
    }),
    cookies,
    { env: { ENVIRONMENT: 'production' } }
  );
  expect(logout.status).toBe(200);
  expect(requestCounts.logout).toBeGreaterThan(0);
  const denied = await handle({
    event: event('/api/admin/analytics', cookies) as never,
    resolve: async () => new Response('protected')
  } as never);
  expect(denied.status).toBe(401);
}, 20000);
it('fresh pre-patch-format Identity tokens remain valid for every affected application audience', async () => {
  vi.stubGlobal('fetch', syntheticFetch);
  for (const [audience, property] of [
    ['io', 'io'],
    ['ltd', 'ltd'],
    ['client-workspace', 'agency']
  ] as const) {
    const minted = await generateTokens(db, user, audience);
    expect(minted.expiresIn).toBe(900);
    const refreshRow = await db
      .prepare('SELECT audience,expires_at FROM refresh_tokens WHERE token_hash=?')
      .bind(await hashToken(minted.refreshToken))
      .first();
    expect(refreshRow.audience).toBe(audience);
    expect(Date.parse(refreshRow.expires_at) - Date.now()).toBeGreaterThan(
      7 * 24 * 60 * 60 * 1000 - 10_000
    );
    expect(Date.parse(refreshRow.expires_at) - Date.now()).toBeLessThanOrEqual(
      7 * 24 * 60 * 60 * 1000
    );
    const entries = values();
    entries.set('cs_access_token', minted.accessToken);
    entries.set('cs_refresh_token', minted.refreshToken);
    const cookies = jar(entries);
    expect(
      await createSessionManager(cookies, {
        identityVerification: identitySessionVerification(undefined, audience),
        authProvider: { type: 'identity-worker' }
      }).getUser()
    ).toMatchObject({ id: user.id, email: user.email });
    expect(cookies.writes).toEqual([]); // existing valid cookies are neither rewritten nor invalidated.
    const data = await createLayoutServerLoader({ property, identityAudience: audience })({
      url: new URL(`https://example.test/account`),
      cookies: cookies as never,
      platform: { env: { ENVIRONMENT: 'production' } }
    });
    expect(data.user).toMatchObject({ id: user.id });
    const account = await createAccountPageLoader()({
      parent: async () => ({ user: { ...data.user!, analytics_opt_out: true } }),
      cookies: cookies as never
    });
    expect(account.user.id).toBe(user.id);
  }
}, 20000);
it('expired or absent access cookies refresh and preserve each existing audience and refresh family', async () => {
  vi.stubGlobal('fetch', syntheticFetch);
  for (const audience of ['io', 'ltd', 'client-workspace'] as const)
    for (const access of ['expired', 'absent']) {
      const minted = await generateTokens(db, user, audience);
      const predecessor = await db
        .prepare('SELECT family_id FROM refresh_tokens WHERE token_hash=?')
        .bind(await hashToken(minted.refreshToken))
        .first();
      const entries = values();
      entries.set('cs_refresh_token', minted.refreshToken);
      if (access === 'expired') {
        const claims = JSON.parse(
          Buffer.from(minted.accessToken.split('.')[1], 'base64url').toString()
        );
        entries.set(
          'cs_access_token',
          await createSignedToken(db, { ...claims, exp: Math.floor(Date.now() / 1000) - 1 })
        );
      }
      const cookies = jar(entries);
      expect(
        await createSessionManager(cookies, {
          identityVerification: identitySessionVerification(undefined, audience),
          authProvider: { type: 'identity-worker' }
        }).getUser()
      ).toMatchObject({ id: user.id });
      const claims = JSON.parse(
        Buffer.from(entries.get('cs_access_token')!.split('.')[1], 'base64url').toString()
      );
      expect(claims.aud).toEqual([audience]);
      expect(entries.get('cs_refresh_token')).not.toBe(minted.refreshToken);
      const successor = await db
        .prepare('SELECT family_id,audience FROM refresh_tokens WHERE token_hash=?')
        .bind(await hashToken(entries.get('cs_refresh_token')!))
        .first();
      expect(successor).toMatchObject({ family_id: predecessor.family_id, audience });
      expect([...entries.keys()].sort()).toEqual(['cs_access_token', 'cs_refresh_token']);
    }
}, 20000);
it('an explicitly Identity-owned Agency refresh uses only the Identity endpoint', async () => {
  vi.stubGlobal('fetch', syntheticFetch);
  const minted = await generateTokens(db, user, 'client-workspace');
  const entries = values();
  entries.set('cs_refresh_token', minted.refreshToken);
  const before = requestCounts.legacy;
  const cookies = jar(entries);
  expect(
    await createSessionManager(cookies, {
      identityVerification: identitySessionVerification(undefined, 'client-workspace'),
      authProvider: { type: 'identity-worker' }
    }).getUser()
  ).toMatchObject({ id: user.id });
  expect(requestCounts.legacy).toBe(before);
});
it('valid but non-admin Identity still receives 403; wrong audience remains 401', async () => {
  vi.stubGlobal('fetch', syntheticFetch);
  const entries = values(),
    cookies = jar(entries);
  const minted = await generateTokens(db, user, 'io');
  entries.set('cs_access_token', minted.accessToken);
  await ioDb.prepare("UPDATE users SET role='user' WHERE id=?").bind(user.id).run();
  try {
    expect(
      (
        await handle({
          event: event('/api/admin/analytics', cookies) as never,
          resolve: async () => new Response('protected')
        } as never)
      ).status
    ).toBe(403);
  } finally {
    await ioDb.prepare("UPDATE users SET role='admin' WHERE id=?").bind(user.id).run();
  }
  entries.set('cs_access_token', (await generateTokens(db, user, 'ltd')).accessToken);
  expect(
    (
      await handle({
        event: event('/api/admin/analytics', cookies) as never,
        resolve: async () => new Response('protected')
      } as never)
    ).status
  ).toBe(401);
});
it('configured legacy Auth0 sessions still verify, refresh with no access cookie, and log out through their own provider', async () => {
  const legacyIssuer = 'https://legacy-active.synthetic.test/';
  const clientId = 'existing-legacy-client';
  const token = await createSignedToken(db, {
    sub: 'auth0|existing',
    email: user.email,
    iss: legacyIssuer,
    aud: clientId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900
  });
  const authProvider = getAuth0Config({
    AUTH0_DOMAIN: 'legacy-active.synthetic.test',
    AUTH0_CLIENT_ID: clientId,
    AUTH0_ISSUER_BASE_URL: legacyIssuer,
    AUTH0_CLIENT_SECRET: 'synthetic-client-secret'
  })!;
  let refreshCalls = 0,
    revokeCalls = 0;
  vi.stubGlobal('fetch', async (input: any, init?: RequestInit) => {
    const url = String(input);
    if (url === `${legacyIssuer}.well-known/jwks.json`) return Response.json(await getJWKS(db));
    if (url === `${legacyIssuer}oauth/token`) {
      refreshCalls++;
      expect(JSON.parse(String(init?.body)).refresh_token).toBe('synthetic-legacy-refresh');
      return Response.json({
        id_token: token,
        refresh_token: 'synthetic-legacy-rotated',
        expires_in: 900
      });
    }
    if (url === `${legacyIssuer}oauth/revoke`) {
      revokeCalls++;
      return Response.json({});
    }
    throw Error(`Unexpected legacy fixture egress: ${url}`);
  });
  const entries = values();
  entries.set('cs_access_token', token);
  const cookies = jar(entries);
  expect(
    await createSessionManager(cookies, {
      authProvider,
      identityVerification: identitySessionVerification(undefined, 'io')
    }).getUser()
  ).toMatchObject({ id: 'auth0|existing' });
  expect(refreshCalls).toBe(0);
  entries.delete('cs_access_token');
  entries.set('cs_refresh_token', 'synthetic-legacy-refresh');
  expect(
    await createSessionManager(cookies, {
      authProvider,
      identityVerification: identitySessionVerification(undefined, 'io')
    }).getUser()
  ).toMatchObject({ id: 'auth0|existing' });
  expect(refreshCalls).toBe(1);
  expect([...entries.keys()].sort()).toEqual(['cs_access_token', 'cs_refresh_token']);
  const response = await handleLogout(
    new Request('https://createsomething.ltd/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: cookieHeader(entries) }
    }),
    cookies,
    {
      env: {
        ENVIRONMENT: 'production',
        AUTH0_DOMAIN: 'legacy-active.synthetic.test',
        AUTH0_CLIENT_ID: clientId,
        AUTH0_ISSUER_BASE_URL: legacyIssuer,
        AUTH0_CLIENT_SECRET: 'synthetic-client-secret'
      }
    }
  );
  expect(response.status).toBe(200);
  expect(revokeCalls).toBe(1);
  expect(((await response.json()) as { logoutUrl: string }).logoutUrl).toContain(
    `${legacyIssuer}v2/logout`
  );
});

it('a transient JWKS outage denies access while retaining the rotated refresh successor for recovery', async () => {
  clearJWKSCache();
  const minted = await generateTokens(db, user, 'io');
  const entries = values();
  entries.set('cs_refresh_token', minted.refreshToken);
  const cookies = jar(entries);
  vi.stubGlobal('fetch', async (input: any, init?: RequestInit) =>
    String(input) === `${issuer}/.well-known/jwks.json`
      ? Response.json({ error: 'synthetic-jwks-outage' }, { status: 503 })
      : syntheticFetch(input, init)
  );
  const session = createSessionManager(cookies, {
    identityVerification: identitySessionVerification(undefined, 'io'),
    authProvider: { type: 'identity-worker' }
  });
  expect(await session.getUser()).toBeNull();
  expect(entries.has('cs_access_token')).toBe(false);
  expect(entries.get('cs_refresh_token')).not.toBe(minted.refreshToken);
  expect(cookies.writes.map((w) => w.name)).toEqual(['cs_refresh_token']);
  clearJWKSCache();
  vi.stubGlobal('fetch', syntheticFetch);
  expect(await session.getUser()).toMatchObject({ id: user.id });
  expect(entries.get('cs_access_token')).toBeTruthy();
  expect(await refreshTokens(db, minted.refreshToken)).toBeNull(); // real replay detection remains intact.
}, 20000);

it('the actual Agency verifier provides a current client-workspace identity accepted by the account loader', async () => {
  vi.stubGlobal('fetch', syntheticFetch);
  const minted = await generateTokens(db, user, 'client-workspace');
  const entries = values();
  entries.set('cs_access_token', minted.accessToken);
  entries.set('cs_refresh_token', minted.refreshToken);
  const cookies = jar(entries);
  const verified = await verifyAgencyIdentitySession({
    cookies,
    platform: { env: { ENVIRONMENT: 'production' } } as never
  });
  expect(verified).toMatchObject({ id: user.id, email: user.email });
  expect(
    await createAccountPageLoader()({
      parent: async () => ({ user: { ...verified!, analytics_opt_out: true } }),
      cookies: cookies as never
    })
  ).toMatchObject({ user: { id: user.id } });
});
