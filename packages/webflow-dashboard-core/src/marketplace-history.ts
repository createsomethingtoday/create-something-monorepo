import type { MarketplaceFreshnessMetadata } from './airtable';

const LEADERBOARD_TABLE = 'marketplace_leaderboard_snapshots';
const CATEGORY_TABLE = 'marketplace_category_snapshots';
const DEFAULT_MARKETPLACE_TREND_POINTS = 8;
const LEGACY_LEADERBOARD_KEY_COLUMN = 'entry_key';
const LEGACY_CATEGORY_KEY_COLUMN = 'category_key';
const CANONICAL_KEY_COLUMN = 'record_key';

type MarketplaceTableSchema = 'canonical' | 'legacy';

export interface MarketplaceLeaderboardRecord {
  templateName: string;
  category: string;
  creatorEmail: string;
  totalSales30d: number;
  totalRevenue30d: number;
  avgRevenuePerSale: number;
  salesRank: number;
  revenueRank: number;
}

export interface MarketplaceCategoryRecord {
  category: string;
  subcategory: string;
  templatesInSubcategory: number;
  totalSales30d: number;
  totalRevenue30d: number;
  avgRevenuePerTemplate: number;
  revenueRank: number;
}

export interface MarketplaceLeaderboardTrendRecord extends MarketplaceLeaderboardRecord {
  trendData?: number[];
}

export interface MarketplaceCategoryTrendRecord extends MarketplaceCategoryRecord {
  trend?: 'up' | 'down' | 'neutral';
  changePercent?: number;
}

export interface MarketplaceSnapshotCaptureInput {
  leaderboard: {
    records: MarketplaceLeaderboardRecord[];
    freshness: MarketplaceFreshnessMetadata;
  };
  categories: {
    records: MarketplaceCategoryRecord[];
    freshness: MarketplaceFreshnessMetadata;
  };
}

export interface MarketplaceSnapshotCaptureResult {
  leaderboard: SnapshotWriteResult;
  categories: SnapshotWriteResult;
}

interface SnapshotWriteResult {
  snapshotAt: string;
  freshnessTimestamp: string | null;
  freshnessSource: string;
  captured: number;
}

interface MetricPoint {
  snapshotAt: string;
  value: number;
}

interface LeaderboardHistoryRow {
  snapshot_at: string;
  record_key?: string | null;
  template_name?: string | null;
  category?: string | null;
  creator_email?: string | null;
  total_sales_30d: number;
}

interface CategoryHistoryRow {
  snapshot_at: string;
  record_key: string;
  avg_revenue_per_template: number;
}

interface TableColumnInfo {
  name: string;
}

export async function captureMarketplaceSnapshots(
  db: D1Database,
  input: MarketplaceSnapshotCaptureInput,
  now: Date = new Date()
): Promise<MarketplaceSnapshotCaptureResult> {
  const [leaderboard, categories] = await Promise.all([
    writeLeaderboardSnapshots(db, input.leaderboard.records, input.leaderboard.freshness, now),
    writeCategorySnapshots(db, input.categories.records, input.categories.freshness, now)
  ]);

  return { leaderboard, categories };
}

export async function enrichLeaderboardWithHistory(
  db: D1Database | undefined,
  records: MarketplaceLeaderboardRecord[],
  freshness: MarketplaceFreshnessMetadata,
  options: { now?: Date; maxPoints?: number } = {}
): Promise<MarketplaceLeaderboardTrendRecord[]> {
  if (!db || records.length === 0) return records;

  const historyRows = await loadLeaderboardHistoryRows(db, options.maxPoints);
  return enrichLeaderboardRecordsWithHistory(records, historyRows, freshness, options);
}

export async function enrichCategoriesWithHistory(
  db: D1Database | undefined,
  records: MarketplaceCategoryRecord[],
  freshness: MarketplaceFreshnessMetadata,
  options: { now?: Date; maxPoints?: number } = {}
): Promise<MarketplaceCategoryTrendRecord[]> {
  if (!db || records.length === 0) return records;

  const historyRows = await loadCategoryHistoryRows(db, options.maxPoints);
  return enrichCategoryRecordsWithHistory(records, historyRows, freshness, options);
}

export function enrichLeaderboardRecordsWithHistory(
  records: MarketplaceLeaderboardRecord[],
  historyRows: ReadonlyArray<LeaderboardHistoryRow>,
  freshness: MarketplaceFreshnessMetadata,
  options: { now?: Date; maxPoints?: number } = {}
): MarketplaceLeaderboardTrendRecord[] {
  const snapshotMeta = buildSnapshotMetadata(freshness, options.now);
  const currentSnapshotAt = normalizeLeaderboardSnapshotTimestamp(snapshotMeta.snapshotAt);
  const maxPoints = options.maxPoints ?? DEFAULT_MARKETPLACE_TREND_POINTS;
  const historyByKey = buildMetricPointMap(historyRows, (row) => ({
    recordKey: getLeaderboardHistoryKey(row),
    snapshotAt: normalizeLeaderboardSnapshotTimestamp(row.snapshot_at),
    value: row.total_sales_30d
  }));

  return records.map((record) => {
    const series = mergeCurrentPoint(
      historyByKey.get(buildLeaderboardSnapshotKey(record)) ?? [],
      { snapshotAt: currentSnapshotAt, value: record.totalSales30d },
      maxPoints
    );

    return series.length < 2
      ? record
      : { ...record, trendData: series.map((point) => point.value) };
  });
}

export function enrichCategoryRecordsWithHistory(
  records: MarketplaceCategoryRecord[],
  historyRows: ReadonlyArray<CategoryHistoryRow>,
  freshness: MarketplaceFreshnessMetadata,
  options: { now?: Date; maxPoints?: number } = {}
): MarketplaceCategoryTrendRecord[] {
  const snapshotMeta = buildSnapshotMetadata(freshness, options.now);
  const maxPoints = options.maxPoints ?? DEFAULT_MARKETPLACE_TREND_POINTS;
  const historyByKey = buildMetricPointMap(historyRows, (row) => ({
    recordKey: row.record_key,
    snapshotAt: row.snapshot_at,
    value: row.avg_revenue_per_template
  }));

  return records.map((record) => {
    const series = mergeCurrentPoint(
      historyByKey.get(buildCategorySnapshotKey(record)) ?? [],
      { snapshotAt: snapshotMeta.snapshotAt, value: record.avgRevenuePerTemplate },
      maxPoints
    );

    if (series.length < 2) return record;

    const previous = series.at(-2)?.value;
    const current = series.at(-1)?.value ?? record.avgRevenuePerTemplate;
    const changePercent = calculateChangePercent(current, previous);

    return changePercent === null
      ? record
      : { ...record, trend: getTrendDirection(changePercent), changePercent };
  });
}

export function buildLeaderboardSnapshotKey(
  record: Pick<MarketplaceLeaderboardRecord, 'templateName' | 'category' | 'creatorEmail'>
): string {
  return [
    normalizeKeyPart(record.templateName),
    normalizeKeyPart(record.creatorEmail),
    normalizeKeyPart(record.category)
  ].join('::');
}

export function buildCategorySnapshotKey(
  record: Pick<MarketplaceCategoryRecord, 'category' | 'subcategory'>
): string {
  return [normalizeKeyPart(record.category), normalizeKeyPart(record.subcategory)].join('::');
}

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildSnapshotMetadata(
  freshness: MarketplaceFreshnessMetadata,
  now: Date = new Date()
): { snapshotAt: string; freshnessTimestamp: string | null; freshnessSource: string } {
  const normalizedFreshness = normalizeIsoTimestamp(freshness.timestamp);
  if (!normalizedFreshness) {
    return {
      snapshotAt: getLastSyncTimeForDate(now).toISOString(),
      freshnessTimestamp: null,
      freshnessSource: 'schedule-estimate'
    };
  }

  return {
    snapshotAt: normalizedFreshness,
    freshnessTimestamp: normalizedFreshness,
    freshnessSource: freshness.source
  };
}

async function writeLeaderboardSnapshots(
  db: D1Database,
  records: MarketplaceLeaderboardRecord[],
  freshness: MarketplaceFreshnessMetadata,
  now: Date
): Promise<SnapshotWriteResult> {
  const snapshotMeta = buildSnapshotMetadata(freshness, now);
  const snapshotAt = normalizeLeaderboardSnapshotTimestamp(snapshotMeta.snapshotAt);
  const schema = await getLeaderboardTableSchema(db);
  const insert =
    schema === 'legacy'
      ? db.prepare(`
				INSERT OR REPLACE INTO ${LEADERBOARD_TABLE} (
					snapshot_at,
					${LEGACY_LEADERBOARD_KEY_COLUMN},
					template_name,
					category,
					creator_email,
					total_sales_30d,
					total_revenue_30d,
					avg_revenue_per_sale,
					sales_rank,
					revenue_rank
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`)
      : db.prepare(`
				INSERT OR REPLACE INTO ${LEADERBOARD_TABLE} (
					snapshot_at,
					freshness_timestamp,
					freshness_source,
					${CANONICAL_KEY_COLUMN},
					template_name,
					category,
					creator_email,
					total_sales_30d,
					total_revenue_30d,
					avg_revenue_per_sale,
					sales_rank,
					revenue_rank
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

  const batch = [
    db.prepare(`DELETE FROM ${LEADERBOARD_TABLE} WHERE snapshot_at = ?`).bind(snapshotAt),
    ...records.map((record) =>
      schema === 'legacy'
        ? insert.bind(
            snapshotAt,
            buildLeaderboardSnapshotKey(record),
            record.templateName,
            record.category,
            record.creatorEmail,
            record.totalSales30d,
            record.totalRevenue30d,
            record.avgRevenuePerSale,
            record.salesRank,
            record.revenueRank
          )
        : insert.bind(
            snapshotAt,
            snapshotMeta.freshnessTimestamp,
            snapshotMeta.freshnessSource,
            buildLeaderboardSnapshotKey(record),
            record.templateName,
            record.category,
            record.creatorEmail,
            record.totalSales30d,
            record.totalRevenue30d,
            record.avgRevenuePerSale,
            record.salesRank,
            record.revenueRank
          )
    )
  ];

  await db.batch(batch);

  return {
    snapshotAt,
    freshnessTimestamp: snapshotMeta.freshnessTimestamp,
    freshnessSource: snapshotMeta.freshnessSource,
    captured: records.length
  };
}

async function writeCategorySnapshots(
  db: D1Database,
  records: MarketplaceCategoryRecord[],
  freshness: MarketplaceFreshnessMetadata,
  now: Date
): Promise<SnapshotWriteResult> {
  const snapshotMeta = buildSnapshotMetadata(freshness, now);
  const schema = await getCategoryTableSchema(db);
  const insert =
    schema === 'legacy'
      ? db.prepare(`
				INSERT OR REPLACE INTO ${CATEGORY_TABLE} (
					snapshot_at,
					${LEGACY_CATEGORY_KEY_COLUMN},
					category,
					subcategory,
					templates_in_subcategory,
					total_sales_30d,
					total_revenue_30d,
					avg_revenue_per_template,
					revenue_rank
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`)
      : db.prepare(`
				INSERT OR REPLACE INTO ${CATEGORY_TABLE} (
					snapshot_at,
					freshness_timestamp,
					freshness_source,
					${CANONICAL_KEY_COLUMN},
					category,
					subcategory,
					templates_in_subcategory,
					total_sales_30d,
					total_revenue_30d,
					avg_revenue_per_template,
					revenue_rank
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

  const batch = [
    db.prepare(`DELETE FROM ${CATEGORY_TABLE} WHERE snapshot_at = ?`).bind(snapshotMeta.snapshotAt),
    ...records.map((record) =>
      schema === 'legacy'
        ? insert.bind(
            snapshotMeta.snapshotAt,
            buildCategorySnapshotKey(record),
            record.category,
            record.subcategory,
            record.templatesInSubcategory,
            record.totalSales30d,
            record.totalRevenue30d,
            record.avgRevenuePerTemplate,
            record.revenueRank
          )
        : insert.bind(
            snapshotMeta.snapshotAt,
            snapshotMeta.freshnessTimestamp,
            snapshotMeta.freshnessSource,
            buildCategorySnapshotKey(record),
            record.category,
            record.subcategory,
            record.templatesInSubcategory,
            record.totalSales30d,
            record.totalRevenue30d,
            record.avgRevenuePerTemplate,
            record.revenueRank
          )
    )
  ];

  await db.batch(batch);

  return {
    snapshotAt: snapshotMeta.snapshotAt,
    freshnessTimestamp: snapshotMeta.freshnessTimestamp,
    freshnessSource: snapshotMeta.freshnessSource,
    captured: records.length
  };
}

async function loadLeaderboardHistoryRows(
  db: D1Database,
  maxPoints: number = DEFAULT_MARKETPLACE_TREND_POINTS
): Promise<LeaderboardHistoryRow[]> {
  const snapshotTimes = await loadRecentSnapshotTimes(db, LEADERBOARD_TABLE, maxPoints);
  if (snapshotTimes.length === 0) return [];

  const placeholders = snapshotTimes.map(() => '?').join(', ');
  try {
    const keyColumn =
      (await getLeaderboardTableSchema(db)) === 'legacy'
        ? LEGACY_LEADERBOARD_KEY_COLUMN
        : CANONICAL_KEY_COLUMN;
    const result = await db
      .prepare(
        `
				SELECT
					snapshot_at,
					${keyColumn} AS record_key,
					template_name,
					category,
					creator_email,
					total_sales_30d
				FROM ${LEADERBOARD_TABLE}
				WHERE snapshot_at IN (${placeholders})
				ORDER BY snapshot_at ASC
			`
      )
      .bind(...snapshotTimes)
      .all<LeaderboardHistoryRow>();

    return result.results || [];
  } catch (err) {
    console.warn('[Marketplace History] Failed to load leaderboard history:', err);
    return [];
  }
}

async function loadCategoryHistoryRows(
  db: D1Database,
  maxPoints: number = DEFAULT_MARKETPLACE_TREND_POINTS
): Promise<CategoryHistoryRow[]> {
  const snapshotTimes = await loadRecentSnapshotTimes(db, CATEGORY_TABLE, maxPoints);
  if (snapshotTimes.length === 0) return [];

  const placeholders = snapshotTimes.map(() => '?').join(', ');
  try {
    const keyColumn =
      (await getCategoryTableSchema(db)) === 'legacy'
        ? LEGACY_CATEGORY_KEY_COLUMN
        : CANONICAL_KEY_COLUMN;
    const result = await db
      .prepare(
        `
				SELECT snapshot_at, ${keyColumn} AS record_key, avg_revenue_per_template
				FROM ${CATEGORY_TABLE}
				WHERE snapshot_at IN (${placeholders})
				ORDER BY snapshot_at ASC
			`
      )
      .bind(...snapshotTimes)
      .all<CategoryHistoryRow>();

    return result.results || [];
  } catch (err) {
    console.warn('[Marketplace History] Failed to load category history:', err);
    return [];
  }
}

async function loadRecentSnapshotTimes(
  db: D1Database,
  tableName: string,
  maxPoints: number
): Promise<string[]> {
  try {
    const result = await db
      .prepare(
        `
				SELECT DISTINCT snapshot_at
				FROM ${tableName}
				ORDER BY snapshot_at DESC
				LIMIT ?
			`
      )
      .bind(Math.max(1, maxPoints))
      .all<{ snapshot_at: string }>();

    return (result.results || [])
      .map((row) => row.snapshot_at)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
  } catch (err) {
    console.warn(`[Marketplace History] Failed to load snapshot times for ${tableName}:`, err);
    return [];
  }
}

async function getLeaderboardTableSchema(db: D1Database): Promise<MarketplaceTableSchema> {
  return resolveTableSchema(
    await loadTableColumnNames(db, LEADERBOARD_TABLE),
    LEADERBOARD_TABLE,
    CANONICAL_KEY_COLUMN,
    LEGACY_LEADERBOARD_KEY_COLUMN
  );
}

async function getCategoryTableSchema(db: D1Database): Promise<MarketplaceTableSchema> {
  return resolveTableSchema(
    await loadTableColumnNames(db, CATEGORY_TABLE),
    CATEGORY_TABLE,
    CANONICAL_KEY_COLUMN,
    LEGACY_CATEGORY_KEY_COLUMN
  );
}

async function loadTableColumnNames(db: D1Database, tableName: string): Promise<Set<string>> {
  const result = await db.prepare(`PRAGMA table_info(${tableName})`).all<TableColumnInfo>();
  return new Set(
    (result.results || [])
      .map((column) => column.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0)
  );
}

function resolveTableSchema(
  columns: ReadonlySet<string>,
  tableName: string,
  canonicalKeyColumn: string,
  legacyKeyColumn: string
): MarketplaceTableSchema {
  if (columns.has(canonicalKeyColumn)) return 'canonical';
  if (columns.has(legacyKeyColumn)) return 'legacy';

  throw new Error(
    `[Marketplace History] Unsupported schema for ${tableName}; expected ${canonicalKeyColumn} or ${legacyKeyColumn}.`
  );
}

function buildMetricPointMap<Row>(
  rows: ReadonlyArray<Row>,
  select: (row: Row) => { recordKey: string; snapshotAt: string; value: number }
): Map<string, MetricPoint[]> {
  const grouped = new Map<string, MetricPoint[]>();

  for (const row of rows) {
    const point = select(row);
    if (!point.recordKey) continue;

    const existing = grouped.get(point.recordKey) ?? [];
    existing.push({ snapshotAt: point.snapshotAt, value: point.value });
    grouped.set(point.recordKey, existing);
  }

  for (const points of grouped.values()) {
    points.sort((a, b) => a.snapshotAt.localeCompare(b.snapshotAt));
  }

  return grouped;
}

function getLeaderboardHistoryKey(row: LeaderboardHistoryRow): string {
  if (row.template_name && row.category && row.creator_email) {
    return buildLeaderboardSnapshotKey({
      templateName: row.template_name,
      category: row.category,
      creatorEmail: row.creator_email
    });
  }

  return row.record_key ?? '';
}

function mergeCurrentPoint(
  history: ReadonlyArray<MetricPoint>,
  currentPoint: MetricPoint,
  maxPoints: number
): MetricPoint[] {
  const deduped = new Map<string, MetricPoint>();

  for (const point of history) {
    if (point.snapshotAt > currentPoint.snapshotAt) continue;
    deduped.set(point.snapshotAt, point);
  }

  deduped.set(currentPoint.snapshotAt, currentPoint);

  return Array.from(deduped.values())
    .sort((a, b) => a.snapshotAt.localeCompare(b.snapshotAt))
    .slice(-Math.max(1, maxPoints));
}

function calculateChangePercent(current: number, previous: number | undefined): number | null {
  if (previous === undefined) return null;
  if (previous === 0) return current === 0 ? 0 : null;

  return normalizeSignedZero(roundTo(((current - previous) / previous) * 100, 1));
}

function getTrendDirection(changePercent: number): 'up' | 'down' | 'neutral' {
  if (changePercent > 0.1) return 'up';
  if (changePercent < -0.1) return 'down';
  return 'neutral';
}

function normalizeIsoTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeLeaderboardSnapshotTimestamp(snapshotAt: string): string {
  const normalized = normalizeIsoTimestamp(snapshotAt);
  return normalized ? getLastSyncTimeForDate(new Date(normalized)).toISOString() : snapshotAt;
}

function getLastSyncTimeForDate(referenceDate: Date): Date {
  const currentDay = referenceDate.getUTCDay();
  const currentHour = referenceDate.getUTCHours();
  let daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;

  if (currentDay === 1 && currentHour < 16) {
    daysSinceMonday = 7;
  }

  const lastSync = new Date(referenceDate);
  lastSync.setUTCDate(referenceDate.getUTCDate() - daysSinceMonday);
  lastSync.setUTCHours(16, 0, 0, 0);
  return lastSync;
}

function roundTo(value: number, decimals: number): number {
  const precision = 10 ** decimals;
  return Math.round(value * precision) / precision;
}

function normalizeSignedZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}
