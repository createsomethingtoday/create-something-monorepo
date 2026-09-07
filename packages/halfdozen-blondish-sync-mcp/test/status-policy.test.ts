import assert from 'node:assert/strict';
import test from 'node:test';
import {
  effectiveSourceStatusMap,
  mapHdStatusToOsStatus,
  parseStatusWritebackMap,
} from '../src/status-policy.js';

const crackedStatusMap = {
  'Not Started': 'Submitted',
  Responded: 'Under Review',
  'Client Action': 'Under Review',
  Assigned: 'Under Review',
  'Needs Review': 'Under Review',
  Backburner: null,
  Archive: null,
};

test('Cracked status policy implements the transcript mapping', () => {
  const parsed = parseStatusWritebackMap(JSON.stringify(crackedStatusMap));

  assert.deepEqual(parsed, crackedStatusMap);
  assert.deepEqual(effectiveSourceStatusMap(parsed), {
    'Not Started': 'Submitted',
    Responded: 'Under Review',
    'Client Action': 'Under Review',
    Assigned: 'Under Review',
    'In Progress': 'In Progress',
    'Needs Review': 'Under Review',
    Roadblock: 'Roadblock',
    Backburner: null,
    Complete: 'Complete',
    Archive: null,
  });
});

test('status policy preserves no-write states and rejects unknown HD statuses', () => {
  assert.equal(mapHdStatusToOsStatus('Backburner', crackedStatusMap), null);
  assert.equal(mapHdStatusToOsStatus('Archive', crackedStatusMap), null);
  assert.throws(
    () => parseStatusWritebackMap('{"Unknown":"Submitted"}'),
    /cannot override unknown Half Dozen status/,
  );
});
