import type { MarketActivitySummary } from '../../src/lib/npg/market';
export function marketFixture(empty = false): MarketActivitySummary {
  return {
    scope: 'owner_private',
    generatedAt: Date.now(),
    window: 'all_saved_history',
    totals: empty
      ? {
          searches: 0,
          matchingResults: 0,
          unknownResultCounts: 0,
          exportsRequested: 0,
          exportsPrepared: 0
        }
      : {
          searches: 5,
          matchingResults: 350,
          unknownResultCounts: 1,
          exportsRequested: 3,
          exportsPrepared: 2
        },
    locales: empty
      ? []
      : [
          {
            locale: 'Springfield, MO',
            searches: 3,
            matchingResults: 300,
            unknownResultCounts: 0,
            exportsRequested: 2,
            exportsPrepared: 1,
            latestSearchAt: Date.UTC(2026, 10, 20),
            sourceFetchedAt: '2026-11-10',
            incompleteSearches: 1
          },
          {
            locale: 'Columbia, MO',
            searches: 1,
            matchingResults: 50,
            unknownResultCounts: 0,
            exportsRequested: 1,
            exportsPrepared: 1,
            latestSearchAt: Date.UTC(2026, 10, 21),
            sourceFetchedAt: '2026-11-10',
            incompleteSearches: 0
          },
          {
            locale: 'Locale not recorded',
            searches: 1,
            matchingResults: 0,
            unknownResultCounts: 1,
            exportsRequested: 0,
            exportsPrepared: 0,
            latestSearchAt: null,
            sourceFetchedAt: null,
            incompleteSearches: 0
          }
        ],
    limitations: [
      'Only your saved conversations are included. Matching results are not unique candidates.',
      'Registry records do not establish active licensure, board certification, availability, or hiring demand.',
      'Legacy search times may reflect the conversation’s last update.'
    ]
  };
}
