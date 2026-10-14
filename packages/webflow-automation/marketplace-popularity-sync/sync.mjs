#!/usr/bin/env node
/**
 * Template Popularity sync — Snowflake (+ beacon D1) → Airtable 👛Assets.
 *
 * Replaces the Fivetran activation "Template Marketplace Popularity Score"
 * (dataset "Template popularity", daily ~03:03 UTC). Runs the V7 SQL (v7.sql)
 * for the per-template inputs, then scores under the selected model variant
 * (model.mjs) and updates the Assets fields keyed template_id →
 * 👀ℹ️MRP ID (Override). Update-only: rows without a matching asset are
 * reported, never created.
 *
 *   --model v7|v8-beacon|v8-orders|v8   scoring variant (default: MODEL env or v7)
 *   --source snowflake|airtable         where per-template inputs come from
 *                                       (default: SOURCE env or snowflake)
 *   --execute                           write (default is a dry run)
 *
 * --source airtable (v8-beacon only) needs NO Snowflake auth: the Fivetran
 * activation "Template popularity inputs (V8)" runs v8-inputs.sql under
 * Fivetran's own Snowflake connection and writes 🖌️Score ex-views +
 * 🖌️Dead Inventory Multiplier to Assets; this script adds the beacon viewer
 * term and writes 🖌️Popularity Score only.
 *
 * Only 🖌️Popularity Score changes with the variant. 📋 Unique Viewers,
 * 📋 Cumulative Purchases and 📋 Cumulative Revenue stay on their V7 (Stripe /
 * Segment) basis so the creator-facing dashboard numbers do not change
 * meaning underneath the creators.
 *
 * Dry-run prints a parity diff against the values currently in Airtable
 * (Fivetran's latest write while both syncs coexist; our own previous write
 * after cutover). Receipts land in runs/; the raw V7 result set is dumped to
 * runs/v7-rows.json for v8-impact.mjs.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VARIANTS,
  WEIGHTS,
  percentRankMap,
  ORDERS_SQL,
  buildTemplates,
  querySnowflake,
  queryBeacon,
  round2,
  scoreVariant,
  verifyV7Reproduction
} from './model.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = join(HERE, 'runs');

const BASE_ID = 'appMoIgXMTTTNIc3p';
const ASSETS_TABLE = 'tblRwzpWoLgE9MrUm';

// 👛Assets fields
const F = {
  NAME: 'fldUzJBor3Gnkykjc',
  MRP_ID_OVERRIDE: 'fldNI0oPuODQcIZlo', // 👀ℹ️MRP ID (Override) — the sync key
  POPULARITY_SCORE: 'fld2oR4wANrMWcJ7D', // 🖌️Popularity Score
  UNIQUE_VIEWERS: 'fldrwub1DYmbXYUJr', // 📋 Unique Viewers
  CUMULATIVE_PURCHASES: 'fldKGxAN1G7PLotF5', // 📋 Cumulative Purchases
  CUMULATIVE_REVENUE: 'fldn7rI5rHcomAPJZ', // 📋 Cumulative Revenue
  SYNCED_AT: 'fldBnFFFeIQ6p9s2p', // SYNCED_AT
  SCORE_EX_VIEWS: 'fldHQIbjtcpNbFOo6', // 🖌️Score ex-views (Fivetran, v8-inputs.sql)
  DEAD_MULTIPLIER: 'fldmLbajV8QDOmgzb', // 🖌️Dead Inventory Multiplier (Fivetran, v8-inputs.sql)
  CMS_SLUG: 'fldXvOFvxtksUts0w' // 🥞CMS Slug — the marketplace URL slug the beacon keys on
};

// Fivetran-written fields older than this mean its activation did not run.
const MAX_INPUT_AGE_HOURS = 30;
// One Fivetran activation run writes every row within minutes; rows older than
// this relative to the newest SYNCED_AT were not part of the latest run.
const COHORT_WINDOW_HOURS = 6;
// A complete run leaves a handful of rows behind (assets that left the V8 result
// set). More than this means the activation stopped partway: ranking a partial
// cohort would mix scores normalized against different populations.
const MAX_STALE_FRACTION = 0.02;

const EXECUTE = process.argv.includes('--execute');
const modelArg = process.argv.indexOf('--model');
const MODEL = modelArg !== -1 ? process.argv[modelArg + 1] : process.env.MODEL || 'v7';
const sourceArg = process.argv.indexOf('--source');
const SOURCE = sourceArg !== -1 ? process.argv[sourceArg + 1] : process.env.SOURCE || 'snowflake';

function log(...parts) {
  console.log(new Date().toISOString(), ...parts);
}

function fail(message) {
  console.error(`FATAL: ${message}`);
  process.exit(1);
}

// ------------------------------------------------------------------ Airtable

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
let lastRequestAt = 0;

async function airtable(method, path, body) {
  const wait = lastRequestAt + 250 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 31_000));
    return airtable(method, path, body);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable ${method} ${path} → ${response.status}: ${text.slice(0, 500)}`);
  }
  return response.json();
}

async function listAssets() {
  const fields = Object.values(F);
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
    for (const fieldId of fields) params.append('fields[]', fieldId);
    if (offset) params.set('offset', offset);
    const page = await airtable('GET', `${ASSETS_TABLE}?${params}`);
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records;
}

// ------------------------------------------------- Airtable-inputs source

/**
 * v8-beacon from Fivetran-written inputs: score = ex-views + 100·dead·0.10·pr(beacon).
 * Percent rank runs over the assets that carry inputs (= the V8 dataset's
 * population, which is V7's), so it matches model.mjs's v8-beacon scoring.
 */
async function mainFromAirtable() {
  if (MODEL !== 'v8-beacon') fail(`--source airtable supports --model v8-beacon only (got ${MODEL}).`);

  log('Fetching Assets from Airtable...');
  const assets = await listAssets();
  const candidates = [];
  let duplicateKeys = 0;
  const seen = new Set();
  let newestSync = '';
  for (const record of assets) {
    const key = (record.fields[F.MRP_ID_OVERRIDE] ?? '').trim();
    const exViews = record.fields[F.SCORE_EX_VIEWS];
    if (!key || exViews == null) continue;
    if (seen.has(key)) { duplicateKeys += 1; continue; }
    seen.add(key);
    const syncedAt = record.fields[F.SYNCED_AT] ?? '';
    if (syncedAt > newestSync) newestSync = syncedAt;
    candidates.push(record);
  }
  // Only the latest Fivetran write is a valid cohort. Rows the activation did not
  // touch (partial run, asset left the result set) keep old inputs: exclude them
  // from scoring and from the beacon percent-rank population.
  const cohortStart = Date.parse(newestSync) - COHORT_WINDOW_HOURS * 3_600_000;
  const withInputs = candidates.filter((record) => Date.parse(record.fields[F.SYNCED_AT] ?? '') >= cohortStart);
  const staleInputs = candidates.length - withInputs.length;
  log(`Assets: ${assets.length} records, ${candidates.length} with V8 inputs, ${staleInputs} stale (outside the latest sync).`);
  if (staleInputs > candidates.length * MAX_STALE_FRACTION) {
    fail(`${staleInputs}/${candidates.length} assets missed the latest Fivetran write (${newestSync}) — partial activation, refusing to write.`);
  }
  if (withInputs.length < 5000) fail(`Only ${withInputs.length} assets carry 🖌️Score ex-views — Fivetran V8 inputs missing, refusing to write.`);
  const ageHours = newestSync ? (Date.now() - Date.parse(newestSync)) / 3_600_000 : Infinity;
  if (ageHours > MAX_INPUT_AGE_HOURS) fail(`Newest SYNCED_AT is ${newestSync || 'empty'} (${Math.round(ageHours)}h old) — Fivetran V8 activation did not run, refusing to write.`);

  log('Querying beacon sessions from D1...');
  const beacon = new Map(queryBeacon().map((r) => [r.slug, Number(r.sessions) || 0]));
  log(`Beacon slugs: ${beacon.size}.`);

  const slugOfRecord = (record) => (record.fields[F.CMS_SLUG] ?? '').trim() || null;
  const sessions = withInputs.map((record) => beacon.get(slugOfRecord(record)) ?? 0);
  const beaconCoverage = sessions.filter((v) => v > 0).length;
  if (beaconCoverage < withInputs.length * 0.5) {
    fail(`Beacon covered only ${beaconCoverage}/${withInputs.length} assets — source looks broken, refusing to write.`);
  }
  const prBeacon = percentRankMap(sessions);

  const updates = [];
  const parity = { exact: 0, within0_5: 0, larger: 0, maxDelta: 0, largest: [] };
  const deltas = [];
  withInputs.forEach((record, i) => {
    const exViews = Number(record.fields[F.SCORE_EX_VIEWS]) || 0;
    const dead = Number(record.fields[F.DEAD_MULTIPLIER] ?? 1);
    const newScore = round2(exViews + 100 * dead * WEIGHTS.views * prBeacon.get(sessions[i]));
    const currentScore = round2(record.fields[F.POPULARITY_SCORE]);
    const delta = Math.abs(newScore - currentScore);
    if (delta < 0.005) parity.exact += 1;
    else if (delta <= 0.5) parity.within0_5 += 1;
    else parity.larger += 1;
    if (delta > parity.maxDelta) parity.maxDelta = round2(delta);
    if (delta >= 0.005) {
      deltas.push({ name: record.fields[F.NAME], before: currentScore, after: newScore, delta: round2(delta) });
      updates.push({ id: record.id, fields: { [F.POPULARITY_SCORE]: newScore } });
    }
  });
  deltas.sort((a, b) => b.delta - a.delta);
  parity.largest = deltas.slice(0, 15);

  const receipt = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    model: MODEL,
    source: 'airtable',
    ranAt: new Date().toISOString(),
    assetsWithInputs: withInputs.length,
    duplicateMrpIds: duplicateKeys,
    staleInputsSkipped: staleInputs,
    inputsNewestSyncedAt: newestSync,
    beaconSlugs: beacon.size,
    beaconCoverage,
    parityVsAirtable: parity,
    plannedWrites: updates.length
  };
  await writeAndReceipt(updates, receipt);
}

async function writeAndReceipt(updates, receipt) {
  if (EXECUTE) {
    log(`Writing ${updates.length} changed assets...`);
    let written = 0;
    for (let i = 0; i < updates.length; i += 10) {
      const batch = updates.slice(i, i + 10);
      await airtable('PATCH', ASSETS_TABLE, { typecast: true, records: batch });
      written += batch.length;
      if (written % 1000 === 0) log(`  ...${written}/${updates.length}`);
    }
    receipt.written = written;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const receiptPath = join(RUNS_DIR, `receipt-${stamp}${EXECUTE ? '' : '-dryrun'}.json`);
  mkdirSync(RUNS_DIR, { recursive: true });
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  log(`${EXECUTE ? 'Sync complete' : 'Dry run complete (no writes)'} — receipt: ${receiptPath}`);
  console.log(JSON.stringify(receipt, null, 2));
}

// ---------------------------------------------------------------------- Main

async function main() {
  if (!AIRTABLE_KEY) fail('AIRTABLE_API_KEY is not set (see README).');
  if (SOURCE === 'airtable') return mainFromAirtable();
  if (SOURCE !== 'snowflake') fail(`Unknown --source "${SOURCE}" (known: snowflake, airtable)`);
  const variant = VARIANTS[MODEL];
  if (!variant) fail(`Unknown --model "${MODEL}" (known: ${Object.keys(VARIANTS).join(', ')})`);

  log(`Model: ${MODEL} (demand=${variant.demand}, views=${variant.views})`);
  log('Running Template Popularity V7 in Snowflake...');
  const rows = querySnowflake({ file: join(HERE, 'v7.sql') });
  log(`V7 returned ${rows.length} templates.`);
  mkdirSync(RUNS_DIR, { recursive: true });
  writeFileSync(join(RUNS_DIR, 'v7-rows.json'), JSON.stringify(rows));

  let orderRows = [];
  if (variant.demand === 'orders') {
    log('Querying delivered-orders purchase metrics from Snowflake...');
    orderRows = querySnowflake({ sql: ORDERS_SQL }, { timeout: 600_000 });
    log(`Orders metrics for ${orderRows.length} templates.`);
  }
  let beaconRows = [];
  if (variant.views === 'beacon') {
    log('Querying beacon sessions from D1...');
    beaconRows = queryBeacon();
    log(`Beacon slugs: ${beaconRows.length}.`);
  }

  const templates = buildTemplates(rows, orderRows, beaconRows);
  // The JS scorer must reproduce v7.sql before any variant score is written.
  const repro = verifyV7Reproduction(templates);
  if (!repro.ok) fail(`JS scoring does not reproduce V7 (max delta ${repro.maxScoreDelta}) — refusing to write.`);
  const scores = scoreVariant(templates, MODEL);
  const beaconCoverage = templates.filter((t) => t.beaconSessions > 0).length;
  if (variant.views === 'beacon' && beaconCoverage < templates.length * 0.5) {
    fail(`Beacon covered only ${beaconCoverage}/${templates.length} templates — source looks broken, refusing to write.`);
  }

  log('Fetching Assets from Airtable...');
  const assets = await listAssets();
  const assetByMrpId = new Map();
  const duplicateKeys = new Set();
  for (const record of assets) {
    const key = (record.fields[F.MRP_ID_OVERRIDE] ?? '').trim();
    if (!key) continue;
    if (assetByMrpId.has(key)) duplicateKeys.add(key);
    else assetByMrpId.set(key, record);
  }
  log(`Assets: ${assets.length} records, ${assetByMrpId.size} with MRP ID (Override).`);

  // Join + parity diff against current Airtable values.
  const updates = [];
  const unmatchedTemplates = [];
  const parity = { exact: 0, within0_5: 0, larger: 0, maxDelta: 0, largest: [] };
  const deltas = [];

  for (const row of rows) {
    const asset = assetByMrpId.get(String(row.TEMPLATE_ID).trim());
    const newScore = scores.get(row.TEMPLATE_ID);
    if (!asset) {
      if (newScore > 0) unmatchedTemplates.push({ name: row.TEMPLATE_NAME, score: newScore });
      continue;
    }

    const current = asset.fields;
    const currentScore = round2(current[F.POPULARITY_SCORE]);
    const delta = Math.abs(newScore - currentScore);
    if (delta < 0.005) parity.exact += 1;
    else if (delta <= 0.5) parity.within0_5 += 1;
    else parity.larger += 1;
    if (delta > parity.maxDelta) parity.maxDelta = round2(delta);
    if (delta >= 0.005) {
      deltas.push({ name: row.TEMPLATE_NAME, before: currentScore, after: newScore, delta: round2(delta) });
    }

    const desired = {
      [F.POPULARITY_SCORE]: newScore,
      [F.UNIQUE_VIEWERS]: Number(row.UNIQUE_VIEWERS) || 0,
      [F.CUMULATIVE_PURCHASES]: Number(row.CUMULATIVE_PURCHASES) || 0,
      [F.CUMULATIVE_REVENUE]: round2(row.CUMULATIVE_REVENUE)
    };
    const changed =
      desired[F.POPULARITY_SCORE] !== currentScore ||
      desired[F.UNIQUE_VIEWERS] !== (Number(current[F.UNIQUE_VIEWERS]) || 0) ||
      desired[F.CUMULATIVE_PURCHASES] !== (Number(current[F.CUMULATIVE_PURCHASES]) || 0) ||
      desired[F.CUMULATIVE_REVENUE] !== round2(current[F.CUMULATIVE_REVENUE]);

    if (changed) {
      updates.push({ id: asset.id, fields: { ...desired, [F.SYNCED_AT]: row.SYNCED_AT } });
    }
  }

  deltas.sort((a, b) => b.delta - a.delta);
  parity.largest = deltas.slice(0, 15);

  const receipt = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    model: MODEL,
    ranAt: new Date().toISOString(),
    v7Rows: rows.length,
    v7ReproductionCheck: repro,
    ordersRows: orderRows.length,
    beaconSlugs: beaconRows.length,
    beaconCoverage,
    assetsWithKey: assetByMrpId.size,
    duplicateMrpIds: duplicateKeys.size,
    matched: rows.length - unmatchedTemplates.length,
    unmatchedWithScore: unmatchedTemplates.length,
    topUnmatched: unmatchedTemplates.sort((a, b) => b.score - a.score).slice(0, 20),
    parityVsAirtable: parity,
    plannedWrites: updates.length
  };

  await writeAndReceipt(updates, receipt);
}

main().catch((error) => fail(error.stack ?? String(error)));
