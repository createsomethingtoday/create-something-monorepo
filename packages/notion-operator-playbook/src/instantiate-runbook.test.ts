import assert from 'node:assert/strict';
import test from 'node:test';
import type { InstantiateRunbookInput, NotionRunbookClient } from './contracts.js';
import { instantiateRunbook } from './instantiate-runbook.js';

const baseInput: InstantiateRunbookInput = {
  playbookId: 'playbook-operator-handoff',
  playbookVersion: '1.0.0',
  runbookTitle: 'Demo operator handoff',
  owner: 'Demo Operator',
  approved: true,
  dryRun: true,
  targetDataSourceId: null,
  steps: ['Confirm scope', 'Run smoke', 'Record receipt']
};

test('instantiation defaults to a no-write preview', async () => {
  const result = await instantiateRunbook(baseInput);
  assert.equal(result.status, 'preview');
  assert.equal(result.created, false);
  assert.equal(result.pageId, null);
});

test('instantiation blocks without approval or the write gate', async () => {
  const notApproved = await instantiateRunbook({ ...baseInput, approved: false, dryRun: false });
  assert.equal(notApproved.status, 'blocked');
  assert.match(notApproved.reason ?? '', /approval/i);

  const gateClosed = await instantiateRunbook({
    ...baseInput,
    dryRun: false,
    targetDataSourceId: 'sandbox-data-source'
  });
  assert.equal(gateClosed.status, 'blocked');
  assert.match(gateClosed.reason ?? '', /WRITE_ENABLED/);
});

test('live instantiation is idempotent by deterministic receipt', async () => {
  const calls: string[] = [];
  const client: NotionRunbookClient = {
    dataSources: {
      query: async () => ({ results: [{ id: 'existing-page' }] })
    },
    pages: {
      create: async () => {
        calls.push('create');
        return { id: 'new-page' };
      }
    }
  };
  const result = await instantiateRunbook(
    { ...baseInput, dryRun: false, targetDataSourceId: 'sandbox-data-source' },
    { notion: client, writeEnabled: true }
  );
  assert.equal(result.status, 'existing');
  assert.equal(result.pageId, 'existing-page');
  assert.deepEqual(calls, []);
});

test('live instantiation creates once after every guard passes', async () => {
  let createdInput: Record<string, unknown> | null = null;
  const client: NotionRunbookClient = {
    dataSources: {
      query: async () => ({ results: [] })
    },
    pages: {
      create: async (input) => {
        createdInput = input;
        return { id: 'new-page' };
      }
    }
  };
  const result = await instantiateRunbook(
    { ...baseInput, dryRun: false, targetDataSourceId: 'sandbox-data-source' },
    { notion: client, writeEnabled: true }
  );
  assert.equal(result.status, 'created');
  assert.equal(result.pageId, 'new-page');
  assert.ok(createdInput);
});

test('idempotency receipt changes when the executable steps change', async () => {
  const first = await instantiateRunbook(baseInput);
  const changed = await instantiateRunbook({
    ...baseInput,
    steps: [...baseInput.steps, 'Notify the owner']
  });
  assert.notEqual(first.receiptId, changed.receiptId);
});
