import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { jsonContent } from '@create-something/mcp-core';
import { z } from 'zod';

export const SERVER_NAME = 'abundance-jobs-mcp';
export const SERVER_VERSION = '1.0.0';
export const DEFAULT_RAPIDAPI_HOST = 'active-jobs-db.p.rapidapi.com';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 512 * 1024;
export const DEFAULT_INGEST_LIMIT = 100;
export const MAX_INGEST_LIMIT = 500;
export const DEFAULT_FRESHNESS_WINDOW_MINUTES = 60;
export const NURSING_JOBS_TITLE_FILTER = 'nurse';
export const DEFAULT_NURSING_JOBS_LOCATION_FILTER = 'United States';
export const EXPIRED_ENDPOINT = '/active-ats-expired';

const ACTIVE_ENDPOINTS = ['/active-ats-7d', '/modified-ats-24h'] as const;
const DEFAULT_REFRESH_ENDPOINTS = ['/modified-ats-24h'] as const satisfies readonly RapidApiActiveJobsEndpoint[];
const READ_ONLY_TOOL_NAMES = ['search', 'fetch', 'list_public_jobs', 'search_public_jobs', 'get_job'] as const;
const FUNNEL_TOOL_NAME = 'send_job_to_funnel' as const;
const TOOL_NAMES = [...READ_ONLY_TOOL_NAMES, FUNNEL_TOOL_NAME] as const;
const NORMALIZED_STATUSES = ['open', 'closed', 'expired', 'unknown'] as const;
const US_STATE_CODES = [
  ['alabama', 'AL'],
  ['alaska', 'AK'],
  ['arizona', 'AZ'],
  ['arkansas', 'AR'],
  ['california', 'CA'],
  ['colorado', 'CO'],
  ['connecticut', 'CT'],
  ['delaware', 'DE'],
  ['florida', 'FL'],
  ['georgia', 'GA'],
  ['hawaii', 'HI'],
  ['idaho', 'ID'],
  ['illinois', 'IL'],
  ['indiana', 'IN'],
  ['iowa', 'IA'],
  ['kansas', 'KS'],
  ['kentucky', 'KY'],
  ['louisiana', 'LA'],
  ['maine', 'ME'],
  ['maryland', 'MD'],
  ['massachusetts', 'MA'],
  ['michigan', 'MI'],
  ['minnesota', 'MN'],
  ['mississippi', 'MS'],
  ['missouri', 'MO'],
  ['montana', 'MT'],
  ['nebraska', 'NE'],
  ['nevada', 'NV'],
  ['new hampshire', 'NH'],
  ['new jersey', 'NJ'],
  ['new mexico', 'NM'],
  ['new york', 'NY'],
  ['north carolina', 'NC'],
  ['north dakota', 'ND'],
  ['ohio', 'OH'],
  ['oklahoma', 'OK'],
  ['oregon', 'OR'],
  ['pennsylvania', 'PA'],
  ['rhode island', 'RI'],
  ['south carolina', 'SC'],
  ['south dakota', 'SD'],
  ['tennessee', 'TN'],
  ['texas', 'TX'],
  ['utah', 'UT'],
  ['vermont', 'VT'],
  ['virginia', 'VA'],
  ['washington', 'WA'],
  ['west virginia', 'WV'],
  ['wisconsin', 'WI'],
  ['wyoming', 'WY'],
] as const;
const NURSING_TITLE_RANK_SQL = `
      CASE
        WHEN (
          lower(title) LIKE '%registered nurse%'
          OR lower(title) LIKE 'rn %'
          OR lower(title) LIKE 'rn-%'
          OR lower(title) LIKE 'rn,%'
          OR lower(title) LIKE 'rn/%'
          OR lower(title) LIKE '% rn %'
          OR lower(title) LIKE '% rn-%'
          OR lower(title) LIKE '% rn,%'
          OR lower(title) LIKE '% rn/%'
          OR lower(title) LIKE '%(rn)%'
          OR lower(title) LIKE '%/rn%'
        )
        AND lower(title) NOT LIKE '%intern%'
        AND lower(title) NOT LIKE '%non paid%'
        AND lower(title) NOT LIKE '%unpaid%' THEN 0
        WHEN (
          lower(title) LIKE '%licensed practical nurse%'
          OR lower(title) LIKE '%licensed vocational nurse%'
          OR lower(title) LIKE 'lpn %'
          OR lower(title) LIKE 'lpn-%'
          OR lower(title) LIKE '% lpn%'
          OR lower(title) LIKE '%(lpn)%'
          OR lower(title) LIKE '%/lpn%'
          OR lower(title) LIKE 'lvn %'
          OR lower(title) LIKE 'lvn-%'
          OR lower(title) LIKE '% lvn%'
          OR lower(title) LIKE '%(lvn)%'
          OR lower(title) LIKE '%/lvn%'
        ) THEN 1
        WHEN (
          lower(title) LIKE '%certified nurse aide%'
          OR lower(title) LIKE '%certified nurse assistant%'
          OR lower(title) LIKE '% cna%'
          OR lower(title) LIKE '%(cna)%'
        ) THEN 2
        WHEN lower(title) LIKE '%nurse practitioner%' AND lower(title) NOT LIKE '%physician assistant%' THEN 3
        WHEN lower(title) LIKE '%nurse%'
          AND lower(title) NOT LIKE '%intern%'
          AND lower(title) NOT LIKE '%non paid%'
          AND lower(title) NOT LIKE '%unpaid%'
          AND lower(title) NOT LIKE '%physician assistant%' THEN 4
        WHEN lower(title) LIKE '%nurse%' THEN 5
        ELSE 9
      END
    `;
const LEGACY_STATUS_TO_NORMALIZED: Record<string, PublicJobStatus> = {
  new: 'open',
  reviewing: 'open',
  qualified: 'open',
  rejected: 'closed',
  archived: 'closed',
};

export type PublicJobStatus = (typeof NORMALIZED_STATUSES)[number];
export type RapidApiActiveJobsEndpoint = (typeof ACTIVE_ENDPOINTS)[number];

export interface AbundanceJobsProviderConfig {
  rapidApiKey?: string;
  rapidApiHost?: string;
  rapidApiBaseUrl?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  allowExpiredIngest?: boolean;
}

export interface AbundanceJobsServerOptions {
  getDb: () => D1Database | undefined;
}

export interface AbundanceJobsToolRegistrationOptions {
  includeFunnelTool?: boolean;
}

export interface RapidApiIngestInput {
  title_filter?: string;
  location_filter?: string;
  organization_filter?: string;
  limit?: number;
  offset?: number;
  endpoints?: RapidApiActiveJobsEndpoint[];
  include_backfill?: boolean;
  force_refresh?: boolean;
  freshness_window_minutes?: number;
  dry_run?: boolean;
}

export interface NursingJobsIngestInput {
  location_filter?: string;
  limit?: number;
  offset?: number;
  include_backfill?: boolean;
  force_refresh?: boolean;
  freshness_window_minutes?: number;
  dry_run?: boolean;
}

export interface PublicJobRow {
  id: string;
  provider: string;
  source_system: string;
  source_url?: string | null;
  external_job_id: string;
  raw_payload_hash: string;
  title: string;
  employer?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  location_text?: string | null;
  specialty?: string | null;
  discipline?: string | null;
  employment_type?: string | null;
  shift?: string | null;
  duration?: string | null;
  start_date?: string | null;
  pay_min?: number | null;
  pay_max?: number | null;
  pay_text?: string | null;
  currency?: string | null;
  openings?: number | null;
  status: PublicJobStatus | string;
  application_url?: string | null;
  posted_at?: string | null;
  last_seen_at: string;
  fetched_at: string;
  normalized_at: string;
  provider_snapshot_id?: string | null;
  raw_payload_json?: string | null;
  raw_payload_expires_at?: string | null;
  metadata_json?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PublicJob {
  id: string;
  title: string;
  employer?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  specialty?: string;
  discipline?: string;
  employment_type?: string;
  shift?: string;
  duration?: string;
  start_date?: string;
  pay_min?: number;
  pay_max?: number;
  pay_text?: string;
  currency?: string;
  openings?: number;
  status: string;
  source: string;
  provider: string;
  source_system: string;
  source_url?: string;
  application_url?: string;
  posted_at?: string;
  last_seen_at: string;
  fetched_at: string;
  normalized_at: string;
  metadata?: unknown;
  raw_payload?: unknown;
}

interface NormalizedJobInput {
  provider: string;
  source_system: string;
  source_url?: string;
  external_job_id?: string;
  title: string;
  employer?: string;
  city?: string;
  state?: string;
  country?: string;
  location_text?: string;
  specialty?: string;
  discipline?: string;
  employment_type?: string;
  shift?: string;
  duration?: string;
  start_date?: string;
  pay_min?: number;
  pay_max?: number;
  pay_text?: string;
  currency?: string;
  openings?: number;
  status?: PublicJobStatus;
  application_url?: string;
  posted_at?: string;
  fetched_at?: string;
  last_seen_at?: string;
  normalized_at?: string;
  raw_payload: unknown;
  raw_payload_expires_at?: string;
  metadata?: Record<string, unknown>;
}

interface DbFilters {
  query?: string;
  location?: string;
  provider?: string;
  source_system?: string;
  status?: string;
  state?: string;
  specialty?: string;
  limit?: number;
  offset?: number;
}

interface PreparedUpsert {
  sql: string;
  args: unknown[];
}

interface RapidApiProviderStatus {
  rapidapi_key_configured: boolean;
  rapidapi_host: string;
  base_url: string;
  timeout_ms: number;
  max_response_bytes: number;
  active_endpoints: RapidApiActiveJobsEndpoint[];
  default_refresh_endpoints: RapidApiActiveJobsEndpoint[];
  default_freshness_window_minutes: number;
  expired_ingest_enabled: boolean;
}

type NormalizedRapidApiIngestRequest = Required<Omit<RapidApiIngestInput, 'endpoints'>> & {
  endpoints: RapidApiActiveJobsEndpoint[];
};

interface RecentRapidApiIngestionRun {
  id: string;
  requested_filters_json: string;
  metadata_json: string;
  finished_at: string;
}

const listSchema = {
  limit: optionalIntParam('Default 10, max 25.', 1, 25),
  offset: optionalIntParam('Default 0.', 0, 10_000),
  status: optionalStringParam('Status filter. Accepts open, closed, expired, unknown, or legacy new/reviewing/qualified/rejected/archived.'),
  source_system: optionalStringParam('Source system filter, such as paylocity, greenhouse, or adzuna.'),
  specialty: optionalStringParam('Specialty filter.'),
  state: optionalStringParam('US state name or abbreviation.'),
};

const searchSchema = {
  query: requiredStringParam('Search text for title, employer, location, specialty, category, or source.'),
  limit: optionalIntParam('Default 10, max 25.', 1, 25),
  status: optionalStringParam('Status filter. Accepts open, closed, expired, unknown, or legacy new/reviewing/qualified/rejected/archived.'),
  location: optionalStringParam('Location text filter.'),
  specialty: optionalStringParam('Specialty filter.'),
  state: optionalStringParam('US state name or abbreviation.'),
  source_system: optionalStringParam('Source system filter.'),
};

const standardSearchSchema = {
  query: requiredStringParam('Search text for nursing jobs, such as "registered nurse Arlington Texas".'),
};

const standardFetchSchema = {
  id: requiredStringParam('Abundance public job ID returned by search.'),
};

const standardSearchOutputSchema = {
  results: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string(),
    }),
  ),
};

const standardFetchOutputSchema = {
  id: z.string(),
  title: z.string(),
  text: z.string(),
  url: z.string(),
  metadata: z.record(z.unknown()).optional(),
};

const getJobSchema = {
  job_id: requiredStringParam('Abundance public job ID.'),
  include_raw_payload: optionalBooleanParam('Default false.'),
};

const sendJobToFunnelSchema = {
  job_id: requiredStringParam('Abundance public job ID to send into the Agency funnel after user confirmation.'),
};

export function listAbundanceJobToolNames(options: AbundanceJobsToolRegistrationOptions = {}): string[] {
  return options.includeFunnelTool === false ? [...READ_ONLY_TOOL_NAMES] : [...TOOL_NAMES];
}

export function createAbundanceJobsServer(
  options: AbundanceJobsServerOptions,
  toolOptions: AbundanceJobsToolRegistrationOptions = {},
): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
  registerAbundanceJobsTools(server, options, toolOptions);
  return server;
}

export function registerAbundanceJobsTools(
  server: McpServer,
  options: AbundanceJobsServerOptions,
  toolOptions: AbundanceJobsToolRegistrationOptions = {},
): void {
  server.resource(
    'abundance-jobs-status',
    'abundance-jobs://status',
    {
      description: 'Abundance Jobs MCP status with no secret values.',
      mimeType: 'application/json',
    },
    async () =>
      resourceJson('abundance-jobs://status', {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        jobs_db_configured: Boolean(options.getDb()),
        tools: listAbundanceJobToolNames(toolOptions),
      }),
  );

  const readOnlyAnnotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };

  server.registerTool(
    'search',
    {
      title: 'Search Nursing Jobs',
      description: 'Search current public nursing jobs. Use this when the user asks to find nursing jobs by role, location, employer, specialty, or pay terms.',
      inputSchema: standardSearchSchema,
      outputSchema: standardSearchOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) => executeDb(options.getDb(), (db) => searchPublicJobDocuments(db, normalizeInput(input))),
  );

  server.registerTool(
    'fetch',
    {
      title: 'Fetch Nursing Job',
      description: 'Fetch one public nursing job by ID returned from search. Use this when the user asks for details about a specific job.',
      inputSchema: standardFetchSchema,
      outputSchema: standardFetchOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) => executeDb(options.getDb(), (db) => fetchPublicJobDocument(db, normalizeInput(input))),
  );

  server.tool(
    'list_public_jobs',
    'List a representative national shortlist of public job listings from the normalized Abundance jobs database. Read-only.',
    listSchema,
    readOnlyAnnotations,
    async (input) => executeDb(options.getDb(), (db) => listPublicJobs(db, normalizeInput(input))),
  );

  server.tool(
    'search_public_jobs',
    'Search public job listings by title, employer, location, specialty, source, or category. Read-only.',
    searchSchema,
    readOnlyAnnotations,
    async (input) => executeDb(options.getDb(), (db) => searchPublicJobs(db, normalizeInput(input))),
  );

  server.tool(
    'get_job',
    'Get one public job listing by ID.',
    getJobSchema,
    readOnlyAnnotations,
    async (input) => executeDb(options.getDb(), (db) => getPublicJob(db, normalizeInput(input))),
  );

  if (toolOptions.includeFunnelTool !== false) {
    server.tool(
      FUNNEL_TOOL_NAME,
      'Send a qualified public job listing into the Agency funnel. Writes to the shared database and should only be called after user confirmation.',
      sendJobToFunnelSchema,
      async (input) => executeDb(options.getDb(), (db) => sendJobToFunnel(db, normalizeInput(input))),
    );
  }
}

async function searchPublicJobDocuments(db: D1Database, input: Record<string, unknown>): Promise<CallToolResult> {
  const query = readRequiredString(input.query, 'query');
  let result: Awaited<ReturnType<typeof queryPublicJobs>> | null = null;

  for (const filters of buildStandardSearchAttempts(query)) {
    result = await queryPublicJobs(db, filters);
    if (result.jobs.length > 0) break;
  }

  return structuredJsonContent({
    results: (result?.jobs ?? []).map((job) => ({
      id: job.id,
      title: jobDocumentTitle(job),
      url: jobCanonicalUrl(job),
    })),
  });
}

function buildStandardSearchAttempts(query: string): DbFilters[] {
  const roleQuery = inferNursingRoleQuery(query);
  const state = inferUsState(query);
  const attempts: DbFilters[] = [
    {
      query,
      status: 'open',
      limit: 10,
    },
  ];

  if (roleQuery && state) {
    attempts.push({
      query: roleQuery,
      state,
      status: 'open',
      limit: 10,
    });
  }

  if (state) {
    attempts.push({
      state,
      status: 'open',
      limit: 10,
    });
  }

  if (roleQuery) {
    attempts.push({
      query: roleQuery,
      status: 'open',
      limit: 10,
    });
  }

  if (roleQuery !== 'nurse') {
    attempts.push({
      query: 'nurse',
      status: 'open',
      limit: 10,
    });
  }

  return attempts;
}

function inferNursingRoleQuery(query: string): string {
  const normalized = query.toLowerCase();
  if (/\bregistered nurse\b/.test(normalized) || /\brn\b/.test(normalized)) return 'registered nurse';
  if (/\blicensed practical nurse\b/.test(normalized) || /\blpn\b/.test(normalized)) return 'licensed practical nurse';
  if (/\blicensed vocational nurse\b/.test(normalized) || /\blvn\b/.test(normalized)) return 'licensed vocational nurse';
  if (/\bcertified nursing assistant\b/.test(normalized) || /\bcertified nurse aide\b/.test(normalized) || /\bcna\b/.test(normalized)) return 'cna';
  if (/\bnurse practitioner\b/.test(normalized)) return 'nurse practitioner';
  if (/\bnurs(?:e|ing)\b/.test(normalized)) return 'nurse';
  return query;
}

function inferUsState(query: string): string | undefined {
  const normalized = query.toLowerCase();
  for (const [name, code] of US_STATE_CODES) {
    if (normalized.includes(name) || new RegExp(`\\b${code.toLowerCase()}\\b`).test(normalized)) return code;
  }
  return undefined;
}

async function executeDb(
  db: D1Database | undefined,
  fn: (db: D1Database) => Promise<CallToolResult>,
): Promise<CallToolResult> {
  if (!db) {
    return toolErrorContent({
      ok: false,
      error: 'JOBS_DB is not configured for this deployment.',
    });
  }

  try {
    return await fn(db);
  } catch (error) {
    return toolErrorContent({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function listPublicJobs(db: D1Database, input: Record<string, unknown>): Promise<CallToolResult> {
  const result = await queryPublicJobs(db, {
    limit: readOptionalInteger(input.limit),
    offset: readOptionalInteger(input.offset),
    status: readOptionalString(input.status),
    source_system: readOptionalString(input.source_system),
    specialty: readOptionalString(input.specialty),
    state: readOptionalString(input.state),
  });
  return jsonContent(result);
}

async function searchPublicJobs(db: D1Database, input: Record<string, unknown>): Promise<CallToolResult> {
  const result = await queryPublicJobs(db, {
    query: readRequiredString(input.query, 'query'),
    location: readOptionalString(input.location),
    limit: readOptionalInteger(input.limit),
    status: readOptionalString(input.status),
    source_system: readOptionalString(input.source_system),
    specialty: readOptionalString(input.specialty),
    state: readOptionalString(input.state),
  });
  return jsonContent(result);
}

export async function getPublicJob(db: D1Database, input: Record<string, unknown>): Promise<CallToolResult> {
  const jobId = readRequiredString(input.job_id, 'job_id');
  const includeRawPayload = readOptionalBoolean(input.include_raw_payload) ?? false;
  const row = await getPublicJobRow(db, jobId);
  if (!row) {
    return toolErrorContent({ ok: false, error: `Job not found: ${jobId}` });
  }
  return jsonContent({ job: toPublicJob(row, includeRawPayload) });
}

async function fetchPublicJobDocument(db: D1Database, input: Record<string, unknown>): Promise<CallToolResult> {
  const jobId = readRequiredString(input.id, 'id');
  const row = await getPublicJobRow(db, jobId);
  if (!row) {
    return toolErrorContent({ ok: false, error: `Job not found: ${jobId}` });
  }

  const job = toPublicJob(row, false);
  return structuredJsonContent({
    id: job.id,
    title: jobDocumentTitle(job),
    text: jobDocumentText(job),
    url: jobCanonicalUrl(job),
    metadata: pruneUndefined({
      employer: job.employer,
      location: job.location,
      city: job.city,
      state: job.state,
      country: job.country,
      specialty: job.specialty,
      discipline: job.discipline,
      employment_type: job.employment_type,
      shift: job.shift,
      duration: job.duration,
      start_date: job.start_date,
      pay_min: job.pay_min,
      pay_max: job.pay_max,
      pay_text: job.pay_text,
      currency: job.currency,
      openings: job.openings,
      status: job.status,
      provider: job.provider,
      source_system: job.source_system,
      posted_at: job.posted_at,
      last_seen_at: job.last_seen_at,
      fetched_at: job.fetched_at,
    }),
  });
}

async function sendJobToFunnel(db: D1Database, input: Record<string, unknown>): Promise<CallToolResult> {
  const jobId = readRequiredString(input.job_id, 'job_id');
  const row = await getPublicJobRow(db, jobId);
  if (!row) {
    return toolErrorContent({ ok: false, error: `Job not found: ${jobId}` });
  }

  const job = toPublicJob(row, false);
  const sourceDetail = `abundance-job:${job.id}`;
  const existing = await db
    .prepare('SELECT id, stage, updated_at FROM leads WHERE source = ? AND source_detail = ? ORDER BY updated_at DESC LIMIT 1')
    .bind('other', sourceDetail)
    .first<{ id: string; stage: string; updated_at: string }>();

  if (existing) {
    return jsonContent({
      ok: true,
      action: 'already_in_funnel',
      lead_id: existing.id,
      stage: existing.stage,
      job,
    });
  }

  const now = new Date().toISOString();
  const leadId = `lead_${crypto.randomUUID()}`;
  const notes = [
    `Abundance public job selected for recruiter review.`,
    `Job ID: ${job.id}`,
    `Title: ${job.title}`,
    job.employer ? `Employer: ${job.employer}` : null,
    job.location ? `Location: ${job.location}` : null,
    job.application_url ? `Application URL: ${job.application_url}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  await db
    .prepare(
      `
      INSERT INTO leads (
        id, name, company, role, source, source_detail, campaign, stage,
        service_interest, first_touch_at, last_touch_at, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      leadId,
      job.title,
      job.employer ?? null,
      'public healthcare job',
      'other',
      sourceDetail,
      'abundance-jobs',
      'consideration',
      'abundance-public-jobs',
      now,
      now,
      notes,
      now,
      now,
    )
    .run();

  return jsonContent({
    ok: true,
    action: 'sent_to_funnel',
    lead_id: leadId,
    job,
  });
}

function jobDocumentTitle(job: PublicJob): string {
  const parts = [job.title, job.employer, job.location].filter(Boolean);
  return parts.join(' - ');
}

function jobCanonicalUrl(job: PublicJob): string {
  return job.application_url ?? job.source_url ?? `https://abundance-jobs-mcp.createsomething.workers.dev/public/jobs/${encodeURIComponent(job.id)}`;
}

function jobDocumentText(job: PublicJob): string {
  return [
    `Title: ${job.title}`,
    job.employer ? `Employer: ${job.employer}` : null,
    job.location ? `Location: ${job.location}` : null,
    job.specialty ? `Specialty: ${job.specialty}` : null,
    job.discipline ? `Discipline: ${job.discipline}` : null,
    job.employment_type ? `Employment type: ${job.employment_type}` : null,
    job.shift ? `Shift: ${job.shift}` : null,
    job.duration ? `Duration: ${job.duration}` : null,
    job.start_date ? `Start date: ${job.start_date}` : null,
    job.pay_text ? `Pay: ${job.pay_text}` : null,
    job.pay_min || job.pay_max
      ? `Pay range: ${job.pay_min ?? 'unknown'}-${job.pay_max ?? 'unknown'} ${job.currency ?? ''}`.trim()
      : null,
    job.openings ? `Openings: ${job.openings}` : null,
    `Status: ${job.status}`,
    `Source: ${job.source_system}`,
    job.application_url ? `Apply: ${job.application_url}` : null,
    job.source_url && job.source_url !== job.application_url ? `Source URL: ${job.source_url}` : null,
    `Job ID: ${job.id}`,
    `Last seen: ${job.last_seen_at}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function structuredJsonContent<T extends Record<string, unknown>>(data: T): CallToolResult {
  return {
    structuredContent: data,
    content: [{ type: 'text' as const, text: JSON.stringify(data) }],
  };
}

export async function queryPublicJobs(
  db: D1Database,
  filters: DbFilters,
): Promise<{ jobs: PublicJob[]; limit: number; offset: number; freshness: { newest_last_seen_at?: string; newest_provider?: string } }> {
  const limit = clamp(filters.limit ?? 10, 1, 25);
  const offset = Math.max(0, filters.offset ?? 0);
  const where: string[] = [];
  const args: unknown[] = [];

  if (filters.provider?.trim()) {
    where.push('provider = ?');
    args.push(filters.provider.trim());
  }

  if (filters.source_system?.trim()) {
    where.push('lower(source_system) = lower(?)');
    args.push(filters.source_system.trim());
  }

  const status = normalizeStatusFilter(filters.status);
  if (status) {
    where.push('status = ?');
    args.push(status);
  }

  if (filters.state?.trim()) {
    where.push('(upper(state) = ? OR lower(location_text) LIKE lower(?))');
    const state = filters.state.trim();
    args.push(state.toUpperCase(), `%${state}%`);
  }

  if (filters.specialty?.trim()) {
    where.push('lower(specialty) = lower(?)');
    args.push(filters.specialty.trim());
  }

  if (filters.location?.trim()) {
    where.push('(lower(city) LIKE lower(?) OR lower(state) LIKE lower(?) OR lower(location_text) LIKE lower(?))');
    const location = `%${filters.location.trim()}%`;
    args.push(location, location, location);
  }

  if (filters.query?.trim()) {
    where.push(
      '(lower(title) LIKE lower(?) OR lower(employer) LIKE lower(?) OR lower(location_text) LIKE lower(?) OR lower(specialty) LIKE lower(?) OR lower(discipline) LIKE lower(?) OR lower(source_system) LIKE lower(?))',
    );
    const query = `%${filters.query.trim()}%`;
    args.push(query, query, query, query, query, query);
  }

  const sql = `
    SELECT * FROM abundance_public_jobs
    ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${NURSING_TITLE_RANK_SQL}, last_seen_at DESC, posted_at DESC, created_at DESC
    LIMIT ? OFFSET ?
  `;
  const { results } = await db.prepare(sql).bind(...args, limit, offset).all<PublicJobRow>();
  const jobs = results.map((row) => toPublicJob(row, false));

  return {
    jobs,
    limit,
    offset,
    freshness: {
      newest_last_seen_at: jobs[0]?.last_seen_at,
      newest_provider: jobs[0]?.provider,
    },
  };
}

async function getPublicJobRow(db: D1Database, jobId: string): Promise<PublicJobRow | null> {
  const row = await db.prepare('SELECT * FROM abundance_public_jobs WHERE id = ? LIMIT 1').bind(jobId).first<PublicJobRow>();
  return row ?? null;
}

export function getRapidApiProviderStatus(config: AbundanceJobsProviderConfig): RapidApiProviderStatus {
  const resolved = resolveProviderConfig(config);
  return {
    rapidapi_key_configured: Boolean(resolved.rapidApiKey),
    rapidapi_host: resolved.rapidApiHost,
    base_url: resolved.rapidApiBaseUrl,
    timeout_ms: resolved.timeoutMs,
    max_response_bytes: resolved.maxResponseBytes,
    active_endpoints: [...ACTIVE_ENDPOINTS],
    default_refresh_endpoints: [...DEFAULT_REFRESH_ENDPOINTS],
    default_freshness_window_minutes: DEFAULT_FRESHNESS_WINDOW_MINUTES,
    expired_ingest_enabled: resolved.allowExpiredIngest,
  };
}

export async function ingestRapidApiJobs(input: {
  db: D1Database;
  config: AbundanceJobsProviderConfig;
  request: RapidApiIngestInput;
}): Promise<{
  ok: boolean;
  run_id: string;
  dry_run: boolean;
  endpoints: Array<{ endpoint: RapidApiActiveJobsEndpoint; status: number; count: number; upserted: number }>;
  result_count: number;
  request_count: number;
  skipped: boolean;
  skip_reason?: string;
  reused_run_id?: string;
  jobs: PublicJob[];
}> {
  const config = resolveProviderConfig(input.config);
  if (!config.rapidApiKey) {
    throw new Error('ACTIVE_JOBS_RAPIDAPI_KEY is not configured.');
  }

  const request = normalizeIngestInput(input.request);
  const startedAt = new Date().toISOString();
  const runId = `abjobrun_${crypto.randomUUID()}`;
  const jobs: PublicJobRow[] = [];
  const endpointResults: Array<{ endpoint: RapidApiActiveJobsEndpoint; status: number; count: number; upserted: number }> = [];

  try {
    const recentRun =
      request.force_refresh || request.freshness_window_minutes <= 0
        ? null
        : await findReusableRapidApiIngestionRun(input.db, request, startedAt);
    if (recentRun) {
      await createPublicJobIngestionRun(input.db, {
        id: runId,
        provider: 'rapidapi',
        sourceSystem: 'active_jobs_db',
        status: 'succeeded',
        requestedFilters: request,
        resultCount: 0,
        metadata: {
          skipped: true,
          skip_reason: 'fresh_cloudflare_d1_ingestion',
          reused_run_id: recentRun.id,
          freshness_window_minutes: request.freshness_window_minutes,
        },
        startedAt,
        finishedAt: new Date().toISOString(),
      });

      return {
        ok: true,
        run_id: runId,
        dry_run: request.dry_run,
        endpoints: [],
        result_count: 0,
        request_count: 0,
        skipped: true,
        skip_reason: 'fresh_cloudflare_d1_ingestion',
        reused_run_id: recentRun.id,
        jobs: [],
      };
    }

    for (const endpoint of request.endpoints) {
      const response = await fetchRapidApiEndpoint(config, endpoint, request);
      const normalized = await Promise.all(
        response.records.map((record) =>
          normalizeRapidApiJobRecord(record, {
            fetchedAt: startedAt,
            endpoint,
            requestedFilters: request,
          }),
        ),
      );
      jobs.push(...normalized);

      let upserted = 0;
      if (!request.dry_run) {
        upserted = await upsertPublicJobs(input.db, normalized);
      }

      endpointResults.push({
        endpoint,
        status: response.status,
        count: normalized.length,
        upserted,
      });
    }

    await createPublicJobIngestionRun(input.db, {
      id: runId,
      provider: 'rapidapi',
      sourceSystem: 'active_jobs_db',
      status: 'succeeded',
      requestedFilters: request,
      resultCount: endpointResults.reduce((sum, result) => sum + result.upserted, 0),
      metadata: {
        endpoints: endpointResults,
        dry_run: request.dry_run,
        request_count: endpointResults.length,
      },
      startedAt,
      finishedAt: new Date().toISOString(),
    });

    return {
      ok: true,
      run_id: runId,
      dry_run: request.dry_run,
      endpoints: endpointResults,
      result_count: endpointResults.reduce((sum, result) => sum + result.count, 0),
      request_count: endpointResults.length,
      skipped: false,
      jobs: jobs.map((job) => toPublicJob(job, false)),
    };
  } catch (error) {
    await createPublicJobIngestionRun(input.db, {
      id: runId,
      provider: 'rapidapi',
      sourceSystem: 'active_jobs_db',
      status: 'failed',
      requestedFilters: request,
      resultCount: 0,
      error: error instanceof Error ? error.message : String(error),
      metadata: { dry_run: request.dry_run },
      startedAt,
      finishedAt: new Date().toISOString(),
    }).catch(() => undefined);
    throw error;
  }
}

export async function probeRapidApiExpired(input: {
  config: AbundanceJobsProviderConfig;
  limitBytes?: number;
}): Promise<{ ok: boolean; status: number; byte_limit: number; error?: string; sample_shape?: string }> {
  const config = resolveProviderConfig(input.config);
  if (!config.rapidApiKey) {
    throw new Error('ACTIVE_JOBS_RAPIDAPI_KEY is not configured.');
  }

  const byteLimit = clamp(input.limitBytes ?? 128 * 1024, 8 * 1024, 512 * 1024);
  const url = new URL(`${config.rapidApiBaseUrl}${EXPIRED_ENDPOINT}`);
  url.searchParams.set('limit', '10');
  url.searchParams.set('offset', '0');

  const response = await fetch(url, {
    headers: rapidApiHeaders(config),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  try {
    const text = await readLimitedResponse(response, byteLimit);
    const parsed = parseJson(text);
    return {
      ok: response.ok,
      status: response.status,
      byte_limit: byteLimit,
      sample_shape: Array.isArray(parsed) ? `array:${parsed.length}` : typeof parsed,
    };
  } catch (error) {
    return {
      ok: false,
      status: response.status,
      byte_limit: byteLimit,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchRapidApiEndpoint(
  config: ResolvedProviderConfig,
  endpoint: RapidApiActiveJobsEndpoint,
  request: NormalizedRapidApiIngestRequest,
): Promise<{ status: number; records: Record<string, unknown>[] }> {
  const url = new URL(`${config.rapidApiBaseUrl}${endpoint}`);
  url.searchParams.set('limit', String(request.limit));
  url.searchParams.set('offset', String(request.offset));
  if (request.title_filter) url.searchParams.set('title_filter', request.title_filter);
  if (request.location_filter) url.searchParams.set('location_filter', request.location_filter);
  if (request.organization_filter) url.searchParams.set('organization_filter', request.organization_filter);

  const response = await fetch(url, {
    headers: rapidApiHeaders(config),
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  const text = await readLimitedResponse(response, config.maxResponseBytes);
  const parsed = parseJson(text);

  if (!response.ok) {
    throw new Error(`RapidAPI Active Jobs ${endpoint} failed with HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  return {
    status: response.status,
    records: extractRecords(parsed),
  };
}

export async function normalizeRapidApiJobRecord(
  record: Record<string, unknown>,
  options: {
    fetchedAt?: string;
    endpoint?: string;
    requestedFilters?: Record<string, unknown>;
  } = {},
): Promise<PublicJobRow> {
  const title = firstString(record, ['title', 'job_title', 'position', 'name']);
  if (!title) {
    throw new Error('RapidAPI Active Jobs record is missing a title.');
  }

  const location = parseRapidApiLocation(record);
  const sourceDomain = firstString(record, ['source_domain', 'domain']);
  const source = firstString(record, ['source', 'source_type', 'site']) ?? sourceDomain;
  const sourceSystem = normalizeSourceSystem(source ?? sourceDomain ?? 'active_jobs_db');
  const employer = firstString(record, ['organization', 'company', 'company_name', 'employer']);
  const dateValidThrough = firstString(record, ['date_validthrough', 'valid_through']);
  const status = dateValidThrough && isPastDate(dateValidThrough) ? 'expired' : 'open';
  const pay = parseRapidApiPay(record);

  return normalizePublicJob({
    provider: 'rapidapi',
    source_system: sourceSystem,
    source_url: firstString(record, ['url', 'job_url', 'application_url']),
    external_job_id: firstString(record, ['id', 'job_id', 'external_job_id']),
    title,
    employer,
    city: location.city,
    state: location.state,
    country: location.country,
    location_text: location.locationText,
    specialty: firstString(record, ['specialty', 'category', 'job_category']),
    discipline: firstString(record, ['discipline', 'profession']),
    employment_type: firstString(record, ['employment_type']),
    shift: firstString(record, ['shift', 'shift_type']),
    duration: firstString(record, ['duration', 'contract_duration']),
    start_date: firstString(record, ['start_date']),
    pay_min: pay.min,
    pay_max: pay.max,
    pay_text: pay.text,
    currency: pay.currency ?? 'USD',
    openings: firstNumber(record, ['openings', 'positions', 'number_of_openings']),
    status,
    application_url: firstString(record, ['url', 'application_url', 'apply_url']),
    posted_at: firstString(record, ['date_posted', 'posted_at', 'posted_date']),
    fetched_at: options.fetchedAt,
    raw_payload: record,
    metadata: {
      rapidapi_endpoint: options.endpoint,
      rapidapi_source: source,
      rapidapi_source_domain: sourceDomain,
      requested_filters: options.requestedFilters,
    },
  });
}

export async function normalizePublicJob(input: NormalizedJobInput): Promise<PublicJobRow> {
  const fetchedAt = input.fetched_at ?? new Date().toISOString();
  const normalizedAt = input.normalized_at ?? fetchedAt;
  const lastSeenAt = input.last_seen_at ?? fetchedAt;
  const rawPayloadJson = stableStringify(input.raw_payload);
  const rawPayloadHash = await sha256Hex(rawPayloadJson);
  const externalJobId = cleanString(input.external_job_id) ?? `raw-${rawPayloadHash.slice(0, 24)}`;
  const identityHash = await sha256Hex(`${input.provider}:${input.source_system}:${externalJobId}`);

  return {
    id: `abj_${identityHash.slice(0, 24)}`,
    provider: input.provider,
    source_system: input.source_system,
    source_url: cleanString(input.source_url),
    external_job_id: externalJobId,
    raw_payload_hash: rawPayloadHash,
    title: input.title.trim(),
    employer: cleanString(input.employer),
    city: cleanString(input.city),
    state: normalizeState(input.state),
    country: cleanString(input.country) ?? 'US',
    location_text: cleanString(input.location_text),
    specialty: cleanString(input.specialty),
    discipline: cleanString(input.discipline),
    employment_type: cleanString(input.employment_type),
    shift: cleanString(input.shift),
    duration: cleanString(input.duration),
    start_date: cleanString(input.start_date),
    pay_min: input.pay_min,
    pay_max: input.pay_max,
    pay_text: cleanString(input.pay_text),
    currency: cleanString(input.currency) ?? 'USD',
    openings: input.openings,
    status: input.status ?? 'open',
    application_url: cleanString(input.application_url),
    posted_at: cleanString(input.posted_at),
    last_seen_at: lastSeenAt,
    fetched_at: fetchedAt,
    normalized_at: normalizedAt,
    raw_payload_json: rawPayloadJson,
    raw_payload_expires_at: cleanString(input.raw_payload_expires_at),
    metadata_json: stableStringify(input.metadata ?? {}),
  };
}

export async function upsertPublicJobs(db: D1Database, jobs: PublicJobRow[]): Promise<number> {
  for (const job of jobs) {
    const statement = buildPublicJobUpsert(job);
    await db.prepare(statement.sql).bind(...statement.args).run();
  }
  return jobs.length;
}

export function buildPublicJobUpsert(job: PublicJobRow): PreparedUpsert {
  return {
    sql: `
      INSERT INTO abundance_public_jobs (
        id, provider, source_system, source_url, external_job_id, raw_payload_hash,
        title, employer, city, state, country, location_text, specialty, discipline,
        employment_type, shift, duration, start_date, pay_min, pay_max, pay_text,
        currency, openings, status, application_url, posted_at, last_seen_at, fetched_at,
        normalized_at, provider_snapshot_id, raw_payload_json, raw_payload_expires_at,
        metadata_json
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
      ON CONFLICT(provider, source_system, external_job_id) DO UPDATE SET
        source_url = excluded.source_url,
        raw_payload_hash = excluded.raw_payload_hash,
        title = excluded.title,
        employer = excluded.employer,
        city = excluded.city,
        state = excluded.state,
        country = excluded.country,
        location_text = excluded.location_text,
        specialty = excluded.specialty,
        discipline = excluded.discipline,
        employment_type = excluded.employment_type,
        shift = excluded.shift,
        duration = excluded.duration,
        start_date = excluded.start_date,
        pay_min = excluded.pay_min,
        pay_max = excluded.pay_max,
        pay_text = excluded.pay_text,
        currency = excluded.currency,
        openings = excluded.openings,
        status = excluded.status,
        application_url = excluded.application_url,
        posted_at = excluded.posted_at,
        last_seen_at = excluded.last_seen_at,
        fetched_at = excluded.fetched_at,
        normalized_at = excluded.normalized_at,
        provider_snapshot_id = excluded.provider_snapshot_id,
        raw_payload_json = excluded.raw_payload_json,
        raw_payload_expires_at = excluded.raw_payload_expires_at,
        metadata_json = excluded.metadata_json
    `,
    args: [
      job.id,
      job.provider,
      job.source_system,
      job.source_url ?? null,
      job.external_job_id,
      job.raw_payload_hash,
      job.title,
      job.employer ?? null,
      job.city ?? null,
      job.state ?? null,
      job.country ?? null,
      job.location_text ?? null,
      job.specialty ?? null,
      job.discipline ?? null,
      job.employment_type ?? null,
      job.shift ?? null,
      job.duration ?? null,
      job.start_date ?? null,
      job.pay_min ?? null,
      job.pay_max ?? null,
      job.pay_text ?? null,
      job.currency ?? null,
      job.openings ?? null,
      job.status,
      job.application_url ?? null,
      job.posted_at ?? null,
      job.last_seen_at,
      job.fetched_at,
      job.normalized_at,
      job.provider_snapshot_id ?? null,
      job.raw_payload_json ?? '{}',
      job.raw_payload_expires_at ?? null,
      job.metadata_json ?? '{}',
    ],
  };
}

export async function createPublicJobIngestionRun(
  db: D1Database,
  input: {
    id: string;
    provider: string;
    sourceSystem?: string;
    status: 'pending' | 'running' | 'snapshot_pending' | 'succeeded' | 'failed';
    providerSnapshotId?: string;
    requestedFilters: Record<string, unknown>;
    resultCount?: number;
    error?: string;
    metadata?: Record<string, unknown>;
    startedAt?: string;
    finishedAt?: string;
  },
): Promise<void> {
  const startedAt = input.startedAt ?? new Date().toISOString();
  await db
    .prepare(
      `
      INSERT INTO abundance_public_job_ingestion_runs (
        id, provider, source_system, status, provider_snapshot_id, requested_filters_json,
        result_count, error, metadata_json, started_at, finished_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      input.id,
      input.provider,
      input.sourceSystem ?? null,
      input.status,
      input.providerSnapshotId ?? null,
      JSON.stringify(input.requestedFilters),
      input.resultCount ?? 0,
      input.error ?? null,
      JSON.stringify(input.metadata ?? {}),
      startedAt,
      input.finishedAt ?? null,
    )
    .run();
}

function toPublicJob(row: PublicJobRow, includeRawPayload: boolean): PublicJob {
  const metadata = parseJsonSafe(row.metadata_json);
  const rawPayload = includeRawPayload ? parseJsonSafe(row.raw_payload_json) : undefined;
  const fallbackLocation = [cleanString(row.city), cleanString(row.state)].filter(Boolean).join(', ') || undefined;
  return pruneUndefined({
    id: row.id,
    title: row.title,
    employer: cleanString(row.employer),
    location: cleanString(row.location_text) ?? fallbackLocation,
    city: cleanString(row.city),
    state: cleanString(row.state),
    country: cleanString(row.country),
    specialty: cleanString(row.specialty),
    discipline: cleanString(row.discipline),
    employment_type: cleanString(row.employment_type),
    shift: cleanString(row.shift),
    duration: cleanString(row.duration),
    start_date: cleanString(row.start_date),
    pay_min: row.pay_min ?? undefined,
    pay_max: row.pay_max ?? undefined,
    pay_text: cleanString(row.pay_text),
    currency: cleanString(row.currency),
    openings: row.openings ?? undefined,
    status: row.status,
    source: row.source_system,
    provider: row.provider,
    source_system: row.source_system,
    source_url: cleanString(row.source_url),
    application_url: cleanString(row.application_url),
    posted_at: cleanString(row.posted_at),
    last_seen_at: row.last_seen_at,
    fetched_at: row.fetched_at,
    normalized_at: row.normalized_at,
    metadata,
    raw_payload: rawPayload,
  });
}

export function classifyNursingJobTitle(title: string): { rank: number; role: string; reason: string } {
  const normalized = title.toLowerCase();
  const hasRn = /\br\.?n\.?\b/i.test(title) || normalized.includes('registered nurse');
  const hasLpnLvn =
    /\blpn\b/i.test(title) ||
    /\blvn\b/i.test(title) ||
    normalized.includes('licensed practical nurse') ||
    normalized.includes('licensed vocational nurse');
  const hasCna = /\bcna\b/i.test(title) || normalized.includes('certified nurse aide') || normalized.includes('certified nurse assistant');
  const hasPractitioner = normalized.includes('nurse practitioner');
  const hasNurse = normalized.includes('nurse');
  const isInternOrUnpaid = normalized.includes('intern') || normalized.includes('non paid') || normalized.includes('unpaid');
  const isPaBlended = normalized.includes('physician assistant') || /\bpa\b/i.test(title);

  if (hasRn && !isInternOrUnpaid) return { rank: 0, role: 'registered_nurse', reason: 'RN or Registered Nurse title' };
  if (hasLpnLvn) return { rank: 1, role: 'licensed_practical_or_vocational_nurse', reason: 'LPN/LVN title' };
  if (hasCna) return { rank: 2, role: 'certified_nursing_assistant', reason: 'CNA title' };
  if (hasPractitioner && !isPaBlended) return { rank: 3, role: 'nurse_practitioner', reason: 'Nurse practitioner title' };
  if (hasNurse && !isInternOrUnpaid && !isPaBlended) return { rank: 4, role: 'nursing_general', reason: 'General nurse title' };
  if (hasNurse) return { rank: 5, role: 'nurse_adjacent_or_mixed', reason: 'Contains nurse but includes mixed, intern, unpaid, or PA language' };
  return { rank: 9, role: 'not_nursing_title', reason: 'Title does not contain nursing signal' };
}

type ResolvedProviderConfig = Required<Omit<AbundanceJobsProviderConfig, 'rapidApiKey' | 'rapidApiHost' | 'rapidApiBaseUrl'>> & {
  rapidApiKey: string;
  rapidApiHost: string;
  rapidApiBaseUrl: string;
};

function resolveProviderConfig(config: AbundanceJobsProviderConfig): ResolvedProviderConfig {
  const rapidApiHost = normalizeHost(config.rapidApiHost) ?? DEFAULT_RAPIDAPI_HOST;
  const rapidApiBaseUrl = normalizeBaseUrl(config.rapidApiBaseUrl) ?? `https://${rapidApiHost}`;
  return {
    rapidApiKey: config.rapidApiKey?.trim() ?? '',
    rapidApiHost,
    rapidApiBaseUrl,
    timeoutMs: config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS,
    maxResponseBytes: config.maxResponseBytes && config.maxResponseBytes > 0 ? config.maxResponseBytes : DEFAULT_MAX_RESPONSE_BYTES,
    allowExpiredIngest: config.allowExpiredIngest ?? false,
  };
}

export function normalizeRapidApiIngestInput(input: RapidApiIngestInput): NormalizedRapidApiIngestRequest {
  const endpoints =
    input.endpoints && input.endpoints.length > 0
      ? input.endpoints
      : input.include_backfill
        ? [...ACTIVE_ENDPOINTS]
        : [...DEFAULT_REFRESH_ENDPOINTS];
  for (const endpoint of endpoints) {
    if (!ACTIVE_ENDPOINTS.includes(endpoint)) {
      throw new Error(`Unsupported RapidAPI Active Jobs endpoint: ${endpoint}`);
    }
  }
  return {
    title_filter: input.title_filter?.trim() || NURSING_JOBS_TITLE_FILTER,
    location_filter: input.location_filter?.trim() || DEFAULT_NURSING_JOBS_LOCATION_FILTER,
    organization_filter: input.organization_filter?.trim() || '',
    limit: clamp(input.limit ?? DEFAULT_INGEST_LIMIT, 1, MAX_INGEST_LIMIT),
    offset: Math.max(0, Math.trunc(input.offset ?? 0)),
    endpoints,
    include_backfill: input.include_backfill ?? false,
    force_refresh: input.force_refresh ?? false,
    freshness_window_minutes: clamp(input.freshness_window_minutes ?? DEFAULT_FRESHNESS_WINDOW_MINUTES, 0, 24 * 60),
    dry_run: input.dry_run ?? false,
  };
}

export function normalizeNursingJobsIngestInput(input: NursingJobsIngestInput): NormalizedRapidApiIngestRequest {
  return normalizeRapidApiIngestInput({
    title_filter: NURSING_JOBS_TITLE_FILTER,
    location_filter: input.location_filter?.trim() || DEFAULT_NURSING_JOBS_LOCATION_FILTER,
    limit: input.limit,
    offset: input.offset,
    include_backfill: input.include_backfill,
    force_refresh: input.force_refresh,
    freshness_window_minutes: input.freshness_window_minutes,
    dry_run: input.dry_run,
  });
}

function normalizeIngestInput(input: RapidApiIngestInput): NormalizedRapidApiIngestRequest {
  return normalizeRapidApiIngestInput(input);
}

async function findReusableRapidApiIngestionRun(
  db: D1Database,
  request: NormalizedRapidApiIngestRequest,
  nowIso: string,
): Promise<RecentRapidApiIngestionRun | null> {
  const cutoff = new Date(Date.parse(nowIso) - request.freshness_window_minutes * 60_000).toISOString();
  const { results } = await db
    .prepare(
      `
        SELECT id, requested_filters_json, metadata_json, finished_at
        FROM abundance_public_job_ingestion_runs
        WHERE provider = ?
          AND source_system = ?
          AND status = ?
          AND finished_at IS NOT NULL
          AND finished_at >= ?
        ORDER BY finished_at DESC
        LIMIT 20
      `,
    )
    .bind('rapidapi', 'active_jobs_db', 'succeeded', cutoff)
    .all<RecentRapidApiIngestionRun>();

  for (const run of results) {
    const metadata = parseJsonSafe(run.metadata_json);
    if (isRecord(metadata) && metadata.skipped === true) continue;
    if (isRecord(metadata) && metadata.dry_run === true) continue;
    const previous = parseJsonSafe(run.requested_filters_json);
    if (sameRapidApiRefreshRequest(previous, request)) return run;
  }

  return null;
}

function sameRapidApiRefreshRequest(previous: unknown, current: NormalizedRapidApiIngestRequest): boolean {
  if (!isRecord(previous)) return false;
  const previousEndpoints = Array.isArray(previous.endpoints) ? previous.endpoints.filter(isRapidApiActiveJobsEndpoint) : [];
  return (
    comparableString(firstString(previous, ['title_filter'])) === comparableString(current.title_filter) &&
    comparableString(firstString(previous, ['location_filter'])) === comparableString(current.location_filter) &&
    comparableString(firstString(previous, ['organization_filter'])) === comparableString(current.organization_filter) &&
    firstNumber(previous, ['limit']) === current.limit &&
    firstNumber(previous, ['offset']) === current.offset &&
    Boolean(previous.include_backfill) === current.include_backfill &&
    sameStringArray(previousEndpoints, current.endpoints)
  );
}

function isRapidApiActiveJobsEndpoint(value: unknown): value is RapidApiActiveJobsEndpoint {
  return typeof value === 'string' && (ACTIVE_ENDPOINTS as readonly string[]).includes(value);
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function comparableString(value: string | undefined): string {
  return value?.trim() ?? '';
}

function rapidApiHeaders(config: ResolvedProviderConfig): Headers {
  return new Headers({
    Accept: 'application/json',
    'X-RapidAPI-Key': config.rapidApiKey,
    'X-RapidAPI-Host': config.rapidApiHost,
  });
}

function extractRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (isRecord(payload)) {
    if (Array.isArray(payload.data)) return payload.data.filter(isRecord);
    if (Array.isArray(payload.jobs)) return payload.jobs.filter(isRecord);
    if (Array.isArray(payload.results)) return payload.results.filter(isRecord);
    if (looksLikeJobRecord(payload)) return [payload];
  }
  return [];
}

function parseRapidApiLocation(record: Record<string, unknown>): { city?: string; state?: string; country?: string; locationText?: string } {
  const locationText = firstString(record, ['location', 'location_text']);
  const locationsRaw = record.locations_raw;
  if (Array.isArray(locationsRaw)) {
    for (const location of locationsRaw) {
      if (!isRecord(location) || !isRecord(location.address)) continue;
      const address = location.address;
      const city = firstString(address, ['addressLocality']);
      const state = firstString(address, ['addressRegion']);
      const country = firstString(address, ['addressCountry']);
      const street = firstString(address, ['streetAddress']);
      const postalCode = firstString(address, ['postalCode']);
      return {
        city,
        state,
        country,
        locationText: [street, city, state, postalCode, country].filter(Boolean).join(', '),
      };
    }
  }

  const cities = record.cities_derived;
  const states = record.regions_derived;
  const countries = record.countries_derived;
  const city = Array.isArray(cities) ? cleanString(cities[0]) : undefined;
  const state = Array.isArray(states) ? cleanString(states[0]) : undefined;
  const country = Array.isArray(countries) ? cleanString(countries[0]) : undefined;
  return {
    city,
    state,
    country,
    locationText: locationText ?? [city, state, country].filter(Boolean).join(', '),
  };
}

function parseRapidApiPay(record: Record<string, unknown>): { min?: number; max?: number; text?: string; currency?: string } {
  const salaryRaw = record.salary_raw;
  if (isRecord(salaryRaw)) {
    return {
      min: firstNumber(salaryRaw, ['minValue', 'min_value', 'min']),
      max: firstNumber(salaryRaw, ['maxValue', 'max_value', 'max']),
      text: firstString(salaryRaw, ['value', 'text', 'description']),
      currency: firstString(salaryRaw, ['currency']),
    };
  }
  return {
    min: firstNumber(record, ['pay_min', 'salary_min', 'salary_from']),
    max: firstNumber(record, ['pay_max', 'salary_max', 'salary_to']),
    text: firstString(record, ['salary_raw', 'pay_text', 'salary', 'compensation']),
    currency: firstString(record, ['currency', 'salary_currency']),
  };
}

function normalizeStatusFilter(value: string | undefined): PublicJobStatus | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if ((NORMALIZED_STATUSES as readonly string[]).includes(normalized)) return normalized as PublicJobStatus;
  return LEGACY_STATUS_TO_NORMALIZED[normalized] ?? null;
}

function normalizeSourceSystem(value: string): string {
  const source = value
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
    .split('.')[0]
    ?.replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return source || 'active_jobs_db';
}

async function readLimitedResponse(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error(`Response exceeded ${maxBytes} bytes.`);
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Response exceeded ${maxBytes} bytes.`);
      }
      chunks.push(value);
    }
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(buffer);
}

function parseJson(text: string): unknown {
  if (!text.trim()) return null;
  return JSON.parse(text);
}

function parseJsonSafe(text: string | null | undefined): unknown | undefined {
  if (!text?.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function resourceJson(uri: string, data: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function normalizeInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function requiredStringParam(description: string) {
  return z.preprocess((value) => (value === null || value === undefined ? '' : value), z.string().trim().min(1)).describe(description);
}

function optionalStringParam(description: string) {
  return z
    .preprocess((value) => (value === null || value === undefined || value === '' ? undefined : value), z.string().trim().optional())
    .describe(description);
}

function optionalIntParam(description: string, min: number, max: number) {
  return z
    .preprocess((value) => (value === null || value === undefined || value === '' ? undefined : value), z.coerce.number().int().min(min).max(max).optional())
    .describe(description);
}

function optionalBooleanParam(description: string) {
  return z
    .preprocess((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
      return value;
    }, z.boolean().optional())
    .describe(description);
}

function readRequiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${name} is required.`);
  return value.trim();
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readOptionalInteger(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
  return undefined;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    const cleaned = cleanString(value);
    if (cleaned) return cleaned;
  }
  return undefined;
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[$,]/g, '').trim());
      if (Number.isFinite(parsed)) return Math.trunc(parsed);
    }
  }
  return undefined;
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeState(value: string | undefined): string | undefined {
  const cleaned = cleanString(value);
  return cleaned?.length === 2 ? cleaned.toUpperCase() : cleaned;
}

function normalizeHost(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const url = new URL(trimmed);
  if (url.protocol !== 'https:') throw new Error('RapidAPI base URL must use https.');
  return url.toString().replace(/\/+$/, '');
}

function isPastDate(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, sortJsonValue(entryValue)]),
    );
  }
  return value;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function looksLikeJobRecord(record: Record<string, unknown>): boolean {
  return Boolean(firstString(record, ['id', 'job_id', 'title', 'job_title', 'position']));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pruneUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function toolErrorContent(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    isError: true,
  };
}
