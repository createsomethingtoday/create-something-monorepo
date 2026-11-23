import type { MarketActivity, MarketLocale, MarketMetrics } from '../../npg/market';
/** Only query geography is retained. Never copy names, NPIs, street addresses or result rows. */
export function marketLocale(args: Record<string, unknown>, knownNational = false): string {
  if (
    typeof args.center_address === 'string' &&
    typeof args.radius_miles === 'number' &&
    Number.isFinite(args.radius_miles)
  )
    return `Radius search (${args.radius_miles} mi)`;
  const state =
    typeof args.state === 'string' && /^[a-z]{2}$/i.test(args.state)
      ? args.state.toUpperCase()
      : '';
  const city =
    typeof args.city === 'string' && /^[\p{L} .'-]{1,100}$/u.test(args.city.trim())
      ? args.city
          .trim()
          .toLowerCase()
          .replace(/(^|[ .'-])\p{L}/gu, (value) => value.toUpperCase())
      : '';
  if (city && state) return `${city}, ${state}`;
  if (state) return state;
  const markets: Record<string, string> = {
    'npg-family-np-nationwide': 'Nationwide',
    'npg-family-np-springfield-mo': 'Springfield, MO',
    'npg-family-np-arlington-tx': 'Arlington, TX'
  };
  return (
    (typeof args.market_id === 'string' ? markets[args.market_id] : undefined) ??
    (knownNational ? 'Nationwide' : 'Unspecified locale')
  );
}
function legacyLocale(data: any) {
  try {
    const url = new URL(data.csv_download_url);
    if (
      url.origin !== 'https://createsomething.agency' ||
      url.pathname !== '/delivery/abundance/sourcing.csv'
    )
      return 'Unspecified locale';
    const args: Record<string, unknown> = Object.fromEntries(url.searchParams);
    if (args.radius_miles) args.radius_miles = Number(args.radius_miles);
    return marketLocale(args, true);
  } catch {
    return 'Unspecified locale';
  }
}
const empty = (): MarketMetrics => ({
  searches: 0,
  matchingResults: 0,
  unknownResultCounts: 0,
  exportsRequested: 0,
  exportsPrepared: 0
});
type SavedConversation = { id: string; updated_at: number; state_json: string };
type ExportEvent = {
  locale: string;
  status: string;
  requested_at: number;
  requestedCount?: number;
  preparedCount?: number;
};
export function summarizeMarket(
  conversations: SavedConversation[],
  exports: ExportEvent[],
  now = Date.now()
): MarketActivity {
  const groups = new Map<string, MarketLocale>();
  function group(locale: string) {
    let row = groups.get(locale);
    if (!row) {
      row = {
        ...empty(),
        locale,
        latestSearchAt: null,
        sourceFetchedAt: null,
        incompleteSearches: 0
      };
      groups.set(locale, row);
    }
    return row;
  }
  const seen = new Set<string>();
  for (const c of conversations) {
    let state: any;
    try {
      state = JSON.parse(c.state_json);
    } catch {
      continue;
    }
    if (!Array.isArray(state.sources)) continue;
    state.sources.forEach((source: any, index: number) => {
      if (!['search_registry_sourcing', 'search_coverage_candidates'].includes(source?.tool))
        return;
      const id = source.market?.id ? String(source.market.id) : `${c.id}:legacy:${index}`;
      if (seen.has(id)) return;
      seen.add(id);
      const data = source.data && typeof source.data === 'object' ? source.data : {};
      // Stored current metadata is produced by marketLocale; historical source links are canonical only.
      const locale =
        typeof source.market?.locale === 'string'
          ? source.market.locale
          : source.tool === 'search_coverage_candidates'
            ? marketLocale({
                market_id: data.market_id,
                state: data.location?.state,
                city: data.location?.city
              })
            : legacyLocale(data);
      const row = group(locale);
      row.searches++;
      if (typeof data.total === 'number' && Number.isSafeInteger(data.total) && data.total >= 0)
        row.matchingResults += data.total;
      else row.unknownResultCounts++;
      const at = typeof source.market?.at === 'number' ? source.market.at : null;
      if (at !== null) row.latestSearchAt = Math.max(row.latestSearchAt ?? 0, at);
      const sourceDate =
        data.source_fetched_at ?? data.source_published_at ?? data.source_latest_fetched_at;
      if (typeof sourceDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sourceDate))
        row.sourceFetchedAt =
          !row.sourceFetchedAt || sourceDate > row.sourceFetchedAt
            ? sourceDate
            : row.sourceFetchedAt;
      if (
        data.completeness &&
        !['complete', 'complete_snapshot', 'all_matching_records_in_selected_snapshot'].includes(
          data.completeness
        )
      )
        row.incompleteSearches++;
    });
  }
  for (const event of exports) {
    const row = group(event.locale);
    row.exportsRequested += event.requestedCount ?? 1;
    row.exportsPrepared += event.preparedCount ?? (event.status === 'prepared' ? 1 : 0);
  }
  const locales = [...groups.values()].sort(
    (a, b) => b.searches - a.searches || a.locale.localeCompare(b.locale)
  );
  const totals = empty();
  for (const row of locales)
    for (const key of Object.keys(totals) as (keyof MarketMetrics)[]) totals[key] += row[key];
  return {
    scope: 'owner_private',
    generatedAt: now,
    window: 'all_saved_history',
    totals,
    locales,
    limitations: [
      'Your saved registry sourcing and coverage candidate searches only. Counts include pagination and repeated searches. Result totals are upstream registry query totals, never displayed page sizes, unique candidates or a market population estimate. Coverage readiness filtering applies only to the returned page; totals do not count readiness-qualified candidates.',
      'Historical locale is recovered from canonical CSV parameters, approved named markets or coarse state/city evidence where available; otherwise it remains unspecified. Known national queries are labeled Nationwide. Historical search time is unknown.',
      'CSV requests are tracked from this release onward. Prepared means a streaming response was created, not a confirmed complete export, download or delivery. Earlier exports and telemetry gaps are unknown.',
      'Source dates describe registry freshness, not verified licensure, qualifications, availability, contact permission or recruiting fit. Missing completeness evidence remains unknown.'
    ]
  };
}
export async function readMarketActivity(db: D1Database, owner: string, now = Date.now()) {
  // Scalar JSON projection keeps candidate rows/messages out of analytics reads. Keyset
  // pages bound D1 response size even when an owner has a long sourcing history.
  const conversations: SavedConversation[] = [];
  let afterConversation = '',
    afterIndex = -1;
  let searchesCapped = false;
  for (let pageNumber = 0; pageNumber < 20; pageNumber++) {
    const page = await db
      .prepare(
        `SELECT c.id,CAST(s.key AS INTEGER) AS source_index,
      json_object('sources',json_array(json_object('tool',json_extract(s.value,'$.tool'),
        'market',json_extract(s.value,'$.market'),
        'data',json_object('total',json_extract(s.value,'$.data.total'),
          'market_id',json_extract(s.value,'$.data.market_id'),
          'location',json_object('state',json_extract(s.value,'$.data.location.state'),'city',json_extract(s.value,'$.data.location.city')),
          'source_latest_fetched_at',json_extract(s.value,'$.data.source_latest_fetched_at'),
          'source_fetched_at',json_extract(s.value,'$.data.source_fetched_at'),
          'source_published_at',json_extract(s.value,'$.data.source_published_at'),
          'completeness',json_extract(s.value,'$.data.completeness'),
          'csv_download_url',json_extract(s.value,'$.data.csv_download_url'))))) AS state_json
      FROM npg_analyst_conversations c,json_each(c.state_json,'$.sources') s
      WHERE c.owner_id=? AND c.scope='npg' AND json_extract(s.value,'$.tool') IN ('search_registry_sourcing','search_coverage_candidates')
      AND (c.id>? OR (c.id=? AND CAST(s.key AS INTEGER)>?))
      ORDER BY c.id,CAST(s.key AS INTEGER) LIMIT 250`
      )
      .bind(owner, afterConversation, afterConversation, afterIndex)
      .all<{ id: string; source_index: number; state_json: string }>();
    for (const row of page.results)
      conversations.push({
        id: `${row.id}:${row.source_index}`,
        updated_at: 0,
        state_json: row.state_json
      });
    if (page.results.length < 250) break;
    const last = page.results.at(-1)!;
    afterConversation = last.id;
    afterIndex = last.source_index;
    if (pageNumber === 19) searchesCapped = true;
  }
  // Aggregate growing export history inside D1 rather than paging every request.
  const exportGroups = await db
    .prepare(
      `SELECT locale,count(*) AS requestedCount,
    sum(CASE WHEN status='prepared' THEN 1 ELSE 0 END) AS preparedCount
    FROM npg_registry_export_events WHERE owner_id=? GROUP BY locale`
    )
    .bind(owner)
    .all<{ locale: string; requestedCount: number; preparedCount: number }>();
  const events: ExportEvent[] = exportGroups.results.map((row) => ({
    ...row,
    status: 'aggregate',
    requested_at: 0
  }));
  const result = summarizeMarket(conversations, events, now);
  if (searchesCapped)
    result.limitations.unshift(
      'Partial history: this view reached its bounded limit of 5,000 saved registry searches. Counts are lower bounds; additional history may be omitted.'
    );
  return result;
}
