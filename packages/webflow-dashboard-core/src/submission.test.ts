import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateLocalSubmissionData, formatTimeUntil } from './submission.js';
import {
  calculateMarketplaceWarningLevel,
  calculateRemainingSubmissionSlots,
  isMarketplaceTemplateActiveReviewStatus,
  MARKETPLACE_TEMPLATE_SUBMISSION_POLICY,
} from '@create-something/webflow-marketplace-core';

test('formatTimeUntil handles null and positive durations', () => {
  assert.equal(formatTimeUntil(null), 'now');
  assert.equal(formatTimeUntil(45_000), '45s');
  assert.equal(formatTimeUntil(3_600_000), '1h 0m');
});

test('calculateLocalSubmissionData ignores delisted and expired submissions', () => {
  const now = Date.now();
  const assets = [
    {
      id: 'asset-1',
      name: 'Recent draft',
      status: 'Draft',
      submittedDate: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'asset-2',
      name: 'Published',
      status: 'Published',
      submittedDate: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'asset-3',
      name: 'Delisted',
      status: 'Delisted',
      submittedDate: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'asset-4',
      name: 'Outside window',
      status: 'Draft',
      submittedDate: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const result = calculateLocalSubmissionData(assets);

  assert.equal(result.submissions.length, 2);
  assert.equal(result.remainingSubmissions, 4);
  assert.equal(result.isAtLimit, false);
  assert.equal(result.publishedCount, 1);
});

test('shared marketplace template policy helpers expose expected limits', () => {
  assert.equal(MARKETPLACE_TEMPLATE_SUBMISSION_POLICY.submissionLimit, 6);
  assert.equal(calculateRemainingSubmissionSlots(4, false), 2);
  assert.equal(calculateRemainingSubmissionSlots(8, false), 0);
  assert.equal(calculateMarketplaceWarningLevel(2, false), 'caution');
  assert.equal(calculateMarketplaceWarningLevel(0, false), 'critical');
  assert.equal(calculateMarketplaceWarningLevel(2, true), 'none');
});

test('active review helper matches Marketplace review states', () => {
  assert.equal(isMarketplaceTemplateActiveReviewStatus('Ready for review'), true);
  assert.equal(isMarketplaceTemplateActiveReviewStatus('Changes Requested'), true);
  assert.equal(isMarketplaceTemplateActiveReviewStatus('Published'), false);
  assert.equal(isMarketplaceTemplateActiveReviewStatus('Rejected'), false);
});
