import assert from 'node:assert/strict';
import test from 'node:test';

import { buildInventory } from '../external-runtime-dependency-audit.mjs';

test('classifies every tracked Dify and Notion reference without current-stack blockers', () => {
  const first = buildInventory();
  const second = buildInventory();

  assert.deepEqual(second, first);
  assert.equal(first.summary.blockerCount, 0);
  assert.ok(first.summary.trackedReferenceCount > 0);
  assert.equal(first.summary.counts.unclassified ?? 0, 0);
  assert.equal(first.summary.counts.current_stack ?? 0, 0);
  assert.equal(first.summary.counts.active_runtime ?? 0, 0);
  assert.equal(
    first.blockers.filter((blocker) => blocker.category === 'active_runtime').length,
    0,
    'active production entrypoints must not contain Dify URLs, secret bindings, imports, or calls'
  );
  assert.ok(first.summary.counts.approved_rollback > 0);
  assert.ok(first.summary.counts.client_compatibility > 0);
  assert.ok(first.summary.counts.historical_evidence > 0);
  assert.ok(first.requiredCanonical.every((requirement) => requirement.present));
});
