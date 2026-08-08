import assert from 'node:assert/strict';
import test from 'node:test';

import identityWorker from '../src/index.ts';

const env = {
  ENVIRONMENT: 'test',
  ALLOWED_ORIGINS: 'https://chatgpt.com',
} as any;

test('identity worker publishes the AI-readable auth platform contract', async () => {
  const response = await identityWorker.fetch(
    new Request('https://id.createsomething.space/.well-known/create-something-auth'),
    env,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  assert.match(response.headers.get('cache-control') ?? '', /max-age=300/);

  const body = await response.json() as any;
  assert.equal(body.schema, 'https://createsomething.agency/schemas/auth-platform/v1');
  assert.equal(body.version, '1.0.0');
  assert.equal(body.issuer, 'https://id.createsomething.space');
  assert.equal(body.jwks_uri, 'https://id.createsomething.space/.well-known/jwks.json');
  assert.equal(body.openapi_uri, 'https://id.createsomething.space/v1/auth/openapi.json');
  assert.equal(body.endpoints.login, 'https://id.createsomething.space/v1/auth/login');
  assert.equal(body.endpoints.player_login, 'https://id.createsomething.space/v1/auth/player-login');
  assert.equal(body.endpoints.me, 'https://id.createsomething.space/v1/users/me');
  assert.deepEqual(body.jwt.algorithms, ['ES256']);
  assert.ok(body.policy_dimensions.includes('email_domain'));
  assert.deepEqual(body.mcp.resources, ['auth://platform/contract', 'auth://platform/openapi']);
  assert.deepEqual(body.mcp.tools, ['auth_config_validate']);
  assert.deepEqual(body.mcp.mutations, []);
  assert.equal(body.safety.agent_can_issue_credentials, false);
  assert.equal(body.safety.agent_can_grant_access, false);
  assert.equal(body.safety.agent_can_rotate_secrets, false);
});

test('identity worker publishes an auth-focused OpenAPI contract', async () => {
  const response = await identityWorker.fetch(
    new Request('https://id.createsomething.space/v1/auth/openapi.json'),
    env,
  );

  assert.equal(response.status, 200);
  const body = await response.json() as any;
  assert.equal(body.openapi, '3.1.0');
  assert.equal(body.info.title, 'CREATE SOMETHING Auth API');
  assert.equal(body.servers[0].url, 'https://id.createsomething.space');
  assert.equal(body.paths['/v1/auth/login'].post.operationId, 'login');
  assert.equal(body.paths['/v1/auth/player-login'].post.operationId, 'playerLogin');
  assert.equal(body.paths['/v1/auth/signup'].post.operationId, 'signup');
  assert.equal(body.paths['/v1/auth/refresh'].post.operationId, 'refreshSession');
  assert.equal(body.paths['/v1/auth/logout'].post.operationId, 'logout');
  assert.equal(body.paths['/v1/users/me'].get.operationId, 'getCurrentUser');
  assert.equal(body.components.securitySchemes.bearerAuth.scheme, 'bearer');
  assert.doesNotMatch(JSON.stringify(body), /password_hash|private_key|refresh_token_value/i);
});
