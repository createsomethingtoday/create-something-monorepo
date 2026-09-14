import assert from 'node:assert/strict';
import { test } from 'node:test';
import { observeTemplateHandoff } from '../src/handoff-observation.js';

test('confirms an exact linked review version without leaking source records', async () => {
  const result = await observeTemplateHandoff(
    {
      getAssetById: async () => ({ assetId: 'recAAAAAAAAAAAAAA', templateName: 'private name' }),
      getVersionById: async () => ({
        versionId: 'recBBBBBBBBBBBBBB',
        assetId: 'recAAAAAAAAAAAAAA',
        reviewStatus: '🆕Ready for Review',
        reviewFeedback: 'private feedback'
      })
    },
    { assetId: 'recAAAAAAAAAAAAAA', versionId: 'recBBBBBBBBBBBBBB' },
    { observedAt: '2026-09-14T00:00:00.000Z' }
  );
  assert.equal(result.state, 'confirmed');
  assert.equal(result.nextAction, 'await_review');
  assert.match(result.evidenceSha256, /^sha256:[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(JSON.stringify(result).includes('recAAAAAAAAAAAAAA'), false);
});

const request = { assetId: 'recAAAAAAAAAAAAAA', versionId: 'recBBBBBBBBBBBBBB' };
const clock = { observedAt: '2026-09-14T00:00:00.000Z' };
const asset = { assetId: request.assetId };
const version = {
  versionId: request.versionId,
  assetId: request.assetId,
  reviewStatus: '🆕Ready for Review'
};

test('a missing version stays unknown and never recommends resubmission', async () => {
  const result = await observeTemplateHandoff(
    { getAssetById: async () => asset, getVersionById: async () => null },
    request,
    clock
  );
  assert.equal(result.state, 'insufficient_evidence');
  assert.equal(result.reason, 'version_missing');
  assert.equal(result.nextAction, 'inspect_source_evidence');
});

test('a version linked to a different asset is a conflict even when ready', async () => {
  const result = await observeTemplateHandoff(
    {
      getAssetById: async () => asset,
      getVersionById: async () => ({ ...version, assetId: 'recCCCCCCCCCCCCCC' })
    },
    request,
    clock
  );
  assert.equal(result.state, 'conflicting_evidence');
  assert.equal(result.nextAction, 'escalate_source_conflict');
});

test('a source outage propagates instead of fabricating a missing record', async () => {
  await assert.rejects(
    observeTemplateHandoff(
      {
        getAssetById: async () => {
          throw new Error('upstream unavailable');
        },
        getVersionById: async () => version
      },
      request,
      clock
    ),
    /upstream unavailable/
  );
});

test('unknown review status is insufficient evidence; terminal review is not an intake failure', async () => {
  for (const [status, expected] of [
    ['future status', 'insufficient_evidence'],
    ['❌Rejected', 'confirmed']
  ] as const) {
    const result = await observeTemplateHandoff(
      {
        getAssetById: async () => asset,
        getVersionById: async () => ({ ...version, reviewStatus: status })
      },
      request,
      clock
    );
    assert.equal(result.state, expected);
  }
});

test('invalid or widened requests fail before reading any source', async () => {
  let calls = 0;
  const source = {
    getAssetById: async () => {
      calls++;
      return asset;
    },
    getVersionById: async () => {
      calls++;
      return version;
    }
  };
  for (const input of [
    { ...request, email: 'private@example.com' },
    { ...request, assetId: "rec' OR TRUE" }
  ]) {
    await assert.rejects(observeTemplateHandoff(source, input, clock));
  }
  assert.equal(calls, 0);
});

test('identical evidence is deterministic and changed status changes its digest', async () => {
  const source = { getAssetById: async () => asset, getVersionById: async () => version };
  const a = await observeTemplateHandoff(source, request, clock);
  assert.deepEqual(await observeTemplateHandoff(source, request, clock), a);
  const b = await observeTemplateHandoff(
    { ...source, getVersionById: async () => ({ ...version, reviewStatus: '🏃🏾In Review' }) },
    request,
    clock
  );
  assert.equal(a.requestSha256, b.requestSha256);
  assert.notEqual(a.evidenceSha256, b.evidenceSha256);
});

test('an archived record does not prove that intake reached a reviewer', async () => {
  const result = await observeTemplateHandoff(
    {
      getAssetById: async () => asset,
      getVersionById: async () => ({ ...version, reviewStatus: '☠️Archived' })
    },
    request,
    clock
  );
  assert.equal(result.state, 'insufficient_evidence');
});
