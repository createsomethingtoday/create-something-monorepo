#!/usr/bin/env node
/** Weekly complete snapshots. Dry-run by default; no legacy-table writes. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSnapshotFromAirtable,
  createAirtableRest,
  latestMondayBoundary,
  parseMetric,
  publishSnapshot,
  readSellersFromAirtable
} from '../../webflow-dashboard-core/src/marketplace-insights-publish.mjs';

// The read/build/publish steps live in webflow-dashboard-core so the dashboard's
// /api/cron/insights endpoint (driven by the marketplace-insights-cron Worker)
// runs the same code. This CLI adds the Snowflake source, dry runs and the
// local review artifacts in runs/.
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
const log = (...parts) => console.log(new Date().toISOString(), ...parts);
const fail = (message) => {
  throw new Error(message);
};
// Explicit UTC: the Snowflake session time zone is not UTC, and a bare literal
// would shift the window by the session offset.
const toSqlTs = (date) => `'${date.toISOString().replace('T', ' ').slice(0, 19)} +00:00'::TIMESTAMP_TZ`;
function querySnowflake(windowStart, windowEnd) {
  // LOADED_THROUGH is the newest order the warehouse holds. The orders table
  // loads once a day, so a window that closed after the last load is missing
  // its final hours; refuse it instead of publishing a short week.
  const sql = `
    WITH loaded AS (SELECT MAX(CREATED_ON) AS LOADED_THROUGH FROM ANALYTICS.WEBFLOW.MARKETPLACE_ORDERS)
    SELECT
      t.TEMPLATE_ID AS TEMPLATE_ID,
      p.DOCUMENT_ID AS MRP_ID,
      t.TEMPLATE_NAME AS NAME,
      COUNT(*) AS SALES_30D,
      COALESCE(COUNT_IF(o.TEMPLATE_FULFILLMENT_CODE_ID IS NOT NULL), 0) AS FULFILLMENT_SALES_30D,
      ROUND(SUM(o.PRICE_VALUE), 2) AS REVENUE_30D,
      TO_VARCHAR(CONVERT_TIMEZONE('UTC', ANY_VALUE(l.LOADED_THROUGH)), 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"') AS LOADED_THROUGH
    FROM ANALYTICS.WEBFLOW.MARKETPLACE_ORDERS o
    JOIN ANALYTICS.WEBFLOW.MARKETPLACE_PRODUCTS p ON o.MARKETPLACE_PRODUCT_ID = p.DOCUMENT_ID
    JOIN ANALYTICS.WEBFLOW.TEMPLATES t ON p.RESOURCE_ID = t.TEMPLATE_ID
    CROSS JOIN loaded l
    WHERE p.RESOURCE_TYPE = 'Template'
      AND o.STATUS = 'delivered'
      AND o.CREATED_ON >= ${toSqlTs(windowStart)}
      AND o.CREATED_ON < ${toSqlTs(windowEnd)}
    GROUP BY 1, 2, 3
  `;

  log(`Querying Snowflake (window ${windowStart.toISOString()} → ${windowEnd.toISOString()})...`);
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
  const loadedThrough = Date.parse(rows[0]?.LOADED_THROUGH);
  if (!(loadedThrough >= windowEnd.getTime()))
    fail(
      `Snowflake orders are loaded only through ${rows[0]?.LOADED_THROUGH ?? 'unknown'}, before the window end ${windowEnd.toISOString()}; rerun after the next daily load`
    );

  return rows.map((row) => ({
    templateId: row.TEMPLATE_ID,
    mrpId: row.MRP_ID,
    name: row.NAME,
    sales: parseMetric(row.SALES_30D),
    fulfillmentSales: parseMetric(row.FULFILLMENT_SALES_30D),
    revenue: parseMetric(row.REVENUE_30D)
  }));
}

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
  const rest = createAirtableRest({ apiKey: AIRTABLE_KEY, baseId: BASE_ID });
  const sellers =
    source === 'airtable'
      ? await readSellersFromAirtable(rest, asOf)
      : querySnowflake(new Date(asOf.getTime() - 30 * 86400000), asOf);
  log(`Read ${sellers.length} sellers from ${source} (window ending ${asOf.toISOString()}).`);
  const { snapshot, taxonomyNotes, creatorEmailNotes } = await buildSnapshotFromAirtable(rest, {
    sellers,
    snapshotAt: asOf.toISOString()
  });
  // Full review artifact exists even if publication fails. Never logs credentials.
  const runs = join(HERE, 'runs');
  mkdirSync(runs, { recursive: true });
  const stamp = asOf.toISOString().slice(0, 10);
  writeFileSync(join(runs, `snapshot-${stamp}.json`), JSON.stringify(snapshot, null, 2), {
    mode: 0o600
  });
  const recordId = EXECUTE ? await publishSnapshot(rest, snapshotTable, snapshot) : undefined;
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
