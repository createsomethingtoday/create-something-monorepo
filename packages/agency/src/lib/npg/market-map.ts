import type { MarketActivitySummary, MarketLocale, MarketMetrics } from './market';
import { MARKET_STATES } from './assets/us-states';
export { MARKET_STATES, MARKET_MAP_VIEWBOX } from './assets/us-states';
export type MarketStateActivity = MarketMetrics & {
  code: string;
  name: string;
  locales: MarketLocale[];
  incompleteSearches: number;
  latestSearchAt: number | null;
  sourceFetchedAt: string | null;
};
const keys = [
  'searches',
  'matchingResults',
  'unknownResultCounts',
  'exportsRequested',
  'exportsPrepared'
] as const;
const emptyMetrics = (): MarketMetrics => ({
  searches: 0,
  matchingResults: 0,
  unknownResultCounts: 0,
  exportsRequested: 0,
  exportsPrepared: 0
});
/** Only exact state names/codes or explicit city + state are assigned geometry. */
export function resolveMarketState(locale: string): string | null {
  const input = locale.trim();
  if (/\b(?:unknown|unspecified|nationwide|radius)\b/i.test(input)) return null;
  const exact = MARKET_STATES.find(
    (s) =>
      s.code.toLowerCase() === input.toLowerCase() || s.name.toLowerCase() === input.toLowerCase()
  );
  if (exact) return exact.code;
  const city = /^([\p{L}][\p{L} .’'\-]*),\s*([a-z]{2})$/iu.exec(input);
  return city
    ? (MARKET_STATES.find((s) => s.code.toLowerCase() === city[2].toLowerCase())?.code ?? null)
    : null;
}
export function projectMarketActivity(summary: MarketActivitySummary): {
  states: MarketStateActivity[];
  unmapped: MarketLocale[];
  mappedTotals: MarketMetrics;
} {
  const states: MarketStateActivity[] = MARKET_STATES.map(({ code, name }) => ({
    code,
    name,
    ...emptyMetrics(),
    locales: [],
    incompleteSearches: 0,
    latestSearchAt: null,
    sourceFetchedAt: null
  }));
  const unmapped: MarketLocale[] = [];
  const mappedTotals = emptyMetrics();
  const byCode = new Map(states.map((state) => [state.code, state]));
  for (const locale of summary.locales) {
    const code = resolveMarketState(locale.locale);
    const state = code ? byCode.get(code) : undefined;
    if (!state) {
      unmapped.push(locale);
      continue;
    }
    state.locales.push(locale);
    for (const key of keys) {
      state[key] += locale[key];
      mappedTotals[key] += locale[key];
    }
    state.incompleteSearches += locale.incompleteSearches;
    if (locale.latestSearchAt !== null)
      state.latestSearchAt = Math.max(
        state.latestSearchAt ?? locale.latestSearchAt,
        locale.latestSearchAt
      );
    if (
      locale.sourceFetchedAt &&
      (!state.sourceFetchedAt || locale.sourceFetchedAt > state.sourceFetchedAt)
    )
      state.sourceFetchedAt = locale.sourceFetchedAt;
  }
  return { states, unmapped, mappedTotals };
}
export function matchCountLabel(
  value: Pick<MarketMetrics, 'searches' | 'matchingResults' | 'unknownResultCounts'>
): string {
  if (value.searches === 0 || value.unknownResultCounts >= value.searches) return 'Matches unknown';
  const count = value.matchingResults.toLocaleString('en-US');
  return value.unknownResultCounts > 0
    ? `${count} known matches · ${value.unknownResultCounts.toLocaleString('en-US')} ${value.unknownResultCounts === 1 ? 'count' : 'counts'} unknown`
    : `${count} matches`;
}
