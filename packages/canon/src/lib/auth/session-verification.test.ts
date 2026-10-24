import { afterEach, expect, it, vi } from 'vitest';
import { createSessionManager } from './session.js';
import { clearJWKSCache } from './server.js';

afterEach(() => {
  clearJWKSCache();
  vi.unstubAllGlobals();
});

it('does not authenticate decoded attacker claims, even with a future expiry', async () => {
  const token = [
    btoa('{"alg":"none"}'),
    btoa(
      JSON.stringify({
        sub: 'admin',
        email: 'admin@example.test',
        exp: Math.floor(Date.now() / 1000) + 900
      })
    ),
    'fake'
  ].join('.');
  const session = createSessionManager({
    get: (name) => (name === 'cs_access_token' ? token : undefined),
    set() {},
    delete() {}
  });
  expect(await session.getUser()).toBeNull();
});

async function fixture(claims: Record<string, unknown> = {}) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify'
  ]);
  const jwk = {
    ...(await crypto.subtle.exportKey('jwk', pair.publicKey)),
    kid: 'local-fixture',
    alg: 'ES256',
    use: 'sig'
  };
  const now = Math.floor(Date.now() / 1000);
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const input = `${encode({ alg: 'ES256', kid: jwk.kid })}.${encode({ sub: 'u', email: 'owner@example.test', tier: 'free', source: 'io', iss: 'https://identity.test', aud: ['io'], iat: now, exp: now + 300, kind: 'identity_access_token', session_version: 2, email_verified: true, ...claims })}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    pair.privateKey,
    new TextEncoder().encode(input)
  );
  return {
    token: `${input}.${Buffer.from(signature).toString('base64url')}`,
    jwks: { keys: [jwk] }
  };
}
const verification = {
  issuer: 'https://identity.test',
  audience: 'io',
  jwksUrl: 'https://identity.test/jwks'
};
function cookies(access: string, refresh?: string) {
  const values = new Map<string, string>([['cs_access_token', access]]);
  if (refresh) values.set('cs_refresh_token', refresh);
  return {
    get: (name: string) => values.get(name),
    set: (name: string, value: string) => {
      values.set(name, value);
    },
    delete: (name: string) => {
      values.delete(name);
    }
  };
}
it('accepts a correctly signed, current session for the exact application', async () => {
  const value = await fixture();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(value.jwks))
  );
  expect(
    await createSessionManager(cookies(value.token), {
      identityVerification: verification
    }).getUser()
  ).toMatchObject({ id: 'u', email: 'owner@example.test' });
});
it('rejects signed wrong issuer, audience, expired and retired sessions', async () => {
  for (const claims of [
    { iss: 'https://other.test' },
    { aud: ['ltd'] },
    { exp: 1 },
    { session_version: 1 },
    { email_verified: false },
    { kind: 'other' }
  ]) {
    const value = await fixture(claims);
    clearJWKSCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(value.jwks))
    );
    expect(
      await createSessionManager(cookies(value.token), {
        identityVerification: verification
      }).getUser()
    ).toBeNull();
  }
});
it('rejects altered claims, unknown keys and unavailable JWKS', async () => {
  const value = await fixture();
  const other = await fixture();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(value.jwks))
  );
  expect(
    await createSessionManager(cookies(other.token), {
      identityVerification: verification
    }).getUser()
  ).toBeNull();
  const parts = value.token.split('.');
  parts[1] = Buffer.from(
    JSON.stringify({
      sub: 'admin',
      email: 'owner@example.test',
      iss: verification.issuer,
      aud: ['io'],
      exp: Math.floor(Date.now() / 1000) + 300,
      kind: 'identity_access_token',
      session_version: 2,
      email_verified: true
    })
  ).toString('base64url');
  expect(
    await createSessionManager(cookies(parts.join('.')), {
      identityVerification: verification
    }).getUser()
  ).toBeNull();
  clearJWKSCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw Error('offline');
    })
  );
  expect(
    await createSessionManager(cookies(value.token), {
      identityVerification: verification
    }).getUser()
  ).toBeNull();
});
it('verifies refreshed tokens before authenticating the user', async () => {
  const old = await fixture({ exp: 1 });
  const value = await fixture();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input) =>
      String(input).endsWith('/jwks')
        ? Response.json(value.jwks)
        : Response.json({
            access_token: value.token,
            refresh_token: 'rotated',
            expires_in: 900,
            token_type: 'Bearer'
          })
    )
  );
  expect(
    await createSessionManager(cookies(old.token, 'refresh'), {
      identityVerification: verification
    }).getUser()
  ).toMatchObject({ id: 'u' });
  clearJWKSCache();
  const wrong = await fixture();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input) =>
      String(input).endsWith('/jwks')
        ? Response.json(value.jwks)
        : Response.json({
            access_token: wrong.token,
            refresh_token: 'rotated',
            expires_in: 900,
            token_type: 'Bearer'
          })
    )
  );
  expect(
    await createSessionManager(cookies(old.token, 'refresh'), {
      identityVerification: verification
    }).getUser()
  ).toBeNull();
});
it('preserves cryptographic validation for an explicitly configured legacy Auth0 provider', async () => {
  const value = await fixture({ iss: 'https://legacy.test', aud: ['legacy-client'] });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(value.jwks))
  );
  const { getAuth0Config } = await import('./auth0.js');
  const provider = getAuth0Config({
    AUTH0_DOMAIN: 'legacy.test',
    AUTH0_CLIENT_ID: 'legacy-client',
    AUTH0_JWKS_URL: 'https://legacy.test/jwks'
  })!;
  expect(
    await createSessionManager(cookies(value.token), { authProvider: provider }).getUser()
  ).toMatchObject({ id: 'u' });
});
it('accepts configured Identity and Auth0 sessions independently during additive operation', async () => {
  const owned = await fixture();
  const legacy = await fixture({ iss: 'https://legacy.test', aud: ['legacy-client'] });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input) =>
      String(input).startsWith('https://legacy.test')
        ? Response.json(legacy.jwks)
        : Response.json(owned.jwks)
    )
  );
  const { getAuth0Config } = await import('./auth0.js');
  const authProvider = getAuth0Config({
    AUTH0_DOMAIN: 'legacy.test',
    AUTH0_CLIENT_ID: 'legacy-client',
    AUTH0_JWKS_URL: 'https://legacy.test/jwks'
  })!;
  expect(
    await createSessionManager(cookies(owned.token), {
      authProvider,
      identityVerification: verification
    }).getUser()
  ).toMatchObject({ id: 'u' });
  expect(
    await createSessionManager(cookies(legacy.token), {
      authProvider,
      identityVerification: verification
    }).getUser()
  ).toMatchObject({ id: 'u' });
});

it('honors the exact explicitly configured legacy issuer, including a trailing slash', async () => {
  const value = await fixture({ iss: 'https://legacy-slash.test/', aud: ['legacy-client'] });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(value.jwks))
  );
  const { getAuth0Config } = await import('./auth0.js');
  const provider = getAuth0Config({
    AUTH0_DOMAIN: 'legacy-slash.test',
    AUTH0_CLIENT_ID: 'legacy-client',
    AUTH0_ISSUER_BASE_URL: 'https://legacy-slash.test/'
  })!;
  expect(provider.issuer).toBe('https://legacy-slash.test/');
  expect(provider.jwksUrl).toBe('https://legacy-slash.test/.well-known/jwks.json');
  expect(
    await createSessionManager(cookies(value.token), { authProvider: provider }).getUser()
  ).toMatchObject({ id: 'u' });
  const differentIssuer = await fixture({
    iss: 'https://legacy-slash.test',
    aud: ['legacy-client']
  });
  clearJWKSCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(differentIssuer.jwks))
  );
  expect(
    await createSessionManager(cookies(differentIssuer.token), { authProvider: provider }).getUser()
  ).toBeNull();
});

it('accepts a legacy RS256 ID token with its configured issuer and client audience', async () => {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  );
  const jwk = {
    ...(await crypto.subtle.exportKey('jwk', pair.publicKey)),
    kid: 'legacy-rsa',
    alg: 'RS256',
    use: 'sig'
  };
  const enc = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const input = `${enc({ alg: 'RS256', kid: jwk.kid })}.${enc({ sub: 'auth0|existing-rsa', email: 'legacy@example.test', iss: 'https://legacy-rsa.test/', aud: 'legacy-client', iat: now, exp: now + 900 })}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    pair.privateKey,
    new TextEncoder().encode(input)
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ keys: [jwk] }))
  );
  const { getAuth0Config } = await import('./auth0.js');
  const authProvider = getAuth0Config({
    AUTH0_DOMAIN: 'legacy-rsa.test',
    AUTH0_CLIENT_ID: 'legacy-client',
    AUTH0_ISSUER_BASE_URL: 'https://legacy-rsa.test/'
  })!;
  expect(
    await createSessionManager(
      cookies(`${input}.${Buffer.from(signature).toString('base64url')}`),
      { authProvider }
    ).getUser()
  ).toMatchObject({ id: 'auth0|existing-rsa', email: 'legacy@example.test' });
});
