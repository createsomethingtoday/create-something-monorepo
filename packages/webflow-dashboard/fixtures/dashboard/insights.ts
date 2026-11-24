/**
 * LOCAL FIXTURE ONLY. A fictional Marketplace Insights snapshot, so the
 * Insights page can be viewed with no credentials. No number here is real.
 *
 * FIXTURE_INSIGHTS=legacy serves the shape of a snapshot from before listed
 * supply and the 90-day window existed (no supply, no 90-day fields, no row
 * without sales). The page must still read correctly with it.
 *
 * FIXTURE_INSIGHTS_FILE=/path/to/snapshot.json serves a snapshot that a local
 * build wrote (the output of buildMarketplaceSnapshot). Use it to look at a
 * new snapshot shape with real numbers before anything is published. The file
 * stays on your machine; never commit one.
 */
import { readFileSync } from 'node:fs';
import { FIXTURE_EMAIL } from './data';

type Row = [
  category: string,
  subcategory: string,
  listed: number,
  selling30: number,
  sales30: number,
  revenue30: number,
  fulfillment30: number,
  selling90: number,
  sales90: number,
  revenue90: number,
  fulfillment90: number
];

const ROWS: Row[] = [
  ['Portfolio & Agency', 'Creative Agency', 1420, 96, 131, 11790, 14, 248, 402, 36180, 38],
  ['Technology', 'Software & SaaS', 1180, 88, 124, 12276, 9, 231, 389, 38511, 27],
  ['Technology', 'Startup', 940, 71, 97, 9603, 21, 190, 301, 29799, 60],
  ['Portfolio & Agency', 'Design Portfolio', 1260, 64, 79, 6241, 6, 171, 244, 19276, 17],
  ['Professional Services', 'Consulting & Coaching', 410, 41, 52, 4628, 4, 104, 158, 14062, 12],
  ['Technology', 'AI', 286, 38, 55, 5445, 3, 92, 149, 14751, 9],
  ['Design', 'Studio', 172, 22, 29, 2581, 2, 57, 84, 7476, 6],
  ['Real Estate', 'Real Estate', 180, 19, 24, 2376, 0, 48, 69, 6831, 0],
  ['Medical', 'Clinic & Pharmacy', 76, 14, 18, 1782, 1, 33, 47, 4653, 3],
  ['Travel', 'Outdoors', 64, 11, 15, 1335, 0, 26, 38, 3382, 0],
  ['Wellness', 'Therapy & Psychology', 58, 12, 16, 1424, 7, 27, 41, 3649, 18],
  ['Non-profit', 'Environment', 66, 9, 11, 869, 0, 22, 30, 2370, 0],
  ['Technology', 'Developer tools', 118, 8, 10, 990, 1, 24, 33, 3267, 2],
  ['Food & Drink', 'Restaurant', 205, 13, 14, 1106, 0, 37, 46, 3634, 0],
  ['Events', 'Weddings', 47, 5, 6, 474, 0, 13, 17, 1343, 0],
  ['Education', 'Online courses', 92, 6, 7, 553, 5, 17, 22, 1738, 13],
  ['Home Services', 'Landscaping', 39, 4, 4, 356, 0, 11, 13, 1157, 0],
  [
    'Portfolio & Agency',
    'Agency with a deliberately long subcategory name',
    23,
    3,
    3,
    237,
    0,
    7,
    9,
    711,
    0
  ],
  ['Community', 'Funeral & Memorial', 14, 0, 0, 0, 0, 2, 2, 158, 0],
  ['Government', 'Public services', 9, 0, 0, 0, 0, 0, 0, 0, 0]
];

/** Unique marketplace totals. Rows overlap (a template sits in each of its subcategories), so these are lower than the row sums. */
const SUMMARY = {
  totalSales: 612,
  totalRevenue: 55890,
  sellingTemplates: 441,
  fulfillmentSales: 61,
  listedTemplates: 4980,
  totalSales90d: 1902,
  totalRevenue90d: 172400,
  sellingTemplates90d: 1087
};

const LEADERS: Array<
  [name: string, category: string, sales: number, price: number, fulfillment: number, own: boolean]
> = [
  ['Northwind', 'Technology', 9, 129, 0, false],
  ['Halcyon', 'Portfolio & Agency', 8, 99, 3, false],
  ['Orbit Launch', 'Technology', 7, 99, 2, true],
  ['Saltmarsh', 'Professional Services', 7, 79, 0, false],
  ['Lumen Studio', 'Design', 6, 129, 0, false],
  ['Brightwork', 'Design', 5, 79, 1, true],
  ['Quillon', 'Technology', 5, 99, 0, false],
  ['Fennel & Rye', 'Food & Drink', 4, 79, 0, false],
  ['Tidewater', 'Real Estate', 4, 99, 0, false],
  ['Cinder', 'Technology', 3, 99, 0, true],
  ['Marigold Clinic', 'Medical', 3, 99, 1, false],
  ['Driftwood', 'Travel', 3, 79, 0, true]
];

const legacy = process.env.FIXTURE_INSIGHTS === 'legacy';

/** Latest Monday 16:00 UTC at or before now: the end of the newest complete window. */
function latestWindowEnd(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 16));
  let back = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;
  if (back === 0 && now < d) back = 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString();
}

function rankBy<T>(rows: T[], metric: (row: T) => number): Map<T, number> {
  const sorted = [...rows].sort((a, b) => metric(b) - metric(a));
  const result = new Map<T, number>();
  sorted.forEach((row, index) =>
    result.set(
      row,
      index && metric(row) === metric(sorted[index - 1])
        ? result.get(sorted[index - 1])!
        : index + 1
    )
  );
  return result;
}

function categories() {
  const source = legacy ? ROWS.filter((row) => row[3] > 0) : ROWS;
  const ranks = rankBy(source, (row) => row[5]);
  return source
    .map((row) => {
      const [
        category,
        subcategory,
        listed,
        selling30,
        sales30,
        revenue30,
        fulfillment30,
        selling90,
        sales90,
        revenue90,
        fulfillment90
      ] = row;
      return {
        category,
        subcategory,
        templatesInSubcategory: selling30,
        totalSales30d: sales30,
        totalRevenue30d: revenue30,
        avgRevenuePerTemplate: selling30 ? Math.round((revenue30 / selling30) * 100) / 100 : 0,
        revenueRank: ranks.get(row)!,
        ...(!legacy && {
          fulfillmentSales30d: fulfillment30,
          listedTemplates: listed,
          templatesWithSales90d: selling90,
          totalSales90d: sales90,
          totalRevenue90d: revenue90,
          fulfillmentSales90d: fulfillment90
        })
      };
    })
    .sort((a, b) => a.revenueRank - b.revenueRank || a.subcategory.localeCompare(b.subcategory));
}

function leaderboard() {
  const rows = LEADERS.map(([templateName, category, sales, price, fulfillment, own], index) => ({
    templateId: (index + 1).toString(16).padStart(24, '0'),
    templateName,
    category,
    creatorEmail: own ? FIXTURE_EMAIL : `creator-${index + 1}@example.test`,
    totalSales30d: sales,
    totalRevenue30d: sales * price,
    avgRevenuePerSale: price,
    fulfillmentSales30d: fulfillment
  }));
  const salesRanks = rankBy(rows, (row) => row.totalSales30d);
  const revenueRanks = rankBy(rows, (row) => row.totalRevenue30d);
  return rows.map((row) => ({
    ...row,
    salesRank: salesRanks.get(row)!,
    revenueRank: revenueRanks.get(row)!
  }));
}

function summary() {
  const { listedTemplates, totalSales90d, totalRevenue90d, sellingTemplates90d, ...base } = SUMMARY;
  return legacy ? base : SUMMARY;
}

const shared = () => ({
  freshness: { timestamp: latestWindowEnd(), source: 'field' as const, fieldName: 'SNAPSHOT_AT' },
  snapshotVersion: legacy ? 'fixture-legacy' : 'fixture-segments',
  marketplaceSummary: summary()
});

/** A locally built snapshot, when FIXTURE_INSIGHTS_FILE names one. */
function fromFile() {
  const file = process.env.FIXTURE_INSIGHTS_FILE;
  if (!file) return null;
  const snapshot = JSON.parse(readFileSync(file, 'utf8'));
  return {
    leaderboard: snapshot.leaderboard,
    categories: snapshot.categories,
    shared: {
      freshness: {
        timestamp: snapshot.snapshotAt,
        source: 'field' as const,
        fieldName: 'SNAPSHOT_AT'
      },
      snapshotVersion: `file-${snapshot.snapshotAt}`,
      marketplaceSummary: snapshot.summary
    }
  };
}

export const fixtureLeaderboard = () => {
  const file = fromFile();
  return file
    ? { records: file.leaderboard, ...file.shared }
    : { records: leaderboard(), ...shared() };
};
export const fixtureCategoryPerformance = () => {
  const file = fromFile();
  return file
    ? { records: file.categories, ...file.shared }
    : { records: categories(), ...shared() };
};
