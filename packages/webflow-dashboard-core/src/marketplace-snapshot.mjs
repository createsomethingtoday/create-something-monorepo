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

/**
 * Input assets are keyed by template resource ID, never by display name.
 *
 * Optional inputs, each all or nothing:
 *  - `asset.listed` on the assets: adds listed supply. A subcategory then gets a
 *    row even with no sales, so sell-through reads from one source. A template
 *    counts as listed when it is listed now or sold in a window of this snapshot.
 *  - `sellers90`: every template with a delivered sale in the 90 days that end
 *    at `snapshotAt`. It must contain the 30-day sellers.
 */
export function buildMarketplaceSnapshot({ sellers, assets, categories, snapshotAt, sellers90 }) {
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
  const hasSupply = assets.some((asset) => asset.listed !== undefined);
  const has90 = sellers90 !== undefined;
  const sold90 = new Map();
  if (has90) {
    if (!Array.isArray(sellers90) || !sellers90.length) reject('empty 90-day source');
    for (const seller of sellers90) {
      const key = id(seller.templateId);
      if (sold90.has(key)) reject(`duplicate 90-day template ID ${key}`);
      const sales = number(seller.sales, '90-day sales', true);
      if (sales === 0) reject('90-day seller without delivered sales');
      sold90.set(key, {
        sales,
        revenue: round(number(seller.revenue, '90-day revenue')),
        fulfillmentSales: seller.fulfillmentSales ?? undefined
      });
    }
  }
  // The fulfillment-link split of the 90-day source is all or nothing, like the 30-day one.
  const with90Fulfillment = [...sold90.values()].filter((s) => s.fulfillmentSales !== undefined);
  if (with90Fulfillment.length && with90Fulfillment.length !== sold90.size)
    reject('partial 90-day fulfillment-link counts');
  const has90Fulfillment = with90Fulfillment.length > 0;
  for (const sold of with90Fulfillment)
    if (number(sold.fulfillmentSales, '90-day fulfillment-link sales', true) > sold.sales)
      reject('fulfillment-link sales exceed sales');
  const usedTemplates = new Set(sellers.map((row) => id(row.templateId)));
  const byTemplate = new Map();
  // Templates that are not 30-day sellers but still belong to a subcategory:
  // listed now, or sold in the 90 days. Their source rows are not validated as
  // strictly as the sellers', so a gap there never stops the weekly snapshot.
  const others = new Map();
  for (const asset of assets) {
    // Assets without product IDs are not published marketplace resources.
    if (!asset.templateId) continue;
    const key = String(asset.templateId).trim().toLowerCase();
    if (!usedTemplates.has(key)) {
      if (!(hasSupply && asset.listed === true) && !sold90.has(key)) continue;
      const known = (asset.categories ?? []).filter((c) => typeof c === 'string' && groups.has(c.trim()));
      others.set(key, new Set([...(others.get(key) ?? []), ...known.map((c) => c.trim())]));
      continue;
    }
    const normalized = {
      creatorEmail: text(asset.creatorEmail, 'creator email'),
      categories: [...new Set(asset.categories.map((c) => text(c, 'asset category')))].sort()
    };
    if (!normalized.categories.length) reject(`missing category for ${key}`);
    if (byTemplate.has(key) && JSON.stringify(byTemplate.get(key)) !== JSON.stringify(normalized))
      reject(`ambiguous asset mapping for ${key}`);
    byTemplate.set(key, normalized);
  }
  // Fulfillment-link counts are optional (older sources lack them) but all or
  // nothing: a partial split would understate the total without saying so.
  const withFulfillment = sellers.filter((s) => s.fulfillmentSales !== undefined && s.fulfillmentSales !== null);
  if (withFulfillment.length && withFulfillment.length !== sellers.length) reject('partial fulfillment-link counts');
  const hasFulfillment = withFulfillment.length > 0;
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
    // A template may carry subcategories from several parent groups (about
    // 40% of sellers do under the current taxonomy). Its leaderboard row is
    // reported under the group of its first (sorted) subcategory; every
    // subcategory still contributes to its own category breakdown below.
    const totalSales30d = number(seller.sales, 'sales', true);
    if (totalSales30d === 0) reject('seller without delivered sales');
    if (has90 && !(sold90.get(templateId)?.sales >= totalSales30d)) reject('90-day sales below 30-day sales');
    const row = {
      templateId,
      mrpId,
      templateName: text(seller.name, 'template name'),
      creatorEmail: asset.creatorEmail,
      category: groups.get(asset.categories[0]),
      categories: asset.categories,
      totalSales30d,
      totalRevenue30d: round(number(seller.revenue, 'revenue'))
    };
    if (hasFulfillment) {
      row.fulfillmentSales30d = number(seller.fulfillmentSales, 'fulfillment-link sales', true);
      if (row.fulfillmentSales30d > totalSales30d) reject('fulfillment-link sales exceed sales');
    }
    return row;
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
  const rollup = (subcategory) => {
    const category = groups.get(subcategory);
    const key = JSON.stringify([category, subcategory]);
    if (!rollups.has(key))
      rollups.set(key, {
        category,
        subcategory,
        templatesInSubcategory: 0,
        totalSales30d: 0,
        totalRevenue30d: 0,
        ...(hasFulfillment && { fulfillmentSales30d: 0 }),
        ...(hasSupply && { listedTemplates: 0 }),
        ...(has90 && { templatesWithSales90d: 0, totalSales90d: 0, totalRevenue90d: 0 }),
        ...(has90Fulfillment && { fulfillmentSales90d: 0 })
      });
    return rollups.get(key);
  };
  const add90 = (templateId, subcategories) => {
    const sold = sold90.get(templateId);
    if (!sold) return;
    for (const subcategory of subcategories) {
      const entry = rollup(subcategory);
      entry.templatesWithSales90d++;
      entry.totalSales90d += sold.sales;
      entry.totalRevenue90d += sold.revenue;
      if (has90Fulfillment) entry.fulfillmentSales90d += sold.fulfillmentSales;
    }
  };
  for (const row of rows) {
    for (const subcategory of row.categories) {
      const entry = rollup(subcategory);
      entry.templatesInSubcategory++;
      entry.totalSales30d += row.totalSales30d;
      entry.totalRevenue30d += row.totalRevenue30d;
      if (hasFulfillment) entry.fulfillmentSales30d += row.fulfillmentSales30d;
      if (hasSupply) entry.listedTemplates++;
    }
    add90(row.templateId, row.categories);
  }
  for (const [templateId, subcategories] of others) {
    if (hasSupply) for (const subcategory of subcategories) rollup(subcategory).listedTemplates++;
    add90(templateId, subcategories);
  }
  // A 90-day seller with no asset record cannot be placed in a subcategory, but it
  // was listed when it sold, so it still counts in the marketplace-wide supply.
  const unplaced90 = [...sold90.keys()].filter((key) => !usedTemplates.has(key) && !others.has(key)).length;
  const categoryRows = [...rollups.values()];
  const categoryRanks = ranks(categoryRows, 'totalRevenue30d');
  const snapshot = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    snapshotAt,
    summary: {
      totalSales: rows.reduce((sum, r) => sum + r.totalSales30d, 0),
      totalRevenue: round(rows.reduce((sum, r) => sum + r.totalRevenue30d, 0)),
      sellingTemplates: rows.length,
      ...(hasFulfillment && {
        fulfillmentSales: rows.reduce((sum, r) => sum + r.fulfillmentSales30d, 0)
      }),
      ...(hasSupply && { listedTemplates: rows.length + others.size + unplaced90 }),
      ...(has90 && {
        totalSales90d: [...sold90.values()].reduce((sum, r) => sum + r.sales, 0),
        totalRevenue90d: round([...sold90.values()].reduce((sum, r) => sum + r.revenue, 0)),
        sellingTemplates90d: sold90.size
      })
    },
    leaderboard,
    categories: categoryRows
      .map((row) => ({
        ...row,
        totalRevenue30d: round(row.totalRevenue30d),
        ...(has90 && { totalRevenue90d: round(row.totalRevenue90d) }),
        avgRevenuePerTemplate: row.templatesInSubcategory
          ? round(row.totalRevenue30d / row.templatesInSubcategory)
          : 0,
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
  // Optional split: sales made through creator fulfillment links (paid off-platform).
  const hasFulfillment = summary.fulfillmentSales !== undefined;
  if (hasFulfillment && number(summary.fulfillmentSales, 'fulfillment-link sales', true) > summary.totalSales)
    reject('fulfillment-link sales exceed sales');
  // Optional listed supply and optional 90-day window; each is all or nothing.
  const hasSupply = summary.listedTemplates !== undefined;
  if (hasSupply && number(summary.listedTemplates, 'listed templates', true) < summary.sellingTemplates)
    reject('listed templates below selling templates');
  const has90 = summary.totalSales90d !== undefined;
  if ((summary.sellingTemplates90d !== undefined) !== has90 || (summary.totalRevenue90d !== undefined) !== has90)
    reject('partial 90-day summary');
  if (has90 && hasSupply && summary.listedTemplates < summary.sellingTemplates90d)
    reject('listed templates below selling templates');
  if (has90) {
    number(summary.totalRevenue90d, '90-day revenue');
    if (
      number(summary.totalSales90d, '90-day sales', true) < summary.totalSales ||
      number(summary.sellingTemplates90d, '90-day selling templates', true) < summary.sellingTemplates
    )
      reject('90-day sales below 30-day sales');
  }
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
    if (hasFulfillment !== (row.fulfillmentSales30d !== undefined))
      reject('mixed fulfillment-link counts');
    if (hasFulfillment && number(row.fulfillmentSales30d, 'fulfillment-link sales', true) > row.totalSales30d)
      reject('fulfillment-link sales exceed sales');
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
    if (row.fulfillmentSales30d !== undefined && number(row.fulfillmentSales30d, 'fulfillment-link sales', true) > row.totalSales30d)
      reject('fulfillment-link sales exceed sales');
    if (hasSupply !== (row.listedTemplates !== undefined)) reject('mixed listed supply');
    if (hasSupply && number(row.listedTemplates, 'listed templates', true) < row.templatesInSubcategory)
      reject('selling templates exceed listed templates');
    if (has90 !== (row.totalSales90d !== undefined)) reject('mixed 90-day counts');
    if (row.fulfillmentSales90d !== undefined && !(has90 && number(row.fulfillmentSales90d, '90-day fulfillment-link sales', true) <= row.totalSales90d))
      reject('fulfillment-link sales exceed sales');
    if (has90) {
      number(row.totalRevenue90d, '90-day revenue');
      if (
        number(row.totalSales90d, '90-day sales', true) < row.totalSales30d ||
        number(row.templatesWithSales90d, '90-day selling templates', true) < row.templatesInSubcategory
      )
        reject('90-day sales below 30-day sales');
    }
    // A row with no 30-day seller is valid only when supply or the 90-day window put it there.
    if (!row.revenueRank || (!row.templatesInSubcategory && !row.listedTemplates && !row.templatesWithSales90d))
      reject('zero category count or rank');
  }
  if (
    summary.sellingTemplates < snapshot.leaderboard.length ||
    summary.totalSales < snapshot.leaderboard.reduce((sum, row) => sum + row.totalSales30d, 0) ||
    summary.totalRevenue + 0.01 <
      snapshot.leaderboard.reduce((sum, row) => sum + row.totalRevenue30d, 0) ||
    (hasFulfillment &&
      summary.fulfillmentSales < snapshot.leaderboard.reduce((sum, row) => sum + row.fulfillmentSales30d, 0))
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
