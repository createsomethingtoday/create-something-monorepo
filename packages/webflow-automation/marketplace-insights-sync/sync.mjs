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
const values = (raw) =>
  (Array.isArray(raw) ? raw : [raw])
    .filter((x) => typeof x === 'string' && x.trim())
    .map((x) => x.trim());
async function main() {
  if (!AIRTABLE_KEY) fail('AIRTABLE_API_KEY is not set');
  let asOf = latestMondayBoundary();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--execute') continue;
    if (args[i] === '--as-of' && args[i + 1] && !args[i + 1].startsWith('--'))
      asOf = new Date(args[++i]);
    else fail(`Unknown or incomplete argument: ${args[i]}`);
  }
  if (!Number.isFinite(asOf.getTime())) fail('Invalid --as-of timestamp');
  if (EXECUTE && !/^tbl[a-zA-Z0-9]{14}$/.test(snapshotTable ?? ''))
    fail('Set the approved MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID before executing');
  const sellers = querySnowflake(new Date(asOf.getTime() - 30 * 86400000), asOf);
  const categoryRecords = await listAll('tblSygBX7adZ4VNjK', [
    'fldWQDQuXlqwWxORG',
    'fldDSMRYPV8KBIeX7'
  ]);
  const assetRecords = await listAll('tblRwzpWoLgE9MrUm', [
    'fldFeWROxzwzCo84b',
    'fldHhxmfSNMp117SP',
    'fldBv3YTf6Bd5HDXN'
  ]);
  const snapshot = buildMarketplaceSnapshot({
    snapshotAt: asOf.toISOString(),
    sellers,
    categories: categoryRecords
      .filter((r) => r.fields.fldWQDQuXlqwWxORG && values(r.fields.fldDSMRYPV8KBIeX7).length)
      .map((r) => ({
        name: r.fields.fldWQDQuXlqwWxORG,
        group: values(r.fields.fldDSMRYPV8KBIeX7)[0]
      })),
    assets: assetRecords.flatMap((r) =>
      values(r.fields.fldFeWROxzwzCo84b).flatMap((value) =>
        value.split(',').map((templateId) => ({
          templateId: templateId.trim(),
          creatorEmail: values(r.fields.fldHhxmfSNMp117SP)[0],
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
    snapshotAt: snapshot.snapshotAt,
    summary: snapshot.summary,
    leaderboardRows: snapshot.leaderboard.length,
    categoryRows: snapshot.categories.length,
    recordId,
    legacyTablesModified: false,
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
