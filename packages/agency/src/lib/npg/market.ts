export type MarketMetrics = {
  searches: number;
  matchingResults: number;
  unknownResultCounts: number;
  exportsRequested: number;
  exportsPrepared: number;
};
export type MarketLocale = MarketMetrics & {
  locale: string;
  latestSearchAt: number | null;
  sourceFetchedAt: string | null;
  incompleteSearches: number;
};
export type MarketActivity = {
  scope: 'owner_private';
  generatedAt: number;
  window: 'all_saved_history';
  totals: MarketMetrics;
  locales: MarketLocale[];
  limitations: string[];
};

export type MarketActivitySummary = MarketActivity;
