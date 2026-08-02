import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeSearchConsolePeriods,
  buildGscCompareToolDefinition,
  parseSearchComparisonArgs,
  type SearchAnalyticsExecutor
} from '../gsc-analysis.js';

const baseInput = {
  siteUrl: 'sc-domain:createsomething.com',
  current: { startDate: '2026-07-01', endDate: '2026-07-31' },
  previous: { startDate: '2026-06-01', endDate: '2026-06-30' },
  dimensions: ['query', 'page'],
  searchType: 'web',
  aggregationType: 'auto',
  rowLimit: 2,
  maxRows: 10,
  minImpressions: 100,
  minPosition: 8,
  maxPosition: 15,
  opportunityLimit: 10
};

test('publishes and parses the bounded comparison tool contract', () => {
  const definition = buildGscCompareToolDefinition();
  assert.equal(definition.name, 'google_search_console_compare_periods');
  assert.deepEqual(definition.inputSchema.required, [
    'site_url',
    'current_start_date',
    'current_end_date',
    'previous_start_date',
    'previous_end_date'
  ]);

  const parsed = parseSearchComparisonArgs({
    site_url: 'sc-domain:createsomething.com',
    current_start_date: '2026-07-01',
    current_end_date: '2026-07-31',
    previous_start_date: '2026-06-01',
    previous_end_date: '2026-06-30'
  });

  assert.deepEqual(parsed.dimensions, ['query', 'page']);
  assert.equal(parsed.rowLimit, 5000);
  assert.equal(parsed.maxRows, 25000);
  assert.equal(parsed.minImpressions, 100);
  assert.equal(parsed.minPosition, 8);
  assert.equal(parsed.maxPosition, 15);
});

test('compares paginated periods and ranks transparent SEO/AEO opportunities deterministically', async () => {
  const pages = new Map<string, Record<string, unknown>>([
    [
      '2026-07-01:0',
      {
        successful: true,
        data: {
          rows: [
            {
              keys: ['webflow agency', 'https://createsomething.com/'],
              clicks: 20,
              impressions: 1000,
              ctr: 0.02,
              position: 9
            },
            {
              keys: ['how to use webflow', 'https://createsomething.com/guides/webflow'],
              clicks: 10,
              impressions: 1000,
              ctr: 0.01,
              position: 9
            }
          ]
        }
      }
    ],
    [
      '2026-07-01:2',
      {
        successful: true,
        data: {
          rows: [
            {
              keys: ['create something', 'https://createsomething.com/'],
              clicks: 80,
              impressions: 400,
              ctr: 0.2,
              position: 3
            }
          ]
        }
      }
    ],
    [
      '2026-06-01:0',
      {
        successful: true,
        data: {
          rows: [
            {
              keys: ['webflow agency', 'https://createsomething.com/'],
              clicks: 12,
              impressions: 800,
              ctr: 0.015,
              position: 11
            },
            {
              keys: ['how to use webflow', 'https://createsomething.com/guides/webflow'],
              clicks: 5,
              impressions: 500,
              ctr: 0.01,
              position: 12
            }
          ]
        }
      }
    ],
    ['2026-06-01:2', { successful: true, data: { rows: [] } }]
  ]);
  const calls: Record<string, unknown>[] = [];
  const execute: SearchAnalyticsExecutor = async (args) => {
    calls.push(args);
    return (
      pages.get(`${args.start_date}:${args.start_row}`) ?? { successful: true, data: { rows: [] } }
    );
  };

  const receipt = await analyzeSearchConsolePeriods(baseInput, execute);

  assert.equal(calls.length, 4);
  assert.deepEqual(receipt.current.totals, {
    clicks: 110,
    impressions: 2400,
    ctr: 0.045833,
    position: 8,
    rowCount: 3
  });
  assert.deepEqual(receipt.previous.totals, {
    clicks: 17,
    impressions: 1300,
    ctr: 0.013077,
    position: 11.384615,
    rowCount: 2
  });
  assert.equal(receipt.delta.clicks.absolute, 93);
  assert.equal(receipt.delta.clicks.percent, 547.058824);
  assert.equal(receipt.current.pagination.pagesFetched, 2);
  assert.equal(receipt.current.pagination.truncated, false);
  assert.deepEqual(
    receipt.opportunities.map((opportunity) => opportunity.dimensions.query),
    ['how to use webflow', 'webflow agency']
  );
  assert.equal(receipt.opportunities[0]?.score, 7000);
  assert.deepEqual(receipt.opportunities[0]?.intentSignals, {
    answerSeeking: true,
    matchedPrefix: 'how'
  });
  assert.equal(receipt.opportunities[1]?.intentSignals.answerSeeking, false);
  assert.equal(receipt.provenance.sourceToolSlug, 'GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY');
  assert.equal(
    receipt.methodology.opportunityScoreFormula,
    'current.impressions * (maxPosition - current.position + 1)'
  );
});

test('returns a valid zero-result receipt for empty Search Analytics rows', async () => {
  const receipt = await analyzeSearchConsolePeriods(baseInput, async () => ({
    successful: true,
    data: { rows: [] }
  }));

  assert.equal(receipt.current.totals.rowCount, 0);
  assert.equal(receipt.previous.totals.rowCount, 0);
  assert.deepEqual(receipt.opportunities, []);
  assert.equal(receipt.zeroResult, true);
});

test('fails the receipt when an upstream Search Analytics query fails', async () => {
  await assert.rejects(
    () =>
      analyzeSearchConsolePeriods(baseInput, async () => ({
        successful: false,
        error: 'Search Console unavailable'
      })),
    /Search Console unavailable/
  );
});
