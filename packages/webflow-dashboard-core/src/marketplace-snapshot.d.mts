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
}
export interface SnapshotCategoryRow {
  category: string;
  subcategory: string;
  templatesInSubcategory: number;
  totalSales30d: number;
  totalRevenue30d: number;
  avgRevenuePerTemplate: number;
  revenueRank: number;
}
export interface MarketplaceSnapshot {
  schemaVersion: 1;
  snapshotAt: string;
  summary: { totalSales: number; totalRevenue: number; sellingTemplates: number };
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
  }>;
  assets: Array<{ templateId: string; creatorEmail: string; categories: string[] }>;
  categories: Array<{ name: string; group: string }>;
  snapshotAt: string;
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
): Promise<MarketplaceSnapshot | null>;
