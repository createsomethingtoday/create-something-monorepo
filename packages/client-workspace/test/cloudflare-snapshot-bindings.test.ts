import assert from 'node:assert/strict';
import test from 'node:test';

import {
  D1WorkspaceSnapshotLedger,
  R2WorkspaceSnapshotObjects
} from '../src/lib/cloudflare/snapshot-bindings.js';

test('D1 snapshot ledger reads and upserts one sanitized pointer per sandbox', async () => {
  const calls: unknown[] = [];
  const database = {
    prepare(sql: string) {
      calls.push(['prepare', sql.replace(/\s+/g, ' ').trim()]);
      return {
        bind(...values: unknown[]) {
          calls.push(['bind', ...values]);
          return {
            async first() {
              calls.push(['first']);
              return {
                sandbox_id: 'client-workspace-0123456789abcdef0123456789abcdef',
                object_key: 'snapshots/private.tgz',
                size_bytes: 42,
                captured_at: '2026-07-15T14:00:00.000Z'
              };
            },
            async run() {
              calls.push(['run']);
              return { success: true };
            }
          };
        }
      };
    }
  };
  const ledger = new D1WorkspaceSnapshotLedger(database);

  assert.deepEqual(await ledger.latest('client-workspace-0123456789abcdef0123456789abcdef'), {
    sandboxId: 'client-workspace-0123456789abcdef0123456789abcdef',
    objectKey: 'snapshots/private.tgz',
    size: 42,
    capturedAt: '2026-07-15T14:00:00.000Z'
  });
  await ledger.record({
    sandboxId: 'client-workspace-0123456789abcdef0123456789abcdef',
    objectKey: 'snapshots/new.tgz',
    size: 84,
    capturedAt: '2026-07-15T15:00:00.000Z'
  });

  assert.equal(
    calls.some((call) => JSON.stringify(call).includes('access_token')),
    false
  );
  assert.deepEqual(
    calls.filter((call) => Array.isArray(call) && call[0] === 'bind'),
    [
      ['bind', 'client-workspace-0123456789abcdef0123456789abcdef'],
      [
        'bind',
        'client-workspace-0123456789abcdef0123456789abcdef',
        'snapshots/new.tgz',
        84,
        '2026-07-15T15:00:00.000Z'
      ]
    ]
  );
});

test('R2 snapshot objects keep archive streams private behind the binding', async () => {
  const calls: unknown[] = [];
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.close();
    }
  });
  const bucket = {
    async get(key: string) {
      calls.push(['get', key]);
      return { body: source };
    },
    async put(key: string, value: ReadableStream<Uint8Array>, options: unknown) {
      const bytes = new Uint8Array(await new Response(value).arrayBuffer());
      calls.push(['put', key, value === source, [...bytes], options]);
    }
  };
  const objects = new R2WorkspaceSnapshotObjects(bucket, {
    createFixedLengthStream(size) {
      calls.push(['fixed', size]);
      return new TransformStream<Uint8Array, Uint8Array>();
    }
  });

  assert.equal(await objects.get('snapshots/private.tgz'), source);
  await objects.put('snapshots/private.tgz', source, 3);
  assert.deepEqual(calls, [
    ['get', 'snapshots/private.tgz'],
    ['fixed', 3],
    [
      'put',
      'snapshots/private.tgz',
      false,
      [1, 2, 3],
      {
        httpMetadata: { contentType: 'application/gzip' },
        customMetadata: { classification: 'private-client-workspace-snapshot' }
      }
    ]
  ]);
});
