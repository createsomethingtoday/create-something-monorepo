import {
  normalizeAnalyticsDays,
  type AnalyticsDays,
  type AnalyticsProperty
} from './analytics-dashboard';

export interface ReportWindow {
  start: string;
  end: string;
}
export interface ReportWindows {
  days: AnalyticsDays;
  current: ReportWindow;
  prior: ReportWindow;
}
export interface SourceStatus {
  id: string;
  label: string;
  status: 'ready' | 'unavailable';
  observedAt: string;
  latestAt: string | null;
  detail: string;
}
export interface ScorecardMetric {
  id: string;
  group: 'Discovery' | 'Usefulness' | 'Relationship' | 'Verified outcomes';
  label: string;
  unit: string;
  current: number | null;
  prior: number | null;
  source: string;
  definition: string;
}
export interface PropertyScore {
  property: AnalyticsProperty;
  views: number | null;
  priorViews: number | null;
  sessions: number | null;
  priorSessions: number | null;
  external: number | null;
  unclassified: number | null;
  excluded: number | null;
}
export interface WeeklyScorecard {
  version: 1;
  observedAt: string;
  windows: ReportWindows;
  sources: SourceStatus[];
  properties: PropertyScore[];
  metrics: ScorecardMetric[];
  audience: { eligible: number; active: number; total: number } | null;
  historicalDeliveries: number | null;
  topPages: Array<{ property: string; path: string; count: number }>;
  acquisition: Array<{ property: string; channel: string; current: number; prior: number }>;
  countries: Array<{ country: string; views: number }>;
  daily: Array<{ date: string; count: number }>;
  limitations: string[];
}

/** Complete UTC days, end exclusive. No partially elapsed day in either period. */
export function scorecardWindows(days: string | null, now = new Date()): ReportWindows {
  const count = normalizeAnalyticsDays(days);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = end - count * 86400000;
  return {
    days: count,
    current: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
    prior: {
      start: new Date(start - count * 86400000).toISOString(),
      end: new Date(start).toISOString()
    }
  };
}

export function formatWeeklyReport(report: WeeklyScorecard): string {
  const lines = [
    '# CREATE SOMETHING audience scorecard',
    `Observed: ${report.observedAt}`,
    `Current UTC: [${report.windows.current.start}, ${report.windows.current.end})`,
    `Prior UTC: [${report.windows.prior.start}, ${report.windows.prior.end})`,
    '',
    'Counts retain their own units; unavailable is never zero.',
    ''
  ];
  for (const group of ['Discovery', 'Usefulness', 'Relationship', 'Verified outcomes']) {
    lines.push(
      `## ${group}`,
      '',
      '| Measure | Current | Prior | Unit |',
      '| --- | ---: | ---: | --- |'
    );
    for (const m of report.metrics.filter((m) => m.group === group)) {
      lines.push(
        `| ${m.label} | ${m.current ?? 'Unavailable'} | ${m.prior ?? 'Unavailable'} | ${m.unit} |`
      );
    }
    lines.push('');
  }
  lines.push(
    '',
    '## Acquisition',
    '',
    'First observed public page-view referral per property session; missing source data is not zero.',
    '',
    '| Property | Channel | Current sessions | Prior sessions |',
    '| --- | --- | ---: | ---: |'
  );
  for (const row of report.acquisition)
    lines.push(`| ${row.property} | ${row.channel} | ${row.current} | ${row.prior} |`);
  lines.push(
    '',
    '## Country context',
    '',
    'Public page views in available sources; country is not a persona.',
    ''
  );
  for (const row of report.countries) lines.push(`- ${row.country}: ${row.views} page views`);
  lines.push(
    '## Property coverage',
    '',
    '| Property | Current views | Prior views | Current sessions | Prior sessions |',
    '| --- | ---: | ---: | ---: | ---: |'
  );
  for (const p of report.properties)
    lines.push(
      `| ${p.property} | ${p.views ?? 'Unavailable'} | ${p.priorViews ?? 'Unavailable'} | ${p.sessions ?? 'Unavailable'} | ${p.priorSessions ?? 'Unavailable'} |`
    );
  lines.push(
    '',
    `Audience snapshot (not period growth): ${report.audience ? `${report.audience.eligible} eligible / ${report.audience.active} active / ${report.audience.total} total records` : 'Unavailable'}`,
    `Historical delivery ledger: ${report.historicalDeliveries ?? 'Unavailable'} (excluded from period counts; not fresh provider evidence)`,
    '',
    '## Source checks',
    ''
  );
  for (const s of report.sources)
    lines.push(
      `- ${s.label}: ${s.status}; checked ${s.observedAt}; latest read record ${s.latestAt ?? 'none available'}. ${s.detail}`
    );
  lines.push('', '## Definitions', '');
  for (const m of report.metrics) lines.push(`- ${m.label}: ${m.definition}`);
  lines.push('', '## Limits', '', ...report.limitations.map((s) => `- ${s}`));
  return lines.join('\n');
}
