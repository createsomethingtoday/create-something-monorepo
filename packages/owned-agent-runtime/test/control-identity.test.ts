import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { SignJWT, exportJWK, generateKeyPair } from 'jose';

import {
  ControlIdentityUnavailableError,
  FirstPartyControlIdentity
} from '../src/control-identity.js';

test('cryptographically derives Control scope and role from first-party identity only', async (t) => {
  const primary = await generateKeyPair('ES256');
  const other = await generateKeyPair('ES256');
  const publicJwk = await exportJWK(primary.publicKey);
  let jwksAvailable = true;
  const server = createServer((_request, response) => {
    if (!jwksAvailable) {
      response.statusCode = 503;
      response.end('unavailable');
      return;
    }
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ keys: [{ ...publicJwk, kid: 'primary', alg: 'ES256', use: 'sig' }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const issuer = 'https://id.example';
  const audience = 'https://create-something-agent-runtime.createsomething.workers.dev/mcp';
  const identity = new FirstPartyControlIdentity({
    issuer,
    audience,
    jwksUrl: `http://127.0.0.1:${address.port}/.well-known/jwks.json`
  });

  async function token(input: {
    issuer?: string;
    audience?: string;
    expires?: string;
    key?: CryptoKey;
    claims?: Record<string, unknown>;
  } = {}) {
    return new SignJWT({
      account_id: 'account-a',
      tenant_id: 'tenant-a',
      workspace_account_id: 'workspace-a',
      roles: ['account_owner'],
      ...input.claims
    })
      .setProtectedHeader({ alg: 'ES256', kid: 'primary' })
      .setSubject('identity-owner')
      .setIssuer(input.issuer ?? issuer)
      .setAudience(input.audience ?? audience)
      .setIssuedAt()
      .setExpirationTime(input.expires ?? '5m')
      .sign(input.key ?? primary.privateKey);
  }

  const valid = await token();
  const context = await identity.resolve(new Request('https://runtime.example/v1/control/runs', {
    headers: {
      authorization: `Bearer ${valid}`,
      'x-control-role': 'control_scheduler',
      'x-tenant-id': 'tenant-b'
    }
  }));
  assert.deepEqual(context, {
    scope: { accountId: 'account-a', tenantId: 'tenant-a', workspaceAccountId: 'workspace-a' },
    actor: { subject: 'identity-owner', role: 'account_owner' },
    credentialSource: 'bearer'
  });

  const cookie = await identity.resolve(new Request('https://runtime.example', {
    headers: { cookie: `other=value; cs_access_token=${encodeURIComponent(valid)}` }
  }));
  assert.equal(cookie, undefined);

  const explicitBearer = await identity.resolve(new Request('https://runtime.example', {
    headers: {
      authorization: `Bearer ${valid}`,
      cookie: 'cs_access_token=stale-cookie-token'
    }
  }));
  assert.deepEqual(explicitBearer, context);

  const lowercaseBearer = await identity.resolve(new Request('https://runtime.example', {
    headers: { authorization: `bearer ${valid}` }
  }));
  assert.deepEqual(lowercaseBearer, context);

  const normalizedAudienceIdentity = new FirstPartyControlIdentity({
    issuer,
    audience: `${audience}/`,
    jwksUrl: `http://127.0.0.1:${address.port}/.well-known/jwks.json`
  });
  assert.deepEqual(
    await normalizedAudienceIdentity.resolve(new Request('https://runtime.example', {
      headers: { authorization: `Bearer ${valid}` }
    })),
    context
  );

  const scheduler = await identity.resolve(new Request('https://runtime.example', {
    headers: {
      authorization: `Bearer ${await token({ claims: {
        roles: ['control_scheduler'], activation_id: 'activation-a'
      } })}`
    }
  }));
  assert.equal(scheduler?.schedulerActivationId, 'activation-a');
  assert.equal(
    await identity.resolve(new Request('https://runtime.example', {
      headers: { authorization: `Bearer ${await token({ claims: { roles: ['control_scheduler'] } })}` }
    })),
    undefined
  );

  assert.equal(
    await identity.resolve(new Request('https://runtime.example', {
      headers: {
        authorization: 'Bearer invalid-explicit-token',
        cookie: `cs_access_token=${encodeURIComponent(valid)}`
      }
    })),
    undefined
  );

  for (const invalid of [
    await token({ issuer: 'https://other.example' }),
    await token({ audience: 'other-audience' }),
    await token({ expires: '0s' }),
    await token({ key: other.privateKey }),
    await token({ claims: { tenant_id: undefined } }),
    await token({ claims: { roles: ['untrusted_role'] } })
  ]) {
    assert.equal(
      await identity.resolve(new Request('https://runtime.example', {
        headers: { authorization: `Bearer ${invalid}` }
      })),
      undefined
    );
  }

  jwksAvailable = false;
  const unavailableIdentity = new FirstPartyControlIdentity({
    issuer,
    audience,
    jwksUrl: `http://127.0.0.1:${address.port}/.well-known/jwks.json`
  });
  await assert.rejects(
    unavailableIdentity.resolve(new Request('https://runtime.example', {
      headers: { authorization: `Bearer ${valid}` }
    })),
    ControlIdentityUnavailableError
  );
});
