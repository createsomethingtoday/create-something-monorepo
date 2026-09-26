import { test } from 'node:test';
import assert from 'node:assert/strict';
import { admit, authorized, stopped } from './policy.mjs';
const initial = () => ({ issued: 0, active: null, runs: {} });

test('unknown commands and caller-supplied tenant authority cannot be submitted', () => {
  for (const request of [{ id: '../bad', mode: 'restricted' }, { id: 'run-a', mode: 'shell' },
    { id: 'run-a', mode: 'restricted', tenant: 'another-creator' }]) {
    assert.equal(admit(initial(), request, 0).status, 400);
  }
});
test('duplicate IDs do not spend twice; changed intent under same ID is rejected', () => {
  const first = admit(initial(), { id: 'run-a', mode: 'restricted' }, 0);
  const duplicate = admit(first.next, { id: 'run-a', mode: 'restricted' }, 1);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.next, undefined);
  assert.equal(admit(first.next, { id: 'run-a', mode: 'control' }, 1).status, 409);
});
test('active and uncertain runs retain the capacity reservation', () => {
  const first = admit(initial(), { id: 'run-a', mode: 'restricted' }, 0);
  assert.equal(admit(first.next, { id: 'run-b', mode: 'restricted' }, 999999).status, 409);
});
test('completed runs consume the fixed non-renewing experiment budget', () => {
  let state = initial();
  for (let i = 0; i < 12; i++) {
    const result = admit(state, { id: `run-${i}`, mode: 'restricted' }, i);
    assert.equal(result.status, 202); state = { ...result.next, active: null };
  }
  assert.equal(admit(state, { id: 'run-thirteenth', mode: 'restricted' }, 5).status, 429);
});
test('only stopped provider states release capacity', () => {
  for (const status of ['running', 'healthy', 'stopping', undefined]) assert.equal(stopped({ status }), false);
  assert.equal(stopped({ status: 'stopped' }), true);
});
test('missing or incorrect operator credentials fail closed', async () => {
  assert.equal(await authorized(null, undefined), false);
  assert.equal(await authorized('Bearer ' + 'a'.repeat(64), 'b'.repeat(64)), false);
  assert.equal(await authorized('Bearer ' + 'a'.repeat(64), 'a'.repeat(64)), true);
});

test('non-string IDs cannot consume admission or wedge reservation identity', () => {
  for (const id of [['run-repro'], { toString: () => 'run-repro' }, 123, null, undefined]) {
    const state = initial();
    const result = admit(state, { id, mode: 'isolated' }, 0);
    assert.equal(result.status, 400);
    assert.equal(result.next, undefined);
    assert.deepEqual(state, initial());
  }
});
