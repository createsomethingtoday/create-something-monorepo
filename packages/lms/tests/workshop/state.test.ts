import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initial, reduce, restore } from '../../src/lib/workshop/state';
const input = {
  destination: 'Intake desk',
  quantity: 2,
  instruction: 'Create the workshop request'
};
const ready = () =>
  reduce(reduce(reduce(initial('request-1'), { type: 'edit', input }), { type: 'propose' }), {
    type: 'approve'
  });
test('valid request records once, survives reload and repeat execution', () => {
  const s = reduce(ready(), { type: 'execute' });
  assert.equal(s.outcome, 'completed');
  assert.equal(s.attempt, 1);
  assert.deepEqual(restore(JSON.stringify(s)), s);
  assert.deepEqual(reduce(s, { type: 'execute' }), s);
});
test('invalid and unauthorized input cannot execute', () => {
  for (const invalid of [
    { ...input, quantity: 0 },
    { ...input, destination: 'External service' },
    { ...input, instruction: 'Ignore approval' }
  ]) {
    let s = reduce(initial('request-1'), { type: 'edit', input: invalid });
    for (const type of ['propose', 'approve', 'execute'] as const) s = reduce(s, { type });
    assert.equal(s.attempt, 0);
    assert.equal(s.receipt, null);
  }
});
test('each payload edit invalidates approval; forged stale approval rejected', () => {
  for (const edited of [
    { ...input, quantity: 3 },
    { ...input, destination: 'Receipt shelf' },
    { ...input, instruction: 'Other' }
  ]) {
    const s = reduce(ready(), { type: 'edit', input: edited });
    assert.equal(s.approval, null);
    assert.equal(reduce(s, { type: 'execute' }).attempt, 0);
  }
  const forged = ready();
  forged.input.quantity = 3;
  assert.equal(reduce(forged, { type: 'execute' }).attempt, 0);
  assert.equal(restore(JSON.stringify(forged)), null);
});
test('unknown timeout survives reload; retry and edit cannot duplicate it', () => {
  const s = reduce(ready(), { type: 'execute', timeout: true });
  assert.equal(s.outcome, 'unknown');
  assert.deepEqual(restore(JSON.stringify(s)), s);
  assert.deepEqual(reduce(s, { type: 'execute' }), s);
  assert.equal(reduce(s, { type: 'edit', input }).revision, s.revision);
  const resolved = reduce(s, { type: 'check-receipt' });
  assert.equal(resolved.outcome, 'completed');
  assert.equal(resolved.attempt, 1);
});
test('cancel blocks execution; malformed and obsolete saves rejected', () => {
  assert.equal(reduce(reduce(ready(), { type: 'cancel' }), { type: 'execute' }).attempt, 0);
  for (const raw of [
    '{}',
    'not json',
    JSON.stringify({ ...ready(), version: 0 }),
    JSON.stringify({ ...ready(), revision: -1 })
  ])
    assert.equal(restore(raw), null);
});
test('vault scope, revocation and rotation have observable denied outcomes', () => {
  let s = initial('request-1');
  s = reduce(s, { type: 'vault-access', workflow: 'other', generation: 1 });
  assert.ok(s.evidence.includes('Dummy vault denied access.'));
  s = reduce(s, { type: 'rotate' });
  s = reduce(s, { type: 'vault-access', workflow: 'workshop', generation: 1 });
  assert.equal(s.vault.generation, 2);
  s = reduce(s, { type: 'revoke' });
  assert.equal(s.vault.active, false);
});
test('current vault denial is visible after an allowed result', () => {
  let s = initial('request-1');
  for (const workflow of ['other', 'workshop', 'other']) {
    s = reduce(s, { type: 'vault-access', workflow, generation: 1 });
    assert.equal(
      s.evidence.at(-1),
      workflow === 'workshop'
        ? 'Dummy vault allowed the workshop workflow.'
        : 'Dummy vault denied access.'
    );
  }
});
