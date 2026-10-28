#!/usr/bin/env node
/**
 * V8 impact analysis — what changes if Template Popularity fixes its two
 * broken sources, holding the V7 formula and weights constant:
 *
 *   A. Purchases from delivered MARKETPLACE_ORDERS instead of
 *      report__template_sales (which is missing pre-2026-08-13 fulfillment-link
 *      sales — ~12% of the current 90d window, biased against
 *      fulfillment-heavy templates).
 *   B. Viewer signal from the owned views beacon (webflow-template-views D1,
 *      trailing 28d sessions) instead of the Segment event table that died
 *      2026-07-21.
 *
 * Inputs: runs/v7-rows.json (dumped by sync.mjs), Snowflake, beacon D1.
 * Output: runs/v8-impact.json + console summary. Read-only; writes nothing
 * to Airtable — this is the review artifact for the V8 decision.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BEACON_WINDOW_DAYS,
  ORDERS_SQL,
  buildTemplates,
  querySnowflake,
  queryBeacon,
  scoreVariant,
  verifyV7Reproduction
} from './model.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = join(HERE, 'runs');

function fail(message) {
  console.error(`FATAL: ${message}`);
  process.exit(1);
}

// Ties follow the production Popular sort (webflow-template-search search.ts):
// 📋 Cumulative Purchases (V7 basis for every variant), viewers, newest, ID.
// Approximation: production breaks the last ties on Airtable published_date and
// record ID; this uses Snowflake created date and template ID. Advisory only.
function rankBy(rows, scoreKey) {
  const sorted = [...rows].sort(
    (a, b) =>
      b[scoreKey] - a[scoreKey] ||
      b.reportCumulative - a.reportCumulative ||
      b.uniqueViewers - a.uniqueViewers ||
      String(b.createdDate ?? '').localeCompare(String(a.createdDate ?? '')) ||
      String(a.templateId).localeCompare(String(b.templateId))
  );
  const ranks = new Map();
  sorted.forEach((row, i) => ranks.set(row.templateId, i + 1));
  return ranks;
}

// ------------------------------------------------------------------- Inputs

const v7Rows = JSON.parse(readFileSync(join(RUNS_DIR, 'v7-rows.json'), 'utf8'));
console.log(`V7 rows: ${v7Rows.length}`);

const ORDERS_CACHE = join(RUNS_DIR, 'orders-rows.json');
const useCache = process.argv.includes('--cached') && existsSync(ORDERS_CACHE);
console.log(useCache ? 'Loading cached delivered-orders metrics...' : 'Querying delivered-orders purchase metrics from Snowflake...');
let orderRows;
try {
  orderRows = useCache ? JSON.parse(readFileSync(ORDERS_CACHE, 'utf8')) : querySnowflake({ sql: ORDERS_SQL }, { timeout: 600_000 });
} catch (error) {
  fail(error.message);
}
if (!useCache) writeFileSync(ORDERS_CACHE, JSON.stringify(orderRows));
console.log(`Orders metrics for ${orderRows.length} templates.`);

console.log(`Querying beacon sessions (trailing ${BEACON_WINDOW_DAYS}d) from D1...`);
let beaconRows;
try {
  beaconRows = queryBeacon();
} catch (error) {
  fail(error.message);
}
console.log(`Beacon slugs: ${beaconRows.length}`);

// -------------------------------------------------------------------- Model

const templates = buildTemplates(v7Rows, orderRows, beaconRows);
const scoreMaps = {
  v7Recomputed: scoreVariant(templates, 'v7'),
  v8aScore: scoreVariant(templates, 'v8-orders'), // orders swap only
  v8bScore: scoreVariant(templates, 'v8-beacon'), // beacon swap only
  v8Score: scoreVariant(templates, 'v8') // both
};
for (const t of templates) {
  for (const [key, map] of Object.entries(scoreMaps)) t[key] = map.get(t.templateId);
}

// Verify our scoring reproduces the SQL (guards the whole analysis).
const repro = verifyV7Reproduction(templates);
if (!repro.ok) fail(`JS scoring does not reproduce v7.sql (max delta ${repro.maxScoreDelta}) — refusing to write an impact report from an invalid baseline.`);
const reproOk = repro.ok;
const reproMax = repro.maxScoreDelta;
const prBeacon = (() => {
  // beacon percent-rank for the spotlight rows only
  const sorted = templates.map((t) => t.beaconSessions).sort((a, b) => a - b);
  return { get: (v) => (sorted.length > 1 ? sorted.indexOf(v) / (sorted.length - 1) : 0) };
})();

const v7Ranks = rankBy(templates, 'v7Score');
const v8Ranks = rankBy(templates, 'v8Score');
const v8aRanks = rankBy(templates, 'v8aScore');
const v8bRanks = rankBy(templates, 'v8bScore');

for (const t of templates) {
  t.v7Rank = v7Ranks.get(t.templateId);
  t.v8Rank = v8Ranks.get(t.templateId);
  t.rankChange = t.v7Rank - t.v8Rank; // positive = moves up
  t.rankChangeOrdersOnly = t.v7Rank - v8aRanks.get(t.templateId);
  t.rankChangeBeaconOnly = t.v7Rank - v8bRanks.get(t.templateId);
}

// ------------------------------------------------------------------ Summary

const absChanges = templates.map((t) => Math.abs(t.rankChange)).sort((a, b) => a - b);
const quantile = (q) => absChanges[Math.min(absChanges.length - 1, Math.floor(q * absChanges.length))];

const v7Top100 = new Set([...templates].sort((a, b) => a.v7Rank - b.v7Rank).slice(0, 100).map((t) => t.templateId));
const v8Top100 = new Set([...templates].sort((a, b) => a.v8Rank - b.v8Rank).slice(0, 100).map((t) => t.templateId));
const enteringTop100 = templates.filter((t) => v8Top100.has(t.templateId) && !v7Top100.has(t.templateId));
const leavingTop100 = templates.filter((t) => v7Top100.has(t.templateId) && !v8Top100.has(t.templateId));

const publicRow = (t) => ({
  name: t.name,
  v7Rank: t.v7Rank,
  v8Rank: t.v8Rank,
  rankChange: t.rankChange,
  v7Score: t.v7Score,
  v8Score: t.v8Score,
  ordersP90: t.ordersP90,
  reportP90: t.reportP90,
  beaconSessions28d: t.beaconSessions,
  driver:
    Math.abs(t.rankChangeOrdersOnly) >= Math.abs(t.rankChangeBeaconOnly) * 2 ? 'orders-fix'
    : Math.abs(t.rankChangeBeaconOnly) >= Math.abs(t.rankChangeOrdersOnly) * 2 ? 'beacon-views'
    : 'both'
});

function summarize(ranks) {
  const changes = templates.map((t) => Math.abs(t.v7Rank - ranks.get(t.templateId))).sort((a, b) => a - b);
  const q = (p) => changes[Math.min(changes.length - 1, Math.floor(p * changes.length))];
  const top100 = new Set([...templates].sort((a, b) => ranks.get(a.templateId) - ranks.get(b.templateId)).slice(0, 100).map((t) => t.templateId));
  const top1000 = new Set([...templates].sort((a, b) => ranks.get(a.templateId) - ranks.get(b.templateId)).slice(0, 1000).map((t) => t.templateId));
  const v7Top1000 = new Set([...templates].sort((a, b) => a.v7Rank - b.v7Rank).slice(0, 1000).map((t) => t.templateId));
  return {
    median: q(0.5), p90: q(0.9), p99: q(0.99),
    over100: changes.filter((c) => c > 100).length,
    top100Entering: [...top100].filter((id) => !v7Top100.has(id)).length,
    top1000Entering: [...top1000].filter((id) => !v7Top1000.has(id)).length
  };
}
const variants = {
  ordersOnly: summarize(v8aRanks),
  beaconOnly: summarize(v8bRanks),
  both: summarize(v8Ranks)
};
const SPOTLIGHT = (process.env.SPOTLIGHT || 'Fleety,Xodex').split(',');
const spotlight = templates.filter((t) => SPOTLIGHT.includes(t.name)).map((t) => ({
  name: t.name, v7Score: t.v7Score, ordersOnly: t.v8aScore, beaconOnly: t.v8bScore, both: t.v8Score,
  v7Rank: t.v7Rank, ordersOnlyRank: v8aRanks.get(t.templateId), beaconOnlyRank: v8bRanks.get(t.templateId), bothRank: t.v8Rank,
  reportP90: t.reportP90, ordersP90: t.ordersP90, viewersV7_90d: t.uniqueViewers, viewerScoreV7: Math.round(t.viewerScoreV7 * 1000) / 1000,
  beaconSessions28d: t.beaconSessions, beaconScore: Math.round(prBeacon.get(t.beaconSessions) * 1000) / 1000
}));

const movers = [...templates].sort((a, b) => b.rankChange - a.rankChange);
const impact = {
  ranAt: new Date().toISOString(),
  population: templates.length,
  beaconWindowDays: BEACON_WINDOW_DAYS,
  v7ReproductionCheck: { ok: reproOk, maxScoreDelta: Math.round(reproMax * 100) / 100 },
  variants,
  spotlight,
  rankChange: {
    median: quantile(0.5),
    p90: quantile(0.9),
    p99: quantile(0.99),
    over100: templates.filter((t) => Math.abs(t.rankChange) > 100).length,
    over500: templates.filter((t) => Math.abs(t.rankChange) > 500).length
  },
  top100Churn: {
    entering: enteringTop100.map(publicRow).sort((a, b) => a.v8Rank - b.v8Rank),
    leaving: leavingTop100.map(publicRow).sort((a, b) => a.v7Rank - b.v7Rank)
  },
  topMoversUp: movers.slice(0, 20).map(publicRow),
  topMoversDown: movers.slice(-20).reverse().map(publicRow),
  newTop25: [...templates].sort((a, b) => a.v8Rank - b.v8Rank).slice(0, 25).map(publicRow),
  histogram: [
    ['0', templates.filter((t) => t.rankChange === 0).length],
    ['1-10', templates.filter((t) => Math.abs(t.rankChange) >= 1 && Math.abs(t.rankChange) <= 10).length],
    ['11-50', templates.filter((t) => Math.abs(t.rankChange) >= 11 && Math.abs(t.rankChange) <= 50).length],
    ['51-100', templates.filter((t) => Math.abs(t.rankChange) >= 51 && Math.abs(t.rankChange) <= 100).length],
    ['101-500', templates.filter((t) => Math.abs(t.rankChange) >= 101 && Math.abs(t.rankChange) <= 500).length],
    ['500+', templates.filter((t) => Math.abs(t.rankChange) > 500).length]
  ]
};

writeFileSync(join(RUNS_DIR, 'v8-impact.json'), JSON.stringify(impact, null, 2));
writeFileSync(
  join(RUNS_DIR, 'v8-impact-full.json'),
  JSON.stringify(templates.map(publicRow), null, 1)
);

console.log(JSON.stringify({ ...impact, top100Churn: { entering: impact.top100Churn.entering.length, leaving: impact.top100Churn.leaving.length }, topMoversUp: impact.topMoversUp.slice(0, 5), topMoversDown: impact.topMoversDown.slice(0, 5), newTop25: undefined, histogram: impact.histogram }, null, 2));
console.log('Saved runs/v8-impact.json and runs/v8-impact-full.json');
