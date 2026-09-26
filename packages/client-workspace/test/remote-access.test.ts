import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createServer } from 'node:http';
import { test } from 'node:test';

import { verifyRemoteAccess } from '../src/lib/server/remote-access.js';

test('remote workspace denies a request without an Access assertion', async () => {
  const allowed = await verifyRemoteAccess(new Request('https://client-agent.example.test/'), {
    teamDomain: 'https://team.cloudflareaccess.com',
    audience: 'client-agent-audience',
    allowedEmail: 'operator@example.test'
  });

  assert.equal(allowed, false);
});

test('remote workspace accepts only a signed Access assertion for its operator', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const teamDomain = `http://127.0.0.1:${address.port}`;
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: teamDomain,
      aud: ['client-agent-audience'],
      email: 'operator@example.test',
      iat: now,
      exp: now + 60
    })).toString('base64url');
    const body = `${header}.${payload}`;
    const signature = sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url');
    const request = new Request('https://client-agent.example.test/', {
      headers: { 'Cf-Access-Jwt-Assertion': `${body}.${signature}` }
    });

    assert.equal(await verifyRemoteAccess(request, {
      teamDomain,
      audience: 'client-agent-audience',
      allowedEmail: 'operator@example.test'
    }), true);
    assert.equal(await verifyRemoteAccess(request, {
      teamDomain,
      audience: 'another-app',
      allowedEmail: 'operator@example.test'
    }), false);
    assert.equal(await verifyRemoteAccess(request, {
      teamDomain,
      audience: 'client-agent-audience',
      allowedEmail: 'someone-else@example.test'
    }), false);
    const forged = new Request(request.url, {
      headers: { 'Cf-Access-Jwt-Assertion': `${body}.${signature.slice(0, -2)}xx` }
    });
    assert.equal(await verifyRemoteAccess(forged, {
      teamDomain,
      audience: 'client-agent-audience',
      allowedEmail: 'operator@example.test'
    }), false);
  } finally {
    server.close();
  }
});
