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

export type UsageStudy = 'all' | 'review-mcp' | 'asset-dashboard';

/** Definitions share approved snapshot values; no derived ROI or conversion rate. */
export const webflowUsageMetrics = [
  {
    id: 'template-review', study: 'review-mcp', label: 'Template Review MCP',
    count: webflowUsageSnapshot.review[0].calls, unit: 'recorded tool calls',
    definition: 'Calls to tools that retrieve template review context, run checks, and support review actions.',
    detail: '87 tool failures were recorded within these calls. A tool call is one step in a review, not a completed review.',
    limit: 'This count does not establish review quality or final approval.',
    source: 'Cloudflare D1 · tool-invocation records',
    href: '/case-studies/webflow-marketplace/review-mcp'
  },
  {
    id: 'app-review', study: 'review-mcp', label: 'App Review MCP',
    count: webflowUsageSnapshot.review[1].calls, unit: 'recorded tool calls',
    definition: 'Calls to tools that bring app versions, review context, and submission evidence into the reviewer’s workflow.',
    detail: 'No tool failures were recorded in this window. Recording is best effort, so that is not a guarantee of perfect reliability.',
    limit: 'Tool results do not establish review quality or final approval.',
    source: 'Cloudflare D1 · tool-invocation records',
    href: '/case-studies/webflow-marketplace/review-mcp'
  },
  {
    id: 'dashboard-loads', study: 'asset-dashboard', label: 'Dashboard loads',
    count: webflowUsageSnapshot.dashboard[0].count, unit: 'recorded load events',
    definition: 'Events recorded when the earlier Asset Dashboard loaded. Repeat visits can produce more than one event.',
    detail: 'These records belong to the legacy application, not the Cloud port or native Creator Hub.',
    limit: 'A load event does not establish a unique creator or a completed task.',
    source: 'Cloudflare D1 · legacy Dashboard analytics',
    href: '/case-studies/webflow-marketplace/asset-dashboard'
  },
  {
    id: 'asset-updates', study: 'asset-dashboard', label: 'Asset updates',
    count: webflowUsageSnapshot.dashboard[1].count, unit: 'completion events',
    definition: 'Asset-update completion events recorded by the earlier Asset Dashboard.',
    detail: 'A completion event is an application event label, not an independent check of the saved business record. Events can be missed or repeated.',
    limit: 'This count does not describe the Cloud port or native Creator Hub.',
    source: 'Cloudflare D1 · legacy Dashboard analytics',
    href: '/case-studies/webflow-marketplace/asset-dashboard'
  }
] as const;
