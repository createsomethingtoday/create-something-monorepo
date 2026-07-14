import assert from 'node:assert/strict';
import test from 'node:test';
import type { Asset } from '../../vendor/core/airtable';
import { isActiveReviewAsset } from './creator-eligibility';

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
