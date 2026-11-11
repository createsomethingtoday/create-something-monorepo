import test from 'node:test';
import assert from 'node:assert/strict';
import {runPendingRecovery} from './pending.mjs';

test('lost response never permits a second dispatch', async () => {
  const {makeFixture} = await import('./test-fixture.mjs');
  const f = makeFixture();
  f.adapter.append = async () => { f.sends++; throw Error('lost response'); };
  assert.equal((await runPendingRecovery(f)).status, 'unknown');
  assert.equal((await runPendingRecovery(f)).status, 'held-existing-attempt');
  assert.equal(f.sends, 1);
});
for (const kind of ['human-edit', 'source-mismatch', 'ownership', 'non-409']) {
  test(`refuses ${kind} before dispatch`, async () => {
    const {makeFixture} = await import('./test-fixture.mjs');
    const f = makeFixture();
    if (kind === 'human-edit') f.adapter.getPage = async () => ({id:f.profile.pageId, properties:{Reviewed:{checkbox:true}}});
    if (kind === 'source-mismatch') f.raw = 'changed';
    if (kind === 'ownership') f.adapter.guard = async () => { throw Error('owner changed'); };
    if (kind === 'non-409') f.evidence.provider.status = 500;
    await assert.rejects(runPendingRecovery(f));
    assert.equal(f.sends, 0);
  });
}
test('exact append yields positive receipt without checkpoint or old-journal mutation', async () => {
  const {makeFixture} = await import('./test-fixture.mjs');
  const f = makeFixture();
  const result = await runPendingRecovery(f);
  assert.equal(result.status, 'verified');
  assert.equal(result.receipt.ids.length, 80);
  assert.equal(f.sends, 1);
});
