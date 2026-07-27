import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CloudflareWorkspaceRouter,
  CloudflareWorkspaceRouterError
} from '../src/lib/cloudflare/workspace-router.js';

const allowedAccess = {
  status: 'allowed' as const,
  source: 'identity' as const,
  signInUrl: '/sign-in',
  subject: 'identity|operator-123',
  email: 'micah@createsomething.io',
  tenantId: null,
  roles: [],
  reason: 'allowed',
  detail: 'allowed'
};

test('router maps an allowed identity and opaque browser instance to one private sandbox id', async () => {
  const router = new CloudflareWorkspaceRouter({
    cookieSecret: 'test-secret-with-32-bytes-minimum'
  });
  const first = await router.resolve({
    access: allowedAccess,
    request: new Request('https://workspace.createsomething.space/')
  });

  assert.match(first.sandboxId, /^client-workspace-[a-f0-9]{32}$/);
  assert.equal(first.sandboxId.includes('operator-123'), false);
  assert.match(first.setCookie ?? '', /^cs_workspace_instance=/);
  assert.match(first.setCookie ?? '', /HttpOnly/);
  assert.match(first.setCookie ?? '', /Secure/);
  assert.match(first.setCookie ?? '', /SameSite=Lax/);

  const second = await router.resolve({
    access: allowedAccess,
    request: new Request('https://workspace.createsomething.space/api/workspaces', {
      headers: { cookie: first.setCookie!.split(';', 1)[0] }
    })
  });

  assert.equal(second.sandboxId, first.sandboxId);
  assert.equal(second.setCookie, null);
});

test('router rejects denied identity and forged workspace instance cookies', async () => {
  const router = new CloudflareWorkspaceRouter({
    cookieSecret: 'test-secret-with-32-bytes-minimum'
  });

  await assert.rejects(
    router.resolve({
      access: { ...allowedAccess, status: 'blocked', subject: 'identity|blocked' },
      request: new Request('https://workspace.createsomething.space/')
    }),
    (error: unknown) =>
      error instanceof CloudflareWorkspaceRouterError && error.code === 'workspace_access_denied'
  );

  await assert.rejects(
    router.resolve({
      access: allowedAccess,
      request: new Request('https://workspace.createsomething.space/', {
        headers: { cookie: 'cs_workspace_instance=forged' }
      })
    }),
    (error: unknown) =>
      error instanceof CloudflareWorkspaceRouterError && error.code === 'workspace_instance_invalid'
  );
});
