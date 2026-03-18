import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateLocalSubmissionData, formatTimeUntil } from './submission.js';

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
