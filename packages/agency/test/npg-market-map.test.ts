import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARKET_STATES,
  resolveMarketState,
  projectMarketActivity,
  matchCountLabel
} from '../src/lib/npg/market-map';
import type { MarketActivitySummary, MarketLocale } from '../src/lib/npg/market';
const locale = (name: string, more: Partial<MarketLocale> = {}): MarketLocale => ({
  locale: name,
  searches: 1,
  matchingResults: 5,
  unknownResultCounts: 0,
  exportsRequested: 2,
  exportsPrepared: 1,
  latestSearchAt: 10,
  sourceFetchedAt: '2026-01-01',
  incompleteSearches: 0,
  ...more
});
test('local geometry covers 50 states and DC including AK/HI', () => {
  assert.equal(MARKET_STATES.length, 51);
  assert.equal(new Set(MARKET_STATES.map((s) => s.code)).size, 51);
  for (const code of ['AK', 'HI', 'DC', 'TX'])
    assert.match(MARKET_STATES.find((s) => s.code === code)!.path, /^M[\d.,LZM]+$/);
});
test('only recognized states or explicit city/state map', () => {
  for (const v of ['TX', 'texas', ' Austin, TX ', 'Washington, DC', 'O’Fallon, MO'])
    assert.ok(resolveMarketState(v), v);
  for (const v of [
    'Nationwide',
    'Unknown, TX',
    'Within radius, TX',
    'Unknown',
    'PR',
    'Guam',
    'Austin',
    'TX radius 50',
    '50 miles, TX',
    'Austin, ZZ',
    'New York metropolitan area',
    'Portland, OR / Seattle, WA'
  ])
    assert.equal(resolveMarketState(v), null, v);
});
test('additive rollup preserves unmapped rows, dates, partial counts and original input', () => {
  const summary = {
    locales: [
      locale('TX'),
      locale('Austin, TX', {
        unknownResultCounts: 1,
        matchingResults: 0,
        incompleteSearches: 1,
        latestSearchAt: 20,
        sourceFetchedAt: '2026-02-01'
      }),
      locale('Nationwide'),
      locale('PR')
    ]
  } as MarketActivitySummary;
  const before = JSON.stringify(summary);
  const result = projectMarketActivity(summary);
  const tx = result.states.find((s) => s.code === 'TX')!;
  assert.deepEqual(result.mappedTotals, {
    searches: 2,
    matchingResults: 5,
    unknownResultCounts: 1,
    exportsRequested: 4,
    exportsPrepared: 2
  });
  assert.equal(tx.locales.length, 2);
  assert.equal(tx.incompleteSearches, 1);
  assert.equal(tx.latestSearchAt, 20);
  assert.equal(tx.sourceFetchedAt, '2026-02-01');
  assert.deepEqual(
    result.unmapped.map((s) => s.locale),
    ['Nationwide', 'PR']
  );
  assert.equal(result.states.find((s) => s.code === 'CA')!.searches, 0);
  assert.equal(JSON.stringify(summary), before);
});
test('labels distinguish unknown, zero and partially known matches', () => {
  assert.equal(matchCountLabel(locale('TX', { searches: 0 })), 'Matches unknown');
  assert.equal(matchCountLabel(locale('TX', { unknownResultCounts: 1 })), 'Matches unknown');
  assert.equal(matchCountLabel(locale('TX', { matchingResults: 0 })), '0 matches');
  assert.equal(
    matchCountLabel(locale('TX', { searches: 2, unknownResultCounts: 1 })),
    '5 known matches · 1 count unknown'
  );
});
