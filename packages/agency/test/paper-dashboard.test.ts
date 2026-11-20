import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createDashboardState,
  visibleWork,
  approveWork,
  workCounts,
  sampleWork
} from '../src/lib/motion/paperDashboard';
test('review approval changes one item, preserves total work and rejects repeats', () => {
  const state = createDashboardState();
  assert.deepEqual(workCounts(state), { review: 2, active: 2, done: 1 });
  assert.equal(approveWork(state), true);
  assert.deepEqual(workCounts(state), { review: 1, active: 2, done: 2 });
  assert.equal(approveWork(state), false);
  assert.deepEqual(state.approvals, ['041']);
  state.selected = '042';
  assert.equal(approveWork(state), false);
  assert.equal(state.items.length, 5);
  assert.equal(sampleWork[0].status, 'review');
});
test('search intersects status while preserving selected context', () => {
  const state = createDashboardState();
  state.query = '  MAYA  ';
  state.filter = 'review';
  assert.deepEqual(
    visibleWork(state).map((i) => i.id),
    ['041', '043']
  );
  state.query = 'missing request';
  assert.equal(visibleWork(state).length, 0);
  assert.equal(state.selected, '041');
  state.query = '';
  state.filter = 'done';
  assert.deepEqual(
    visibleWork(state).map((i) => i.id),
    ['045']
  );
});
test('reset restores isolated original data after every sample review', () => {
  let state = createDashboardState();
  approveWork(state);
  state.selected = '043';
  approveWork(state);
  assert.deepEqual(workCounts(state), { review: 0, active: 2, done: 3 });
  state = createDashboardState();
  assert.deepEqual(workCounts(state), { review: 2, active: 2, done: 1 });
  assert.deepEqual(state.approvals, []);
  assert.equal(state.selected, '041');
});
