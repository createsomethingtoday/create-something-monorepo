import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  missingObservations,
  observationsRequired,
  simulationReady
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
