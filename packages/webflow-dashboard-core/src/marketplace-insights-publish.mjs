/**
 * Weekly Marketplace Insights publication, shared by the CLI
 * (webflow-automation/marketplace-insights-sync) and the dashboard's
 * /api/cron/insights endpoint. Pure functions over an injected Airtable REST
 * client; no filesystem, no process state.
 */
import { buildMarketplaceSnapshot, snapshotToFields, snapshotFromFields } from './marketplace-snapshot.mjs';

const fail = (message) => {
  throw new Error(message);
};

export const SELLERS_TABLE = 'tblkyKZ5nGOcEqb5r';
export const SELLER_FIELDS = {
  TEMPLATE_ID: 'fldgZHXYZqlX2HSag',
  MRP_ID: 'fldA9ZA24286DtNyZ',
  TEMPLATE_NAME: 'fldgO5x1KhpKkL0QP',
  SALES_30D: 'fldXU6c3ERnqBbvSp',
  FULFILLMENT_SALES_30D: 'fld7zlIkAV4GDW7rk',
  REVENUE_30D: 'fldxVd61LWea9SlEF',
  SNAPSHOT_AT: 'fldLJlqsFaukWP4Jq',
  WINDOW_SELLERS: 'fldkJiQBUdfWUMP7Q',
  WINDOW_SALES: 'fld31oTda0kji5IDi',
  WINDOW_REVENUE: 'fldzB6kawJH32fDmA'
};
const CATEGORIES_TABLE = 'tblSygBX7adZ4VNjK';
const ASSETS_TABLE = 'tblRwzpWoLgE9MrUm';
const CREATORS_TABLE = 'tbljt0plqxdMARZXb';
const F = {
  categoryName: 'fldWQDQuXlqwWxORG',
  categoryGroups: 'fldDSMRYPV8KBIeX7',
  assetMrpId: 'fldFeWROxzwzCo84b',
  assetCreatorEmail: 'fldHhxmfSNMp117SP',
  assetCategories: 'fldBv3YTf6Bd5HDXN',
  assetType: 'fldmfcD7pebc82EuN',
  assetCreator: 'fldGDWo2VfnTbSUiL',
  creatorEmail: 'fld5AtQoz6Af7jdos'
};
const TEMPLATE_ASSET_TYPE = 'recA2YsPEHSuAHOLD';

/** Latest Monday 16:00 UTC at or before `now`: the end of the newest complete window. */
export function latestMondayBoundary(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 16));
  let back = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;
  if (back === 0 && now < d) back = 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d;
}

export function parseMetric(value) {
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

const values = (raw) =>
  (Array.isArray(raw) ? raw : [raw]).filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());

/**
 * Minimal Airtable REST client: paced to Airtable's 5 req/s budget, one retry
 * on 429. `fetchImpl` is injectable for tests.
 */
export function createAirtableRest({ apiKey, baseId, fetchImpl = fetch, requestDelayMs = 250 }) {
  if (!apiKey) fail('AIRTABLE_API_KEY is not set');
  if (!/^app[a-zA-Z0-9]{14}$/.test(baseId ?? '')) fail('AIRTABLE_BASE_ID is not set');
  let lastRequestAt = 0;
  async function request(method, path, body, attempt = 0) {
    const wait = lastRequestAt + requestDelayMs - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    const response = await fetchImpl(`https://api.airtable.com/v0/${baseId}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000)
    });
    if (response.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 31_000));
      return request(method, path, body, attempt + 1);
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
      const page = await request('GET', `${table}?${params}`);
      if (!Array.isArray(page.records)) fail('Malformed Airtable source');
      records.push(...page.records);
      offset = page.offset;
    } while (offset);
    return records;
  }
  return { request, listAll };
}

/**
 * Sellers for one window from the table the Fivetran activation writes. The
 * activation upserts on TEMPLATE_ID, so the table holds the latest window plus
 * stale rows for templates that stopped selling. Use only the requested window,
 * and prove the set is complete: every row carries the window totals computed
 * in the same query.
 */
export async function readSellersFromAirtable(rest, windowEnd) {
  const want = windowEnd.toISOString();
  const S = SELLER_FIELDS;
  const records = await rest.listAll(SELLERS_TABLE, Object.values(S));
  const stamps = [...new Set(records.map((r) => r.fields[S.SNAPSHOT_AT]).filter(Boolean))].sort();
  const rows = records.filter((r) => r.fields[S.SNAPSHOT_AT] === want);
  // The dataset emits no rows until Snowflake holds every order in the window,
  // so a missing window can also mean the daily orders load has not run yet.
  if (!rows.length)
    fail(
      `Fivetran sellers activation has no rows for window ${want} (newest: ${stamps.at(-1) ?? 'none'}); the orders load may not cover the window end yet`
    );
  const totals = new Set(
    rows.map((r) => `${r.fields[S.WINDOW_SELLERS]}/${r.fields[S.WINDOW_SALES]}/${r.fields[S.WINDOW_REVENUE]}`)
  );
  if (totals.size !== 1) fail(`Fivetran sellers rows disagree on window totals for ${want}`);
  // FULFILLMENT_SALES_30D is all-or-nothing per window; a partial column would
  // understate fulfillment-link sales without saying so.
  const withFulfillment = rows.filter((r) => r.fields[S.FULFILLMENT_SALES_30D] !== undefined).length;
  if (withFulfillment && withFulfillment !== rows.length)
    fail(`Fivetran sellers rows for ${want} carry FULFILLMENT_SALES_30D on ${withFulfillment} of ${rows.length} rows`);
  const sellers = rows.map((r) => ({
    templateId: r.fields[S.TEMPLATE_ID],
    mrpId: r.fields[S.MRP_ID],
    name: r.fields[S.TEMPLATE_NAME],
    sales: parseMetric(r.fields[S.SALES_30D]),
    ...(withFulfillment && { fulfillmentSales: parseMetric(r.fields[S.FULFILLMENT_SALES_30D]) }),
    revenue: parseMetric(r.fields[S.REVENUE_30D])
  }));
  const expectedSellers = parseMetric(rows[0].fields[S.WINDOW_SELLERS]);
  const expectedSales = parseMetric(rows[0].fields[S.WINDOW_SALES]);
  const expectedRevenue = parseMetric(rows[0].fields[S.WINDOW_REVENUE]);
  const sales = sellers.reduce((sum, row) => sum + row.sales, 0);
  // Revenue is compared in cents so a rerun that changed only revenue cannot
  // pass with a mix of old and new rows.
  const cents = Math.round(sellers.reduce((sum, row) => sum + row.revenue, 0) * 100);
  if (sellers.length !== expectedSellers || sales !== expectedSales || cents !== Math.round(expectedRevenue * 100))
    fail(
      `Fivetran sellers rows are incomplete for ${want}: ${sellers.length}/${expectedSellers} sellers, ${sales}/${expectedSales} sales, ${cents / 100}/${expectedRevenue} revenue`
    );
  return sellers;
}

/**
 * Builds the complete snapshot for `sellers` from Airtable taxonomy and assets.
 * Returns the snapshot plus the source-data substitutions it had to make.
 */
export async function buildSnapshotFromAirtable(rest, { sellers, snapshotAt }) {
  const categoryRecords = await rest.listAll(CATEGORIES_TABLE, [F.categoryName, F.categoryGroups]);
  const assetRecords = await rest.listAll(ASSETS_TABLE, [
    F.assetMrpId,
    F.assetCreatorEmail,
    F.assetCategories,
    F.assetType,
    F.assetCreator
  ]);
  const publishedAssets = assetRecords.filter((r) => values(r.fields[F.assetType]).includes(TEMPLATE_ASSET_TYPE));

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
    const name = (r.fields[F.categoryName] ?? '').trim();
    const groups = [...new Set(values(r.fields[F.categoryGroups]))];
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
    const cats = values(r.fields[F.assetCategories]);
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
    const direct = values(r.fields[F.assetCreatorEmail])[0];
    if (direct) return direct;
    const creatorId = values(r.fields[F.assetCreator])[0];
    if (!creatorId) return undefined;
    creatorEmails ??= new Map(
      (await rest.listAll(CREATORS_TABLE, [F.creatorEmail])).map((c) => [c.id, values(c.fields[F.creatorEmail])[0]])
    );
    const email = creatorEmails.get(creatorId);
    if (email) creatorEmailNotes.push({ asset: r.id, creator: creatorId });
    return email;
  }
  const assetEmails = new Map();
  for (const r of publishedAssets) assetEmails.set(r.id, await creatorEmailFor(r));

  const snapshot = buildMarketplaceSnapshot({
    snapshotAt,
    sellers,
    categories: [...taxonomy].map(([name, group]) => ({ name, group })),
    assets: publishedAssets.flatMap((r) =>
      values(r.fields[F.assetMrpId]).flatMap((value) =>
        value.split(',').map((templateId) => ({
          templateId: templateId.trim(),
          creatorEmail: assetEmails.get(r.id),
          categories: values(r.fields[F.assetCategories])
        }))
      )
    )
  });
  return { snapshot, taxonomyNotes, creatorEmailNotes };
}

/** Upserts one snapshot record (KEY = window end) and verifies the readback. */
export async function publishSnapshot(rest, snapshotTable, snapshot) {
  if (!/^tbl[a-zA-Z0-9]{14}$/.test(snapshotTable ?? ''))
    fail('Set the approved MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID before executing');
  const fields = snapshotToFields(snapshot);
  const result = await rest.request('PATCH', snapshotTable, {
    performUpsert: { fieldsToMergeOn: ['KEY'] },
    records: [{ fields }]
  });
  const recordId = result.records?.[0]?.id;
  if (!/^rec[a-zA-Z0-9]{14}$/.test(recordId ?? '')) fail('Missing publication record ID');
  const observed = await rest.request('GET', `${snapshotTable}/${recordId}`);
  const readback = snapshotFromFields(observed.fields);
  if (JSON.stringify(readback) !== JSON.stringify(snapshot))
    fail('Publication readback does not match the planned snapshot');
  return recordId;
}

/**
 * End to end from the Fivetran sellers table: read the window, build, publish,
 * verify. Returns the receipt the CLI also writes to runs/.
 */
export async function publishMarketplaceInsights(rest, { snapshotTable, asOf = latestMondayBoundary(), execute = true }) {
  const sellers = await readSellersFromAirtable(rest, asOf);
  const { snapshot, taxonomyNotes, creatorEmailNotes } = await buildSnapshotFromAirtable(rest, {
    sellers,
    snapshotAt: asOf.toISOString()
  });
  const recordId = execute ? await publishSnapshot(rest, snapshotTable, snapshot) : undefined;
  return {
    mode: execute ? 'execute' : 'dry-run',
    source: 'airtable',
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
}
