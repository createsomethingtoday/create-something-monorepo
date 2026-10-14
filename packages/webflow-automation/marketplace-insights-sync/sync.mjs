#!/usr/bin/env node
/** Weekly complete snapshots. Dry-run by default; no legacy-table writes. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildMarketplaceSnapshot,
  snapshotToFields,
  snapshotFromFields
} from '../../webflow-dashboard-core/src/marketplace-snapshot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE_ID = 'appMoIgXMTTTNIc3p';
const SNOWFLAKE_USER = process.env.SNOWFLAKE_USER || 'micah@webflow.com';
const SNOWFLAKE_ACCOUNT = process.env.SNOWFLAKE_ACCOUNT || 'wn71398.us-east-1';
const SNOWFLAKE_WAREHOUSE = process.env.SNOWFLAKE_WAREHOUSE || 'SNOWFLAKE_REPORTING';
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
const snapshotTable = process.env.MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID;
// Seller rows come from Snowflake directly (needs a live Okta session) or from
// the Fivetran activation "Marketplace Insights sellers (30d)", which writes the
// same query's output to an Airtable table (no Snowflake credential needed here).
const SOURCES = ['snowflake', 'airtable'];
let source = process.env.MARKETPLACE_INSIGHTS_SOURCE || 'snowflake';
const SELLERS_TABLE = 'tblkyKZ5nGOcEqb5r';
const SELLER_FIELDS = {
  TEMPLATE_ID: 'fldgZHXYZqlX2HSag',
  MRP_ID: 'fldA9ZA24286DtNyZ',
  TEMPLATE_NAME: 'fldgO5x1KhpKkL0QP',
  SALES_30D: 'fldXU6c3ERnqBbvSp',
  REVENUE_30D: 'fldxVd61LWea9SlEF',
  SNAPSHOT_AT: 'fldLJlqsFaukWP4Jq',
  WINDOW_SELLERS: 'fldkJiQBUdfWUMP7Q',
  WINDOW_SALES: 'fld31oTda0kji5IDi'
};
const log = (...parts) => console.log(new Date().toISOString(), ...parts);
const fail = (message) => {
  throw new Error(message);
};
function latestMondayBoundary(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 16));
  let back = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;
  if (back === 0 && now < d) back = 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d;
}
const toSqlTs = (date) => date.toISOString().replace('T', ' ').slice(0, 19);
function parseMetric(value) {
  if (
    value === null ||
    value === undefined ||
    (typeof value !== 'number' && typeof value !== 'string') ||
    String(value).trim() === ''
  )
    fail('Missing warehouse metric');
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) fail('Invalid warehouse metric');
  return parsed;
}
function querySnowflake(windowStart, windowEnd) {
  const sql = `
    SELECT
      t.TEMPLATE_ID AS TEMPLATE_ID,
      p.DOCUMENT_ID AS MRP_ID,
      t.TEMPLATE_NAME AS NAME,
      COUNT(*) AS SALES_30D,
      ROUND(SUM(o.PRICE_VALUE), 2) AS REVENUE_30D
    FROM ANALYTICS.WEBFLOW.MARKETPLACE_ORDERS o
    JOIN ANALYTICS.WEBFLOW.MARKETPLACE_PRODUCTS p ON o.MARKETPLACE_PRODUCT_ID = p.DOCUMENT_ID
    JOIN ANALYTICS.WEBFLOW.TEMPLATES t ON p.RESOURCE_ID = t.TEMPLATE_ID
    WHERE p.RESOURCE_TYPE = 'Template'
      AND o.STATUS = 'delivered'
      AND o.CREATED_ON >= '${toSqlTs(windowStart)}'
      AND o.CREATED_ON < '${toSqlTs(windowEnd)}'
    GROUP BY 1, 2, 3
  `;

  log(`Querying Snowflake (window ${toSqlTs(windowStart)} → ${toSqlTs(windowEnd)} UTC)...`);
  const result = spawnSync(
    'uvx',
    [
      '--from',
      'snowflake-cli',
      'snow',
      'sql',
      '-q',
      sql,
      '--temporary-connection',
      '--account',
      SNOWFLAKE_ACCOUNT,
      '--user',
      SNOWFLAKE_USER,
      '--authenticator',
      'externalbrowser',
      '--database',
      'ANALYTICS',
      '--schema',
      'WEBFLOW',
      '--warehouse',
      SNOWFLAKE_WAREHOUSE,
      '--format',
      'json'
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
    templateId: row.TEMPLATE_ID,
    mrpId: row.MRP_ID,
    name: row.NAME,
    sales: parseMetric(row.SALES_30D),
    revenue: parseMetric(row.REVENUE_30D)
  }));
}

let lastRequestAt = 0;
async function airtable(method, path, body, attempt = 0) {
  const wait = lastRequestAt + 250 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
  const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000)
  });
  if (response.status === 429 && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 31_000));
    return airtable(method, path, body, attempt + 1);
  }
  if (!response.ok) fail(`Airtable ${method} failed (${response.status})`);
  return response.json();
}
async function listAll(table, fields) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
    for (const field of fields) params.append('fields[]', field);
    if (offset) params.set('offset', offset);
    const page = await airtable('GET', `${table}?${params}`);
    if (!Array.isArray(page.records)) fail('Malformed Airtable source');
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records;
}
// The activation upserts on TEMPLATE_ID and never deletes, so the table holds
// every week's sellers. Use only the requested window, and prove the set is
// complete: every row carries the window totals computed in the same query.
async function readSellersFromAirtable(windowEnd) {
  const want = windowEnd.toISOString();
  const F = SELLER_FIELDS;
  const records = await listAll(SELLERS_TABLE, Object.values(F));
  const stamps = [...new Set(records.map((r) => r.fields[F.SNAPSHOT_AT]).filter(Boolean))].sort();
  const rows = records.filter((r) => r.fields[F.SNAPSHOT_AT] === want);
  if (!rows.length)
    fail(`Fivetran sellers activation has no rows for window ${want} (newest: ${stamps.at(-1) ?? 'none'})`);
  const totals = new Set(rows.map((r) => `${r.fields[F.WINDOW_SELLERS]}/${r.fields[F.WINDOW_SALES]}`));
  if (totals.size !== 1) fail(`Fivetran sellers rows disagree on window totals for ${want}`);
  const sellers = rows.map((r) => ({
    templateId: r.fields[F.TEMPLATE_ID],
    mrpId: r.fields[F.MRP_ID],
    name: r.fields[F.TEMPLATE_NAME],
    sales: parseMetric(r.fields[F.SALES_30D]),
    revenue: parseMetric(r.fields[F.REVENUE_30D])
  }));
  const expectedSellers = parseMetric(rows[0].fields[F.WINDOW_SELLERS]);
  const expectedSales = parseMetric(rows[0].fields[F.WINDOW_SALES]);
  const sales = sellers.reduce((sum, row) => sum + row.sales, 0);
  if (sellers.length !== expectedSellers || sales !== expectedSales)
    fail(
      `Fivetran sellers rows are incomplete for ${want}: ${sellers.length}/${expectedSellers} sellers, ${sales}/${expectedSales} sales`
    );
  log(`Read ${sellers.length} sellers from Airtable (window ending ${want}).`);
  return sellers;
}
const values = (raw) =>
  (Array.isArray(raw) ? raw : [raw])
    .filter((x) => typeof x === 'string' && x.trim())
    .map((x) => x.trim());
async function main() {
  if (!AIRTABLE_KEY) fail('AIRTABLE_API_KEY is not set');
  let asOf = latestMondayBoundary();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--execute') continue;
    if (args[i] === '--source' && args[i + 1] && !args[i + 1].startsWith('--')) {
      source = args[++i];
      continue;
    }
    if (args[i] === '--as-of' && args[i + 1] && !args[i + 1].startsWith('--'))
      asOf = new Date(args[++i]);
    else fail(`Unknown or incomplete argument: ${args[i]}`);
  }
  if (!Number.isFinite(asOf.getTime())) fail('Invalid --as-of timestamp');
  if (!SOURCES.includes(source)) fail(`Unknown source "${source}" (known: ${SOURCES.join(', ')})`);
  if (EXECUTE && !/^tbl[a-zA-Z0-9]{14}$/.test(snapshotTable ?? ''))
    fail('Set the approved MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID before executing');
  const sellers =
    source === 'airtable'
      ? await readSellersFromAirtable(asOf)
      : querySnowflake(new Date(asOf.getTime() - 30 * 86400000), asOf);
  const categoryRecords = await listAll('tblSygBX7adZ4VNjK', [
    'fldWQDQuXlqwWxORG',
    'fldDSMRYPV8KBIeX7'
  ]);
  const assetRecords = await listAll('tblRwzpWoLgE9MrUm', [
    'fldFeWROxzwzCo84b',
    'fldHhxmfSNMp117SP',
    'fldBv3YTf6Bd5HDXN',
    'fldmfcD7pebc82EuN',
    'fldGDWo2VfnTbSUiL'
  ]);
  const publishedAssets = assetRecords.filter((r) =>
    values(r.fields.fldmfcD7pebc82EuN).includes('recA2YsPEHSuAHOLD')
  );

  // Taxonomy tolerance. The category table is edited by hand; three shapes
  // appear in practice and none should stop the weekly snapshot:
  //  - a subcategory linked to two parent groups → first linked group;
  //  - the same subcategory name on two rows → first row;
  //  - a subcategory on a published asset with no parent group at all → the
  //    group its sibling subcategories (on the same assets) use most, else Other.
  // Every substitution is listed in the receipt as taxonomyNotes.
  const taxonomyNotes = [];
  const taxonomy = new Map();
  for (const r of categoryRecords) {
    const name = (r.fields.fldWQDQuXlqwWxORG ?? '').trim();
    const groups = [...new Set(values(r.fields.fldDSMRYPV8KBIeX7))];
    if (!name || !groups.length) continue;
    if (groups.length > 1) taxonomyNotes.push({ kind: 'dual-parent', id: r.id, name, groups, used: groups[0] });
    if (taxonomy.has(name)) {
      // Every later same-name row is a source-data task, even when its group agrees.
      taxonomyNotes.push({ kind: 'duplicate-name', id: r.id, name, kept: taxonomy.get(name), dropped: groups[0] });
      continue;
    }
    taxonomy.set(name, groups[0]);
  }
  const cooccur = new Map();
  // No usable taxonomy at all is an empty source, not something to paper over.
  for (const r of taxonomy.size ? publishedAssets : []) {
    const cats = values(r.fields.fldBv3YTf6Bd5HDXN);
    const siblingGroups = cats.filter((c) => taxonomy.has(c)).map((c) => taxonomy.get(c));
    for (const c of cats)
      if (!taxonomy.has(c)) {
        const counts = cooccur.get(c) ?? new Map();
        for (const g of siblingGroups) counts.set(g, (counts.get(g) ?? 0) + 1);
        cooccur.set(c, counts);
      }
  }
  for (const [name, counts] of cooccur) {
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const group = best ? best[0] : 'Other';
    taxonomy.set(name, group);
    taxonomyNotes.push({ kind: 'unmapped', name, used: group });
  }

  // 🎨📧 Creator Email rolls up only Emails tagged Primary; a creator with linked
  // Emails but no Primary tag leaves it empty. Fall back to the creator record's
  // own ❗👛Creator Email rollup and list the substitution in the receipt.
  const creatorEmailNotes = [];
  let creatorEmails;
  async function creatorEmailFor(r) {
    const direct = values(r.fields.fldHhxmfSNMp117SP)[0];
    if (direct) return direct;
    const creatorId = values(r.fields.fldGDWo2VfnTbSUiL)[0];
    if (!creatorId) return undefined;
    creatorEmails ??= new Map(
      (await listAll('tbljt0plqxdMARZXb', ['fld5AtQoz6Af7jdos'])).map((c) => [c.id, values(c.fields.fld5AtQoz6Af7jdos)[0]])
    );
    const email = creatorEmails.get(creatorId);
    if (email) creatorEmailNotes.push({ asset: r.id, creator: creatorId });
    return email;
  }
  const assetEmails = new Map();
  for (const r of publishedAssets) assetEmails.set(r.id, await creatorEmailFor(r));

  const snapshot = buildMarketplaceSnapshot({
    snapshotAt: asOf.toISOString(),
    sellers,
    categories: [...taxonomy].map(([name, group]) => ({ name, group })),
    assets: publishedAssets.flatMap((r) =>
      values(r.fields.fldFeWROxzwzCo84b).flatMap((value) =>
        value.split(',').map((templateId) => ({
          templateId: templateId.trim(),
          creatorEmail: assetEmails.get(r.id),
          categories: values(r.fields.fldBv3YTf6Bd5HDXN)
        }))
      )
    )
  });
  const fields = snapshotToFields(snapshot);
  // Full review artifact exists even if publication fails. Never logs credentials.
  const runs = join(HERE, 'runs');
  mkdirSync(runs, { recursive: true });
  const stamp = asOf.toISOString().slice(0, 10);
  writeFileSync(join(runs, `snapshot-${stamp}.json`), JSON.stringify(snapshot, null, 2), {
    mode: 0o600
  });
  let recordId;
  if (EXECUTE) {
    const result = await airtable('PATCH', snapshotTable, {
      performUpsert: { fieldsToMergeOn: ['KEY'] },
      records: [{ fields }]
    });
    recordId = result.records?.[0]?.id;
    if (!/^rec[a-zA-Z0-9]{14}$/.test(recordId ?? '')) fail('Missing publication record ID');
    const observed = await airtable('GET', `${snapshotTable}/${recordId}`);
    const readback = snapshotFromFields(observed.fields);
    if (JSON.stringify(readback) !== JSON.stringify(snapshot))
      fail('Publication readback does not match the planned snapshot');
  }
  const receipt = {
    mode: EXECUTE ? 'execute' : 'dry-run',
    source,
    snapshotAt: snapshot.snapshotAt,
    summary: snapshot.summary,
    leaderboardRows: snapshot.leaderboard.length,
    categoryRows: snapshot.categories.length,
    recordId,
    legacyTablesModified: false,
    taxonomyNotes,
    creatorEmailNotes,
    ranAt: new Date().toISOString()
  };
  writeFileSync(
    join(runs, `receipt-${stamp}${EXECUTE ? '' : '-dryrun'}.json`),
    JSON.stringify(receipt, null, 2),
    { mode: 0o600 }
  );
  log(JSON.stringify(receipt));
}
main().catch((error) => {
  console.error(`FATAL: ${error.message}`);
  process.exitCode = 1;
});
