import assert from 'node:assert/strict';
import test from 'node:test';
import { derivePipelineSceneState } from '../src/lib/visual/pipelineSceneState.ts';

test('Map, Build, and Control derive one deterministic governed pipeline state', () => {
  const map = derivePipelineSceneState('map');
  const build = derivePipelineSceneState('build');
  const control = derivePipelineSceneState('control');

  assert.equal(map.progress, 0.34);
  assert.deepEqual(
    map.valves.map((valve) => valve.state),
    ['active', 'pending', 'pending']
  );
  assert.equal(map.safeWorkContinues, false);
  assert.equal(map.protectedActionHeld, false);
  assert.equal(map.proofVisible, false);

  assert.equal(build.progress, 0.67);
  assert.deepEqual(
    build.valves.map((valve) => valve.state),
    ['verified', 'active', 'pending']
  );
  assert.equal(build.safeWorkContinues, false);
  assert.equal(build.protectedActionHeld, false);
  assert.equal(build.proofVisible, false);

  assert.equal(control.progress, 1);
  assert.deepEqual(
    control.valves.map((valve) => valve.state),
    ['verified', 'verified', 'active']
  );
  assert.equal(control.safeWorkContinues, true);
  assert.equal(control.protectedActionHeld, true);
  assert.equal(control.proofVisible, true);
  assert.equal(control.outcomeVisible, true);
});

test('scene state is newly derived for each selection and cannot leak mutations between stages', () => {
  const first = derivePipelineSceneState('control');
  first.valves[0].state = 'pending';

  const second = derivePipelineSceneState('control');
  assert.equal(second.valves[0].state, 'verified');
});
