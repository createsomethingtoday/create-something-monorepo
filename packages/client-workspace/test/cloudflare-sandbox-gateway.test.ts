import assert from 'node:assert/strict';
import test from 'node:test';

import { CloudflareSandboxGateway } from '../src/lib/cloudflare/sandbox-gateway.js';

test('sandbox gateway pins RPC, bounded lifecycle, one app process, and authenticated container fetch', async () => {
  const calls: unknown[] = [];
  const sandbox = {
    async getProcess(processId: string) {
      calls.push(['getProcess', processId]);
      return null;
    },
    async startProcess(command: string, options: unknown) {
      calls.push(['startProcess', command, options]);
      return {
        async waitForPort(port: number, options: unknown) {
          calls.push(['waitForPort', port, options]);
        }
      };
    },
    async containerFetch(request: Request, port: number) {
      calls.push(['containerFetch', request.url, port]);
      return new Response('sandbox-app');
    }
  };
  const gateway = new CloudflareSandboxGateway({
    binding: {} as never,
    openaiApiKey: 'server-secret',
    getSandbox(_binding, sandboxId, options) {
      calls.push(['getSandbox', sandboxId, options]);
      return sandbox;
    }
  });

  const response = await gateway.fetch(
    'client-workspace-0123456789abcdef0123456789abcdef',
    new Request('https://workspace.createsomething.space/api/sessions/example')
  );

  assert.equal(await response.text(), 'sandbox-app');
  assert.deepEqual(calls, [
    [
      'getSandbox',
      'client-workspace-0123456789abcdef0123456789abcdef',
      { normalizeId: true, transport: 'rpc', sleepAfter: '10m', keepAlive: false }
    ],
    ['getProcess', 'client-workspace-app'],
    [
      'startProcess',
      '/app/start-client-workspace.sh',
      {
        processId: 'client-workspace-app',
        cwd: '/app',
        env: {
          HOST: '0.0.0.0',
          PORT: '4173',
          NODE_ENV: 'production',
          OPENAI_API_KEY: 'server-secret',
          CLIENT_WORKSPACE_STATE_ROOT: '/workspace/state',
          CLIENT_WORKSPACE_MANAGED_ROOT: '/workspace/projects',
          CLIENT_WORKSPACE_SEED_ROOT: '/app/seed'
        }
      }
    ],
    ['waitForPort', 4173, { path: '/', status: 200, timeout: 120_000 }],
    ['containerFetch', 'https://workspace.createsomething.space/api/sessions/example', 4173]
  ]);
});

test('sandbox gateway reuses a running app process without reinjecting secrets', async () => {
  let starts = 0;
  const gateway = new CloudflareSandboxGateway({
    binding: {} as never,
    openaiApiKey: 'server-secret',
    getSandbox() {
      return {
        async getProcess() {
          return { status: 'running' };
        },
        async startProcess() {
          starts += 1;
          throw new Error('should not start');
        },
        async containerFetch() {
          return new Response('reused');
        }
      };
    }
  });

  const response = await gateway.fetch(
    'client-workspace-0123456789abcdef0123456789abcdef',
    new Request('https://workspace.createsomething.space/')
  );
  assert.equal(await response.text(), 'reused');
  assert.equal(starts, 0);
});

test('sandbox gateway rejects non-router sandbox ids', async () => {
  const gateway = new CloudflareSandboxGateway({
    binding: {} as never,
    openaiApiKey: 'server-secret',
    getSandbox() {
      throw new Error('should not address sandbox');
    }
  });

  await assert.rejects(
    gateway.fetch('operator-email', new Request('https://workspace.createsomething.space/')),
    /sandbox_id_invalid/
  );
});

test('sandbox gateway restores before startup and checkpoints successful diff readback', async () => {
  const calls: unknown[] = [];
  const tasks: Promise<unknown>[] = [];
  const sandbox = {
    async getProcess() {
      calls.push(['getProcess']);
      return null;
    },
    async startProcess() {
      calls.push(['startProcess']);
      return {
        async waitForPort() {
          calls.push(['waitForPort']);
        }
      };
    },
    async containerFetch() {
      calls.push(['containerFetch']);
      return Response.json({ diff: 'bounded' });
    },
    async exec() {
      throw new Error('snapshot fake owns exec');
    },
    async readFile() {
      throw new Error('snapshot fake owns read');
    },
    async writeFile() {
      throw new Error('snapshot fake owns write');
    }
  };
  const gateway = new CloudflareSandboxGateway({
    binding: {} as never,
    openaiApiKey: 'server-secret',
    getSandbox: () => sandbox,
    snapshots: {
      async restoreLatest(sandboxId, target) {
        calls.push(['restore', sandboxId, target === sandbox]);
        return true;
      },
      async capture(sandboxId, target) {
        calls.push(['capture', sandboxId, target === sandbox]);
        return { key: 'private', size: 1, capturedAt: 'now' };
      }
    },
    waitUntil(task) {
      calls.push(['waitUntil']);
      tasks.push(task);
    }
  });

  const sandboxId = 'client-workspace-0123456789abcdef0123456789abcdef';
  const response = await gateway.fetch(
    sandboxId,
    new Request('https://workspace.createsomething.space/api/sessions/session-1/diff')
  );
  assert.equal(response.status, 200);
  await Promise.all(tasks);
  assert.deepEqual(calls, [
    ['getProcess'],
    ['restore', sandboxId, true],
    ['startProcess'],
    ['waitForPort'],
    ['containerFetch'],
    ['capture', sandboxId, true],
    ['waitUntil']
  ]);
});

test('sandbox gateway reports a sanitized checkpoint failure without failing the diff response', async () => {
  const tasks: Promise<unknown>[] = [];
  const failures: unknown[] = [];
  const gateway = new CloudflareSandboxGateway({
    binding: {} as never,
    openaiApiKey: 'server-secret',
    getSandbox: () => ({
      async getProcess() {
        return { status: 'running' };
      },
      async startProcess() {
        throw new Error('should not start');
      },
      async containerFetch() {
        return Response.json({ diff: 'bounded' });
      }
    }),
    snapshots: {
      async restoreLatest() {
        return false;
      },
      async capture() {
        throw new Error('/workspace/private/path');
      }
    },
    waitUntil(task) {
      tasks.push(task);
    },
    onSnapshotError(context) {
      failures.push(context);
    }
  });

  const sandboxId = 'client-workspace-0123456789abcdef0123456789abcdef';
  const response = await gateway.fetch(
    sandboxId,
    new Request('https://workspace.createsomething.space/api/sessions/session-1/diff')
  );
  await Promise.all(tasks);

  assert.equal(response.status, 200);
  assert.deepEqual(failures, [{ sandboxId, kind: 'Error' }]);
  assert.equal(JSON.stringify(failures).includes('/workspace/private/path'), false);
});

test('sandbox gateway checkpoints the operator reset response', async () => {
  const tasks: Promise<unknown>[] = [];
  let captures = 0;
  const gateway = new CloudflareSandboxGateway({
    binding: {} as never,
    openaiApiKey: 'server-secret',
    getSandbox: () => ({
      async getProcess() {
        return { status: 'running' };
      },
      async startProcess() {
        throw new Error('should not start');
      },
      async containerFetch() {
        return Response.json({ ok: true });
      }
    }),
    snapshots: {
      async restoreLatest() {
        return false;
      },
      async capture() {
        captures += 1;
        return { key: 'private', size: 1, capturedAt: 'now' };
      }
    },
    waitUntil(task) {
      tasks.push(task);
    }
  });

  const response = await gateway.fetch(
    'client-workspace-0123456789abcdef0123456789abcdef',
    new Request('https://workspace.createsomething.space/api/workspaces/demo-frontend/reset', {
      method: 'POST'
    })
  );
  await Promise.all(tasks);

  assert.equal(response.status, 200);
  assert.equal(captures, 1);
});

test('sandbox gateway schedules sanitized D1 activity capture for an app response', async () => {
  const tasks: Promise<unknown>[] = [];
  const records: unknown[] = [];
  const gateway = new CloudflareSandboxGateway({
    binding: {} as never,
    openaiApiKey: 'server-secret',
    getSandbox: () => ({
      async getProcess() {
        return { status: 'running' };
      },
      async startProcess() {
        throw new Error('should not start');
      },
      async containerFetch() {
        return Response.json({ receipt: { sessionId: 'session-1' } }, { status: 201 });
      }
    }),
    activity: {
      async recordResponse(sandboxId, request, response) {
        records.push([sandboxId, request.method, new URL(request.url).pathname, response.status]);
      }
    },
    waitUntil(task) {
      tasks.push(task);
    }
  });

  const sandboxId = 'client-workspace-0123456789abcdef0123456789abcdef';
  const response = await gateway.fetch(
    sandboxId,
    new Request('https://workspace.createsomething.space/api/workspaces/demo-frontend/sessions', {
      method: 'POST'
    })
  );
  await Promise.all(tasks);

  assert.equal(response.status, 201);
  assert.deepEqual(records, [
    [sandboxId, 'POST', '/api/workspaces/demo-frontend/sessions', 201]
  ]);
});
