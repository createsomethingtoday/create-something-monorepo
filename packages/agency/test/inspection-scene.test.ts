import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectionState } from '../src/lib/visual/inspectionSceneState';

test('inspection opens and rewinds without retaining a finding', () => {
  const intact = inspectionState(0);
  const inspected = inspectionState(1);
  assert.equal(intact.lidLift, 0);
  assert.ok(inspected.lidLift > 2);
  assert.equal(inspected.finding, 1);
  assert.deepEqual(inspectionState(0), intact);
  assert.equal(inspectionState(1 / 3).finding, 0);
});

test('invalid scroll input cannot escape the closed-to-inspected range', () => {
  for (const input of [-100, NaN, Infinity, -Infinity])
    assert.deepEqual(inspectionState(input), inspectionState(0));
  assert.deepEqual(inspectionState(100), inspectionState(1));
  let lastLift = 0;
  for (let i = 0; i <= 100; i++) {
    const state = inspectionState(i / 100);
    assert.ok(state.lidLift >= lastLift);
    assert.ok(state.stage >= 0 && state.stage <= 3);
    lastLift = state.lidLift;
  }
});
