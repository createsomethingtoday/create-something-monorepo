import test from 'node:test';
import assert from 'node:assert/strict';
import { getAirtableClient } from './airtable.js';
import { buildMarketplaceSnapshot, snapshotToFields } from './marketplace-snapshot.mjs';
test('both core readers share a complete snapshot and expose unique totals', async (t) => {
  const snapshot = buildMarketplaceSnapshot({
    snapshotAt: '2026-09-21T16:00:00.000Z',
    sellers: [
      { templateId: 'a'.repeat(24), mrpId: 'b'.repeat(24), name: 'Same', sales: 3, revenue: 150 }
    ],
    assets: [
      {
        templateId: 'a'.repeat(24),
        creatorEmail: 'fixture@example.test',
        categories: ['Agency', 'Portfolio']
      }
    ],
    categories: [
      { name: 'Agency', group: 'Business' },
      { name: 'Portfolio', group: 'Business' }
    ]
  });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return Response.json({ records: [{ fields: snapshotToFields(snapshot) }] });
  });
  const client = getAirtableClient({
    AIRTABLE_API_KEY: 'fixture-only',
    AIRTABLE_BASE_ID: 'appMoIgXMTTTNIc3p',
    MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID: 'tblSnapshotTest01'
  });
  const [leaderboard, categories] = await Promise.all([
    client.getLeaderboard(),
    client.getCategoryPerformance()
  ]);
  assert.equal(calls, 1);
  assert.match(leaderboard.snapshotVersion!, /^[a-f0-9]{64}$/);
  assert.equal(leaderboard.snapshotVersion, categories.snapshotVersion);
  assert.equal(leaderboard.records[0].templateId, 'a'.repeat(24));
  assert.equal(categories.marketplaceSummary?.totalSales, 3);
  assert.equal(
    categories.records.reduce((sum, x) => sum + x.totalSales30d, 0),
    6
  );
});
