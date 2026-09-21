import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMarketplaceSnapshot,
  snapshotToFields,
  snapshotFromFields,
  fetchMarketplaceSnapshot
} from './marketplace-snapshot.mjs';
const fixture = () => ({
  snapshotAt: '2026-09-21T16:00:00.000Z',
  sellers: [
    { templateId: 'a'.repeat(24), mrpId: 'b'.repeat(24), name: 'Same Name', sales: 3, revenue: 150 }
  ],
  assets: [
    {
      templateId: 'a'.repeat(24),
      creatorEmail: 'one@example.test',
      categories: ['Agency', 'Portfolio', 'Agency']
    }
  ],
  categories: [
    { name: 'Agency', group: 'Business' },
    { name: 'Portfolio', group: 'Business' }
  ]
});
test('multi-tag breakdown does not multiply marketplace totals or duplicate tag contributions', () => {
  const snapshot = buildMarketplaceSnapshot(fixture());
  assert.equal(snapshot.summary.totalSales, 3);
  assert.equal(snapshot.summary.totalRevenue, 150);
  assert.equal(snapshot.summary.sellingTemplates, 1);
  assert.equal(snapshot.categories.length, 2);
  assert.equal(
    snapshot.categories.reduce((sum, row) => sum + row.totalSales30d, 0),
    6
  );
  assert.deepEqual(snapshotFromFields(snapshotToFields(snapshot)), snapshot);
});
test('same-name templates remain distinct and retain their own creators', () => {
  const input = fixture();
  input.sellers.push({
    templateId: 'c'.repeat(24),
    mrpId: 'd'.repeat(24),
    name: 'Same Name',
    sales: 2,
    revenue: 100
  });
  input.assets.push({
    templateId: 'c'.repeat(24),
    creatorEmail: 'two@example.test',
    categories: ['Agency']
  });
  const snapshot = buildMarketplaceSnapshot(input);
  assert.equal(snapshot.summary.totalSales, 5);
  assert.equal(snapshot.summary.sellingTemplates, 2);
  assert.deepEqual(
    snapshot.leaderboard.map((r) => [r.templateId, r.creatorEmail, r.totalSales30d]),
    [
      ['a'.repeat(24), 'one@example.test', 3],
      ['c'.repeat(24), 'two@example.test', 2]
    ]
  );
});
test('marketplace totals cover sellers beyond the top 160', () => {
  const input = fixture();
  input.sellers = [];
  input.assets = [];
  for (let i = 0; i < 161; i++) {
    const id = i.toString(16).padStart(24, '0');
    input.sellers.push({ templateId: id, mrpId: id, name: 'Template', sales: 1, revenue: 10 });
    input.assets.push({ templateId: id, creatorEmail: 'fixture@example.test', categories: ['Agency'] });
  }
  const snapshot = buildMarketplaceSnapshot(input);
  assert.equal(snapshot.leaderboard.length, 160);
  assert.equal(snapshot.summary.totalSales, 161);
  assert.equal(snapshot.summary.sellingTemplates, 161);
});
for (const [name, change] of [
  [
    'empty sellers',
    (x) => {
      x.sellers = [];
    }
  ],
  [
    'empty assets',
    (x) => {
      x.assets = [];
    }
  ],
  [
    'empty categories',
    (x) => {
      x.categories = [];
    }
  ],
  ['ambiguous identities', (x) => x.sellers.push({ ...x.sellers[0] })],
  [
    'missing mapping',
    (x) => {
      x.assets[0].templateId = 'c'.repeat(24);
    }
  ],
  [
    'conflicting creators',
    (x) => x.assets.push({ ...x.assets[0], creatorEmail: 'other@example.test' })
  ],
  [
    'missing taxonomy',
    (x) => {
      x.assets[0].categories = ['Missing'];
    }
  ],
  [
    'invalid sales',
    (x) => {
      x.sellers[0].sales = NaN;
    }
  ]
])
  test(`rejects ${name}`, () => {
    const input = fixture();
    change(input);
    assert.throws(() => buildMarketplaceSnapshot(input));
  });
test('rejects corrupt, partial and oversized wire snapshots', () => {
  const fields = snapshotToFields(buildMarketplaceSnapshot(fixture()));
  assert.throws(() => snapshotFromFields({ ...fields, SUMMARY_JSON: '{}' }));
  assert.throws(() => snapshotFromFields({ ...fields, KEY: 'different' }));
  const input = fixture();
  input.sellers[0].name = 'x'.repeat(90000);
  assert.throws(() => snapshotToFields(buildMarketplaceSnapshot(input)), /field exceeds/);
});
test('missing configuration preserves legacy mode without provider access', async () => {
  assert.equal(
    await fetchMarketplaceSnapshot({}, () => {
      throw Error('must not fetch');
    }),
    null
  );
});
test('configured missing or failed source is not replaced with legacy data', async () => {
  const env = { MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID: 'tblSnapshotTest01' };
  await assert.rejects(fetchMarketplaceSnapshot(env, async () => Response.json({ records: [] })));
  await assert.rejects(
    fetchMarketplaceSnapshot(env, async () => new Response('', { status: 503 }))
  );
});
test('reader validates and returns the complete atomic snapshot', async () => {
  const snapshot = buildMarketplaceSnapshot(fixture());
  const observed = await fetchMarketplaceSnapshot(
    {
      AIRTABLE_BASE_ID: 'appMoIgXMTTTNIc3p',
      MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID: 'tblSnapshotTest01'
    },
    async () => Response.json({ records: [{ fields: snapshotToFields(snapshot) }] })
  );
  const { contentVersion, ...payload } = observed;
  assert.match(contentVersion, /^[a-f0-9]{64}$/);
  assert.deepEqual(payload, snapshot);
});

test('metadata-only corrections change content identity within the same week', async () => {
 const snapshot = buildMarketplaceSnapshot(fixture());
 const env = {MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID: 'tblSnapshotTest01'};
 const read = () => fetchMarketplaceSnapshot(env, async () => Response.json({records: [{fields: snapshotToFields(snapshot)}]}));
 const before = await read();
 snapshot.leaderboard[0].creatorEmail = 'corrected@example.test';
 const after = await read();
 assert.equal(before.snapshotAt, after.snapshotAt);
 assert.deepEqual(before.summary, after.summary);
 assert.notEqual(before.contentVersion, after.contentVersion);
 assert.equal(after.contentVersion, (await read()).contentVersion);
});
