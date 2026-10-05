import { test } from 'node:test';
import assert from 'node:assert/strict';
import { context, isCurrent } from '../../src/lib/workshop/intents';
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
