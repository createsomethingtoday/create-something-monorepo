import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceMemory } from './workspace-memory.mjs';
test('lost approval response holds further writes until read-only receipt and entry readback', async () => {
  const calls = [];
  let lost = true;
  const entry = { id: 'memory-one', revision: 1, text: 'Morning rehearsal' };
  const m = createWorkspaceMemory({
    workspaceId: () => 'synthetic',
    changed() {},
    notice() {},
    call: async (op, input) => {
      calls.push({ op, input });
      if (op === 'memory.request') return { state: 'pending_user_approval' };
      if (op === 'memory.review' && lost) {
        lost = false;
        throw Error('response lost after commit');
      }
      if (op === 'memory.receipt')
        return {
          state: 'verified',
          receipt: { state: 'verified', action: 'save', memoryId: entry.id, revision: 1 }
        };
      if (op === 'memory.get') return entry;
      if (op === 'memory.list' || op === 'memory.requests') return { items: [], nextOffset: null };
      throw Error(op);
    }
  });
  m.edit();
  m.update('text', entry.text);
  m.update('reference', 'User statement');
  await m.save();
  assert.ok(m.state.recovery, 'uncertain mutation is held');
  m.edit();
  assert.equal(m.state.draft, null, 'cannot replace unresolved mutation');
  await m.recover();
  assert.equal(m.state.recovery, null);
  assert.equal(m.state.receipt.state, 'verified');
  assert.equal(
    calls.filter((x) => x.op === 'memory.review').length,
    1,
    'readback never replays a write'
  );
});

test('switching workspaces clears private rows immediately even when the new read fails', async () => {
  let workspace = 'A',
    rejectB;
  const blocked = new Promise((_, reject) => {
    rejectB = reject;
  });
  const m = createWorkspaceMemory({
    workspaceId: () => workspace,
    changed() {},
    notice() {},
    call: async (op, input) => {
      if (input.workspaceId === 'B') return blocked;
      return op === 'memory.list'
        ? { items: [{ id: 'private-A', text: 'A private memory' }], nextOffset: null }
        : { items: [{ requestId: 'private-request-A' }] };
    }
  });
  await m.read();
  assert.equal(m.state.items[0].id, 'private-A');
  m.state.recovery = { requestId: 'recovery-A', workspaceId: 'A' };
  workspace = 'B';
  const reading = m.read();
  assert.deepEqual(m.state.items, []);
  assert.deepEqual(m.state.requests, []);
  assert.equal(m.state.recovery, null);
  rejectB(Error('B unavailable'));
  await assert.rejects(reading, /B unavailable/);
  assert.deepEqual(m.state.items, []);
});
