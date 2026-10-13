import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completeSample, emptyDraft, parseDraft } from '../src/lib/interaction-pilot/model';
import { readJourneyLocation, journeyFragment } from '../../canon/src/lib/patterns/journey-location';

test('completion requires an explicit destination and scope review; repeat completion is stable', () => {
  assert.match(completeSample(emptyDraft()).error, /destination/);
  assert.match(completeSample({ ...emptyDraft(), destination: 'inbox' }).error, /scope/);
  const result = completeSample({ ...emptyDraft(), destination: 'queue', reviewed: true });
  assert.equal(result.error, '');
  assert.equal(result.draft.completed, true);
  assert.deepEqual(completeSample(result.draft), result);
});
test('restoration cannot invent completion or accept arbitrary user payloads', () => {
  assert.deepEqual(parseDraft({ version: 9, destination: 'inbox', reviewed: true }), emptyDraft());
  assert.deepEqual(parseDraft({ version: 1, destination: 'https://external.invalid', reviewed: true }), emptyDraft());
  assert.equal(parseDraft({ version: 1, destination: '', reviewed: true, completed: true }).completed, false);
  assert.equal(parseDraft({ version: 1, destination: 'queue', reviewed: false, completed: true }).completed, false);
  const valid = { version: 1, destination: 'inbox', reviewed: true, completed: true } as const;
  assert.deepEqual(parseDraft(valid), valid);
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
