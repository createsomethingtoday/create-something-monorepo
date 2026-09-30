import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridge } from './bridge.mjs';

test('desktop bridge passes typed record operations to the single dispatch boundary', async () => {
  const calls = [];
  const bridge = createBridge(async (command, args) => {
    calls.push({ command, args });
    return { id: 'gig-1', title: 'Friday show' };
  });
  const saved = await bridge.saveRecord('owner-1', 'gigs', { title: 'Friday show', fields: { status: 'confirmed' } });
  assert.equal(saved.id, 'gig-1');
  assert.deepEqual(calls, [{ command: 'dispatch', args: { operation: 'records.save', input: { workspaceId: 'owner-1', entity: 'gigs', title: 'Friday show', fields: { status: 'confirmed' } } } }]);
});

test('desktop bridge requires a workspace for owned records and uses explicit backup operations', async () => {
  const calls = [];
  const bridge = createBridge(async (_command, args) => { calls.push(args); return { backupId: 'backup-1' }; });
  assert.throws(() => bridge.listRecords('', 'gigs'), /workspace/i);
  assert.equal(calls.length, 0);
  await bridge.createBackup('owner-1');
  assert.deepEqual(calls[0], { operation: 'backup.create', input: { workspaceId: 'owner-1' } });
});

test('bounded collection cursor and exact relation role reach the domain unchanged', async () => {
  const calls = [];
  const bridge = createBridge(async (_command, args) => { calls.push(args); return { items: [], nextCursor: null }; });
  await bridge.listRecords('w1', 'gigs', 'cursor-2');
  await bridge.linkRecords('w1', 'gigs', 'g1', 'contacts', 'c1', 'Booked Through');
  assert.deepEqual(calls[0], { operation: 'records.list', input: { workspaceId: 'w1', entity: 'gigs', cursor: 'cursor-2' } });
  assert.deepEqual(calls[1], { operation: 'relations.link', input: { workspaceId: 'w1', fromEntity: 'gigs', fromId: 'g1', toEntity: 'contacts', toId: 'c1', role: 'Booked Through' } });
});

test('source import is workspace owned and context search stays within five snippets', async () => {
  const calls = [];
  const bridge = createBridge(async (_command, args) => { calls.push(args); return {}; });
  await bridge.importSource('w1', 'gmail', 'account-1', 'page-2');
  await bridge.searchContext('Friday show');
  assert.deepEqual(calls[0], { operation: 'connections.import', input: { workspaceId: 'w1', provider: 'gmail', connectedAccountId: 'account-1', cursor: 'page-2' } });
  assert.deepEqual(calls[1], { operation: 'context.search', input: { query: 'Friday show', limit: 5 } });
});
