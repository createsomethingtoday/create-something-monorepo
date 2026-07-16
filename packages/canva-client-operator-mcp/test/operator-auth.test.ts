import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authenticateOperatorRequest,
  buildCanvaProtectedResourceMetadata,
  parseAllowedEmails,
} from '../src/operator-auth.js';

test('Claude discovery advertises Identity and operator authentication preserves bounded scopes', async () => {
  const metadata = buildCanvaProtectedResourceMetadata({
    origin: 'https://canva-client-mcp.example.com',
    issuer: 'https://id.createsomething.space',
  });
  assert.deepEqual(metadata.authorization_servers, ['https://id.createsomething.space']);
  assert.equal(metadata.resource, 'https://canva-client-mcp.example.com/mcp');

  const result = await authenticateOperatorRequest({
    request: new Request('https://canva-client-mcp.example.com/mcp', {
      headers: { Authorization: 'Bearer operator-token' },
    }),
    issuer: 'https://id.createsomething.space',
    expectedResource: 'https://canva-client-mcp.example.com/mcp',
    allowedDomain: 'createsomething.io',
    allowedEmails: parseAllowedEmails('operator@createsomething.io'),
    fetch: async () =>
      Response.json({
        sub: 'operator_123',
        email: 'operator@createsomething.io',
        email_verified: true,
        name: 'Operator',
        resource: 'https://canva-client-mcp.example.com/mcp',
        scope: 'canva-client:read canva-client:write canva-client:admin',
      }),
  });

  assert.deepEqual(result, {
    ok: true,
    operator: {
      subject: 'operator_123',
      email: 'operator@createsomething.io',
      name: 'Operator',
      scopes: ['canva-client:read', 'canva-client:write', 'canva-client:admin'],
    },
  });
});

test('operator authentication rejects missing, unverified, and non-allowlisted identities', async () => {
  const base = {
    issuer: 'https://id.createsomething.space',
    expectedResource: 'https://canva-client-mcp.example.com/mcp',
    allowedDomain: 'createsomething.io',
    allowedEmails: parseAllowedEmails('operator@createsomething.io'),
  };
  const missing = await authenticateOperatorRequest({
    ...base,
    request: new Request('https://canva-client-mcp.example.com/mcp'),
  });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.status, 401);

  const denied = await authenticateOperatorRequest({
    ...base,
    request: new Request('https://canva-client-mcp.example.com/mcp', {
      headers: { Authorization: 'Bearer denied-token' },
    }),
    fetch: async () =>
      Response.json({
        sub: 'client_456',
        email: 'client@example.com',
        email_verified: true,
        resource: 'https://canva-client-mcp.example.com/mcp',
        scope: 'canva-client:read',
      }),
  });
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.status, 403);
});
