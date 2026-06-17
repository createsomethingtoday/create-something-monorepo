import assert from 'node:assert/strict';
import test from 'node:test';
import { getClerkAccessState, verifyClerkSessionToken } from '../src/lib/server/auth/clerk-access.ts';

function base64Url(value: string | ArrayBuffer) {
  const buffer = typeof value === 'string' ? Buffer.from(value) : Buffer.from(value);
  return buffer.toString('base64url');
}

async function createSignedJwt(payload: Record<string, unknown>) {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  publicJwk.kid = 'test-key';
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  const signingInput = [
    base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })),
    base64Url(JSON.stringify(payload))
  ].join('.');
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyPair.privateKey,
    new TextEncoder().encode(signingInput)
  );

  return {
    token: `${signingInput}.${base64Url(signature)}`,
    jwks: { keys: [publicJwk] }
  };
}

function createJwksFetch(jwks: unknown): typeof fetch {
  return async () =>
    new Response(JSON.stringify(jwks), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
}

test('Clerk verifier accepts a valid RS256 session token', async () => {
  const now = Math.floor(Date.now() / 1000);
  const { token, jwks } = await createSignedJwt({
    sub: 'user_123',
    iss: 'https://clerk.example.test',
    org_id: 'org_create',
    org_role: 'org:admin',
    exp: now + 300
  });

  const claims = await verifyClerkSessionToken({
    token,
    fetch: createJwksFetch(jwks),
    platform: {
      env: {
        ENVIRONMENT: 'production',
        CLERK_ISSUER: 'https://clerk.example.test'
      }
    }
  });

  assert.equal(claims.subject, 'user_123');
  assert.equal(claims.organizationId, 'org_create');
  assert.equal(claims.organizationRole, 'org:admin');
});

test('Clerk access allows matching organization and role', async () => {
  const now = Math.floor(Date.now() / 1000);
  const { token, jwks } = await createSignedJwt({
    sub: 'user_123',
    iss: 'https://allowed.clerk.example.test',
    email: 'operator@createsomething.io',
    org_id: 'org_create',
    org_role: 'org:admin',
    exp: now + 300
  });

  const state = await getClerkAccessState({
    fetch: createJwksFetch(jwks),
    request: new Request('https://ona.example.test/agents', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),
    url: new URL('https://ona.example.test/agents'),
    platform: {
      env: {
        ENVIRONMENT: 'production',
        CLERK_ISSUER: 'https://allowed.clerk.example.test',
        CLERK_ALLOWED_ORGANIZATION_IDS: 'org_create',
        CLERK_ALLOWED_ORGANIZATION_ROLES: 'org:admin'
      }
    }
  });

  assert.equal(state.status, 'allowed');
  assert.equal(state.source, 'clerk');
  assert.equal(state.email, 'operator@createsomething.io');
});

test('Clerk access blocks valid sessions outside allow rules', async () => {
  const now = Math.floor(Date.now() / 1000);
  const { token, jwks } = await createSignedJwt({
    sub: 'user_456',
    iss: 'https://blocked.clerk.example.test',
    org_id: 'org_other',
    org_role: 'org:member',
    exp: now + 300
  });

  const state = await getClerkAccessState({
    fetch: createJwksFetch(jwks),
    request: new Request('https://ona.example.test/agents', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),
    url: new URL('https://ona.example.test/agents'),
    platform: {
      env: {
        ENVIRONMENT: 'production',
        CLERK_ISSUER: 'https://blocked.clerk.example.test',
        CLERK_ALLOWED_ORGANIZATION_IDS: 'org_create'
      }
    }
  });

  assert.equal(state.status, 'blocked');
  assert.match(state.detail, /allow/i);
});

test('Clerk access reports anonymous users without a session token', async () => {
  const state = await getClerkAccessState({
    request: new Request('https://ona.example.test/agents'),
    url: new URL('https://ona.example.test/agents'),
    platform: {
      env: {
        ENVIRONMENT: 'production',
        CLERK_ISSUER: 'https://clerk.example.test'
      }
    }
  });

  assert.equal(state.status, 'anonymous');
});
