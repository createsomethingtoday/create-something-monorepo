import assert from 'node:assert/strict';
import { test } from 'node:test';
import { steps } from '../src/lib/interaction-pilot/model';
import { readJourneyLocation, journeyFragment } from '../../canon/src/lib/patterns/journey-location';

test('the retained journey explains the handoff without directing visitors to a fictional exercise', () => {
  assert.equal(steps.length, 4);
  const handoff = steps.find(step => step.id === 'handoff')!;
  assert.match(handoff.boundary, /illustration/);
  assert.match(handoff.boundary, /agreed separately/);
  assert.doesNotMatch(handoff.boundary, /Prepare the fixed sample/);
});
test('location parsing is exact, scoped and safely falls back for stale fragments', () => {
  const steps = ['problem', 'approval', 'check', 'handoff'];
  for (const stepId of steps) for (const detail of [false, true]) {
    const location = { stepId, detail };
    assert.deepEqual(readJourneyLocation('example', steps, journeyFragment('example', location)), location);
  }
  for (const hash of ['', '#unrelated', '#example-missing', '#example-problem-detail-extra']) {
    assert.deepEqual(readJourneyLocation('example', steps, hash), { stepId: 'problem', detail: false });
  }
});
