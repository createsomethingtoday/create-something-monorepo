import assert from 'node:assert/strict';
import test from 'node:test';

import { createClientWorkspaceWorker } from '../src/lib/cloudflare/worker.js';

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

for (const path of [
  '/api/workspaces/demo/sessions',
  '/api/workspaces/demo/preview/'
]) {
  test(`edge worker denies anonymous access to ${path} before a sandbox is addressed`, async () => {
    let sandboxRequests = 0;
    const worker = createClientWorkspaceWorker({
      cookieSecret: 'test-secret-with-32-bytes-minimum',
      resolveAccess: async () => ({ ...allowedAccess, status: 'anonymous', subject: null }),
      sandbox: {
        async fetch() {
          sandboxRequests += 1;
          return Response.json({ unsafe: true });
        }
      }
    });

    const response = await worker.fetch(
      new Request(`https://workspace.createsomething.space${path}`, {
        method: path.endsWith('/sessions') ? 'POST' : 'GET'
      })
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'authentication_required' });
    assert.equal(sandboxRequests, 0);
  });
}

test('edge worker routes an allowed request through one opaque RPC sandbox and strips identity cookies', async () => {
  const seen: Array<{ sandboxId: string; cookie: string | null }> = [];
  const worker = createClientWorkspaceWorker({
    cookieSecret: 'test-secret-with-32-bytes-minimum',
    resolveAccess: async () => allowedAccess,
    sandbox: {
      async fetch(sandboxId, request) {
        seen.push({ sandboxId, cookie: request.headers.get('cookie') });
        return new Response('workspace-shell', { headers: { 'content-type': 'text/html' } });
      }
    }
  });

  const response = await worker.fetch(
    new Request('https://workspace.createsomething.space/', {
      headers: { cookie: 'cs_access_token=secret-access; cs_refresh_token=secret-refresh' }
    })
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'workspace-shell');
  assert.equal(seen.length, 1);
  assert.match(seen[0].sandboxId, /^client-workspace-[a-f0-9]{32}$/);
  assert.equal(seen[0].cookie, null);
  assert.match(response.headers.get('set-cookie') ?? '', /^cs_workspace_instance=/);
});

test('edge worker preserves a bounded multipart turn while stripping browser authority', async () => {
  const worker = createClientWorkspaceWorker({
    cookieSecret: 'test-secret-with-32-bytes-minimum',
    resolveAccess: async () => allowedAccess,
    sandbox: {
      async fetch(_sandboxId, request) {
        assert.equal(request.headers.get('cookie'), null);
        const form = await request.formData();
        const image = form.get('image');
        assert.equal(form.get('text'), 'Use the attached reference.');
        assert.ok(image instanceof File);
        assert.equal(image.type, 'image/png');
        assert.equal(image.size, 8);
        return Response.json({ turnId: 'turn-demo' }, { status: 202 });
      }
    }
  });
  const form = new FormData();
  form.set('text', 'Use the attached reference.');
  form.set('image', new File([Buffer.from('tiny-png')], 'reference.png', { type: 'image/png' }));

  const response = await worker.fetch(
    new Request('https://workspace.createsomething.space/api/sessions/session-demo/turns', {
      method: 'POST',
      headers: { cookie: 'cs_access_token=secret-access; cs_refresh_token=secret-refresh' },
      body: form
    })
  );

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { turnId: 'turn-demo' });
});

test('edge worker redirects blocked document requests to sign-in without leaking workspace data', async () => {
  const worker = createClientWorkspaceWorker({
    cookieSecret: 'test-secret-with-32-bytes-minimum',
    resolveAccess: async () => ({ ...allowedAccess, status: 'blocked' }),
    sandbox: {
      async fetch() {
        throw new Error('sandbox should not be called');
      }
    }
  });

  const response = await worker.fetch(
    new Request('https://workspace.createsomething.space/', {
      headers: { accept: 'text/html' },
      redirect: 'manual'
    })
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/sign-in');
});
