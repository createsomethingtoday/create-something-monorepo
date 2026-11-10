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

test('pending save freezes the reviewed draft until staging completes', async () => {
  let release;
  const staged = new Promise(resolve => { release = resolve; });
  let request;
  const m = createWorkspaceMemory({
    workspaceId: () => 'synthetic', changed() {}, notice() {},
    call: async (op, input) => {
      if (op === 'memory.request') { request = input; await staged; return {}; }
      if (op === 'memory.review') return {};
      if (op === 'memory.receipt') return { state: 'verified', receipt: { state: 'verified', action: 'save', memoryId: 'one', revision: 1 } };
      if (op === 'memory.get') return { revision: 1, text: 'Reviewed text' };
      if (op === 'memory.list' || op === 'memory.requests') return { items: [], nextOffset: null };
      throw Error(op);
    }
  });
  m.edit(); m.update('text', 'Reviewed text'); m.update('reference', 'Reviewed provenance');
  const saving = m.save();
  assert.equal(m.state.busy, true);
  m.update('text', 'New text while saving');
  m.update('reference', 'New provenance while saving');
  assert.equal(m.state.draft.entry.text, 'Reviewed text', 'busy draft must be frozen');
  assert.equal(m.state.draft.entry.source.reference, 'Reviewed provenance');
  release(); await saving;
  assert.equal(request.entry.text, 'Reviewed text');
  assert.equal(m.state.receipt.state, 'verified');
});

test('lost staging response fences edits until a scoped receipt read reconciles the proposal', async () => {
  let staged, receiptUnavailable = true;
  const calls = [];
  const m = createWorkspaceMemory({ workspaceId: () => 'synthetic', changed() {}, notice() {},
    call: async (op, input) => {
      calls.push(op);
      if (op === 'memory.request') { staged = structuredClone(input); throw Error('staging response lost after commit'); }
      if (op === 'memory.receipt') {
        if (receiptUnavailable) throw Error('receipt offline');
        return { state: 'pending_user_approval' };
      }
      if (op === 'memory.list') return { items: [], nextOffset: null };
      if (op === 'memory.requests') return { items: [{ requestId: staged.requestId, request: staged }] };
      throw Error(op);
    }
  });
  m.edit(); m.update('text', 'Exact staged memory'); m.update('reference', 'Exact source');
  await m.save();
  assert.ok(m.state.recovery, 'stage uncertainty must fence edits');
  m.update('text', 'Unreviewed change'); m.cancel();
  assert.equal(m.state.draft.entry.text, 'Exact staged memory');
  await m.recover(); assert.ok(m.state.recovery, 'failed receipt keeps fence');
  receiptUnavailable = false;
  await m.recover();
  assert.equal(m.state.recovery, null);
  assert.equal(m.state.draft, null, 'durable proposal moves to pending review');
  assert.equal(m.state.requests.length, 1);
  assert.equal(calls.filter(x => x === 'memory.request').length, 1);
  assert.equal(calls.filter(x => x === 'memory.review').length, 0, 'recovery cannot approve');
});

test('confirmed absent staging receipt unlocks the unchanged draft for retry', async () => {
  const m = createWorkspaceMemory({ workspaceId: () => 'synthetic', changed() {}, notice() {},
    call: async op => {
      if (op === 'memory.request') throw Error('failed before commit');
      if (op === 'memory.receipt') return { state: 'not_found' };
      throw Error(op);
    }
  });
  m.edit(); m.update('text', 'Retry safely'); m.update('reference', 'User');
  await m.save(); assert.ok(m.state.recovery);
  await m.recover(); assert.equal(m.state.recovery, null);
  m.update('text', 'Updated after confirmed absence');
  assert.equal(m.state.draft.entry.text, 'Updated after confirmed absence');
});

test('durably retired staged proposals clear the frozen draft without approval replay', async () => {
  for (const outcome of ['invalidated', 'rejected', 'verified']) {
    const calls = [];
    const m = createWorkspaceMemory({ workspaceId: () => 'synthetic', changed() {}, notice() {},
      call: async op => {
        calls.push(op);
        if (op === 'memory.request') throw Error('response lost');
        if (op === 'memory.receipt') return { state: outcome, receipt: outcome === 'invalidated' ? {} : { state: outcome, action: 'save', memoryId: 'one', revision: 1 } };
        if (op === 'memory.get') return { text: 'Staged text', revision: 1 };
        if (op === 'memory.list' || op === 'memory.requests') return { items: [], nextOffset: null };
        throw Error(op);
      }
    });
    m.edit(); m.update('text', 'Staged text'); m.update('reference', 'User');
    await m.save(); await m.recover();
    assert.equal(m.state.recovery, null, `${outcome} is a durable outcome`);
    assert.equal(m.state.draft, null, `${outcome} must not reuse retired request id`);
    assert.equal(calls.includes('memory.review'), false);
  }
});
