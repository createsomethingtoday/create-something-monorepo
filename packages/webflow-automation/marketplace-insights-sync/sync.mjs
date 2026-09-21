#!/usr/bin/env node
/**
 * Marketplace Insights sync — Snowflake → Airtable (👛Marketplace Assets).
 *
 * Replaces the legacy worksheet-based warehouse sync that populated:
 *   - "Top Templates by Sales / 30 Days"            (tblcXLVLYobhNmrg6)
 *   - "Template Category/Subcategory Performance"   (tblDU1oUiobNfMQP9)
 *
 * Validated 2026-08-26 against the legacy sync: legacy values were ~1.4–2x true
 * 30-day delivered sales (effective window wider than labeled), rows could
 * freeze across weeks, and revenue was derived (count × price × 0.95 — or 0.80
 * for older frozen rows). This sync computes from ground truth instead.
 *
 * Definitions (the numbers the dashboard label actually claims):
 *   sale      = MARKETPLACE_ORDERS row, RESOURCE_TYPE='Template',
 *               STATUS='delivered' at query time (refunded orders drop out),
 *               CREATED_ON in [as_of − 30d, as_of)
 *   as_of     = most recent Monday 16:00 UTC (keeps the dashboard's weekly
 *               freshness contract), or --as-of <ISO>
 *   revenue   = SUM(PRICE_VALUE) gross list price (measured, no multiplier)
 *   TEMPLATES_IN_SUBCATEGORY = distinct templates with ≥1 sale in the window
 *   taxonomy  = the base's own 🪣Categories → 🪣Category Groups links
 *
 * Dry-run by default; pass --execute to write. Receipt lands in runs/.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSourceCoverage, assertReplacementPlan, parseMaxDeleteFraction } from './plan-guard.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = join(HERE, 'runs');

const BASE_ID = 'appMoIgXMTTTNIc3p';
const TABLES = {
  ASSETS: 'tblRwzpWoLgE9MrUm',
  CATEGORIES: 'tblSygBX7adZ4VNjK',
  LEADERBOARD: 'tblcXLVLYobhNmrg6',
  CATEGORY_PERFORMANCE: 'tblDU1oUiobNfMQP9'
};

// 👛Assets
const F_ASSET_NAME = 'fldUzJBor3Gnkykjc';
const F_ASSET_CREATOR_EMAIL = 'fldHhxmfSNMp117SP'; // 🎨📧 Creator Email (rollup)
const F_ASSET_CATEGORIES_TEXT = 'fldBv3YTf6Bd5HDXN'; // ℹ️🪣Categories (Text) lookup

// 🪣Categories
const F_CAT_NAME = 'fldWQDQuXlqwWxORG';
const F_CAT_GROUP_DISPLAY = 'fldDSMRYPV8KBIeX7'; // 🪣Category Group Display Names lookup

// Top Templates by Sales / 30 Days
const LB = {
  TEMPLATE_NAME: 'fldpoyuACf0AWUZNn',
  CATEGORY: 'fldlnrqSHtXcz8cX3',
  CREATOR_EMAIL: 'fldlnInlxwWIT2h3r',
  TOTAL_SALES_30D: 'fldk5PCuevvbB8uQG',
  TOTAL_REVENUE_30D: 'fldbhCby5W5JWKDP6',
  AVG_REVENUE_PER_SALE: 'fldWpspcOHLYk02Qe',
  SALES_RANK: 'fldO0jQRKiIP0fVHk',
  REVENUE_RANK: 'fldz4K7tG7t8QNsJS',
  SNAPSHOT_AT: 'fldxEWdeV5DWZ6Hyi'
};

// Template Category/Subcategory Performance / 30 days
const CP = {
  ID: 'fld2p5qf0mCZJUHjM',
  CATEGORY: 'fldI1rhVWaVViwxO3',
  SUBCATEGORY: 'fldGMIxFLcmAnSwwf',
  TEMPLATES_IN_SUBCATEGORY: 'fldk1v99hsZ9xbYZx',
  TOTAL_SALES_30D: 'fldY1h9l2bipzysYg',
  TOTAL_REVENUE_30D: 'fldL3byWxlTXix8d4',
  AVG_REVENUE_PER_TEMPLATE: 'fldq7PG9JjhPtggsM',
  REVENUE_RANK: 'fldHqRrno4RtAMF5z',
  SNAPSHOT_AT: 'fld7gUawl9P3lLHC9'
};

const LEADERBOARD_SIZE = 160;
const SNOWFLAKE_USER = process.env.SNOWFLAKE_USER || 'micah@webflow.com';
const SNOWFLAKE_ACCOUNT = process.env.SNOWFLAKE_ACCOUNT || 'wn71398.us-east-1';
const SNOWFLAKE_WAREHOUSE = process.env.SNOWFLAKE_WAREHOUSE || 'SNOWFLAKE_REPORTING';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const asOfArg = args.includes('--as-of') ? args[args.indexOf('--as-of') + 1] : null;

function log(...parts) {
  console.log(new Date().toISOString(), ...parts);
}

function fail(message) {
  console.error(`FATAL: ${message}`);
  process.exit(1);
}

/** Most recent Monday 16:00 UTC at or before now. */
function latestMondayBoundary(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 16, 0, 0));
  const day = d.getUTCDay();
  let back = day === 0 ? 6 : day - 1;
  if (back === 0 && now.getTime() < d.getTime()) back = 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d;
}

function toSqlTs(date) {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function normalizeName(name) {
  return String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Competition ranking (ties share a rank; next rank skips). */
function competitionRanks(rows, metric) {
  const sorted = [...rows].sort((a, b) => metric(b) - metric(a));
  const rank = new Map();
  sorted.forEach((row, index) => {
    const value = metric(row);
    const prev = index > 0 ? metric(sorted[index - 1]) : null;
    rank.set(row, prev !== null && value === prev ? rank.get(sorted[index - 1]) : index + 1);
  });
  return rank;
}

// ---------------------------------------------------------------- Snowflake

function querySnowflake(windowStart, windowEnd) {
  const sql = `
    SELECT
      t.TEMPLATE_NAME AS NAME,
      COUNT(*) AS SALES_30D,
      ROUND(SUM(o.PRICE_VALUE), 2) AS REVENUE_30D,
      COUNT(DISTINCT t.TEMPLATE_ID) AS TEMPLATE_IDS
    FROM ANALYTICS.WEBFLOW.MARKETPLACE_ORDERS o
    JOIN ANALYTICS.WEBFLOW.MARKETPLACE_PRODUCTS p ON o.MARKETPLACE_PRODUCT_ID = p.DOCUMENT_ID
    JOIN ANALYTICS.WEBFLOW.TEMPLATES t ON p.RESOURCE_ID = t.TEMPLATE_ID
    WHERE p.RESOURCE_TYPE = 'Template'
      AND o.STATUS = 'delivered'
      AND o.CREATED_ON >= '${toSqlTs(windowStart)}'
      AND o.CREATED_ON < '${toSqlTs(windowEnd)}'
    GROUP BY 1
  `;

  log(`Querying Snowflake (window ${toSqlTs(windowStart)} → ${toSqlTs(windowEnd)} UTC)...`);
  const result = spawnSync(
    'uvx',
    [
      '--from', 'snowflake-cli', 'snow', 'sql',
      '-q', sql,
      '--temporary-connection',
      '--account', SNOWFLAKE_ACCOUNT,
      '--user', SNOWFLAKE_USER,
      '--authenticator', 'externalbrowser',
      '--database', 'ANALYTICS',
      '--schema', 'WEBFLOW',
      '--warehouse', SNOWFLAKE_WAREHOUSE,
      '--format', 'json'
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000 }
  );

  if (result.status !== 0) {
    fail(`snow sql failed (status ${result.status}): ${result.stderr?.slice(0, 2000)}`);
  }

  // snow may print notices before the JSON payload; parse from the first bracket.
  const stdout = result.stdout ?? '';
  const start = stdout.indexOf('[');
  if (start === -1) fail(`snow sql returned no JSON payload: ${stdout.slice(0, 500)}`);
  const rows = JSON.parse(stdout.slice(start));

  return rows.map((row) => ({
    name: row.NAME,
    sales: Number(row.SALES_30D) || 0,
    revenue: Number(row.REVENUE_30D) || 0,
    templateIds: Number(row.TEMPLATE_IDS) || 1
  }));
}

// ------------------------------------------------------------------ Airtable

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
let lastRequestAt = 0;

async function airtable(method, path, body) {
  // Base-wide limit is 5 rps; stay comfortably under it.
  const wait = lastRequestAt + 250 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${AIRTABLE_KEY}`,
      'Content-Type': 'application/json'
    },
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

async function listAll(tableId, fieldIds) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
    for (const fieldId of fieldIds) params.append('fields[]', fieldId);
    if (offset) params.set('offset', offset);
    const page = await airtable('GET', `${tableId}?${params}`);
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records;
}

async function upsertAll(tableId, mergeFieldId, rows) {
  const results = { created: 0, updated: 0 };
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const response = await airtable('PATCH', tableId, {
      performUpsert: { fieldsToMergeOn: [mergeFieldId] },
      typecast: true,
      records: batch.map((fields) => ({ fields }))
    });
    results.created += response.createdRecords?.length ?? 0;
    results.updated += response.updatedRecords?.length ?? 0;
  }
  return results;
}

async function deleteAll(tableId, recordIds) {
  for (let i = 0; i < recordIds.length; i += 10) {
    const params = new URLSearchParams();
    for (const id of recordIds.slice(i, i + 10)) params.append('records[]', id);
    await airtable('DELETE', `${tableId}?${params}`);
  }
}

// ---------------------------------------------------------------------- Main

async function main() {
  if (!AIRTABLE_KEY) fail('AIRTABLE_API_KEY is not set (see README for provisioning).');

  const maxDeleteFraction = parseMaxDeleteFraction(args);
  const asOf = asOfArg ? new Date(asOfArg) : latestMondayBoundary();
  if (Number.isNaN(asOf.getTime())) fail(`Invalid --as-of value: ${asOfArg}`);
  const windowStart = new Date(asOf.getTime() - 30 * 24 * 60 * 60 * 1000);
  const snapshotAt = asOf.toISOString();

  const sellers = querySnowflake(windowStart, asOf);
  const totalSales = sellers.reduce((sum, s) => sum + s.sales, 0);
  log(`Snowflake: ${sellers.length} templates sold, ${totalSales} delivered orders in window.`);

  log('Fetching taxonomy + assets from Airtable...');
  const categoryRecords = await listAll(TABLES.CATEGORIES, [F_CAT_NAME, F_CAT_GROUP_DISPLAY]);
  const groupByCategory = new Map();
  for (const record of categoryRecords) {
    const name = record.fields[F_CAT_NAME];
    const groups = record.fields[F_CAT_GROUP_DISPLAY];
    if (!name) continue;
    const primary = Array.isArray(groups) ? groups[0] : groups;
    if (typeof primary === 'string' && primary.trim()) {
      groupByCategory.set(name.trim(), primary.trim());
    }
  }

  const assetRecords = await listAll(TABLES.ASSETS, [
    F_ASSET_NAME,
    F_ASSET_CREATOR_EMAIL,
    F_ASSET_CATEGORIES_TEXT
  ]);
  assertSourceCoverage({ sellers, assets: assetRecords, categories: categoryRecords });
  const assetByName = new Map();
  for (const record of assetRecords) {
    const name = record.fields[F_ASSET_NAME];
    if (!name) continue;
    const key = normalizeName(name);
    const categoriesRaw = record.fields[F_ASSET_CATEGORIES_TEXT];
    const categories = (Array.isArray(categoriesRaw) ? categoriesRaw : [categoriesRaw])
      .filter((value) => typeof value === 'string' && value.trim())
      .map((value) => value.trim());
    const emailRaw = record.fields[F_ASSET_CREATOR_EMAIL];
    const email = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw;
    // Prefer the first record seen (published assets predate their delisted twins).
    if (!assetByName.has(key)) {
      assetByName.set(key, { categories, creatorEmail: typeof email === 'string' ? email : '' });
    }
  }
  log(`Airtable: ${groupByCategory.size} categories mapped, ${assetByName.size} named assets.`);

  // Join sellers → assets.
  const unmatchedSellers = [];
  const joined = sellers.map((seller) => {
    const asset = assetByName.get(normalizeName(seller.name));
    if (!asset) unmatchedSellers.push({ name: seller.name, sales: seller.sales });
    return { ...seller, asset };
  });

  // Leaderboard rows.
  const salesRank = competitionRanks(joined, (row) => row.sales);
  const revenueRank = competitionRanks(joined, (row) => row.revenue);
  const leaderboardRows = [...joined]
    .sort((a, b) => b.sales - a.sales || b.revenue - a.revenue)
    .slice(0, LEADERBOARD_SIZE)
    .map((row) => ({
      [LB.TEMPLATE_NAME]: row.name,
      [LB.CATEGORY]: row.asset?.categories?.[0]
        ? groupByCategory.get(row.asset.categories[0]) ?? row.asset.categories[0]
        : 'Other',
      [LB.CREATOR_EMAIL]: row.asset?.creatorEmail ?? '',
      [LB.TOTAL_SALES_30D]: row.sales,
      [LB.TOTAL_REVENUE_30D]: row.revenue,
      [LB.AVG_REVENUE_PER_SALE]: row.sales > 0 ? Math.round((row.revenue / row.sales) * 100) / 100 : 0,
      [LB.SALES_RANK]: salesRank.get(row),
      [LB.REVENUE_RANK]: revenueRank.get(row),
      [LB.SNAPSHOT_AT]: snapshotAt
    }));

  // Category rollups: a selling template contributes to every category it is tagged with.
  const rollups = new Map();
  for (const row of joined) {
    for (const category of row.asset?.categories ?? []) {
      const group = groupByCategory.get(category) ?? 'Other';
      const key = `${group}::${category}`;
      const entry = rollups.get(key) ?? { group, category, templates: 0, sales: 0, revenue: 0 };
      entry.templates += 1;
      entry.sales += row.sales;
      entry.revenue += row.revenue;
      rollups.set(key, entry);
    }
  }
  const rollupRows = [...rollups.values()];
  const categoryRevenueRank = competitionRanks(rollupRows, (row) => row.revenue);
  const categoryRows = rollupRows.map((row) => ({
    [CP.ID]: `${row.group}::${row.category}`,
    [CP.CATEGORY]: row.group,
    [CP.SUBCATEGORY]: row.category,
    [CP.TEMPLATES_IN_SUBCATEGORY]: row.templates,
    [CP.TOTAL_SALES_30D]: row.sales,
    [CP.TOTAL_REVENUE_30D]: Math.round(row.revenue * 100) / 100,
    [CP.AVG_REVENUE_PER_TEMPLATE]: row.templates > 0 ? Math.round((row.revenue / row.templates) * 100) / 100 : 0,
    [CP.REVENUE_RANK]: categoryRevenueRank.get(row),
    [CP.SNAPSHOT_AT]: snapshotAt
  }));

  // Plan deletes: rows whose merge key is not in the new set.
  const existingLeaderboard = await listAll(TABLES.LEADERBOARD, [LB.TEMPLATE_NAME]);
  const keptNames = new Set(leaderboardRows.map((row) => normalizeName(row[LB.TEMPLATE_NAME])));
  const leaderboardDeletes = existingLeaderboard
    .filter((record) => !keptNames.has(normalizeName(record.fields[LB.TEMPLATE_NAME])))
    .map((record) => record.id);

  const existingCategories = await listAll(TABLES.CATEGORY_PERFORMANCE, [CP.ID]);
  const keptIds = new Set(categoryRows.map((row) => row[CP.ID]));
  const categoryDeletes = existingCategories
    .filter((record) => !keptIds.has(record.fields[CP.ID]))
    .map((record) => record.id);

  const receipt = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    ranAt: new Date().toISOString(),
    window: { start: windowStart.toISOString(), end: snapshotAt },
    snowflake: { sellingTemplates: sellers.length, totalDeliveredSales: totalSales },
    leaderboard: {
      rows: leaderboardRows.length,
      deletes: leaderboardDeletes.length,
      top5: leaderboardRows.slice(0, 5).map((row) => ({
        name: row[LB.TEMPLATE_NAME],
        sales: row[LB.TOTAL_SALES_30D],
        revenue: row[LB.TOTAL_REVENUE_30D]
      }))
    },
    categories: {
      rows: categoryRows.length,
      deletes: categoryDeletes.length,
      top5ByRevenue: [...categoryRows]
        .sort((a, b) => a[CP.REVENUE_RANK] - b[CP.REVENUE_RANK])
        .slice(0, 5)
        .map((row) => ({
          key: row[CP.ID],
          sales: row[CP.TOTAL_SALES_30D],
          templates: row[CP.TEMPLATES_IN_SUBCATEGORY]
        }))
    },
    unmatchedSellers: unmatchedSellers.sort((a, b) => b.sales - a.sales).slice(0, 50),
    unmatchedSellerSales: unmatchedSellers.reduce((sum, s) => sum + s.sales, 0)
  };

  if (EXECUTE) {
    // Validate BOTH plans before the first mutation, not between table writes.
    assertReplacementPlan({ label: 'leaderboard', plannedCount: leaderboardRows.length,
      existingCount: existingLeaderboard.length, deleteCount: leaderboardDeletes.length }, maxDeleteFraction);
    assertReplacementPlan({ label: 'categories', plannedCount: categoryRows.length,
      existingCount: existingCategories.length, deleteCount: categoryDeletes.length }, maxDeleteFraction);
    log(`Writing leaderboard (${leaderboardRows.length} upserts, ${leaderboardDeletes.length} deletes)...`);
    receipt.leaderboard.write = await upsertAll(TABLES.LEADERBOARD, LB.TEMPLATE_NAME, leaderboardRows);
    await deleteAll(TABLES.LEADERBOARD, leaderboardDeletes);

    log(`Writing categories (${categoryRows.length} upserts, ${categoryDeletes.length} deletes)...`);
    receipt.categories.write = await upsertAll(TABLES.CATEGORY_PERFORMANCE, CP.ID, categoryRows);
    await deleteAll(TABLES.CATEGORY_PERFORMANCE, categoryDeletes);
  }

  mkdirSync(RUNS_DIR, { recursive: true });
  const stamp = snapshotAt.slice(0, 10);
  const receiptPath = join(RUNS_DIR, `receipt-${stamp}${EXECUTE ? '' : '-dryrun'}.json`);
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));

  log(`${EXECUTE ? 'Sync complete' : 'Dry run complete (no writes)'} — receipt: ${receiptPath}`);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => fail(error.stack ?? String(error)));
