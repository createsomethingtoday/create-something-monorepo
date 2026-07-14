import assert from 'node:assert/strict';
import test from 'node:test';
import { waitForTemplateSubmissionReceipt } from './submission-receipt';

test('confirms a webhook handoff only when its Asset and Version are valid', async () => {
  const result = await waitForTemplateSubmissionReceipt(
    async () => ({
      assetId: 'recAsset',
      versionId: 'recVersion',
      assetType: 'Template🏗️',
      creatorMatched: true,
      reviewStatus: '🆕Ready for Review'
    }),
    {
      creatorEmail: 'creator@example.com',
      templateName: 'Agatha',
      submittedAfter: '2026-07-14T14:00:00.000Z'
    },
    { timeoutMs: 50, pollIntervalMs: 1 }
  );

  assert.deepEqual(result, {
    state: 'confirmed',
    receipt: {
      assetId: 'recAsset',
      versionId: 'recVersion',
      reviewStatus: '🆕Ready for Review'
    }
  });
});

test('waits through an incomplete automation record and confirms the delayed valid version', async () => {
  let calls = 0;
  const result = await waitForTemplateSubmissionReceipt(
    async () => {
      calls += 1;
      if (calls === 1) {
        return {
          assetId: 'recAsset',
          assetType: 'Template🏗️',
          creatorMatched: true
        };
      }

      return {
        assetId: 'recAsset',
        versionId: 'recVersion',
        assetType: 'Template🏗️',
        creatorMatched: true,
        reviewStatus: '🆕Ready for Review'
      };
    },
    {
      creatorEmail: 'creator@example.com',
      templateName: 'Agatha',
      submittedAfter: '2026-07-14T14:00:00.000Z'
    },
    { timeoutMs: 50, pollIntervalMs: 1, sleep: async () => undefined }
  );

  assert.equal(calls, 2);
  assert.equal(result.state, 'confirmed');
});

test('returns processing instead of success when automation stays missing or invalid', async () => {
  let clock = 0;
  let calls = 0;
  const result = await waitForTemplateSubmissionReceipt(
    async () => {
      calls += 1;
      return {
        assetId: 'recAsset',
        versionId: 'recVersion',
        assetType: 'Template🏗️',
        creatorMatched: true,
        reviewStatus: '🚨Error: Field Missing (Email, Type, etc.)'
      };
    },
    {
      creatorEmail: 'creator@example.com',
      templateName: 'Agatha',
      submittedAfter: '2026-07-14T14:00:00.000Z'
    },
    {
      timeoutMs: 2,
      pollIntervalMs: 1,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      }
    }
  );

  assert.equal(calls, 3);
  assert.deepEqual(result, { state: 'processing', reason: 'receipt_pending' });
});
