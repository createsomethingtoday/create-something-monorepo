import type { MarketplaceSnapshot } from './marketplace-snapshot.mjs';

export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}
export interface AirtableRest {
  request(method: string, path: string, body?: unknown): Promise<any>;
  listAll(table: string, fields: string[]): Promise<AirtableRecord[]>;
}
export interface Seller {
  templateId: string;
  mrpId: string;
  name: string;
  sales: number;
  fulfillmentSales?: number;
  revenue: number;
}
export interface InsightsReceipt {
  mode: 'execute' | 'dry-run';
  source: 'airtable' | 'snowflake';
  snapshotAt: string;
  summary: MarketplaceSnapshot['summary'];
  leaderboardRows: number;
  categoryRows: number;
  recordId?: string;
  legacyTablesModified: false;
  taxonomyNotes: unknown[];
  creatorEmailNotes: unknown[];
  ranAt: string;
}
export const SELLERS_TABLE: string;
export const SELLER_FIELDS: Record<string, string>;
export function latestMondayBoundary(now?: Date): Date;
export function parseMetric(value: unknown): number;
export function createAirtableRest(options: {
  apiKey: string | undefined;
  baseId: string | undefined;
  fetchImpl?: typeof fetch;
  requestDelayMs?: number;
}): AirtableRest;
export function readSellersFromAirtable(rest: AirtableRest, windowEnd: Date): Promise<Seller[]>;
export function buildSnapshotFromAirtable(
  rest: AirtableRest,
  input: { sellers: Seller[]; snapshotAt: string }
): Promise<{ snapshot: MarketplaceSnapshot; taxonomyNotes: unknown[]; creatorEmailNotes: unknown[] }>;
export function publishSnapshot(rest: AirtableRest, snapshotTable: string | undefined, snapshot: MarketplaceSnapshot): Promise<string>;
export function publishMarketplaceInsights(
  rest: AirtableRest,
  options: { snapshotTable?: string; asOf?: Date; execute?: boolean }
): Promise<InsightsReceipt>;
