import assert from 'node:assert/strict';
import test from 'node:test';
import type { Asset } from '../../vendor/core/airtable';
import { evaluateCreatorEligibility, isActiveReviewAsset } from './creator-eligibility';

function asset(overrides: Partial<Asset>): Asset {
  return {
    id: 'recAsset',
    name: 'Agatha',
    type: 'Template',
    status: 'Upcoming',
    ...overrides
  } as Asset;
}

test('an upcoming asset with a ready review version counts as an active review', () => {
  assert.equal(isActiveReviewAsset(asset({ latestReviewStatus: '🆕Ready for Review' })), true);
});

test('published, rejected, and delisted assets do not count as active reviews', () => {
  for (const status of ['Published', 'Rejected', 'Delisted'] as const) {
    assert.equal(
      isActiveReviewAsset(asset({ status, latestReviewStatus: '🆕Ready for Review' })),
      false
    );
  }
});

test('blocks when remote eligibility allows but local submissions exhaust the rolling limit', async () => {
  const submittedDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const assets = Array.from({ length: 6 }, (_, index) =>
    asset({
      id: `recAsset${index}`,
      name: `Template ${index}`,
      status: 'Published',
      submittedDate
    })
  );

  const result = await evaluateCreatorEligibility('creator@example.com', {
    getAirtable: async () => ({
      getCreatorByEmail: async () => ({ id: 'recCreator' }) as never,
      getAssetsByEmail: async () => assets
    }),
    checkRemoteCreatorEligibility: async () => ({
      userExists: true,
      hasError: false,
      message:
        '0 out of 6 templates submitted in the past 30 days. You can submit another template.'
    }),
    fetchExternalSubmissionStatus: async () => ({
      hasError: false,
      assetsSubmitted30: 0,
      isWhitelisted: false
    })
  });

  assert.equal(result.allowed, false);
  assert.equal(result.hasError, true);
  assert.equal(result.source, 'hybrid');
  assert.equal(result.remainingSubmissions, 0);
  assert.match(result.message, /rolling 30-day submission limit/);
});
