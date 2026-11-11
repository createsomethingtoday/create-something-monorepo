import { ELIGIBLE_SUBSCRIBERS_PREDICATE } from '@create-something/canon/newsletter/audience';
import {
  SUPPORTED_ANALYTICS_PROPERTIES,
  normalizeAnalyticsPath,
  type AnalyticsProperty
} from '../admin/analytics-dashboard';
import {
  scorecardWindows,
  type WeeklyScorecard,
  type SourceStatus,
  type ScorecardMetric,
  type PropertyScore,
  type ReportWindows
} from '../admin/weekly-scorecard';
import { summarizeNewsletterSessions } from './newsletter-analytics';
import { NEWSLETTER_CAMPAIGNS } from '../newsletter/measurement';

/** Only SELECT is exposed to the reader; no client-supplied SQL, property or database selector. */
export type AnalyticsReadDatabase = Pick<D1Database, 'prepare'>;
export interface ScorecardBindings {
  DB?: AnalyticsReadDatabase;
  LMS_DB?: AnalyticsReadDatabase;
  TELEMETRY_DB?: AnalyticsReadDatabase;
  SCHEDULER_REPORTS?: {
    getBookingSummary(windows: Pick<ReportWindows, 'current' | 'prior'>): Promise<{
      source: 'scheduler-receipts';
      current: { committed: number; rescheduled: number; cancelled: number };
      prior: { committed: number; rescheduled: number; cancelled: number };
      latestAt: string | null;
    }>;
  };
}
export const EVENT_LIMIT = 20000;
export const PUBLIC_HOSTS: Record<AnalyticsProperty, string[]> = {
  agency: ['createsomething.agency', 'www.createsomething.agency'],
  io: ['createsomething.io', 'www.createsomething.io'],
  ltd: ['createsomething.ltd', 'www.createsomething.ltd'],
  space: ['createsomething.space', 'www.createsomething.space'],
  lms: ['learn.createsomething.space']
};
export interface ReportEvent {
  session_id: string;
  property: AnalyticsProperty;
  action: string;
  category: string;
  url: string;
  user_agent: string | null;
  created_at: string;
  traffic_class: string | null;
  campaign: string | null;
  measurement: string | null;
  referrer?: string | null;
  ip_country?: string | null;
}
export const REPORT_EVENTS_SQL = `SELECT session_id, property, category, action, url, user_agent, referrer, ip_country,
  strftime('%Y-%m-%dT%H:%M:%fZ', created_at) AS created_at,
  CASE WHEN json_valid(metadata) THEN COALESCE(json_extract(metadata, '$.trafficClass'), json_extract(metadata, '$.traffic_class')) END AS traffic_class,
  CASE WHEN json_valid(metadata) THEN json_extract(metadata, '$.newsletterCampaign') END AS campaign,
  CASE WHEN json_valid(metadata) THEN json_extract(metadata, '$.newsletterMeasurement') END AS measurement
  FROM unified_events WHERE property IN (%PROPERTIES%)
    AND created_at >= ? AND created_at < ?
    AND julianday(created_at) >= julianday(?) AND julianday(created_at) < julianday(?)
  LIMIT ${EVENT_LIMIT + 1}`;

function eventClassification(e: ReportEvent): 'external' | 'unknown' | 'excluded' {
  try {
    const url = new URL(e.url);
    const hosts = PUBLIC_HOSTS[e.property];
    if (
      !hosts?.includes(url.hostname.toLowerCase()) ||
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    )
      return 'excluded';
    if (normalizeAnalyticsPath(url.pathname) === '/[redacted]') return 'excluded';
    // A public page carrying credentials is private traffic too. All query strings are discarded.
    if (
      [...url.searchParams.keys()].some((k) =>
        /token|secret|password|email|code|key|credential|session|signature|access|invite|recipient/i.test(
          k
        )
      )
    )
      return 'excluded';
    const classifications = [e.traffic_class, ...url.searchParams.getAll('traffic_class')].filter(
      Boolean
    );
    if (classifications.some((c) => c !== 'external' && c !== 'unknown')) return 'excluded';
    if (
      /(?:bot|crawler|spider|headless|playwright|puppeteer|lighthouse|curl|wget|python|httpclient|selenium|uptime|monitor)/i.test(
        e.user_agent ?? ''
      )
    )
      return 'excluded';
    return e.traffic_class === 'external' ? 'external' : 'unknown';
  } catch {
    return 'excluded';
  }
}

/** Most restrictive event wins across the source session, including both comparison windows. */
export function classifyReportEvents(events: ReportEvent[]) {
  const classes = new Map<string, 'external' | 'unknown' | 'excluded'>();
  for (const e of events) {
    const next = !e.session_id ? 'excluded' : eventClassification(e);
    const old = classes.get(e.session_id);
    classes.set(
      e.session_id,
      old === 'excluded' || next === 'excluded'
        ? 'excluded'
        : old === 'unknown' || next === 'unknown'
          ? 'unknown'
          : next
    );
  }
  return { classes, events: events.filter((e) => classes.get(e.session_id) !== 'excluded') };
}

/** Classify source without returning any raw referral host, path, query or identity. */
function acquisitionChannel(event: ReportEvent): string {
  if (
    event.measurement === 'first-party-v1' &&
    NEWSLETTER_CAMPAIGNS.some((id) => id === event.campaign?.replaceAll('_', '-'))
  )
    return 'tagged_newsletter';
  if (!event.referrer) return 'unattributed';
  try {
    const ref = new URL(event.referrer);
    if (!['http:', 'https:'].includes(ref.protocol) || ref.username || ref.password || ref.port)
      return 'unattributed';
    const host = ref.hostname.toLowerCase();
    if (Object.values(PUBLIC_HOSTS).some((hosts) => hosts.includes(host))) return 'own_properties';
    if (
      [
        'google.com',
        'www.google.com',
        'www.google.co.uk',
        'www.google.ca',
        'bing.com',
        'www.bing.com',
        'duckduckgo.com',
        'www.duckduckgo.com',
        'search.yahoo.com',
        'search.brave.com'
      ].includes(host)
    )
      return 'search_referral';
    if (
      [
        'chatgpt.com',
        'www.chatgpt.com',
        'chat.openai.com',
        'perplexity.ai',
        'www.perplexity.ai',
        'claude.ai',
        'www.claude.ai',
        'copilot.microsoft.com',
        'gemini.google.com'
      ].includes(host)
    )
      return 'ai_referral';
    return 'other_referral';
  } catch {
    return 'unattributed';
  }
}

const periods = ['current', 'prior'] as const;
function inWindow(date: string, window: { start: string; end: string }) {
  return date >= window.start && date < window.end;
}
function status(
  id: string,
  label: string,
  now: string,
  ready: boolean,
  latestAt: string | null,
  detail: string
): SourceStatus {
  return { id, label, observedAt: now, status: ready ? 'ready' : 'unavailable', latestAt, detail };
}
async function rows<T>(
  db: AnalyticsReadDatabase | undefined,
  sql: string,
  values: (string | number)[] = []
): Promise<T[]> {
  if (!db) throw new Error('Source unavailable');
  const result = await db
    .prepare(sql)
    .bind(...values)
    .all<T>();
  if (!result.success || !Array.isArray(result.results)) throw new Error('Source unavailable');
  return result.results;
}

export async function readWeeklyScorecard(
  env: ScorecardBindings,
  days: string | null,
  now = new Date()
): Promise<WeeklyScorecard> {
  const observedAt = now.toISOString();
  const windows = scorecardWindows(days, now);
  const report: WeeklyScorecard = {
    version: 1,
    observedAt,
    windows,
    sources: [],
    properties: [],
    metrics: [],
    audience: null,
    historicalDeliveries: null,
    topPages: [],
    acquisition: [],
    countries: [],
    daily: [],
    limitations: [
      'Public first-party sessions are not unique people. External is a traffic classification, not proof of a human. Unknown remains unclassified; consent and instrumentation gaps remain.',
      'Classification uses the most restrictive observed event per session across both windows. Private, tokenized, noncanonical, internal, test, preview and recognized automated traffic is excluded. Unmarked automation can remain.',
      'Periods are complete UTC days with equal prior windows and exclusive ends. Source freshness is the latest read record, not proof that ingestion is healthy.',
      'No cross-property identity join, retention, causal attribution, or combined audience total. Cloudflare visits are a separate measurement and are not added.',
      'Newsletter requests and once-only confirmations are independently dated, not a cohort conversion rate. Opens, email click rates and replies are unavailable. Delivery ledger states are not fresh provider readback.',
      'Outcome records have no reliable traffic-class join. They can contain operator/test activity and do not prove external demand, delivered email or realized customer value.',
      'MCP telemetry is operator-scope operational activity only. Hub requests, routed attempts and downstream calls may overlap, retry or contain tests. No global task deduplication; keys are not customers.'
    ]
  };
  const add = (
    id: string,
    group: ScorecardMetric['group'],
    label: string,
    unit: string,
    source: string,
    current: number | null,
    prior: number | null,
    definition: string
  ) => {
    report.metrics.push({ id, group, label, unit, source, current, prior, definition });
  };
  // Two bounded event reads, fail the complete source on overflow rather than ranking a truncated sample.
  const traffic = await Promise.allSettled([
    readEvents(env.DB, ['agency', 'io', 'space', 'ltd'], windows),
    readEvents(env.LMS_DB, ['lms'], windows)
  ]);
  const allEvents: ReportEvent[] = [];
  const pageCounts = new Map<string, { property: string; path: string; count: number }>();
  const daily = new Map<string, number>();
  const acquisition = new Map<string, WeeklyScorecard['acquisition'][number]>();
  const countries = new Map<string, number>();
  for (const [index, result] of traffic.entries()) {
    const properties: AnalyticsProperty[] =
      index === 0 ? ['agency', 'io', 'space', 'ltd'] : ['lms'];
    const source = index === 0 ? 'shared' : 'learn';
    const raw = result.status === 'fulfilled' ? result.value : null;
    report.sources.push(
      status(
        source,
        index === 0
          ? 'Shared public traffic · agency / io / space / ltd'
          : 'Learn public traffic · lms-db',
        observedAt,
        raw !== null,
        raw?.reduce<string | null>(
          (latest, event) => (!latest || event.created_at > latest ? event.created_at : latest),
          null
        ) ?? null,
        raw
          ? `Complete bounded read (${raw.length} events across both windows).`
          : 'Binding, schema or read unavailable, or the 20,000-event safety limit was exceeded. Restore the source and retry; no zeros substituted.'
      )
    );
    const classified = classifyReportEvents(raw ?? []);
    allEvents.push(...classified.events);
    for (const property of properties) {
      const p: PropertyScore = {
        property,
        views: null,
        priorViews: null,
        sessions: null,
        priorSessions: null,
        external: null,
        unclassified: null,
        excluded: null
      };
      if (raw) {
        const counts = periods.map((period) => {
          const events = classified.events.filter(
            (e) => e.property === property && inWindow(e.created_at, windows[period])
          );
          return {
            events,
            views: events.filter((e) => e.category === 'navigation' && e.action === 'page_view')
              .length,
            sessions: new Set(events.map((e) => e.session_id))
          };
        });
        p.views = counts[0].views;
        p.priorViews = counts[1].views;
        p.sessions = counts[0].sessions.size;
        p.priorSessions = counts[1].sessions.size;
        p.external = [...counts[0].sessions].filter(
          (id) => classified.classes.get(id) === 'external'
        ).length;
        p.unclassified = p.sessions - p.external;
        p.excluded = new Set(
          raw
            .filter(
              (e) =>
                e.property === property &&
                inWindow(e.created_at, windows.current) &&
                classified.classes.get(e.session_id) === 'excluded'
            )
            .map((e) => e.session_id)
        ).size;
        for (const [i, period] of periods.entries()) {
          const landings = new Map<string, ReportEvent>();
          for (const event of counts[i].events) {
            if (event.category !== 'navigation' || event.action !== 'page_view') continue;
            const first = landings.get(event.session_id);
            if (!first || event.created_at < first.created_at)
              landings.set(event.session_id, event);
          }
          for (const landing of landings.values()) {
            const channel = acquisitionChannel(landing);
            const key = property + ':' + channel;
            const row = acquisition.get(key) ?? { property, channel, current: 0, prior: 0 };
            row[period]++;
            acquisition.set(key, row);
          }
        }
        for (const e of counts[0].events.filter(
          (e) => e.category === 'navigation' && e.action === 'page_view'
        )) {
          const path = normalizeAnalyticsPath(new URL(e.url).pathname);
          const key = `${property}:${path}`;
          pageCounts.set(key, { property, path, count: (pageCounts.get(key)?.count ?? 0) + 1 });
          daily.set(e.created_at.slice(0, 10), (daily.get(e.created_at.slice(0, 10)) ?? 0) + 1);
          if (/^[A-Z]{2}$/.test(e.ip_country ?? ''))
            countries.set(e.ip_country!, (countries.get(e.ip_country!) ?? 0) + 1);
        }
      }
      report.properties.push(p);
      add(
        `${property}-sessions`,
        'Discovery',
        property === 'lms' ? 'Learn public sessions' : `.${property} public sessions`,
        'sessions',
        source,
        p.sessions,
        p.priorSessions,
        'Sessions with public activity in the period, after conservative session-wide exclusions. Includes external and unclassified activity; a session can appear on multiple properties.'
      );
    }
  }
  report.properties.sort(
    (a, b) =>
      SUPPORTED_ANALYTICS_PROPERTIES.indexOf(a.property) -
      SUPPORTED_ANALYTICS_PROPERTIES.indexOf(b.property)
  );
  report.topPages = [...pageCounts.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  report.acquisition = [...acquisition.values()].sort(
    (a, b) =>
      b.current - a.current ||
      a.property.localeCompare(b.property) ||
      a.channel.localeCompare(b.channel)
  );
  report.countries = [...countries]
    .map(([country, views]) => ({ country, views }))
    .sort((a, b) => b.views - a.views || a.country.localeCompare(b.country))
    .slice(0, 10);
  // Daily series is withheld when either traffic source is missing, to avoid an apparent collapse.
  if (traffic.every((r) => r.status === 'fulfilled')) {
    for (
      let t = Date.parse(windows.current.start);
      t < Date.parse(windows.current.end);
      t += 86400000
    ) {
      const date = new Date(t).toISOString().slice(0, 10);
      report.daily.push({ date, count: daily.get(date) ?? 0 });
    }
  }
  const trafficReady = traffic.every((r) => r.status === 'fulfilled');
  const useful = periods.map(
    (period) =>
      new Set(
        allEvents
          .filter(
            (e) =>
              inWindow(e.created_at, windows[period]) &&
              [
                'content_copy',
                'content_link_click',
                'experiment_complete',
                'lesson_complete'
              ].includes(e.action)
          )
          .map((e) => `${e.property}:${e.session_id}`)
      ).size
  );
  add(
    'resource-use',
    'Usefulness',
    'Resource-use sessions',
    'property sessions',
    'traffic',
    trafficReady ? useful[0] : null,
    trafficReady ? useful[1] : null,
    'At least one copy, content link click, experiment_complete or lesson_complete browser action. Deduplicated within a property and period; not proof of learning or customer success.'
  );
  const newsletter = periods.map((period) =>
    summarizeNewsletterSessions(
      allEvents.filter((e) => e.property === 'io'),
      windows[period]
    )
  );
  for (const [key, label] of [
    ['landings', 'Tagged newsletter landings'],
    ['resourceUse', 'Tagged newsletter resource use']
  ] as const) {
    add(
      `newsletter-${key}`,
      'Relationship',
      label,
      'sessions',
      'shared',
      traffic[0].status === 'fulfilled' ? newsletter[0][key] : null,
      traffic[0].status === 'fulfilled' ? newsletter[1][key] : null,
      'Configured first-party newsletter campaign only, after public-session filtering. Resource use is a copy or content-link click within 30 minutes after a tagged landing and before the period end. No recipient join or historical attribution inference.'
    );
  }
  await readSupplemental(report, env, add);
  const bookingClicks = periods.map(
    (period) =>
      new Set(
        allEvents
          .filter(
            (event) =>
              event.property === 'agency' &&
              event.action === 'booking_cta_click' &&
              inWindow(event.created_at, windows[period])
          )
          .map((event) => event.session_id)
      ).size
  );
  add(
    'booking-intent',
    'Relationship',
    'Booking CTA sessions',
    'sessions',
    'shared',
    traffic[0].status === 'fulfilled' ? bookingClicks[0] : null,
    traffic[0].status === 'fulfilled' ? bookingClicks[1] : null,
    'Public Agency sessions with a booking CTA click after session-wide traffic filtering. An attempt to continue, not an authoritative booking or a qualified lead.'
  );
  return report;
}

async function readEvents(
  db: AnalyticsReadDatabase | undefined,
  properties: AnalyticsProperty[],
  windows: ReportWindows
) {
  const sql = REPORT_EVENTS_SQL.replace('%PROPERTIES%', properties.map((p) => `'${p}'`).join(','));
  // Broad UTC date bounds use the existing property/created_at index for both ISO
  // and sqlite writers. One extra day on either side also covers ISO offsets;
  // julianday is still the exact inclusion boundary. No sorting before the cap.
  const coarseStart = new Date(Date.parse(windows.prior.start) - 86400000)
    .toISOString()
    .slice(0, 10);
  const coarseEnd = new Date(Date.parse(windows.current.end) + 86400000).toISOString().slice(0, 10);
  const result = await rows<ReportEvent>(db, sql, [
    coarseStart,
    coarseEnd,
    windows.prior.start,
    windows.current.end
  ]);
  if (result.length > EVENT_LIMIT) throw new Error('Bounded read exceeded');
  return result;
}

type AddMetric = (
  id: string,
  group: ScorecardMetric['group'],
  label: string,
  unit: string,
  source: string,
  current: number | null,
  prior: number | null,
  definition: string
) => void;
async function readSupplemental(report: WeeklyScorecard, env: ScorecardBindings, add: AddMetric) {
  const w = report.windows;
  // Exact dates and aggregate columns only. No emails, tokens, account IDs or private payloads leave the reader.
  const definitions = [
    {
      id: 'confirmations',
      label: 'Once-only newsletter confirmations',
      group: 'Relationship' as const,
      unit: 'confirmations',
      db: env.DB,
      table: 'newsletter_signup_attributions',
      date: 'confirmed_at',
      filter: "traffic_class = 'external'",
      definition:
        'Confirmed attribution records dated by confirmed_at (one row per subscriber). External classification at signup is not proof of a human; requests and confirmations are independent periods.'
    },
    {
      id: 'requests',
      label: 'Attributed newsletter requests',
      group: 'Relationship' as const,
      unit: 'requests',
      db: env.DB,
      table: 'newsletter_signup_attributions',
      date: 'requested_at',
      filter: "traffic_class = 'external'",
      definition:
        'Attributed signup requests by requested_at; not the denominator of a confirmation conversion rate.'
    },
    {
      id: 'contact',
      label: 'Durable contact receipts',
      group: 'Verified outcomes' as const,
      unit: 'receipts',
      db: env.DB,
      table: 'contact_request_receipts',
      date: 'created_at',
      filter: '1 = 1',
      definition:
        'Idempotent contact submissions durably stored. Not provider delivery, a booking or a qualified lead; no traffic-class join.'
    },
    {
      id: 'lessons',
      label: 'Completed lesson records',
      group: 'Verified outcomes' as const,
      unit: 'lesson records',
      db: env.LMS_DB,
      table: 'lesson_progress',
      date: "datetime(completed_at, 'unixepoch')",
      filter: "status = 'completed'",
      definition:
        'Current completed lesson records dated by completed_at (Unix seconds). Not unique learners, retained learners or proof of external demand.'
    }
  ];
  const supplemental = await Promise.allSettled(
    definitions.map(async (d) => {
      const sql = `SELECT SUM(CASE WHEN julianday(${d.date}) >= julianday(?) THEN 1 ELSE 0 END) AS current,
      SUM(CASE WHEN julianday(${d.date}) < julianday(?) THEN 1 ELSE 0 END) AS prior,
      MAX(datetime(${d.date})) AS latest FROM ${d.table} WHERE ${d.filter}
      AND julianday(${d.date}) >= julianday(?) AND julianday(${d.date}) < julianday(?)`;
      return (
        await rows<{ current: number | null; prior: number | null; latest: string | null }>(
          d.db,
          sql,
          [w.current.start, w.current.start, w.prior.start, w.current.end]
        )
      )[0];
    })
  );
  supplemental.forEach((r, i) => {
    const d = definitions[i];
    const value = r.status === 'fulfilled' ? r.value : null;
    report.sources.push(
      status(
        d.id,
        d.label,
        report.observedAt,
        !!value,
        value?.latest ?? null,
        value ? 'Aggregate records, not traffic-filtered people.' : 'Read or schema unavailable.'
      )
    );
    add(
      d.id,
      d.group,
      d.label,
      d.unit,
      d.id,
      value ? (value.current ?? 0) : null,
      value ? (value.prior ?? 0) : null,
      d.definition
    );
  });
  const audience = await Promise.allSettled([
    rows<{ total: number; active: number; eligible: number }>(
      env.DB,
      `SELECT COUNT(*) AS total, COALESCE(SUM(status = 'active' AND active = 1),0) AS active,
      COALESCE(SUM(${ELIGIBLE_SUBSCRIBERS_PREDICATE}),0) AS eligible FROM newsletter_subscribers`
    ),
    ...periods.map((period) =>
      rows<{ count: number; latest: string | null }>(
        env.DB,
        `SELECT COUNT(DISTINCT resend_email_id) AS count, strftime('%Y-%m-%dT%H:%M:%fZ', MAX(julianday(created_at))) AS latest
      FROM newsletter_edition_deliveries WHERE kind = 'audience' AND status IN ('sent','delivered','delayed')
      AND resend_email_id IS NOT NULL AND julianday(created_at) >= julianday(?) AND julianday(created_at) < julianday(?)`,
        [w[period].start, w[period].end]
      )
    ),
    rows<{ count: number; latest: string | null }>(
      env.DB,
      "SELECT COUNT(DISTINCT resend_email_id) AS count FROM newsletter_edition_deliveries WHERE kind = 'historical-audience' AND status = 'historical-delivered'"
    )
  ]);
  if (audience[0].status === 'fulfilled') report.audience = audience[0].value[0] ?? null;
  const deliveryReady = audience[1].status === 'fulfilled' && audience[2].status === 'fulfilled';
  if (audience[3].status === 'fulfilled')
    report.historicalDeliveries = audience[3].value[0]?.count ?? 0;
  report.sources.push(
    status(
      'audience',
      'Newsletter eligible audience snapshot',
      report.observedAt,
      report.audience !== null,
      null,
      'Current snapshot only; eligibility reuses the canonical double-opt-in, consent evidence, audience classification and suppression predicate.'
    )
  );
  report.sources.push(
    status(
      'deliveries',
      'Newsletter stored delivery ledger',
      report.observedAt,
      deliveryReady,
      audience[1].status === 'fulfilled' ? (audience[1].value[0]?.latest ?? null) : null,
      'Stored states only. Historical imports and seed sends excluded from periods. No provider requests are made at dashboard load; use Newsletter analytics for paced fresh readback.'
    )
  );
  add(
    'deliveries',
    'Relationship',
    'Provider-accepted audience sends (ledger)',
    'provider IDs',
    'deliveries',
    audience[1].status === 'fulfilled' ? (audience[1].value[0]?.count ?? 0) : null,
    audience[2].status === 'fulfilled' ? (audience[2].value[0]?.count ?? 0) : null,
    'Distinct provider IDs in nonhistorical audience rows with sent/delivered/delayed state, dated by send row creation. This is stored evidence, not fresh provider delivery. Historical import timestamps are never send dates.'
  );
  // Only the fixed server-only scheduler receipt contract supplies booking outcomes.
  await readSchedulerOutcomes(report, env, add);
  for (const [id, label, detail] of [
    [
      'maps',
      'Accepted map / workflow evidence',
      'No approved aggregate contract isolates first-party accepted evidence from client records. No client analytics or private payloads are read.'
    ]
  ]) {
    report.sources.push(status(id, label, report.observedAt, false, null, detail));
    add(
      id,
      'Verified outcomes',
      label,
      id === 'bookings' ? 'bookings' : 'accepted artifacts',
      id,
      null,
      null,
      detail
    );
  }
  const layers = [
    {
      label: 'Hub requests',
      table: 'mcp_tool_invocations',
      filter: "server_name = 'create-something-hub-remote'"
    },
    {
      label: 'Routed attempts',
      table: 'mcp_hub_routes',
      filter: "hub_server_name = 'create-something-hub-remote'"
    },
    {
      label: 'Downstream calls',
      table: 'mcp_tool_invocations',
      filter:
        "server_name <> 'create-something-hub-remote' AND server_name NOT LIKE 'create-something-hub-remote:%'"
    }
  ];
  let mcpReady = true;
  let latest: string | null = null;
  for (const layer of layers) {
    const result = await Promise.allSettled(
      periods.map((period) =>
        rows<{ count: number; latest: string | null }>(
          env.TELEMETRY_DB,
          `SELECT COUNT(*) AS count, strftime('%Y-%m-%dT%H:%M:%fZ', MAX(julianday(created_at))) AS latest FROM ${layer.table}
       WHERE account_id = 'operator' AND ${layer.filter}
       AND julianday(created_at) >= julianday(?) AND julianday(created_at) < julianday(?)`,
          [w[period].start, w[period].end]
        )
      )
    );
    const values = result.map((r) => (r.status === 'fulfilled' ? (r.value[0]?.count ?? 0) : null));
    if (result.some((r) => r.status === 'rejected')) mcpReady = false;
    if (result[0].status === 'fulfilled') {
      const date = result[0].value[0]?.latest;
      if (date && (!latest || date > latest)) latest = date;
    }
    add(
      `mcp-${layer.label}`,
      'Usefulness',
      `MCP operator · ${layer.label.toLowerCase()}`,
      'raw invocations',
      'mcp',
      values[0],
      values[1],
      'Operator-scoped operational telemetry from ' +
        layer.table +
        '; tests and retries can remain. Overlapping hub, route and downstream layers cannot be added; correlation/request IDs do not establish a unique task.'
    );
  }
  report.sources.push(
    status(
      'mcp',
      'MCP operator telemetry · cs-telemetry',
      report.observedAt,
      mcpReady,
      latest,
      'Operator key only; client accounts and unknown keys excluded. Raw invocation layers are separate. A missing route table leaves routed attempts unavailable, not zero.'
    )
  );
}

async function readSchedulerOutcomes(
  report: WeeklyScorecard,
  env: ScorecardBindings,
  add: AddMetric
) {
  type Summary = Awaited<
    ReturnType<NonNullable<ScorecardBindings['SCHEDULER_REPORTS']>['getBookingSummary']>
  >;
  let summary: Summary | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!env.SCHEDULER_REPORTS) throw new Error('Source unavailable');
    const result = await Promise.race([
      env.SCHEDULER_REPORTS.getBookingSummary({
        current: report.windows.current,
        prior: report.windows.prior
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Read timed out')), 5000);
      })
    ]);
    if (
      result.source !== 'scheduler-receipts' ||
      periods.some((period) =>
        ['committed', 'rescheduled', 'cancelled'].some((key) => {
          const value = result[period]?.[key as keyof Summary['current']];
          return !Number.isSafeInteger(value) || value < 0;
        })
      ) ||
      (result.latestAt !== null &&
        (!Number.isFinite(Date.parse(result.latestAt)) ||
          Date.parse(result.latestAt) >= Date.parse(report.windows.current.end) ||
          Date.parse(result.latestAt) < Date.parse(report.windows.prior.start)))
    )
      throw new Error('Invalid aggregate response');
    summary = result;
  } catch {
    // Private upstream errors are never part of the report.
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
  report.sources.push(
    status(
      'bookings',
      'Authoritative scheduler receipts',
      report.observedAt,
      summary !== null,
      summary?.latestAt ?? null,
      summary
        ? 'Server-only read of first-party host lifecycle receipts. No Calendar provider call or booking mutation.'
        : 'Scheduler report binding, deployed read contract, or receipt read unavailable. Restore the source and retry; no browser event is substituted.'
    )
  );
  for (const [id, label, key, unit] of [
    ['bookings', 'Committed scheduler bookings', 'committed', 'bookings'],
    ['booking-reschedules', 'Scheduler reschedule events', 'rescheduled', 'lifecycle events'],
    ['booking-cancellations', 'Scheduler cancellation events', 'cancelled', 'lifecycle events']
  ] as const) {
    add(
      id,
      'Verified outcomes',
      label,
      unit,
      'bookings',
      summary?.current[key] ?? null,
      summary?.prior[key] ?? null,
      'Authoritative first-party host receipts dated by occurred_at. Committed booking IDs are deduplicated; reschedule and cancellation events stay separate. Operator/test bookings may remain. No browser-event inference, personal details, or qualified-lead claim.'
    );
  }
}
