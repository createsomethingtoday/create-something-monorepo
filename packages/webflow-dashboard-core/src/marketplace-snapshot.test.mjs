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

test('reports cross-group template tags under the first subcategory group and in every breakdown', () => {
 const input = fixture();
 input.categories[1].group = 'Creative';
 const snapshot = buildMarketplaceSnapshot(input);
 const multi = input.assets[0];
 const row = snapshot.leaderboard.find((r) => r.templateId === String(multi.templateId).toLowerCase());
 const sorted = [...new Set(multi.categories)].sort();
 const groupOf = new Map(input.categories.map((c) => [c.name, c.group]));
 assert.equal(row.category, groupOf.get(sorted[0]));
 for (const subcategory of sorted)
   assert.ok(snapshot.categories.some((c) => c.subcategory === subcategory && c.category === groupOf.get(subcategory)));
});
test('fulfillment-link sales are split out of the total when the source carries them', () => {
  const input = fixture();
  input.sellers[0].fulfillmentSales = 2;
  input.sellers.push({ templateId: 'c'.repeat(24), mrpId: 'd'.repeat(24), name: 'Other', sales: 1, revenue: 49, fulfillmentSales: 0 });
  input.assets.push({ templateId: 'c'.repeat(24), creatorEmail: 'two@example.test', categories: ['Agency'] });
  const snapshot = buildMarketplaceSnapshot(input);
  assert.equal(snapshot.summary.totalSales, 4);
  assert.equal(snapshot.summary.fulfillmentSales, 2);
  assert.deepEqual(snapshot.leaderboard.map((r) => r.fulfillmentSales30d), [2, 0]);
  assert.deepEqual(snapshotFromFields(snapshotToFields(snapshot)), snapshot);
});
test('snapshots without fulfillment-link counts stay valid and carry no split', () => {
  const snapshot = buildMarketplaceSnapshot(fixture());
  assert.equal('fulfillmentSales' in snapshot.summary, false);
  assert.equal('fulfillmentSales30d' in snapshot.leaderboard[0], false);
});
test('rejects partial, oversized or mixed fulfillment-link counts', () => {
  const partial = fixture();
  partial.sellers.push({ ...partial.sellers[0], templateId: 'c'.repeat(24), fulfillmentSales: 1 });
  partial.assets.push({ ...partial.assets[0], templateId: 'c'.repeat(24) });
  assert.throws(() => buildMarketplaceSnapshot(partial), /partial fulfillment/);
  const oversized = fixture();
  oversized.sellers[0].fulfillmentSales = 4;
  assert.throws(() => buildMarketplaceSnapshot(oversized), /exceed/);
  const withSplit = fixture();
  withSplit.sellers[0].fulfillmentSales = 1;
  const fields = snapshotToFields(buildMarketplaceSnapshot(withSplit));
  const rows = JSON.parse(fields.LEADERBOARD_JSON).map(({ fulfillmentSales30d: _f, ...row }) => row);
  assert.throws(() => snapshotFromFields({ ...fields, LEADERBOARD_JSON: JSON.stringify(rows) }), /mixed/);
});

// Listed supply, sell-through and the optional 90-day window (CRE-2569).
const supplyFixture = () => {
  const input = fixture();
  input.assets[0].listed = true;
  input.assets.push(
    { templateId: 'e'.repeat(24), creatorEmail: 'three@example.test', categories: ['Agency'], listed: true },
    { templateId: 'f'.repeat(24), creatorEmail: '', categories: ['Portfolio', 'Events', 'Unmapped'], listed: true },
    { templateId: '1'.repeat(24), creatorEmail: 'five@example.test', categories: ['Agency'], listed: false }
  );
  input.categories.push({ name: 'Events', group: 'Community' });
  return input;
};
const row = (snapshot, subcategory) => snapshot.categories.find((r) => r.subcategory === subcategory);
test('listed supply comes from the same asset list as sales, and a subcategory with no sales still has a row', () => {
  const snapshot = buildMarketplaceSnapshot(supplyFixture());
  assert.equal(snapshot.summary.listedTemplates, 3);
  assert.equal(snapshot.summary.sellingTemplates, 1);
  assert.deepEqual(
    ['Agency', 'Portfolio', 'Events'].map((name) => [
      name,
      row(snapshot, name).listedTemplates,
      row(snapshot, name).templatesInSubcategory,
      row(snapshot, name).totalSales30d
    ]),
    [
      ['Agency', 2, 1, 3],
      ['Portfolio', 2, 1, 3],
      ['Events', 1, 0, 0]
    ]
  );
  assert.equal(row(snapshot, 'Events').avgRevenuePerTemplate, 0);
  assert.equal(row(snapshot, 'Events').category, 'Community');
  assert.equal(row(snapshot, 'Unmapped'), undefined);
  assert.deepEqual(snapshotFromFields(snapshotToFields(snapshot)), snapshot);
});
test('a template that sold in the window counts as listed even when it is delisted now', () => {
  const input = supplyFixture();
  input.assets[0].listed = false;
  const snapshot = buildMarketplaceSnapshot(input);
  assert.equal(snapshot.summary.listedTemplates, 3);
  assert.equal(row(snapshot, 'Agency').listedTemplates, 2);
});
test('sources without a listed flag keep the old shape: no supply fields and no empty rows', () => {
  const snapshot = buildMarketplaceSnapshot(fixture());
  assert.equal(snapshot.summary.listedTemplates, undefined);
  assert.equal(snapshot.categories.length, 2);
  assert.ok(snapshot.categories.every((r) => r.listedTemplates === undefined));
});
test('fulfillment-link sales are rolled up per subcategory', () => {
  const input = supplyFixture();
  input.sellers[0].fulfillmentSales = 2;
  const snapshot = buildMarketplaceSnapshot(input);
  assert.equal(row(snapshot, 'Agency').fulfillmentSales30d, 2);
  assert.equal(row(snapshot, 'Events').fulfillmentSales30d, 0);
});
test('90-day sellers add a longer window and leave the 30-day numbers unchanged', () => {
  const input = supplyFixture();
  input.sellers90 = [
    { templateId: 'a'.repeat(24), sales: 9, revenue: 450 },
    { templateId: 'e'.repeat(24), sales: 2, revenue: 100 },
    // Sold in the 90 days, no asset record: counted in the total, in no subcategory.
    { templateId: '9'.repeat(24), sales: 1, revenue: 50 }
  ];
  const snapshot = buildMarketplaceSnapshot(input);
  assert.deepEqual(
    [snapshot.summary.totalSales90d, snapshot.summary.sellingTemplates90d, snapshot.summary.totalRevenue90d],
    [12, 3, 600]
  );
  // Listed supply: a, e and f have asset records; the unplaced 90-day seller counts too.
  assert.equal(snapshot.summary.listedTemplates, 4);
  assert.deepEqual(
    [row(snapshot, 'Agency').templatesWithSales90d, row(snapshot, 'Agency').totalSales90d, row(snapshot, 'Agency').totalRevenue90d],
    [2, 11, 550]
  );
  assert.deepEqual([row(snapshot, 'Portfolio').templatesWithSales90d, row(snapshot, 'Portfolio').totalSales90d], [1, 9]);
  assert.deepEqual([row(snapshot, 'Events').templatesWithSales90d, row(snapshot, 'Events').totalSales90d], [0, 0]);
  assert.deepEqual([snapshot.summary.totalSales, row(snapshot, 'Agency').totalSales30d], [3, 3]);
  assert.deepEqual(snapshotFromFields(snapshotToFields(snapshot)), snapshot);
});
test('rejects a 90-day source that is smaller than the 30-day window it must contain', () => {
  const input = supplyFixture();
  input.sellers90 = [{ templateId: 'a'.repeat(24), sales: 2, revenue: 100 }];
  assert.throws(() => buildMarketplaceSnapshot(input), /90-day sales below 30-day sales/);
  input.sellers90 = [{ templateId: 'e'.repeat(24), sales: 2, revenue: 100 }];
  assert.throws(() => buildMarketplaceSnapshot(input), /90-day sales below 30-day sales/);
  input.sellers90 = [];
  assert.throws(() => buildMarketplaceSnapshot(input), /empty 90-day source/);
});
test('rejects wire snapshots with mixed or impossible supply and 90-day fields', () => {
  const corrupt = (change) => {
    const input = supplyFixture();
    input.sellers90 = [{ templateId: 'a'.repeat(24), sales: 9, revenue: 450 }];
    const fields = snapshotToFields(buildMarketplaceSnapshot(input));
    const summary = JSON.parse(fields.SUMMARY_JSON);
    const categories = JSON.parse(fields.CATEGORIES_JSON);
    change(summary, categories);
    return { ...fields, SUMMARY_JSON: JSON.stringify(summary), CATEGORIES_JSON: JSON.stringify(categories) };
  };
  assert.throws(() => snapshotFromFields(corrupt((s, c) => delete c[0].listedTemplates)), /mixed listed supply/);
  assert.throws(() => snapshotFromFields(corrupt((s, c) => (c[0].listedTemplates = 0))), /selling templates exceed listed/);
  assert.throws(() => snapshotFromFields(corrupt((s) => (s.listedTemplates = 0))), /listed templates below selling/);
  assert.throws(
    () => snapshotFromFields(corrupt((s) => (s.sellingTemplates90d = s.listedTemplates + 1))),
    /listed templates below selling/
  );
  assert.throws(() => snapshotFromFields(corrupt((s, c) => delete c[0].totalSales90d)), /mixed 90-day counts/);
  assert.throws(() => snapshotFromFields(corrupt((s, c) => (c[0].totalSales90d = 1))), /90-day sales below 30-day sales/);
  assert.throws(() => snapshotFromFields(corrupt((s) => delete s.sellingTemplates90d)), /partial 90-day summary/);
  assert.throws(
    () => snapshotFromFields(corrupt((s, c) => Object.assign(c.find((r) => !r.templatesInSubcategory), { listedTemplates: 0 }))),
    /zero category count or rank/
  );
});
test('the 90-day source can carry its own fulfillment-link split, all or nothing', () => {
  const input = supplyFixture();
  input.sellers90 = [
    { templateId: 'a'.repeat(24), sales: 9, revenue: 450, fulfillmentSales: 4 },
    { templateId: 'e'.repeat(24), sales: 2, revenue: 100, fulfillmentSales: 0 }
  ];
  const snapshot = buildMarketplaceSnapshot(input);
  assert.deepEqual([row(snapshot, 'Agency').fulfillmentSales90d, row(snapshot, 'Events').fulfillmentSales90d], [4, 0]);
  assert.deepEqual(snapshotFromFields(snapshotToFields(snapshot)), snapshot);
  delete input.sellers90[1].fulfillmentSales;
  assert.throws(() => buildMarketplaceSnapshot(input), /partial 90-day fulfillment-link counts/);
  input.sellers90[1].fulfillmentSales = 3;
  assert.throws(() => buildMarketplaceSnapshot(input), /fulfillment-link sales exceed sales/);
});

// Fulfillment-link revenue. List price is an upper limit of what the buyer paid
// off-platform, so leaderboard revenue and revenue rank use Marketplace checkout only.
const linkRevenueFixture = () => {
  const input = fixture();
  // A: 3 sales, 2 through links. $150 at list price, $50 through checkout.
  Object.assign(input.sellers[0], { fulfillmentSales: 2, fulfillmentRevenue: 100 });
  // C: 3 sales, all through checkout. $120.
  input.sellers.push({ templateId: 'c'.repeat(24), mrpId: 'd'.repeat(24), name: 'Checkout Only', sales: 3, revenue: 120, fulfillmentSales: 0, fulfillmentRevenue: 0 });
  input.assets.push({ templateId: 'c'.repeat(24), creatorEmail: 'two@example.test', categories: ['Agency'] });
  // E: 1 sale through a link. $400 at list price, $0 through checkout.
  input.sellers.push({ templateId: 'e'.repeat(24), mrpId: 'f'.repeat(24), name: 'Link Only', sales: 1, revenue: 400, fulfillmentSales: 1, fulfillmentRevenue: 400 });
  input.assets.push({ templateId: 'e'.repeat(24), creatorEmail: 'three@example.test', categories: ['Agency'] });
  return input;
};
test('leaderboard revenue rank and tie-break use Marketplace checkout revenue when the source has it', () => {
  const snapshot = buildMarketplaceSnapshot(linkRevenueFixture());
  const rows = snapshot.leaderboard.map((r) => [r.templateName, r.totalSales30d, r.totalRevenue30d, r.checkoutRevenue30d, r.salesRank, r.revenueRank]);
  assert.deepEqual(rows, [
    // Same sales: the template with more checkout revenue is first, though its list-price revenue is lower.
    ['Checkout Only', 3, 120, 120, 1, 1],
    ['Same Name', 3, 150, 50, 1, 2],
    // $400 at list price is the highest revenue, but none of it went through checkout.
    ['Link Only', 1, 400, 0, 3, 3]
  ]);
  // Totals and subcategory rows keep list price for link sales; the summary also carries the checkout part.
  assert.equal(snapshot.summary.totalRevenue, 670);
  assert.equal(snapshot.summary.checkoutRevenue, 170);
  assert.equal(snapshot.summary.totalSales, 7);
  const agency = snapshot.categories.find((row) => row.subcategory === 'Agency');
  assert.equal(agency.totalRevenue30d, 670);
  assert.equal(agency.checkoutRevenue30d, undefined);
  assert.deepEqual(snapshotFromFields(snapshotToFields(snapshot)), snapshot);
});
test('without fulfillment-link revenue the leaderboard keeps list-price ranking and has no checkout fields', () => {
  const input = linkRevenueFixture();
  for (const seller of input.sellers) delete seller.fulfillmentRevenue;
  const snapshot = buildMarketplaceSnapshot(input);
  assert.deepEqual(snapshot.leaderboard.map((r) => [r.templateName, r.revenueRank]), [['Same Name', 2], ['Checkout Only', 3], ['Link Only', 1]]);
  assert.equal(snapshot.leaderboard[0].checkoutRevenue30d, undefined);
  assert.equal(snapshot.summary.checkoutRevenue, undefined);
});
test('rejects fulfillment-link revenue that is partial or disagrees with the sales split', () => {
  const build = (change) => {
    const input = linkRevenueFixture();
    change(input.sellers);
    return () => buildMarketplaceSnapshot(input);
  };
  assert.throws(build((s) => delete s[1].fulfillmentRevenue), /partial fulfillment-link revenue/);
  assert.throws(build((s) => s.forEach((x) => delete x.fulfillmentSales)), /fulfillment-link revenue without counts/);
  assert.throws(build((s) => (s[0].fulfillmentRevenue = 151)), /fulfillment-link revenue exceeds revenue/);
  assert.throws(build((s) => (s[1].fulfillmentRevenue = 10)), /fulfillment-link revenue without fulfillment-link sales/);
  assert.throws(build((s) => (s[2].fulfillmentRevenue = 300)), /checkout revenue without checkout sales/);
  // The same rules hold for a snapshot read back from storage.
  const wire = (change) => {
    const snapshot = buildMarketplaceSnapshot(linkRevenueFixture());
    change(snapshot);
    return () => snapshotFromFields(snapshotToFields(snapshot));
  };
  assert.throws(wire((s) => delete s.leaderboard[1].checkoutRevenue30d), /mixed checkout revenue/);
  assert.throws(wire((s) => delete s.summary.checkoutRevenue), /mixed checkout revenue/);
  assert.throws(wire((s) => (s.leaderboard[1].checkoutRevenue30d = 151)), /checkout revenue exceeds revenue/);
  assert.throws(wire((s) => (s.summary.checkoutRevenue = 671)), /checkout revenue exceeds revenue/);
});
