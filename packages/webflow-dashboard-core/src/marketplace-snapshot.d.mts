export interface SnapshotLeaderboardRow {
  templateId: string;
  mrpId: string;
  templateName: string;
  creatorEmail: string;
  category: string;
  totalSales30d: number;
  totalRevenue30d: number;
  avgRevenuePerSale: number;
  salesRank: number;
  revenueRank: number;
  /** Sales through creator fulfillment links (paid off-platform). Absent in older snapshots. */
  fulfillmentSales30d?: number;
}
export interface SnapshotCategoryRow {
  category: string;
  subcategory: string;
  templatesInSubcategory: number;
  totalSales30d: number;
  totalRevenue30d: number;
  avgRevenuePerTemplate: number;
  revenueRank: number;
  /** Part of totalSales30d through fulfillment links; its revenue is assumed at list price. */
  fulfillmentSales30d?: number;
  /** Templates listed now or sold in a window of this snapshot. Present only when the source has supply. */
  listedTemplates?: number;
  /** 90-day window ending at snapshotAt. Present only when the source has it. */
  templatesWithSales90d?: number;
  totalSales90d?: number;
  totalRevenue90d?: number;
  /** Part of totalSales90d through fulfillment links. Present only when the 90-day source has the split. */
  fulfillmentSales90d?: number;
}
export interface MarketplaceSnapshot {
  schemaVersion: 1;
  snapshotAt: string;
  summary: {
    totalSales: number;
    totalRevenue: number;
    sellingTemplates: number;
    /** Part of totalSales made through fulfillment links. Absent in older snapshots. */
    fulfillmentSales?: number;
    /** Unique templates listed now or sold in a window of this snapshot. */
    listedTemplates?: number;
    totalSales90d?: number;
    totalRevenue90d?: number;
    sellingTemplates90d?: number;
  };
  leaderboard: SnapshotLeaderboardRow[];
  categories: SnapshotCategoryRow[];
}
export const SNAPSHOT_SCHEMA_VERSION: 1;
export const SNAPSHOT_FIELD_LIMIT: number;
export function buildMarketplaceSnapshot(input: {
  sellers: Array<{
    templateId: string;
    mrpId: string;
    name: string;
    sales: number;
    revenue: number;
    fulfillmentSales?: number;
  }>;
  assets: Array<{ templateId: string; creatorEmail?: string; categories: string[]; listed?: boolean }>;
  categories: Array<{ name: string; group: string }>;
  snapshotAt: string;
  sellers90?: Array<{ templateId: string; sales: number; revenue: number; fulfillmentSales?: number }>;
}): MarketplaceSnapshot;
export function validateMarketplaceSnapshot(snapshot: unknown): MarketplaceSnapshot;
export function snapshotToFields(snapshot: MarketplaceSnapshot): Record<string, string>;
export function snapshotFromFields(fields: Record<string, unknown>): MarketplaceSnapshot;
export function fetchMarketplaceSnapshot(
  env: {
    AIRTABLE_API_KEY?: string;
    AIRTABLE_BASE_ID?: string;
    MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID?: string;
  },
  fetcher?: typeof fetch
): Promise<(MarketplaceSnapshot & { contentVersion: string }) | null>;
