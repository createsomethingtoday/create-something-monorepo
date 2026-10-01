// The public search API is unauthenticated with CORS `*`, so exact creator
// sales and traffic counts must never leave the worker. Each value is floored
// to the highest threshold it clears. The thresholds are the union of every
// consumer's `>=` checks (card signals, chat/WebMCP demand tiers, grid
// telemetry), so those checks evaluate identically on bucketed values.
// Ranking still uses the exact counts in SQL.
const PURCHASE_FLOORS = [500, 250, 100, 50, 25, 20, 10, 1] as const;
const VIEWER_FLOORS = [1_000_000, 500_000, 250_000, 100_000, 50_000, 25_000, 10_000, 5_000, 1_000, 1] as const;

function floorTo(value: number | null, floors: readonly number[]): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  for (const floor of floors) {
    if (value >= floor) return floor;
  }
  return 0;
}

export function publicPurchaseBucket(value: number | null): number | null {
  return floorTo(value, PURCHASE_FLOORS);
}

export function publicViewerBucket(value: number | null): number | null {
  return floorTo(value, VIEWER_FLOORS);
}
