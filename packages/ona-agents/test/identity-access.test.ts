import assert from 'node:assert/strict';
import test from 'node:test';
import { getIdentityAccessState } from '../src/lib/server/auth/identity-access.ts';

function base64Url(value: string | ArrayBuffer) {
  return Buffer.from(value).toString('base64url');
}

async function createSignedJwt(payload: Record<string, unknown>) {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  publicJwk.kid = 'test-key';
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';
  const signingInput = [
    base64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: 'test-key' })),
    base64Url(JSON.stringify(payload))
  ].join('.');
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyPair.privateKey,
    new TextEncoder().encode(signingInput)
  );
  return {
    token: `${signingInput}.${base64Url(signature)}`,
    jwks: { keys: [publicJwk] }
  };
}

function createJwksFetch(jwks: unknown): typeof fetch {
  return async () => Response.json(jwks);
}

function createPlatform(overrides: Record<string, string> = {}) {
  return {
    env: {
      ENVIRONMENT: 'production',
      CS_IDENTITY_ISSUER: 'https://id.createsomething.space',
      CS_IDENTITY_JWKS_URL: 'https://id.createsomething.space/.well-known/jwks.json',
      CS_IDENTITY_AUDIENCE: 'ona-agents',
      CS_AUTH_ALLOWED_EMAIL_DOMAINS: 'createsomething.io',
      ...overrides
    }
  } as App.Platform;
}

test('first-party access allows an owned identity matching the staff domain', async () => {
  const now = Math.floor(Date.now() / 1000);
  const { token, jwks } = await createSignedJwt({
    sub: 'user_123',
    email: 'operator@createsomething.io',
    tier: 'agency',
    source: 'io',
    iss: 'https://id.createsomething.space',
    aud: ['ona-agents'],
    iat: now,
    exp: now + 300
  });
  const state = await getIdentityAccessState({
    fetch: createJwksFetch(jwks),
    request: new Request('https://ona.example.test/agents', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    url: new URL('https://ona.example.test/agents'),
    platform: createPlatform({
      CS_IDENTITY_JWKS_URL: 'https://id.createsomething.space/allowed-jwks.json'
    })
  });

  assert.equal(state.status, 'allowed');
  assert.equal(state.source, 'identity');
  assert.equal(state.email, 'operator@createsomething.io');
});

test('first-party access blocks a valid identity outside staff allow rules', async () => {
  const now = Math.floor(Date.now() / 1000);
  const { token, jwks } = await createSignedJwt({
    sub: 'user_456',
    email: 'outsider@example.com',
    tier: 'free',
    source: 'space',
    iss: 'https://id.createsomething.space',
    aud: ['ona-agents'],
    iat: now,
    exp: now + 300
  });
  const state = await getIdentityAccessState({
    fetch: createJwksFetch(jwks),
    request: new Request('https://ona.example.test/agents', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    url: new URL('https://ona.example.test/agents'),
    platform: createPlatform()
  });

  assert.equal(state.status, 'blocked');
});

test('first-party access reports anonymous users without a session token', async () => {
  const state = await getIdentityAccessState({
    request: new Request('https://ona.example.test/agents'),
    url: new URL('https://ona.example.test/agents'),
    platform: createPlatform()
  });

  assert.equal(state.status, 'anonymous');
  assert.match(state.detail, /sign in/i);
});

test('preview bypass is explicit outside production and fails closed in production', async () => {
  const request = new Request('https://ona.example.test/agents');
  const url = new URL(request.url);
  const preview = await getIdentityAccessState({
    request,
    url,
    platform: createPlatform({ ENVIRONMENT: 'development', ALLOW_CS_AUTH_PREVIEW: 'true' })
  });
  const production = await getIdentityAccessState({
    request,
    url,
    platform: createPlatform({ ENVIRONMENT: 'production', ALLOW_CS_AUTH_PREVIEW: 'true' })
  });

  assert.equal(preview.status, 'allowed');
  assert.equal(preview.source, 'preview');
  assert.equal(production.status, 'unconfigured');
});

test('development stays protected when preview bypass is not explicitly enabled', async () => {
  const request = new Request('https://ona.example.test/agents');
  const state = await getIdentityAccessState({
    request,
    url: new URL(request.url),
    platform: createPlatform({ ENVIRONMENT: 'development', ALLOW_CS_AUTH_PREVIEW: 'false' })
  });

  assert.equal(state.status, 'anonymous');
});
