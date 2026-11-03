/**
 * Public aggregate snapshot approved for the portfolio on November 3, 2026.
 * Source queries and private readbacks: artifacts/webflow-usage-2026-11-03
 * in the originating checkout. Linear CRE-2341 owns the release evidence.
 * This is a fixed historical window, not a live usage counter.
 */
export const webflowUsageSnapshot = {
  period: '4 October–2 November 2026 · UTC',
  startInclusive: '2026-10-04T00:00:00Z',
  endExclusive: '2026-11-03T00:00:00Z',
  checkedOn: '3 November 2026',
  review: [
    { label: 'Template Review MCP', calls: 9188, failures: 87 },
    { label: 'App Review MCP', calls: 959, failures: 0 }
  ],
  dashboard: [
    { label: 'Dashboard-load events', count: 4042 },
    { label: 'Asset-update completion events', count: 251 }
  ]
} as const;
