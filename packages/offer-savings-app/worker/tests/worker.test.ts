import assert from 'node:assert/strict';
import test from 'node:test';

import { createOfferSavingsWorkerHandler } from '../router.js';

const origin = 'https://offer-savings-agent.createsomething.workers.dev';

function environment() {
  return {
    CS_IDENTITY_ISSUER: 'https://id.createsomething.space',
    OAUTH_ALLOWED_EMAILS: 'micah@createsomething.io'
  } as never;
}

test('the public Worker advertises OAuth and rejects anonymous MCP calls', async () => {
  let mcpCalled = false;
  const worker = createOfferSavingsWorkerHandler({
    mcpFetch: async () => {
      mcpCalled = true;
      return new Response('unexpected');
    }
  });

  const healthResponse = await worker.fetch(
    new Request(`${origin}/health`),
    environment(),
    {} as ExecutionContext
  );
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), {
    name: 'offer-savings-agent',
    version: '0.3.0',
    status: 'healthy',
    endpoint: '/mcp',
    authentication: 'OAuth 2.1 + PKCE through CREATE SOMETHING Identity'
  });

  const metadataResponse = await worker.fetch(
    new Request(`${origin}/.well-known/oauth-protected-resource`),
    environment(),
    {} as ExecutionContext
  );
  assert.equal(metadataResponse.status, 200);
  assert.deepEqual(await metadataResponse.json(), {
    resource: `${origin}/mcp`,
    authorization_servers: ['https://id.createsomething.space'],
    scopes_supported: ['offer-savings:read', 'offer-savings:write'],
    bearer_methods_supported: ['header'],
    resource_name: 'Offer Savings'
  });

  const anonymousResponse = await worker.fetch(
    new Request(`${origin}/mcp`, { method: 'POST' }),
    environment(),
    {} as ExecutionContext
  );
  assert.equal(anonymousResponse.status, 401);
  assert.equal(
    anonymousResponse.headers.get('WWW-Authenticate'),
    `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`
  );
  assert.equal(mcpCalled, false);
});

test('the Worker resolves an exact-resource Identity token before serving MCP', async () => {
  let receivedProps: unknown;
  const worker = createOfferSavingsWorkerHandler({
    identityFetch: async () =>
      Response.json({
        sub: 'user-micah',
        email: 'micah@createsomething.io',
        email_verified: true,
        resource: `${origin}/mcp`,
        scope: 'offer-savings:read offer-savings:write'
      }),
    mcpFetch: async (_request, _env, ctx) => {
      receivedProps = ctx.props;
      return new Response('mcp-ok');
    }
  });

  const response = await worker.fetch(
    new Request(`${origin}/mcp`, {
      method: 'POST',
      headers: { Authorization: 'Bearer opaque-token' }
    }),
    environment(),
    {} as ExecutionContext
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'mcp-ok');
  assert.deepEqual(receivedProps, {
    subject: 'user-micah',
    email: 'micah@createsomething.io',
    scopes: ['offer-savings:read', 'offer-savings:write']
  });
});

test('the Worker prefers the Identity service binding for token verification', async () => {
  const originalFetch = globalThis.fetch;
  let bindingCalled = false;

  globalThis.fetch = async () => {
    throw new Error('public Identity fetch should not be used when the service binding is present');
  };

  try {
    const worker = createOfferSavingsWorkerHandler({
      mcpFetch: async () => new Response('mcp-ok')
    });
    const env = {
      CS_IDENTITY_ISSUER: 'https://id.createsomething.space',
      OAUTH_ALLOWED_EMAILS: 'micah@createsomething.io',
      IDENTITY_WORKER: {
        fetch: async () => {
          bindingCalled = true;
          return Response.json({
            sub: 'user-micah',
            email: 'micah@createsomething.io',
            email_verified: true,
            resource: `${origin}/mcp`,
            scope: 'offer-savings:read offer-savings:write'
          });
        }
      }
    } as never;

    const response = await worker.fetch(
      new Request(`${origin}/mcp`, {
        method: 'POST',
        headers: { Authorization: 'Bearer opaque-token' }
      }),
      env,
      {} as ExecutionContext
    );

    assert.equal(response.status, 200);
    assert.equal(bindingCalled, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
