/** Shared wire contract for complete Marketplace Insights snapshots. */
export const SNAPSHOT_SCHEMA_VERSION = 1;
export const SNAPSHOT_FIELD_LIMIT = 90_000;
const idPattern = /^[a-f0-9]{24}$/i;
const reject = (message) => {
  throw new Error(`Invalid marketplace snapshot: ${message}`);
};
const number = (value, label, integer = false) => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    (integer && !Number.isSafeInteger(value))
  )
    reject(label);
  return value;
};
const text = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) reject(label);
  return value.trim();
};
const id = (value) => {
  const result = text(value, 'missing identity').toLowerCase();
  if (!idPattern.test(result)) reject('identity must be a product/template ID');
  return result;
};
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
function ranks(rows, metric) {
  const sorted = [...rows].sort((a, b) => b[metric] - a[metric]);
  const result = new Map();
  sorted.forEach((row, index) =>
    result.set(
      row,
      index && row[metric] === sorted[index - 1][metric] ? result.get(sorted[index - 1]) : index + 1
    )
  );
  return result;
}

/** Input assets are keyed by template resource ID, never by display name. */
export function buildMarketplaceSnapshot({ sellers, assets, categories, snapshotAt }) {
  if (
    !Array.isArray(sellers) ||
    !sellers.length ||
    !Array.isArray(assets) ||
    !assets.length ||
    !Array.isArray(categories) ||
    !categories.length
  )
    reject('empty source');
  const groups = new Map();
  for (const row of categories) {
    const name = text(row.name, 'category name');
    const group = text(row.group, 'category group');
    if (groups.has(name) && groups.get(name) !== group) reject('ambiguous category mapping');
    groups.set(name, group);
  }
  const usedTemplates = new Set(sellers.map((row) => id(row.templateId)));
  const byTemplate = new Map();
  for (const asset of assets) {
    // Assets without product IDs are not published marketplace resources.
    if (!asset.templateId) continue;
    const key = String(asset.templateId).trim().toLowerCase();
    if (!usedTemplates.has(key)) continue;
    const normalized = {
      creatorEmail: text(asset.creatorEmail, 'creator email'),
      categories: [...new Set(asset.categories.map((c) => text(c, 'asset category')))].sort()
    };
    if (!normalized.categories.length) reject(`missing category for ${key}`);
    if (byTemplate.has(key) && JSON.stringify(byTemplate.get(key)) !== JSON.stringify(normalized))
      reject(`ambiguous asset mapping for ${key}`);
    byTemplate.set(key, normalized);
  }
  const seen = new Set();
  const rows = sellers.map((seller) => {
    const templateId = id(seller.templateId);
    const mrpId = id(seller.mrpId);
    if (seen.has(templateId)) reject(`duplicate template ID ${templateId}`);
    seen.add(templateId);
    const asset = byTemplate.get(templateId);
    if (!asset) reject(`missing asset mapping for ${templateId}`);
    for (const category of asset.categories)
      if (!groups.has(category)) reject(`missing taxonomy mapping for ${category}`);
    const totalSales30d = number(seller.sales, 'sales', true);
    if (totalSales30d === 0) reject('seller without delivered sales');
    return {
      templateId,
      mrpId,
      templateName: text(seller.name, 'template name'),
      creatorEmail: asset.creatorEmail,
      category: groups.get(asset.categories[0]),
      categories: asset.categories,
      totalSales30d,
      totalRevenue30d: round(number(seller.revenue, 'revenue'))
    };
  });
  const salesRanks = ranks(rows, 'totalSales30d');
  const revenueRanks = ranks(rows, 'totalRevenue30d');
  const leaderboard = [...rows]
    .sort(
      (a, b) =>
        b.totalSales30d - a.totalSales30d ||
        b.totalRevenue30d - a.totalRevenue30d ||
        a.templateId.localeCompare(b.templateId)
    )
    .slice(0, 160)
    .map(({ categories: _categories, ...row }) => ({
      ...row,
      avgRevenuePerSale: round(row.totalRevenue30d / row.totalSales30d),
      salesRank: salesRanks.get(rows.find((r) => r.templateId === row.templateId)),
      revenueRank: revenueRanks.get(rows.find((r) => r.templateId === row.templateId))
    }));
  const rollups = new Map();
  for (const row of rows)
    for (const subcategory of row.categories) {
      const category = groups.get(subcategory);
      const key = JSON.stringify([category, subcategory]);
      const entry = rollups.get(key) ?? {
        category,
        subcategory,
        templatesInSubcategory: 0,
        totalSales30d: 0,
        totalRevenue30d: 0
      };
      entry.templatesInSubcategory++;
      entry.totalSales30d += row.totalSales30d;
      entry.totalRevenue30d += row.totalRevenue30d;
      rollups.set(key, entry);
    }
  const categoryRows = [...rollups.values()];
  const categoryRanks = ranks(categoryRows, 'totalRevenue30d');
  const snapshot = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    snapshotAt,
    summary: {
      totalSales: rows.reduce((sum, r) => sum + r.totalSales30d, 0),
      totalRevenue: round(rows.reduce((sum, r) => sum + r.totalRevenue30d, 0)),
      sellingTemplates: rows.length
    },
    leaderboard,
    categories: categoryRows
      .map((row) => ({
        ...row,
        totalRevenue30d: round(row.totalRevenue30d),
        avgRevenuePerTemplate: round(row.totalRevenue30d / row.templatesInSubcategory),
        revenueRank: categoryRanks.get(row)
      }))
      .sort((a, b) => a.revenueRank - b.revenueRank || a.subcategory.localeCompare(b.subcategory))
  };
  validateMarketplaceSnapshot(snapshot);
  return snapshot;
}

export function validateMarketplaceSnapshot(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) reject('unsupported schema');
  if (
    typeof snapshot.snapshotAt !== 'string' ||
    !Number.isFinite(Date.parse(snapshot.snapshotAt)) ||
    new Date(snapshot.snapshotAt).toISOString() !== snapshot.snapshotAt
  )
    reject('snapshot timestamp');
  const summary = snapshot.summary;
  if (!summary) reject('missing summary');
  number(summary.totalSales, 'total sales', true);
  number(summary.totalRevenue, 'total revenue');
  number(summary.sellingTemplates, 'selling templates', true);
  if (
    !Array.isArray(snapshot.leaderboard) ||
    !snapshot.leaderboard.length ||
    snapshot.leaderboard.length > 160 ||
    !Array.isArray(snapshot.categories) ||
    !snapshot.categories.length
  )
    reject('empty or oversized rows');
  const seen = new Set();
  for (const row of snapshot.leaderboard) {
    const key = id(row.templateId);
    id(row.mrpId);
    if (seen.has(key)) reject('duplicate template ID');
    seen.add(key);
    for (const key of ['templateName', 'creatorEmail', 'category']) text(row[key], key);
    for (const key of ['totalSales30d', 'salesRank', 'revenueRank']) number(row[key], key, true);
    for (const key of ['totalRevenue30d', 'avgRevenuePerSale']) number(row[key], key);
    if (!row.totalSales30d || !row.salesRank || !row.revenueRank)
      reject('zero seller sales or rank');
  }
  const keys = new Set();
  for (const row of snapshot.categories) {
    text(row.category, 'category');
    text(row.subcategory, 'subcategory');
    const key = JSON.stringify([row.category, row.subcategory]);
    if (keys.has(key)) reject('duplicate category');
    keys.add(key);
    for (const key of ['totalSales30d', 'templatesInSubcategory', 'revenueRank'])
      number(row[key], key, true);
    for (const key of ['totalRevenue30d', 'avgRevenuePerTemplate']) number(row[key], key);
    if (!row.templatesInSubcategory || !row.revenueRank) reject('zero category count or rank');
  }
  if (
    summary.sellingTemplates < snapshot.leaderboard.length ||
    summary.totalSales < snapshot.leaderboard.reduce((sum, row) => sum + row.totalSales30d, 0) ||
    summary.totalRevenue + 0.01 <
      snapshot.leaderboard.reduce((sum, row) => sum + row.totalRevenue30d, 0)
  )
    reject('summary smaller than leaderboard');
  return snapshot;
}

export function snapshotToFields(snapshot) {
  validateMarketplaceSnapshot(snapshot);
  const fields = {
    KEY: snapshot.snapshotAt,
    SNAPSHOT_AT: snapshot.snapshotAt,
    SUMMARY_JSON: JSON.stringify({ schemaVersion: snapshot.schemaVersion, ...snapshot.summary }),
    LEADERBOARD_JSON: JSON.stringify(snapshot.leaderboard),
    CATEGORIES_JSON: JSON.stringify(snapshot.categories)
  };
  for (const value of Object.values(fields))
    if (new TextEncoder().encode(value).length > SNAPSHOT_FIELD_LIMIT)
      reject('field exceeds safe Airtable size');
  return fields;
}

export function snapshotFromFields(fields) {
  if (fields.KEY !== fields.SNAPSHOT_AT) reject('snapshot key mismatch');
  const summary = JSON.parse(fields.SUMMARY_JSON);
  const { schemaVersion, ...totals } = summary;
  return validateMarketplaceSnapshot({
    schemaVersion,
    snapshotAt: fields.SNAPSHOT_AT,
    summary: totals,
    leaderboard: JSON.parse(fields.LEADERBOARD_JSON),
    categories: JSON.parse(fields.CATEGORIES_JSON)
  });
}

/** Missing configuration keeps the legacy reader; configured failures never fall back. */
export async function fetchMarketplaceSnapshot(env, fetcher = fetch) {
  const table = env.MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID;
  if (!table) return null;
  if (!/^tbl[a-zA-Z0-9]{14}$/.test(table)) reject('invalid snapshot table ID');
  const url = new URL(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${table}`);
  url.searchParams.set('maxRecords', '1');
  url.searchParams.set('sort[0][field]', 'SNAPSHOT_AT');
  url.searchParams.set('sort[0][direction]', 'desc');
  const response = await fetcher(url, {
    headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`Marketplace snapshot read failed (${response.status})`);
  const data = await response.json();
  if (!data.records?.length) reject('configured source is empty');
  const snapshot = snapshotFromFields(data.records[0].fields);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(snapshot)));
  const contentVersion = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return { ...snapshot, contentVersion };
}
