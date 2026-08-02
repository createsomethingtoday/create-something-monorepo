import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const GSC_COMPARE_PERIODS_TOOL = 'google_search_console_compare_periods';
export const GSC_SEARCH_ANALYTICS_SOURCE_SLUG = 'GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY';

const ROUND_DIGITS = 6;
const ANSWER_SEEKING_PREFIXES = [
  'how',
  'what',
  'when',
  'where',
  'why',
  'who',
  'which',
  'can',
  'could',
  'do',
  'does',
  'is',
  'are',
  'should'
] as const;
const GSC_DIMENSIONS = [
  'query',
  'page',
  'country',
  'device',
  'date',
  'searchAppearance',
  'hour'
] as const;
const GSC_SEARCH_TYPES = ['web', 'image', 'video', 'news', 'discover', 'googleNews'] as const;
const GSC_AGGREGATION_TYPES = ['auto', 'byPage', 'byProperty', 'byNewsShowcasePanel'] as const;

type DateWindow = {
  startDate: string;
  endDate: string;
};

export type SearchComparisonInput = {
  siteUrl: string;
  current: DateWindow;
  previous: DateWindow;
  dimensions: string[];
  searchType: string;
  aggregationType: string;
  dimensionFilterGroups?: Record<string, unknown>[];
  rowLimit: number;
  maxRows: number;
  minImpressions: number;
  minPosition: number;
  maxPosition: number;
  opportunityLimit: number;
};

export type SearchAnalyticsExecutor = (
  args: Record<string, unknown>
) => Promise<Record<string, unknown>>;

type Metrics = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type PeriodTotals = Metrics & {
  rowCount: number;
};

type MetricDelta = {
  absolute: number;
  percent: number | null;
};

type PeriodReceipt = {
  window: DateWindow;
  totals: PeriodTotals;
  pagination: {
    pagesFetched: number;
    rowsFetched: number;
    rowLimit: number;
    maxRows: number;
    truncated: boolean;
  };
};

export type SearchComparisonReceipt = {
  receiptVersion: 'gsc_period_comparison.v1';
  siteUrl: string;
  dimensions: string[];
  current: PeriodReceipt;
  previous: PeriodReceipt;
  delta: Record<keyof Metrics, MetricDelta>;
  opportunityThresholds: {
    minImpressions: number;
    minPosition: number;
    maxPosition: number;
    limit: number;
  };
  opportunities: Array<{
    dimensions: Record<string, string | null>;
    current: Metrics;
    previous: Metrics | null;
    delta: Record<keyof Metrics, MetricDelta> | null;
    score: number;
    intentSignals: {
      answerSeeking: boolean;
      matchedPrefix: string | null;
    };
  }>;
  zeroResult: boolean;
  provenance: {
    sourceToolSlug: typeof GSC_SEARCH_ANALYTICS_SOURCE_SLUG;
    sourceToolName: 'google_search_console_search_analytics_query';
    dataState: 'final';
    searchType: string;
    aggregationType: string;
  };
  methodology: {
    opportunityScoreFormula: string;
    totals: string;
    limitations: string[];
  };
};

type NormalizedRow = {
  key: string;
  dimensions: Record<string, string | null>;
  metrics: Metrics;
};

type PeriodData = {
  receipt: PeriodReceipt;
  rows: NormalizedRow[];
};

export function buildGscCompareToolDefinition(): Tool {
  return {
    name: GSC_COMPARE_PERIODS_TOOL,
    description:
      'Compare two explicit Google Search Console periods and return deterministic totals, deltas, and high-impression position opportunities with transparent SEO/AEO signals. Uses only final Search Analytics data.',
    inputSchema: {
      type: 'object',
      properties: {
        site_url: {
          type: 'string',
          description:
            'Exact Search Console property identifier, such as https://www.example.com/ or sc-domain:example.com.'
        },
        current_start_date: { type: 'string', description: 'Current window start, YYYY-MM-DD.' },
        current_end_date: { type: 'string', description: 'Current window end, YYYY-MM-DD.' },
        previous_start_date: {
          type: 'string',
          description: 'Comparison window start, YYYY-MM-DD.'
        },
        previous_end_date: { type: 'string', description: 'Comparison window end, YYYY-MM-DD.' },
        dimensions: {
          type: 'array',
          description: 'Grouping dimensions. Defaults to query and page.',
          default: ['query', 'page'],
          items: { type: 'string', enum: [...GSC_DIMENSIONS] }
        },
        search_type: {
          type: 'string',
          enum: [...GSC_SEARCH_TYPES],
          default: 'web'
        },
        aggregation_type: {
          type: 'string',
          enum: [...GSC_AGGREGATION_TYPES],
          default: 'auto'
        },
        dimension_filter_groups: {
          type: 'array',
          description: 'Optional Search Analytics dimension filter groups passed to both windows.',
          items: { type: 'object', additionalProperties: true }
        },
        row_limit: {
          type: 'integer',
          minimum: 1,
          maximum: 5000,
          default: 5000,
          description: 'Rows requested per Search Analytics page.'
        },
        max_rows: {
          type: 'integer',
          minimum: 1,
          maximum: 25000,
          default: 25000,
          description: 'Safety cap per period. The receipt reports truncation at this cap.'
        },
        min_impressions: {
          type: 'number',
          minimum: 0,
          default: 100,
          description: 'Minimum current-period impressions for an opportunity.'
        },
        min_position: {
          type: 'number',
          minimum: 0,
          default: 8,
          description: 'Best inclusive average position for the opportunity band.'
        },
        max_position: {
          type: 'number',
          minimum: 0,
          default: 15,
          description: 'Worst inclusive average position for the opportunity band.'
        },
        opportunity_limit: {
          type: 'integer',
          minimum: 1,
          maximum: 500,
          default: 50
        },
        connectedAccountId: {
          type: 'string',
          description:
            'Optional Composio connected account ID. Required when an entity has multiple active GSC connections.'
        }
      },
      required: [
        'site_url',
        'current_start_date',
        'current_end_date',
        'previous_start_date',
        'previous_end_date'
      ],
      additionalProperties: false
    }
  };
}

export function parseSearchComparisonArgs(args: Record<string, unknown>): SearchComparisonInput {
  const dimensions = stringArrayArg(args.dimensions, ['query', 'page']);
  for (const dimension of dimensions) {
    if (!(GSC_DIMENSIONS as readonly string[]).includes(dimension)) {
      throw new Error(`Unsupported Search Analytics dimension "${dimension}".`);
    }
  }

  return {
    siteUrl: requiredStringArg(args.site_url, 'site_url'),
    current: {
      startDate: requiredStringArg(args.current_start_date, 'current_start_date'),
      endDate: requiredStringArg(args.current_end_date, 'current_end_date')
    },
    previous: {
      startDate: requiredStringArg(args.previous_start_date, 'previous_start_date'),
      endDate: requiredStringArg(args.previous_end_date, 'previous_end_date')
    },
    dimensions,
    searchType: enumArg(args.search_type, GSC_SEARCH_TYPES, 'web', 'search_type'),
    aggregationType: enumArg(
      args.aggregation_type,
      GSC_AGGREGATION_TYPES,
      'auto',
      'aggregation_type'
    ),
    dimensionFilterGroups: recordArrayArg(args.dimension_filter_groups),
    rowLimit: numberArg(args.row_limit, 5000),
    maxRows: numberArg(args.max_rows, 25000),
    minImpressions: numberArg(args.min_impressions, 100),
    minPosition: numberArg(args.min_position, 8),
    maxPosition: numberArg(args.max_position, 15),
    opportunityLimit: numberArg(args.opportunity_limit, 50)
  };
}

export async function analyzeSearchConsolePeriods(
  input: SearchComparisonInput,
  execute: SearchAnalyticsExecutor
): Promise<SearchComparisonReceipt> {
  validateInput(input);

  const current = await fetchPeriod(input, input.current, execute);
  const previous = await fetchPeriod(input, input.previous, execute);
  const previousByKey = new Map(previous.rows.map((row) => [row.key, row]));
  const opportunities = current.rows
    .filter(
      (row) =>
        row.metrics.impressions >= input.minImpressions &&
        row.metrics.position >= input.minPosition &&
        row.metrics.position <= input.maxPosition
    )
    .map((row) => {
      const previousRow = previousByKey.get(row.key) ?? null;
      const query = row.dimensions.query ?? '';
      const intentSignals = detectAnswerSeekingIntent(query);
      return {
        dimensions: row.dimensions,
        current: row.metrics,
        previous: previousRow?.metrics ?? null,
        delta: previousRow ? buildMetricsDelta(row.metrics, previousRow.metrics) : null,
        score: round(row.metrics.impressions * (input.maxPosition - row.metrics.position + 1)),
        intentSignals,
        stableKey: row.key
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.current.impressions - left.current.impressions ||
        left.current.position - right.current.position ||
        left.stableKey.localeCompare(right.stableKey)
    )
    .slice(0, input.opportunityLimit)
    .map(({ stableKey: _stableKey, ...opportunity }) => opportunity);

  return {
    receiptVersion: 'gsc_period_comparison.v1',
    siteUrl: input.siteUrl,
    dimensions: [...input.dimensions],
    current: current.receipt,
    previous: previous.receipt,
    delta: buildMetricsDelta(current.receipt.totals, previous.receipt.totals),
    opportunityThresholds: {
      minImpressions: input.minImpressions,
      minPosition: input.minPosition,
      maxPosition: input.maxPosition,
      limit: input.opportunityLimit
    },
    opportunities,
    zeroResult: current.receipt.totals.rowCount === 0 && previous.receipt.totals.rowCount === 0,
    provenance: {
      sourceToolSlug: GSC_SEARCH_ANALYTICS_SOURCE_SLUG,
      sourceToolName: 'google_search_console_search_analytics_query',
      dataState: 'final',
      searchType: input.searchType,
      aggregationType: input.aggregationType
    },
    methodology: {
      opportunityScoreFormula: 'current.impressions * (maxPosition - current.position + 1)',
      totals:
        'Clicks and impressions are summed across returned rows; CTR is clicks divided by impressions; position is impression-weighted.',
      limitations: [
        'Totals cover the rows returned within maxRows and may not equal property-wide totals for dimensioned queries.',
        'Missing rows mean no returned impressions for this query, not proof that a URL is unindexed.',
        'Answer-seeking intent is a deterministic query-prefix signal, not proof of an AI answer or citation.',
        "Ordinary Search Analytics does not replace Google Search Console's dedicated Generative AI performance report."
      ]
    }
  };
}

async function fetchPeriod(
  input: SearchComparisonInput,
  window: DateWindow,
  execute: SearchAnalyticsExecutor
): Promise<PeriodData> {
  const rawRows: Record<string, unknown>[] = [];
  let pagesFetched = 0;
  let startRow = 0;
  let truncated = false;

  while (rawRows.length < input.maxRows) {
    const pageSize = Math.min(input.rowLimit, input.maxRows - rawRows.length);
    const args: Record<string, unknown> = {
      site_url: input.siteUrl,
      start_date: window.startDate,
      end_date: window.endDate,
      dimensions: input.dimensions,
      search_type: input.searchType,
      aggregation_type: input.aggregationType,
      data_state: 'final',
      row_limit: pageSize,
      start_row: startRow
    };
    if (input.dimensionFilterGroups && input.dimensionFilterGroups.length > 0) {
      args.dimension_filter_groups = input.dimensionFilterGroups;
    }

    const result = await execute(args);
    assertExecutionSucceeded(result);
    const pageRows = extractRows(result);
    pagesFetched += 1;
    rawRows.push(...pageRows.slice(0, input.maxRows - rawRows.length));

    if (pageRows.length < pageSize) break;
    startRow += pageRows.length;
    if (rawRows.length >= input.maxRows) {
      truncated = true;
      break;
    }
  }

  const rows = normalizeAndMergeRows(rawRows, input.dimensions);
  return {
    rows,
    receipt: {
      window,
      totals: summarizeRows(rows),
      pagination: {
        pagesFetched,
        rowsFetched: rawRows.length,
        rowLimit: input.rowLimit,
        maxRows: input.maxRows,
        truncated
      }
    }
  };
}

function validateInput(input: SearchComparisonInput): void {
  if (!input.siteUrl.trim()) throw new Error('siteUrl is required.');
  validateWindow('current', input.current);
  validateWindow('previous', input.previous);
  if (input.dimensions.length === 0) throw new Error('At least one dimension is required.');
  if (input.rowLimit < 1 || input.rowLimit > 5000) {
    throw new Error('rowLimit must be between 1 and 5000.');
  }
  if (input.maxRows < 1 || input.maxRows > 25000) {
    throw new Error('maxRows must be between 1 and 25000.');
  }
  if (input.minImpressions < 0) throw new Error('minImpressions must be non-negative.');
  if (input.minPosition < 0 || input.maxPosition < input.minPosition) {
    throw new Error('Position thresholds are invalid.');
  }
  if (input.opportunityLimit < 1 || input.opportunityLimit > 500) {
    throw new Error('opportunityLimit must be between 1 and 500.');
  }
}

function validateWindow(label: string, window: DateWindow): void {
  if (!isIsoDate(window.startDate) || !isIsoDate(window.endDate)) {
    throw new Error(`${label} window dates must use YYYY-MM-DD.`);
  }
  if (window.startDate > window.endDate) {
    throw new Error(`${label} start date must not be after its end date.`);
  }
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function assertExecutionSucceeded(result: Record<string, unknown>): void {
  if (result.successful === false || (result.error !== null && result.error !== undefined)) {
    const error = result.error;
    const message =
      typeof error === 'string'
        ? error
        : typeof result.message === 'string'
          ? result.message
          : JSON.stringify(error ?? 'Unknown Search Analytics error');
    throw new Error(`Search Analytics query failed: ${message}`);
  }
}

function extractRows(result: Record<string, unknown>): Record<string, unknown>[] {
  const visit = (value: unknown, depth: number): Record<string, unknown>[] | null => {
    if (depth > 5 || value === null || value === undefined) return null;
    const record = asRecord(value);
    if (!record) return null;
    if (Array.isArray(record.rows)) {
      return record.rows
        .map((row) => asRecord(row))
        .filter((row): row is Record<string, unknown> => Boolean(row));
    }
    for (const key of ['data', 'result', 'response']) {
      const nested = visit(record[key], depth + 1);
      if (nested) return nested;
    }
    return null;
  };

  return visit(result, 0) ?? [];
}

function normalizeAndMergeRows(
  rawRows: Record<string, unknown>[],
  dimensions: string[]
): NormalizedRow[] {
  type Accumulator = {
    key: string;
    dimensions: Record<string, string | null>;
    clicks: number;
    impressions: number;
    weightedPosition: number;
  };
  const byKey = new Map<string, Accumulator>();

  for (const rawRow of rawRows) {
    const keys = Array.isArray(rawRow.keys) ? rawRow.keys.map((value) => String(value)) : [];
    const dimensionValues = Object.fromEntries(
      dimensions.map((dimension, index) => [dimension, keys[index] ?? null])
    );
    const key = dimensions.map((dimension) => dimensionValues[dimension] ?? '').join('\u001f');
    const clicks = finiteNumber(rawRow.clicks);
    const impressions = finiteNumber(rawRow.impressions);
    const position = finiteNumber(rawRow.position);
    const existing = byKey.get(key) ?? {
      key,
      dimensions: dimensionValues,
      clicks: 0,
      impressions: 0,
      weightedPosition: 0
    };
    existing.clicks += clicks;
    existing.impressions += impressions;
    existing.weightedPosition += position * impressions;
    byKey.set(key, existing);
  }

  return Array.from(byKey.values()).map((row) => ({
    key: row.key,
    dimensions: row.dimensions,
    metrics: {
      clicks: round(row.clicks),
      impressions: round(row.impressions),
      ctr: round(safeDivide(row.clicks, row.impressions)),
      position: round(safeDivide(row.weightedPosition, row.impressions))
    }
  }));
}

function summarizeRows(rows: NormalizedRow[]): PeriodTotals {
  const totals = rows.reduce(
    (summary, row) => {
      summary.clicks += row.metrics.clicks;
      summary.impressions += row.metrics.impressions;
      summary.weightedPosition += row.metrics.position * row.metrics.impressions;
      return summary;
    },
    { clicks: 0, impressions: 0, weightedPosition: 0 }
  );
  return {
    clicks: round(totals.clicks),
    impressions: round(totals.impressions),
    ctr: round(safeDivide(totals.clicks, totals.impressions)),
    position: round(safeDivide(totals.weightedPosition, totals.impressions)),
    rowCount: rows.length
  };
}

function buildMetricsDelta(
  current: Metrics,
  previous: Metrics
): Record<keyof Metrics, MetricDelta> {
  return {
    clicks: metricDelta(current.clicks, previous.clicks),
    impressions: metricDelta(current.impressions, previous.impressions),
    ctr: metricDelta(current.ctr, previous.ctr),
    position: metricDelta(current.position, previous.position)
  };
}

function metricDelta(current: number, previous: number): MetricDelta {
  const absolute = round(current - previous);
  return {
    absolute,
    percent: previous === 0 ? (current === 0 ? 0 : null) : round((absolute / previous) * 100)
  };
}

function detectAnswerSeekingIntent(query: string): {
  answerSeeking: boolean;
  matchedPrefix: string | null;
} {
  const normalized = query.trim().toLowerCase();
  const matchedPrefix =
    ANSWER_SEEKING_PREFIXES.find(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix} `)
    ) ?? null;
  return {
    answerSeeking: Boolean(matchedPrefix) || normalized.endsWith('?'),
    matchedPrefix
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function round(value: number): number {
  return Number(value.toFixed(ROUND_DIGITS));
}

function requiredStringArg(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required.`);
  return value.trim();
}

function stringArrayArg(value: unknown, fallback: string[]): string[] {
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error('dimensions must be an array of strings.');
  }
  return value.map((entry) => entry.trim());
}

function recordArrayArg(value: unknown): Record<string, unknown>[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error('dimension_filter_groups must be an array.');
  const records = value.map((entry) => asRecord(entry));
  if (records.some((entry) => entry === null)) {
    throw new Error('dimension_filter_groups entries must be objects.');
  }
  return records as Record<string, unknown>[];
}

function enumArg<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
  name: string
): T[number] {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new Error(`${name} must be one of: ${allowed.join(', ')}.`);
  }
  return value as T[number];
}

function numberArg(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Numeric comparison options must be finite numbers.');
  }
  return value;
}
