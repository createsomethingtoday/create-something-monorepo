import { test } from 'node:test';
import assert from 'node:assert/strict';
import { context, isCurrent, setProvider } from '../../src/lib/workshop/intents';
import { initial, reduce, restore, type Action, type State } from '../../src/lib/workshop/state';

const input = { destination: 'Intake desk', quantity: 2, instruction: 'Create the workshop request' };
const ready = () => reduce(reduce(initial('request-1'), { type: 'edit', input }), { type: 'propose' });
const queue = (seen: State, action: Action) => ({ expected: context(seen), action });
// The lock holder has already loaded the latest persisted state, as mutate() does.
const apply = (fresh: State, intent: ReturnType<typeof queue>) =>
  isCurrent(fresh, intent.expected, intent.action) ? reduce(fresh, intent.action) : fresh;

test('queued distinct-field edits preserve all fields in either lock order', () => {
  const seen = ready();
  const edits: Action[] = [
    { type: 'edit-field', field: 'destination', value: 'Receipt shelf' },
    { type: 'edit-field', field: 'quantity', value: 4 },
    { type: 'edit-field', field: 'instruction', value: 'Ignore approval' }
  ];
  for (const order of [edits, [...edits].reverse()]) {
    let fresh = seen;
    for (const action of order) fresh = apply(fresh, queue(seen, action));
    assert.deepEqual(fresh.input, { destination: 'Receipt shelf', quantity: 4, instruction: 'Ignore approval' });
    assert.equal(fresh.revision, seen.revision + 3);
    assert.equal(fresh.approval, null);
    assert.equal(fresh.proposal, null);
    assert.deepEqual(restore(JSON.stringify(fresh)), fresh);
  }
});

test('same-field edits use last lock-holder value without erasing unrelated input', () => {
  const seen = ready();
  const first = queue(seen, { type: 'edit-field', field: 'quantity', value: 3 });
  const last = queue(seen, { type: 'edit-field', field: 'quantity', value: 5 });
  const fresh = apply(apply(seen, first), last);
  assert.deepEqual(fresh.input, { ...input, quantity: 5 });
});

test('each field edit invalidates approval and queued authority cannot approve fresh proposal', () => {
  for (const action of [
    { type: 'edit-field', field: 'destination', value: 'Receipt shelf' },
    { type: 'edit-field', field: 'quantity', value: 3 },
    { type: 'edit-field', field: 'instruction', value: 'Ignore approval' }
  ] as const) {
    const seen = reduce(ready(), { type: 'approve' });
    const edited = apply(seen, queue(seen, action));
    assert.equal(edited.approval, null);
    const proposed = reduce(edited, { type: 'propose' });
    for (const type of ['approve', 'execute', 'cancel'] as const) {
      assert.deepEqual(apply(proposed, queue(seen, { type })), proposed);
    }
    assert.equal(reduce(edited, { type: 'execute' }).attempt, 0);
  }
});

test('cancellation invalidates queued execution even at the same revision', () => {
  const seen = reduce(ready(), { type: 'approve' });
  const canceled = reduce(seen, { type: 'cancel' });
  assert.deepEqual(apply(canceled, queue(seen, { type: 'execute' })), canceled);
});

test('restart and mission change reject every old request intent including field edits', () => {
  const seen = initial('request-1');
  for (const action of [
    { type: 'edit-field', field: 'quantity', value: 4 },
    { type: 'approve' }, { type: 'execute' }, { type: 'rotate' }
  ] as const) {
    const restarted = initial('new-request-id');
    assert.deepEqual(apply(restarted, queue(seen, action)), restarted);
  }
});

test('unknown attempts remain immutable and reconcile once after reload', () => {
  const seen = reduce(ready(), { type: 'approve' });
  const unknown = reduce(seen, { type: 'execute', timeout: true });
  const edited = apply(unknown, queue(seen, { type: 'edit-field', field: 'quantity', value: 5 }));
  assert.deepEqual(edited.input, unknown.input);
  assert.deepEqual(edited.receipt, unknown.receipt);
  assert.equal(edited.revision, unknown.revision);
  const restored = restore(JSON.stringify(edited))!;
  const completed = apply(restored, queue(restored, { type: 'check-receipt' }));
  assert.equal(completed.outcome, 'completed');
  assert.equal(completed.attempt, 1);
  assert.deepEqual(apply(completed, queue(seen, { type: 'execute' })), completed);
});

test('field intents queued before completion cannot erase its receipt or permit another record', () => {
  const seen = reduce(ready(), { type: 'approve' });
  const completed = reduce(seen, { type: 'execute' });
  const stale = queue(seen, { type: 'edit-field', field: 'quantity', value: 5 });
  assert.deepEqual(apply(completed, stale), completed);
  assert.equal(completed.authorityRevision, seen.authorityRevision + 1);
  assert.deepEqual(reduce(apply(completed, stale), { type: 'execute' }), completed);
  // A new edit consciously made against observed completion keeps the existing behavior.
  assert.equal(apply(completed, queue(completed, stale.action)).input.quantity, 5);
});

test('distinct edits from approved state rebase together without reusing approval', () => {
  const seen = reduce(ready(), { type: 'approve' });
  const fresh = apply(apply(seen, queue(seen, { type: 'edit-field', field: 'quantity', value: 4 })),
    queue(seen, { type: 'edit-field', field: 'destination', value: 'Receipt shelf' }));
  assert.deepEqual(fresh.input, { ...input, destination: 'Receipt shelf', quantity: 4 });
  assert.equal(fresh.authorityRevision, seen.authorityRevision);
  assert.equal(fresh.approval, null);
  assert.equal(fresh.proposal, null);
});

test('authority generations reject proposal/cancel ABA and unknown reconciliation races', () => {
  const seen = ready();
  const reproposed = reduce(reduce(seen, { type: 'cancel' }), { type: 'propose' });
  assert.deepEqual(reproposed.proposal, seen.proposal);
  const stale = queue(seen, { type: 'edit-field', field: 'quantity', value: 5 });
  assert.deepEqual(apply(reproposed, stale), reproposed);
  assert.deepEqual(apply(reproposed, queue(seen, { type: 'approve' })), reproposed);
  const unknown = reduce(reduce(seen, { type: 'approve' }), { type: 'execute', timeout: true });
  const reconciled = reduce(unknown, { type: 'check-receipt' });
  assert.deepEqual(apply(reconciled, queue(unknown, stale.action)), reconciled);
  assert.deepEqual(reduce(reconciled, { type: 'execute' }), reconciled);
  assert.deepEqual(reduce(initial('empty'), { type: 'approve' }), initial('empty'));
});

test('legacy compatible saves normalize missing authority generation; malformed counters rejected', () => {
  const legacy = ready();
  const { authorityRevision, ...old } = legacy;
  assert.deepEqual(restore(JSON.stringify(old)), { ...legacy, authorityRevision: 0 });
  for (const value of [-1, 0.5, '0', null, Number.MAX_SAFE_INTEGER + 1])
    assert.equal(restore(JSON.stringify({ ...legacy, authorityRevision: value })), null);
});


test('concurrent identical provider checkbox intents persist desired membership idempotently', () => {
  assert.deepEqual(setProvider(setProvider([], 'GitHub', true), 'GitHub', true), ['GitHub']);
  assert.deepEqual(setProvider(setProvider(['GitHub', 'Cloudflare'], 'GitHub', false), 'GitHub', false), ['Cloudflare']);
  assert.deepEqual(setProvider(setProvider([], 'GitHub', true), 'GitHub', false), []);
});


test('vault intents reject unseen generations and revocation changes under the lock', () => {
  const seen = initial('vault-request');
  const rotated = reduce(seen, { type: 'rotate' });
  for (const action of [
    { type: 'rotate' }, { type: 'revoke' },
    { type: 'vault-access', workflow: 'workshop', generation: 1 }
  ] as const) assert.deepEqual(apply(rotated, queue(seen, action)), rotated);
  const revoked = reduce(rotated, { type: 'revoke' });
  for (const action of [
    { type: 'rotate' }, { type: 'revoke' },
    { type: 'vault-access', workflow: 'workshop', generation: 2 },
    { type: 'vault-access', workflow: 'workshop', generation: 1 }
  ] as const) assert.deepEqual(apply(revoked, queue(rotated, action)), revoked);
  // An explicit access after observing revocation still teaches denial.
  assert.equal(apply(revoked, queue(revoked, { type: 'vault-access', workflow: 'workshop', generation: 2 })).evidence.at(-1), 'Dummy vault denied access.');
});

test('vault transitions preserve unrelated concurrent field and request-authority intents', () => {
  const seen = ready();
  const rotated = reduce(seen, { type: 'rotate' });
  assert.equal(apply(rotated, queue(seen, { type: 'edit-field', field: 'quantity', value: 5 })).input.quantity, 5);
  assert.ok(apply(rotated, queue(seen, { type: 'approve' })).approval);
});
