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
/** One template's sales in the 90 days to the window end. */
export interface Seller90 {
  templateId: string;
  sales: number;
  fulfillmentSales?: number;
  revenue: number;
}
/** Why the 90-day window is not in a snapshot. */
export interface WindowNote {
  kind: '90-day-source-left-out';
  reason: string;
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
  windowNotes: WindowNote[];
  ranAt: string;
}
export const SELLERS_TABLE: string;
export const SELLER_FIELDS: Record<string, string>;
export const SELLERS_90D_TABLE: string;
export const SELLER_90D_FIELDS: Record<string, string>;
export function latestMondayBoundary(now?: Date): Date;
export function parseMetric(value: unknown): number;
export function createAirtableRest(options: {
  apiKey: string | undefined;
  baseId: string | undefined;
  fetchImpl?: typeof fetch;
  requestDelayMs?: number;
}): AirtableRest;
export function readSellersFromAirtable(rest: AirtableRest, windowEnd: Date): Promise<Seller[]>;
export function readSellers90FromAirtable(rest: AirtableRest, windowEnd: Date): Promise<Seller90[]>;
/** The 90-day rows, or a note that says why they are left out. It does not throw. */
export function readSellers90OrNote(
  rest: AirtableRest,
  windowEnd: Date
): Promise<{ sellers90: Seller90[] | undefined; windowNotes: WindowNote[] }>;
export function buildSnapshotFromAirtable(
  rest: AirtableRest,
  input: {
    sellers: Seller[];
    snapshotAt: string;
    /** Every template with a delivered sale in the 90 days to snapshotAt. Optional; left out when it fails its checks. */
    sellers90?: Seller90[];
  }
): Promise<{
  snapshot: MarketplaceSnapshot;
  taxonomyNotes: unknown[];
  creatorEmailNotes: unknown[];
  windowNotes: WindowNote[];
}>;
export function publishSnapshot(rest: AirtableRest, snapshotTable: string | undefined, snapshot: MarketplaceSnapshot): Promise<string>;
export function publishMarketplaceInsights(
  rest: AirtableRest,
  options: { snapshotTable?: string; asOf?: Date; execute?: boolean }
): Promise<InsightsReceipt>;
