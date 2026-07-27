import assert from 'node:assert/strict';
import test from 'node:test';

import { WorkspaceSnapshotStore } from '../src/lib/cloudflare/snapshot-store.js';

test('snapshot store captures only the governed workspace and receipt roots', async () => {
  const calls: unknown[] = [];
  const archive = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.close();
    }
  });
  const store = new WorkspaceSnapshotStore({
    now: () => new Date('2026-07-15T14:00:00.000Z'),
    randomUUID: () => '11111111-1111-4111-8111-111111111111',
    ledger: {
      async latest() {
        return null;
      },
      async record(record) {
        calls.push(['record', record]);
      }
    },
    objects: {
      async get() {
        return null;
      },
      async put(key, body, size) {
        calls.push(['put', key, body instanceof ReadableStream, size]);
      }
    }
  });
  const sandbox = {
    async exec(command: string) {
      calls.push(['exec', command]);
      return { success: true, exitCode: 0, stderr: '' };
    },
    async readFile(path: string, options: unknown) {
      calls.push(['readFile', path, options]);
      return { content: archive, size: 3 };
    },
    async writeFile() {
      throw new Error('write not expected');
    }
  };

  const receipt = await store.capture('client-workspace-0123456789abcdef0123456789abcdef', sandbox);

  const key =
    'snapshots/client-workspace-0123456789abcdef0123456789abcdef/2026-07-15T14-00-00-000Z-11111111-1111-4111-8111-111111111111.tgz';
  assert.deepEqual(receipt, { key, size: 3, capturedAt: '2026-07-15T14:00:00.000Z' });
  assert.deepEqual(calls, [
    [
      'exec',
      'tar -C /workspace -czf /tmp/client-workspace-snapshot-11111111-1111-4111-8111-111111111111.tgz -- projects state'
    ],
    [
      'readFile',
      '/tmp/client-workspace-snapshot-11111111-1111-4111-8111-111111111111.tgz',
      { encoding: 'none' }
    ],
    ['put', key, true, 3],
    [
      'record',
      {
        sandboxId: 'client-workspace-0123456789abcdef0123456789abcdef',
        objectKey: key,
        size: 3,
        capturedAt: '2026-07-15T14:00:00.000Z'
      }
    ],
    ['exec', 'rm -f /tmp/client-workspace-snapshot-11111111-1111-4111-8111-111111111111.tgz']
  ]);
});

test('snapshot store restores the latest private object before app startup', async () => {
  const calls: unknown[] = [];
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([4, 5, 6]));
      controller.close();
    }
  });
  const store = new WorkspaceSnapshotStore({
    randomUUID: () => '22222222-2222-4222-8222-222222222222',
    ledger: {
      async latest(sandboxId) {
        calls.push(['latest', sandboxId]);
        return {
          sandboxId,
          objectKey: 'snapshots/private/latest.tgz',
          size: 3,
          capturedAt: '2026-07-15T14:00:00.000Z'
        };
      },
      async record() {
        throw new Error('record not expected');
      }
    },
    objects: {
      async get(key) {
        calls.push(['get', key]);
        return body;
      },
      async put() {
        throw new Error('put not expected');
      }
    }
  });
  const sandbox = {
    async exec(command: string) {
      calls.push(['exec', command]);
      return { success: true, exitCode: 0, stderr: '' };
    },
    async readFile() {
      throw new Error('read not expected');
    },
    async writeFile(path: string, content: ReadableStream<Uint8Array>, options: unknown) {
      calls.push(['writeFile', path, content instanceof ReadableStream, options]);
    }
  };

  assert.equal(
    await store.restoreLatest('client-workspace-0123456789abcdef0123456789abcdef', sandbox),
    true
  );
  assert.deepEqual(calls, [
    ['latest', 'client-workspace-0123456789abcdef0123456789abcdef'],
    ['get', 'snapshots/private/latest.tgz'],
    [
      'writeFile',
      '/tmp/client-workspace-restore-22222222-2222-4222-8222-222222222222.tgz',
      true,
      { encoding: 'none' }
    ],
    [
      'exec',
      'rm -rf /workspace/projects /workspace/state && mkdir -p /workspace && tar -C /workspace -xzf /tmp/client-workspace-restore-22222222-2222-4222-8222-222222222222.tgz'
    ],
    ['exec', 'rm -f /tmp/client-workspace-restore-22222222-2222-4222-8222-222222222222.tgz']
  ]);
});

test('snapshot store gives concurrent captures isolated temporary archives', async () => {
  const ids = ['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444'];
  const archivePaths: string[] = [];
  const store = new WorkspaceSnapshotStore({
    randomUUID: () => ids.shift()!,
    ledger: {
      async latest() {
        return null;
      },
      async record() {}
    },
    objects: {
      async get() {
        return null;
      },
      async put() {}
    }
  });
  const sandbox = {
    async exec(command: string) {
      const match = command.match(/-czf (\/tmp\/[^ ]+)/);
      if (match) archivePaths.push(match[1]);
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { success: true, exitCode: 0, stderr: '' };
    },
    async readFile() {
      return {
        content: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array([1]));
            controller.close();
          }
        }),
        size: 1
      };
    },
    async writeFile() {}
  };

  await Promise.all([
    store.capture('client-workspace-0123456789abcdef0123456789abcdef', sandbox),
    store.capture('client-workspace-0123456789abcdef0123456789abcdef', sandbox)
  ]);

  assert.equal(new Set(archivePaths).size, 2);
});

test('snapshot store refuses to record or restore empty archives', async () => {
  let recorded = false;
  let objectRead = false;
  const store = new WorkspaceSnapshotStore({
    randomUUID: () => '55555555-5555-4555-8555-555555555555',
    ledger: {
      async latest(sandboxId) {
        return {
          sandboxId,
          objectKey: 'snapshots/private/empty.tgz',
          size: 0,
          capturedAt: '2026-07-15T14:00:00.000Z'
        };
      },
      async record() {
        recorded = true;
      }
    },
    objects: {
      async get() {
        objectRead = true;
        return null;
      },
      async put() {}
    }
  });
  const sandbox = {
    async exec() {
      return { success: true, exitCode: 0, stderr: '' };
    },
    async readFile() {
      return {
        content: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.close();
          }
        }),
        size: 0
      };
    },
    async writeFile() {
      throw new Error('write not expected');
    }
  };

  await assert.rejects(
    store.capture('client-workspace-0123456789abcdef0123456789abcdef', sandbox),
    /snapshot_archive_empty/
  );
  assert.equal(recorded, false);
  assert.equal(
    await store.restoreLatest('client-workspace-0123456789abcdef0123456789abcdef', sandbox),
    false
  );
  assert.equal(objectRead, false);
});

test('snapshot store no-ops when no durable snapshot exists and rejects arbitrary ids', async () => {
  const store = new WorkspaceSnapshotStore({
    ledger: {
      async latest() {
        return null;
      },
      async record() {}
    },
    objects: {
      async get() {
        throw new Error('object lookup not expected');
      },
      async put() {}
    }
  });
  const sandbox = {
    async exec() {
      throw new Error('exec not expected');
    },
    async readFile() {
      throw new Error('read not expected');
    },
    async writeFile() {
      throw new Error('write not expected');
    }
  };

  assert.equal(
    await store.restoreLatest('client-workspace-0123456789abcdef0123456789abcdef', sandbox),
    false
  );
  await assert.rejects(store.capture('operator-email', sandbox), /sandbox_id_invalid/);
});
