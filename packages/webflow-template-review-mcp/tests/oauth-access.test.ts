import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCOPE_READ,
  SCOPE_QUEUE_READ,
  SCOPE_WRITE,
  buildProtectedResourceMetadata,
  fetchIdentityUserInfo,
  parseAllowedEmails,
  resolveIdentityOAuthRequest,
  resolveOAuthAccess,
} from '../src/oauth-access.js';
import { parseReviewerDirectory } from '../src/reviewer-directory.js';

const directory = parseReviewerDirectory(
  JSON.stringify({
    acct_wf_eric: {
      airtableCollaboratorId: 'usrEric',
      email: 'eric.unger@webflow.com',
      name: 'Eric Unger',
    },
  }),
);

const allowlist = parseAllowedEmails('micah@webflow.com, eric.unger@webflow.com,mariana.segura@webflow.com');

test('fetchIdentityUserInfo resolves a verified reviewer from the owned Identity endpoint', async () => {
  const requests: Request[] = [];
  const identity = await fetchIdentityUserInfo({
    issuer: 'https://id.example.test',
    token: 'owned-oauth-token',
    expectedResource: 'https://template-review.example.test/mcp',
    fetch: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json({
        sub: 'user_webflow_reviewer',
        email: 'reviewer@webflow.com',
        email_verified: true,
        name: 'Webflow Reviewer',
        resource: 'https://template-review.example.test/mcp',
        scope: 'template-review:read template-review:write',
      });
    },
  });

  assert.deepEqual(identity, {
    subject: 'user_webflow_reviewer',
    email: 'reviewer@webflow.com',
    emailVerified: true,
    name: 'Webflow Reviewer',
    resource: 'https://template-review.example.test/mcp',
    scope: 'template-review:read template-review:write',
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.url, 'https://id.example.test/oauth/userinfo');
  assert.equal(requests[0]?.headers.get('Authorization'), 'Bearer owned-oauth-token');
});

test('resolveIdentityOAuthRequest maps an Identity bearer onto reviewer-scoped MCP access', async () => {
  const result = await resolveIdentityOAuthRequest({
    request: new Request('https://template-review.example.test/mcp', {
      headers: { Authorization: 'Bearer identity-token' },
    }),
    issuer: 'https://id.example.test',
    expectedResource: 'https://template-review.example.test/mcp',
    allowedDomain: 'webflow.com',
    allowedEmails: allowlist,
    directory,
    fetch: async () => Response.json({
      sub: 'user_eric',
      email: 'eric.unger@webflow.com',
      email_verified: true,
      resource: 'https://template-review.example.test/mcp',
      scope: 'template-review:read template-review:write',
    }),
  });

  assert.deepEqual(result, {
    ok: true,
    subject: 'user_eric',
    accountId: 'acct_wf_eric',
    email: 'eric.unger@webflow.com',
    name: null,
    scopes: [SCOPE_READ, SCOPE_WRITE],
  });
});

test('resolveIdentityOAuthRequest fails closed for anonymous and invalid Identity bearers', async () => {
  const base = {
    issuer: 'https://id.example.test',
    expectedResource: 'https://template-review.example.test/mcp',
    allowedDomain: 'webflow.com',
    allowedEmails: allowlist,
    directory,
  };
  const anonymous = await resolveIdentityOAuthRequest({
    ...base,
    request: new Request('https://template-review.example.test/mcp'),
  });
  const invalid = await resolveIdentityOAuthRequest({
    ...base,
    request: new Request('https://template-review.example.test/mcp', {
      headers: { Authorization: 'Bearer invalid-token' },
    }),
    fetch: async () => Response.json({ error: 'invalid_token' }, { status: 401 }),
  });

  assert.deepEqual(anonymous, {
    ok: false,
    status: 401,
    code: 'unauthorized',
    message: 'Missing or invalid OAuth access token.',
  });
  assert.deepEqual(invalid, {
    ok: false,
    status: 401,
    code: 'unauthorized',
    message: 'Missing or invalid OAuth access token.',
  });
});

test('resolveIdentityOAuthRequest rejects unverified and non-allowlisted identities', async () => {
  const base = {
    request: new Request('https://template-review.example.test/mcp', {
      headers: { Authorization: 'Bearer identity-token' },
    }),
    issuer: 'https://id.example.test',
    expectedResource: 'https://template-review.example.test/mcp',
    allowedDomain: 'webflow.com',
    allowedEmails: allowlist,
    directory,
  };
  const unverified = await resolveIdentityOAuthRequest({
    ...base,
    fetch: async () => Response.json({
      sub: 'user_unverified',
      email: 'micah@webflow.com',
      email_verified: false,
      resource: 'https://template-review.example.test/mcp',
      scope: 'template-review:read',
    }),
  });
  const denied = await resolveIdentityOAuthRequest({
    ...base,
    fetch: async () => Response.json({
      sub: 'user_denied',
      email: 'someone.else@webflow.com',
      email_verified: true,
      resource: 'https://template-review.example.test/mcp',
      scope: 'template-review:read',
    }),
  });

  assert.deepEqual(unverified, {
    ok: false,
    status: 403,
    code: 'forbidden',
    message: 'A verified email is required for Template Review.',
  });
  assert.deepEqual(denied, {
    ok: false,
    status: 403,
    code: 'forbidden',
    message: 'You are not on the Template Review access list. Ask the review team lead to add you.',
  });
});

test('resolveIdentityOAuthRequest rejects a valid identity token minted for another resource', async () => {
  const result = await resolveIdentityOAuthRequest({
    request: new Request('https://template-review.example.test/mcp', {
      headers: { Authorization: 'Bearer identity-token' },
    }),
    issuer: 'https://id.example.test',
    expectedResource: 'https://template-review.example.test/mcp',
    allowedDomain: 'webflow.com',
    allowedEmails: allowlist,
    directory,
    fetch: async () => Response.json({
      sub: 'user_eric',
      email: 'eric.unger@webflow.com',
      email_verified: true,
      resource: 'https://another-resource.example.test/mcp',
      scope: 'template-review:read template-review:write',
    }),
  });

  assert.deepEqual(result, {
    ok: false,
    status: 401,
    code: 'unauthorized',
    message: 'OAuth access token is not valid for this resource.',
  });
});

test('resolveIdentityOAuthRequest never promotes token scope from reviewer policy', async () => {
  const base = {
    request: new Request('https://template-review.example.test/mcp', {
      headers: { Authorization: 'Bearer identity-token' },
    }),
    issuer: 'https://id.example.test',
    expectedResource: 'https://template-review.example.test/mcp',
    allowedDomain: 'webflow.com',
    allowedEmails: allowlist,
    directory,
  };
  const readOnly = await resolveIdentityOAuthRequest({
    ...base,
    fetch: async () => Response.json({
      sub: 'user_eric',
      email: 'eric.unger@webflow.com',
      email_verified: true,
      resource: 'https://template-review.example.test/mcp',
      scope: 'openid profile email mcp template-review:read',
    }),
  });
  const genericMcp = await resolveIdentityOAuthRequest({
    ...base,
    fetch: async () => Response.json({
      sub: 'user_eric',
      email: 'eric.unger@webflow.com',
      email_verified: true,
      resource: 'https://template-review.example.test/mcp',
      scope: 'openid profile email mcp',
    }),
  });

  assert.equal(readOnly.ok, true);
  if (readOnly.ok) assert.deepEqual(readOnly.scopes, [SCOPE_READ]);
  assert.deepEqual(genericMcp, {
    ok: false,
    status: 403,
    code: 'forbidden',
    message: `OAuth access token is missing the required ${SCOPE_READ} scope.`,
  });
});

test('resolveIdentityOAuthRequest preserves the exact workflow shadow pilot queue scope', async () => {
  const result = await resolveIdentityOAuthRequest({
    request: new Request('https://template-review.example.test/mcp', {
      headers: { Authorization: 'Bearer identity-token' },
    }),
    issuer: 'https://id.example.test',
    expectedResource: 'https://template-review.example.test/mcp',
    allowedDomain: 'webflow.com',
    allowedEmails: allowlist,
    directory,
    fetch: async () => Response.json({
      sub: 'user_eric',
      email: 'eric.unger@webflow.com',
      email_verified: true,
      resource: 'https://template-review.example.test/mcp',
      scope: `openid profile email mcp ${SCOPE_QUEUE_READ}`,
    }),
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.scopes, [SCOPE_QUEUE_READ]);
});

test('resolveOAuthAccess grants write scope to allowlisted reviewers', () => {
  const result = resolveOAuthAccess({
    email: 'Mariana.Segura@webflow.com',
    allowedDomain: 'webflow.com',
    allowedEmails: allowlist,
    directory,
  });
  assert.equal(result.allowed, true);
  if (result.allowed) {
    assert.deepEqual(result.scopes, [SCOPE_READ, SCOPE_WRITE]);
    assert.equal(result.email, 'mariana.segura@webflow.com');
    assert.equal(result.reviewerProfile, null);
  }
});

test('resolveOAuthAccess resolves directory profiles by email', () => {
  const result = resolveOAuthAccess({
    email: 'eric.unger@webflow.com',
    allowedDomain: 'webflow.com',
    allowedEmails: allowlist,
    directory,
  });
  assert.equal(result.allowed, true);
  if (result.allowed) {
    assert.equal(result.reviewerProfile?.airtableCollaboratorId, 'usrEric');
    assert.deepEqual(result.scopes, [SCOPE_READ, SCOPE_WRITE]);
  }
});

test('resolveOAuthAccess rejects non-allowlisted domain users when an allowlist is set', () => {
  const result = resolveOAuthAccess({
    email: 'someone.else@webflow.com',
    allowedDomain: 'webflow.com',
    allowedEmails: allowlist,
    directory,
  });
  assert.deepEqual(result, { allowed: false, reason: 'email_not_allowlisted' });
});

test('resolveOAuthAccess rejects other domains and missing emails', () => {
  assert.deepEqual(
    resolveOAuthAccess({ email: 'x@gmail.com', allowedDomain: 'webflow.com', allowedEmails: allowlist, directory }),
    { allowed: false, reason: 'domain_not_allowed' },
  );
  assert.deepEqual(
    resolveOAuthAccess({ email: null, allowedDomain: 'webflow.com', allowedEmails: allowlist, directory }),
    { allowed: false, reason: 'missing_email' },
  );
});

test('resolveOAuthAccess defaults to read-only for domain users without an allowlist', () => {
  const result = resolveOAuthAccess({
    email: 'someone.else@webflow.com',
    allowedDomain: 'webflow.com',
    allowedEmails: new Set<string>(),
    directory,
  });
  assert.equal(result.allowed, true);
  if (result.allowed) {
    assert.deepEqual(result.scopes, [SCOPE_READ]);
  }
});

test('buildProtectedResourceMetadata points at CREATE SOMETHING Identity', () => {
  const metadata = buildProtectedResourceMetadata({
    resourceOrigin: 'https://wf-template-review.mcp.createsomething.agency',
    resourcePath: '/mcp',
    authorizationServer: 'https://id.createsomething.space',
  });
  assert.equal(metadata.resource, 'https://wf-template-review.mcp.createsomething.agency/mcp');
  assert.deepEqual(metadata.authorization_servers, ['https://id.createsomething.space']);
  assert.deepEqual(metadata.scopes_supported, [SCOPE_READ, SCOPE_WRITE]);
  assert.deepEqual(metadata.bearer_methods_supported, ['header']);
});
