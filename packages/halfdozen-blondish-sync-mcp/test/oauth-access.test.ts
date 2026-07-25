import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCOPE_READ,
  SCOPE_WRITE,
  buildProtectedResourceMetadata,
  parseAllowedDomains,
  parseAllowedEmails,
  resolveIdentityOAuthRequest,
} from '../src/oauth-access.js';

const resource = 'https://halfdozen-cracked-sync-mcp.createsomething.workers.dev/mcp';

test('Cracked Live OAuth accepts a verified, explicitly allowlisted Identity user', async () => {
  const result = await resolveIdentityOAuthRequest({
    request: new Request(resource, {
      headers: { Authorization: 'Bearer identity-token' },
    }),
    issuer: 'https://id.example.test',
    expectedResource: resource,
    allowedEmails: parseAllowedEmails('operator@createsomething.io'),
    fetch: async () => Response.json({
      sub: 'user_operator',
      email: 'Operator@CreateSomething.io',
      email_verified: true,
      resource,
      scope: `${SCOPE_READ} ${SCOPE_WRITE}`,
    }),
  });

  assert.deepEqual(result, {
    ok: true,
    subject: 'user_operator',
    accountId: 'oauth:user_operator',
    email: 'operator@createsomething.io',
    name: null,
    scopes: [SCOPE_READ, SCOPE_WRITE],
  });
});

for (const email of ['producer@halfdozen.co', 'operator@createsomething.io']) {
  test(`Cracked Live OAuth accepts a verified ${email.split('@')[1]} identity`, async () => {
    const result = await resolveIdentityOAuthRequest({
      request: new Request(resource, {
        headers: { Authorization: 'Bearer identity-token' },
      }),
      issuer: 'https://id.example.test',
      expectedResource: resource,
      allowedEmails: new Set(),
      allowedDomains: parseAllowedDomains('halfdozen.co,createsomething.io'),
      fetch: async () => Response.json({
        sub: `user_${email}`,
        email,
        email_verified: true,
        resource,
        scope: `${SCOPE_READ} ${SCOPE_WRITE}`,
      }),
    });

    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.email, email);
  });
}

test('Cracked Live OAuth rejects a lookalike Half Dozen domain', async () => {
  const result = await resolveIdentityOAuthRequest({
    request: new Request(resource, {
      headers: { Authorization: 'Bearer identity-token' },
    }),
    issuer: 'https://id.example.test',
    expectedResource: resource,
    allowedEmails: new Set(),
    allowedDomains: parseAllowedDomains('halfdozen.co,createsomething.io'),
    fetch: async () => Response.json({
      sub: 'user_spoofed',
      email: 'producer@halfdozen.co.example.com',
      email_verified: true,
      resource,
      scope: `${SCOPE_READ} ${SCOPE_WRITE}`,
    }),
  });

  assert.deepEqual(result, {
    ok: false,
    status: 403,
    code: 'forbidden',
    message: 'You are not on the Cracked Live Ticket Sync access list.',
  });
});

test('Cracked Live OAuth rejects a malformed email that only names an allowed domain', async () => {
  const result = await resolveIdentityOAuthRequest({
    request: new Request(resource, {
      headers: { Authorization: 'Bearer identity-token' },
    }),
    issuer: 'https://id.example.test',
    expectedResource: resource,
    allowedEmails: new Set(),
    allowedDomains: parseAllowedDomains('halfdozen.co,createsomething.io'),
    fetch: async () => Response.json({
      sub: 'user_malformed',
      email: 'halfdozen.co',
      email_verified: true,
      resource,
      scope: `${SCOPE_READ} ${SCOPE_WRITE}`,
    }),
  });

  assert.deepEqual(result, {
    ok: false,
    status: 403,
    code: 'forbidden',
    message: 'You are not on the Cracked Live Ticket Sync access list.',
  });
});

test('Cracked Live OAuth fails closed when its email and domain allowlists are missing', async () => {
  const result = await resolveIdentityOAuthRequest({
    request: new Request(resource, {
      headers: { Authorization: 'Bearer identity-token' },
    }),
    issuer: 'https://id.example.test',
    expectedResource: resource,
    allowedEmails: new Set(),
    fetch: async () => Response.json({
      sub: 'user_operator',
      email: 'operator@createsomething.io',
      email_verified: true,
      resource,
      scope: `${SCOPE_READ} ${SCOPE_WRITE}`,
    }),
  });

  assert.deepEqual(result, {
    ok: false,
    status: 500,
    code: 'misconfigured',
    message: 'Cracked Live OAuth access requires an explicit email or domain allowlist.',
  });
});

test('Cracked Live OAuth rejects a token minted for another MCP resource', async () => {
  const result = await resolveIdentityOAuthRequest({
    request: new Request(resource, {
      headers: { Authorization: 'Bearer identity-token' },
    }),
    issuer: 'https://id.example.test',
    expectedResource: resource,
    allowedEmails: parseAllowedEmails('operator@createsomething.io'),
    fetch: async () => Response.json({
      sub: 'user_operator',
      email: 'operator@createsomething.io',
      email_verified: true,
      resource: 'https://another.example.test/mcp',
      scope: `${SCOPE_READ} ${SCOPE_WRITE}`,
    }),
  });

  assert.deepEqual(result, {
    ok: false,
    status: 401,
    code: 'unauthorized',
    message: 'OAuth access token is not valid for this resource.',
  });
});

test('Cracked Live OAuth never promotes a read-only token to write access', async () => {
  const result = await resolveIdentityOAuthRequest({
    request: new Request(resource, {
      headers: { Authorization: 'Bearer identity-token' },
    }),
    issuer: 'https://id.example.test',
    expectedResource: resource,
    allowedEmails: parseAllowedEmails('operator@createsomething.io'),
    fetch: async () => Response.json({
      sub: 'user_operator',
      email: 'operator@createsomething.io',
      email_verified: true,
      resource,
      scope: `openid profile email mcp ${SCOPE_READ}`,
    }),
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.scopes, [SCOPE_READ]);
});

test('Cracked Live protected-resource metadata points Claude at CREATE SOMETHING Identity', () => {
  const metadata = buildProtectedResourceMetadata({
    resourceOrigin: 'https://halfdozen-cracked-sync-mcp.createsomething.workers.dev',
    authorizationServer: 'https://id.createsomething.space',
  });

  assert.equal(metadata.resource, resource);
  assert.deepEqual(metadata.authorization_servers, ['https://id.createsomething.space']);
  assert.deepEqual(metadata.scopes_supported, [SCOPE_READ, SCOPE_WRITE]);
  assert.deepEqual(metadata.bearer_methods_supported, ['header']);
  assert.equal(metadata.resource_name, 'Cracked Live Ticket Sync MCP');
});
