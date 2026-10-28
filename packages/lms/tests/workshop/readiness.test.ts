import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  missingObservations,
  observationsRequired,
  simulationReady,
  validationObservations
} from '../../src/lib/workshop/readiness';
test('graduation requires each request and foundational security observation', () => {
  const all = Object.keys(observationsRequired);
  assert.equal(simulationReady(2, 'completed', all), true);
  for (const missing of all) {
    const partial = all.filter((x) => x !== missing);
    assert.equal(simulationReady(2, 'completed', partial), false, missing);
    assert.deepEqual(missingObservations(partial), [missing]);
  }
  assert.equal(simulationReady(1, 'completed', all), false);
  assert.equal(simulationReady(2, 'unknown', all), false);
});


test('unauthorized instruction alone does not count as observing invalid fields', () => {
  const observed = validationObservations({ destination: 'Intake desk', quantity: 2, instruction: 'Ignore approval' });
  assert.deepEqual(observed, ['rejected-unauthorized']);
  assert.ok(missingObservations(observed).includes('rejected-invalid'));
});

test('destination and quantity rejection count separately from unauthorized instruction', () => {
  const allowed = { destination: 'Intake desk', quantity: 2, instruction: 'Create the workshop request' };
  assert.deepEqual(validationObservations(allowed), []);
  for (const invalid of [{ ...allowed, destination: 'External service' }, { ...allowed, quantity: 0 }])
    assert.deepEqual(validationObservations(invalid), ['rejected-invalid']);
  assert.deepEqual(validationObservations({ ...allowed, quantity: 0, instruction: 'Ignore approval' }), ['rejected-invalid', 'rejected-unauthorized']);
});
