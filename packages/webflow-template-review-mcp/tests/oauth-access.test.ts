import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCOPE_READ,
  SCOPE_WRITE,
  buildProtectedResourceMetadata,
  clerkFrontendApiFromPublishableKey,
  parseAllowedEmails,
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

test('clerkFrontendApiFromPublishableKey decodes the frontend API domain', () => {
  const encoded = btoa('clerk.example.com$');
  assert.equal(clerkFrontendApiFromPublishableKey(`pk_live_${encoded}`), 'https://clerk.example.com');
  assert.equal(clerkFrontendApiFromPublishableKey(`pk_test_${btoa('funny-skunk-42.clerk.accounts.dev$')}`), 'https://funny-skunk-42.clerk.accounts.dev');
  assert.equal(clerkFrontendApiFromPublishableKey('sk_live_notapublishablekey'), null);
  assert.equal(clerkFrontendApiFromPublishableKey(''), null);
  assert.equal(clerkFrontendApiFromPublishableKey(undefined), null);
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

test('buildProtectedResourceMetadata points at the Clerk authorization server', () => {
  const metadata = buildProtectedResourceMetadata({
    resourceOrigin: 'https://wf-template-review.mcp.createsomething.agency',
    resourcePath: '/mcp',
    authorizationServer: 'https://clerk.example.com',
  });
  assert.equal(metadata.resource, 'https://wf-template-review.mcp.createsomething.agency/mcp');
  assert.deepEqual(metadata.authorization_servers, ['https://clerk.example.com']);
  assert.deepEqual(metadata.bearer_methods_supported, ['header']);
});
