import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  artifactObjects,
  initialArtifacts,
  applyArtifact,
  applyStoredArtifact,
  currentArtifact,
  restoreArtifacts,
  artifactStatus,
  type ArtifactState,
  type ArtifactIntent,
  type ArtifactId
} from '../../src/lib/workshop/artifacts';
const act = (s: ArtifactState, intent: ArtifactIntent) =>
  applyArtifact(s, intent, { epoch: s.epoch, version: s.version });
function place(s: ArtifactState, from: ArtifactId, to: ArtifactId) {
  return act(act(s, { type: 'pick', id: from, token: 'pickup' }), { type: 'place', id: to });
}
function complete() {
  let s = act(initialArtifacts('test'), { type: 'unpack' });
  s = place(s, 'starter', 'repository');
  s = place(s, 'repository', 'change');
  s = act(s, { type: 'approve' });
  s = place(s, 'change', 'references');
  s = place(s, 'references', 'target');
  return place(s, 'target', 'result');
}
test('artifact path produces inspectable practice objects, never verified providers', () => {
  const s = complete();
  for (const o of artifactObjects) assert.equal(currentArtifact(s, o.id), true);
  assert.equal(artifactStatus(s, 'result'), 'Practice completed');
  assert.equal(s.nodes.result.revision, 1);
  assert.equal(s.nodes.result.source?.id, 'target');
  assert.deepEqual(restoreArtifacts(JSON.stringify(s)), s);
  assert.match(s.message, /provider evidence remains unverified/);
  assert.ok(!Object.hasOwn(s, 'verified'));
});
test('approval gate and graph allowlist reject out-of-order and repeated actions', () => {
  let s = act(initialArtifacts('test'), { type: 'unpack' });
  s = act(s, { type: 'pick', id: 'starter', token: 'one' });
  const wrong = act(s, { type: 'place', id: 'result' });
  assert.deepEqual(wrong.nodes, s.nodes);
  assert.deepEqual(restoreArtifacts(JSON.stringify(wrong)), wrong); // error survives reload
  s = act(s, { type: 'place', id: 'repository' });
  const repeated = place(s, 'starter', 'repository');
  assert.equal(repeated.nodes.repository.revision, 1);
  s = place(s, 'repository', 'change');
  assert.equal(act(s, { type: 'pick', id: 'change', token: 'no-approval' }).carry, null);
  assert.equal(currentArtifact(s, 'references'), false);
});
test('source revision transitively invalidates approval and downstream evidence', () => {
  let s = complete();
  s = act(s, { type: 'revise' });
  assert.equal(s.approved, null);
  assert.equal(s.nodes.change.revision, 2);
  for (const id of ['references', 'target', 'result'] as const)
    assert.equal(artifactStatus(s, id), 'Stale');
  assert.equal(s.nodes.result.revision, 1); // retained, not falsely erased or current
  assert.deepEqual(restoreArtifacts(JSON.stringify(s)), s);
  s = act(s, { type: 'approve' });
  s = place(s, 'change', 'references');
  s = place(s, 'references', 'target');
  s = place(s, 'target', 'result');
  assert.equal(s.nodes.result.revision, 2);
  assert.equal(currentArtifact(s, 'result'), true);
});
test('destination edits invalidate only downstream result, and same value is idempotent', () => {
  const s = complete();
  assert.deepEqual(act(s, { type: 'environment', value: 'preview' }), s);
  const next = act(s, { type: 'environment', value: 'production' });
  assert.equal(currentArtifact(next, 'target'), true);
  assert.equal(currentArtifact(next, 'result'), false);
  assert.equal(next.approved, s.approved);
  assert.deepEqual(restoreArtifacts(JSON.stringify(next)), next);
});
test('interrupted carry resumes; stale queued place and reset cannot overwrite fresh objects', () => {
  let s = complete();
  s = act(s, { type: 'pick', id: 'target', token: 'resume' });
  assert.deepEqual(restoreArtifacts(JSON.stringify(s)), s);
  const expected = { epoch: s.epoch, version: s.version };
  const fresh = act(s, { type: 'environment', value: 'production' });
  const stale = applyArtifact(fresh, { type: 'place', id: 'result' }, expected);
  assert.deepEqual(stale.nodes, fresh.nodes);
  assert.equal(stale.environment, 'production');
  const reset = act(fresh, { type: 'reset', epoch: 'new' });
  assert.deepEqual(
    applyArtifact(reset, { type: 'reset', epoch: 'old' }, expected).nodes,
    reset.nodes
  );
  assert.equal(applyArtifact(reset, { type: 'approve' }, expected).epoch, 'new');
});
test('concurrent authority actions reject a stale revision without losing the accepted action', () => {
  const s = complete(),
    expected = { epoch: s.epoch, version: s.version };
  const first = applyArtifact(s, { type: 'revise' }, expected);
  const second = applyArtifact(first, { type: 'environment', value: 'production' }, expected);
  assert.deepEqual(second.nodes, first.nodes);
  assert.equal(second.environment, 'preview');
  assert.match(second.message, /another tab/);
});
test('saved data cannot fabricate a current receipt, unknown references, or approval', () => {
  const s = complete();
  for (const corrupt of [
    { ...s, approved: 999 },
    { ...s, selected: 'token' },
    { ...s, carry: { id: 'change', revision: 1, token: '' } },
    {
      ...s,
      nodes: { ...s.nodes, result: { ...s.nodes.result, source: { id: 'starter', revision: 1 } } }
    },
    { ...s, nodes: { ...s.nodes, references: { ...s.nodes.references, prepared: false } } }
  ])
    assert.equal(restoreArtifacts(JSON.stringify(corrupt)), null);
  assert.equal(restoreArtifacts('broken'), null);
  assert.equal(restoreArtifacts(null), null);
});
test('recovery reset reads fresh storage and cannot erase another tab’s repair', () => {
  const stale = initialArtifacts('bad-tab');
  const expected = { epoch: stale.epoch, version: stale.version };
  const reset = { type: 'reset' as const, epoch: 'recovery' };
  assert.equal(applyStoredArtifact('broken', stale, reset, expected).epoch, 'recovery');
  const repaired = complete();
  const result = applyStoredArtifact(JSON.stringify(repaired), stale, reset, expected);
  assert.deepEqual(result.nodes, repaired.nodes);
  assert.equal(result.epoch, repaired.epoch);
  assert.match(result.message, /another tab/);
});
