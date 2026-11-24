/**
 * Segment maths for Marketplace Insights. One subcategory row is one segment.
 * Pure functions: the table, the cards and the tests all read from here.
 */
export type SegmentWindow = '30d' | '90d';

export interface SegmentRow {
  templatesInSubcategory: number;
  totalSales30d: number;
  totalRevenue30d: number;
  fulfillmentSales30d?: number;
  listedTemplates?: number;
  templatesWithSales90d?: number;
  totalSales90d?: number;
  totalRevenue90d?: number;
  fulfillmentSales90d?: number;
}

/** Below this many templates sold, a segment's sell-through moves a lot from one week to the next. */
export const THIN_SELLERS = 15;

export function hasSupply(rows: ReadonlyArray<SegmentRow>): boolean {
  return rows.some((row) => row.listedTemplates !== undefined);
}

export function hasNinetyDays(rows: ReadonlyArray<SegmentRow>): boolean {
  return rows.some((row) => row.totalSales90d !== undefined);
}

export function sellingTemplates(row: SegmentRow, window: SegmentWindow): number {
  return window === '90d' ? (row.templatesWithSales90d ?? 0) : row.templatesInSubcategory;
}

export function segmentSales(row: SegmentRow, window: SegmentWindow): number {
  return window === '90d' ? (row.totalSales90d ?? 0) : row.totalSales30d;
}

export function segmentRevenue(row: SegmentRow, window: SegmentWindow): number {
  return window === '90d' ? (row.totalRevenue90d ?? 0) : row.totalRevenue30d;
}

/** Revenue per template that sold in the window. Zero when none sold. */
export function revenuePerSeller(row: SegmentRow, window: SegmentWindow): number {
  const sellers = sellingTemplates(row, window);
  return sellers > 0 ? segmentRevenue(row, window) / sellers : 0;
}

/**
 * Share of listed templates that sold at least once in the window, 0 to 1.
 * Null when the snapshot has no supply for the row.
 */
export function sellThrough(row: SegmentRow, window: SegmentWindow): number | null {
  if (row.listedTemplates === undefined || row.listedTemplates <= 0) return null;
  return Math.min(1, sellingTemplates(row, window) / row.listedTemplates);
}

/** Few templates sold in the window: read the rate as a hint, not as a ranking. */
export function isThin(row: SegmentRow, window: SegmentWindow): boolean {
  return sellingTemplates(row, window) < THIN_SELLERS;
}

/** A row's revenue is marked as an estimate from this share of assumed sales. */
export const ESTIMATE_SHARE = 0.25;

/**
 * Share of the row's sales in the window that went through fulfillment links,
 * 0 to 1. The buyer paid the creator off-platform, so that revenue is assumed
 * at list price. Null when the snapshot has no split for the window or the
 * row has no sales.
 */
export function assumedRevenueShare(row: SegmentRow, window: SegmentWindow = '30d'): number | null {
  const assumed = window === '90d' ? row.fulfillmentSales90d : row.fulfillmentSales30d;
  const sales = segmentSales(row, window);
  if (assumed === undefined || sales <= 0) return null;
  return Math.min(1, assumed / sales);
}

/** True when enough of the row's revenue is assumed that the figure reads as an estimate. */
export function isEstimate(row: SegmentRow, window: SegmentWindow = '30d'): boolean {
  return (assumedRevenueShare(row, window) ?? 0) >= ESTIMATE_SHARE;
}

/** One decimal for every rate, so a column of rates compares by eye. */
export function formatShare(share: number): string {
  const percent = share * 100;
  if (percent === 0) return '0%';
  if (percent < 0.1) return '<0.1%';
  return `${percent.toFixed(1)}%`;
}

/** Whole percent, for a share that labels a marker and is not compared down a column. */
export function formatWholeShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}
