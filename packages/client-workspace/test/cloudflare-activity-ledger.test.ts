import assert from 'node:assert/strict';
import test from 'node:test';

import { D1WorkspaceActivityLedger } from '../src/lib/cloudflare/activity-ledger.js';

test('D1 activity ledger stores a sanitized receipt without Codex ids, secrets, or paths', async () => {
  const writes: Array<{ sql: string; values: unknown[] }> = [];
  const database = {
    prepare(sql: string) {
      let values: unknown[] = [];
      return {
        bind(...next: unknown[]) {
          values = next;
          return this;
        },
        async run() {
          writes.push({ sql, values });
          return { success: true };
        }
      };
    }
  };
  const ledger = new D1WorkspaceActivityLedger(database, () => new Date('2026-07-15T12:00:00Z'));

  await ledger.recordResponse(
    'client-workspace-0123456789abcdef0123456789abcdef',
    new Request('https://workspace.createsomething.space/api/workspaces/demo-frontend/sessions', {
      method: 'POST'
    }),
    Response.json(
      {
        receipt: {
          sessionId: 'session-123',
          workspaceId: 'demo-frontend',
          threadId: 'codex-thread-private',
          turnId: 'codex-turn-private',
          status: 'completed',
          updatedAt: '2026-07-15T11:59:00Z',
          events: [
            {
              sequence: 1,
              at: '2026-07-15T11:59:00Z',
              type: 'agent.message',
              message: 'Used sk-private at /workspace/projects/demo-frontend/src/page.svelte',
              status: 'completed'
            }
          ]
        }
      },
      { status: 201 }
    )
  );

  assert.equal(writes.length, 2);
  const serialized = JSON.stringify(writes);
  assert.match(serialized, /session-123/);
  assert.match(serialized, /demo-frontend/);
  assert.match(serialized, /\[redacted\]/);
  assert.match(serialized, /\[workspace path\]/);
  assert.equal(serialized.includes('codex-thread-private'), false);
  assert.equal(serialized.includes('codex-turn-private'), false);
  assert.equal(serialized.includes('sk-private'), false);
  assert.equal(serialized.includes('/workspace/projects'), false);
});

test('D1 activity ledger records bounded action metadata without reading request bodies', async () => {
  const writes: unknown[][] = [];
  const database = {
    prepare() {
      let values: unknown[] = [];
      return {
        bind(...next: unknown[]) {
          values = next;
          return this;
        },
        async run() {
          writes.push(values);
          return { success: true };
        }
      };
    }
  };
  const ledger = new D1WorkspaceActivityLedger(database, () => new Date('2026-07-15T12:00:00Z'));

  await ledger.recordResponse(
    'client-workspace-0123456789abcdef0123456789abcdef',
    new Request('https://workspace.createsomething.space/api/sessions/session-123/turns', {
      method: 'POST',
      body: JSON.stringify({ text: 'do not persist this prompt' })
    }),
    Response.json({ turnId: 'private-turn-id' }, { status: 201 })
  );

  assert.equal(writes.length, 1);
  const serialized = JSON.stringify(writes);
  assert.match(serialized, /turn_started/);
  assert.match(serialized, /session-123/);
  assert.equal(serialized.includes('do not persist this prompt'), false);
  assert.equal(serialized.includes('private-turn-id'), false);
});
