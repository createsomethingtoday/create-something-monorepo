import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from 'jose';

import {
  cloudflareAccessServePath,
  isCloudflareAccessMcpPath,
  resolveCloudflareAccessRequest,
} from '../src/cloudflare-access.js';
import { SCOPE_READ, SCOPE_WRITE, parseAllowedEmails } from '../src/oauth-access.js';
import {
  applyReviewerAuthEmailAliases,
  parseReviewerDirectory,
} from '../src/reviewer-directory.js';

const TEAM_DOMAIN = 'https://create-something.cloudflareaccess.com';
const POLICY_AUD = 'template-review-access-audience';
const KEY_ID = 'test-access-key';

const directory = applyReviewerAuthEmailAliases(
  parseReviewerDirectory(JSON.stringify({
    acct_wf_micah: {
      airtableCollaboratorId: 'usrMicah',
      email: 'micah@webflow.com',
      name: 'Micah Johnson',
    },
  })),
  JSON.stringify({ acct_wf_micah: ['micah@createsomething.io'] }),
);

test('Cloudflare Access uses a dedicated MCP surface without intercepting the existing hub path', () => {
  assert.equal(isCloudflareAccessMcpPath('/access/mcp'), true);
  assert.equal(isCloudflareAccessMcpPath('/access/mcp/messages'), true);
  assert.equal(isCloudflareAccessMcpPath('/access/sse'), true);
  assert.equal(isCloudflareAccessMcpPath('/access/sse/messages'), true);
  assert.equal(isCloudflareAccessMcpPath('/mcp'), false);
  assert.equal(isCloudflareAccessMcpPath('/sse'), false);
  assert.equal(cloudflareAccessServePath('/access/mcp/messages'), '/access/mcp');
  assert.equal(cloudflareAccessServePath('/access/sse/messages'), '/access/sse');
});

test('resolveCloudflareAccessRequest fails closed when Access configuration or assertion is missing', async () => {
  const base = {
    request: new Request('https://template-review.example.test/access/mcp'),
    teamDomain: TEAM_DOMAIN,
    audience: POLICY_AUD,
    allowedDomain: 'webflow.com',
    allowedEmails: parseAllowedEmails('micah@createsomething.io'),
    directory,
  };

  assert.deepEqual(await resolveCloudflareAccessRequest({ ...base, teamDomain: '' }), {
    ok: false,
    status: 500,
    code: 'misconfigured',
    message: 'Cloudflare Access authentication is not configured.',
  });
  assert.deepEqual(await resolveCloudflareAccessRequest({
    ...base,
    teamDomain: 'https://attacker.example.com',
  }), {
    ok: false,
    status: 500,
    code: 'misconfigured',
    message: 'Cloudflare Access authentication is not configured.',
  });
  assert.deepEqual(await resolveCloudflareAccessRequest(base), {
    ok: false,
    status: 401,
    code: 'unauthorized',
    message: 'Missing Cloudflare Access application assertion.',
  });
});

test('resolveCloudflareAccessRequest maps a signed Access assertion onto the canonical reviewer', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = KEY_ID;
  publicJwk.alg = 'RS256';

  const assertion = await new SignJWT({
    email: 'micah@createsomething.io',
    type: 'app',
  })
    .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
    .setIssuer(TEAM_DOMAIN)
    .setAudience(POLICY_AUD)
    .setSubject('access-user-micah')
    .setIssuedAt()
    .setNotBefore(Math.floor(Date.now() / 1000) - 1)
    .setExpirationTime('5m')
    .sign(privateKey);

  const result = await resolveCloudflareAccessRequest({
    request: new Request('https://template-review.example.test/mcp', {
      headers: { 'Cf-Access-Jwt-Assertion': assertion },
    }),
    teamDomain: TEAM_DOMAIN,
    audience: POLICY_AUD,
    allowedDomain: 'webflow.com',
    allowedEmails: parseAllowedEmails('micah@webflow.com,micah@createsomething.io'),
    directory,
    jwks: createLocalJWKSet({ keys: [publicJwk] }),
  });

  assert.deepEqual(result, {
    ok: true,
    subject: 'access-user-micah',
    accountId: 'acct_wf_micah',
    email: 'micah@createsomething.io',
    name: null,
    scopes: [SCOPE_READ, SCOPE_WRITE],
  });
});

test('resolveCloudflareAccessRequest rejects assertions outside the exact Access application boundary', async () => {
  const trusted = await generateKeyPair('RS256');
  const attacker = await generateKeyPair('RS256');
  const trustedJwk = await exportJWK(trusted.publicKey);
  trustedJwk.kid = KEY_ID;
  trustedJwk.alg = 'RS256';
  const jwks = createLocalJWKSet({ keys: [trustedJwk] });
  const now = Math.floor(Date.now() / 1000);

  const sign = async (input: {
    privateKey?: CryptoKey;
    issuer?: string;
    audience?: string;
    expiration?: number;
    email?: string;
    type?: string;
  }) => new SignJWT({
    ...(input.email === undefined ? { email: 'micah@createsomething.io' } : input.email ? { email: input.email } : {}),
    type: input.type ?? 'app',
  })
    .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
    .setIssuer(input.issuer ?? TEAM_DOMAIN)
    .setAudience(input.audience ?? POLICY_AUD)
    .setSubject('access-user-micah')
    .setIssuedAt(now - 60)
    .setNotBefore(now - 60)
    .setExpirationTime(input.expiration ?? now + 300)
    .sign(input.privateKey ?? trusted.privateKey);

  const assertions = [
    await sign({ privateKey: attacker.privateKey }),
    await sign({ issuer: 'https://another-team.cloudflareaccess.com' }),
    await sign({ audience: 'another-access-application' }),
    await sign({ expiration: now - 1 }),
    await sign({ email: '' }),
    await sign({ type: 'service' }),
  ];

  for (const assertion of assertions) {
    const result = await resolveCloudflareAccessRequest({
      request: new Request('https://template-review.example.test/access/mcp', {
        headers: { 'Cf-Access-Jwt-Assertion': assertion },
      }),
      teamDomain: TEAM_DOMAIN,
      audience: POLICY_AUD,
      allowedDomain: 'webflow.com',
      allowedEmails: parseAllowedEmails('micah@createsomething.io'),
      directory,
      jwks,
    });

    assert.deepEqual(result, {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: assertion === assertions[4]
        ? 'Cloudflare Access application assertion is missing required identity claims.'
        : assertion === assertions[5]
          ? 'Cloudflare Access application assertion is missing required identity claims.'
          : 'Invalid Cloudflare Access application assertion.',
    });
  }
});

test('resolveCloudflareAccessRequest preserves allowlist and reviewer write-scope policy', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = KEY_ID;
  publicJwk.alg = 'RS256';
  const jwks = createLocalJWKSet({ keys: [publicJwk] });

  const sign = (email: string) => new SignJWT({ email, type: 'app' })
    .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
    .setIssuer(TEAM_DOMAIN)
    .setAudience(POLICY_AUD)
    .setSubject(`access-user-${email}`)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);

  const denied = await resolveCloudflareAccessRequest({
    request: new Request('https://template-review.example.test/access/mcp', {
      headers: { 'Cf-Access-Jwt-Assertion': await sign('someone.else@webflow.com') },
    }),
    teamDomain: TEAM_DOMAIN,
    audience: POLICY_AUD,
    allowedDomain: 'webflow.com',
    allowedEmails: parseAllowedEmails('micah@createsomething.io,reviewer@webflow.com'),
    directory,
    jwks,
  });
  const readOnly = await resolveCloudflareAccessRequest({
    request: new Request('https://template-review.example.test/access/mcp', {
      headers: { 'Cf-Access-Jwt-Assertion': await sign('reviewer@webflow.com') },
    }),
    teamDomain: TEAM_DOMAIN,
    audience: POLICY_AUD,
    allowedDomain: 'webflow.com',
    allowedEmails: parseAllowedEmails('micah@createsomething.io,reviewer@webflow.com'),
    directory,
    jwks,
  });

  assert.deepEqual(denied, {
    ok: false,
    status: 403,
    code: 'forbidden',
    message: 'You are not on the Template Review access list. Ask the review team lead to add you.',
  });
  assert.deepEqual(readOnly, {
    ok: true,
    subject: 'access-user-reviewer@webflow.com',
    accountId: 'oauth:reviewer@webflow.com',
    email: 'reviewer@webflow.com',
    name: null,
    scopes: [SCOPE_READ],
  });
});
