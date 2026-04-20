import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { z } from 'zod';

import {
  buildPublicJobSearchGroups,
  normalizePublicJobFtsQuery,
} from './lib/search.js';
import { extractJobState, normalizeUsStateFilter } from './lib/state.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  MCP_BEARER_TOKEN?: string;
  MCP_OPERATOR_EMAIL?: string;
}

const PUBLIC_SOURCES = ['adzuna', 'exa'] as const;
const INBOUND_JOB_STATUSES = ['new', 'reviewing', 'qualified', 'rejected', 'archived'] as const;

type PublicSource = (typeof PUBLIC_SOURCES)[number];
type InboundJobStatus = (typeof INBOUND_JOB_STATUSES)[number];

interface InboundJobRow {
  id: string;
  source_agent: string;
  source_agents: string | null;
  source_run_id: string | null;
  source_system: string | null;
  external_job_id: string | null;
  job_url: string | null;
  employer: string | null;
  location: string | null;
  title: string;
  category: string | null;
  specialty: string | null;
  facility_name: string | null;
  employment_type: string | null;
  pay_min: number | string | null;
  pay_max: number | string | null;
  pay_period: string | null;
  shift: string | null;
  duration_weeks: number | string | null;
  start_date: string | null;
  openings: number | string | null;
  source_posted_at: string | null;
  status: InboundJobStatus;
  dedupe_key: string;
  raw_payload: string | null;
  notes: string | null;
  funnel_lead_id: string | null;
  funnel_handoff_at: string | null;
  seen_count: number | string;
  ingested_at: string;
  last_seen_at: string;
  reviewed_at: string | null;
  updated_at: string;
}

interface PublicJobSearchRow extends InboundJobRow {
  rank?: number | string | null;
}

const SERVER_NAME = 'abundance-jobs';
const SERVER_VERSION = '1.0.0';
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, mcp-protocol-version, mcp-session-id, x-api-key',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400',
};

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function unauthorized(): Response {
  return withCors(
    new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="mcp"',
      },
    }),
  );
}

function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function checkBearer(request: Request, env: Env): boolean {
  if (!env.MCP_BEARER_TOKEN) return true;
  const header = request.headers.get('Authorization') ?? request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return !!match && match[1] === env.MCP_BEARER_TOKEN;
}

export class AbundanceJobsMCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  async init() {
    const db = this.env.DB;

    this.server.resource(
      'jobs-overview',
      'jobs://overview',
      {
        description: 'Overview of public job listings available to the Abundance jobs MCP.',
        mimeType: 'application/json',
      },
      async () => {
        const stats = await summarizePublicJobs(db);
        return {
          contents: [
            {
              uri: 'jobs://overview',
              mimeType: 'application/json',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      },
    );

    this.server.tool(
      'list_demo_jobs',
      'List a representative national shortlist of public job listings from the Abundance intake database. Read-only.',
      {
        limit: z.number().int().optional().describe('Default 10, max 25.'),
        offset: z.number().int().optional().describe('Default 0.'),
        status: z.enum(INBOUND_JOB_STATUSES).optional(),
        source_system: z.enum(PUBLIC_SOURCES).optional(),
        specialty: z.string().optional(),
        state: z.string().optional().describe('US state name or abbreviation.'),
      },
      async ({ limit, offset, status, source_system, specialty, state }: {
        limit?: number;
        offset?: number;
        status?: InboundJobStatus;
        source_system?: PublicSource;
        specialty?: string;
        state?: string;
      }) => {
        try {
          const result = await queryPublicJobs(db, {
            limit: clampInt(limit, 10, 1, 25),
            offset: clampInt(offset, 0, 0, 1000),
            status,
            sourceSystem: source_system,
            specialty,
            state,
            demoMode: true,
          });

          return textResult({
            jobs: result.rows,
            meta: {
              count: result.rows.length,
              state: normalizeUsStateFilter(state) ?? null,
              specialty: specialty?.trim() || null,
              demo_mode: true,
            },
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      },
    );

    this.server.tool(
      'search_public_jobs',
      'Search public job listings by title, employer, location, specialty, or category. Read-only.',
      {
        query: z.string().min(1),
        limit: z.number().int().optional().describe('Default 10, max 25.'),
        status: z.enum(INBOUND_JOB_STATUSES).optional(),
        location: z.string().optional(),
        specialty: z.string().optional(),
        state: z.string().optional().describe('US state name or abbreviation.'),
        source_system: z.enum(PUBLIC_SOURCES).optional(),
      },
      async ({ query, limit, status, location, specialty, state, source_system }: {
        query: string;
        limit?: number;
        status?: InboundJobStatus;
        location?: string;
        specialty?: string;
        state?: string;
        source_system?: PublicSource;
      }) => {
        try {
          const result = await queryPublicJobs(db, {
            limit: clampInt(limit, 10, 1, 25),
            offset: 0,
            status,
            sourceSystem: source_system,
            query,
            location,
            specialty,
            state,
          });

          return textResult({
            jobs: result.rows,
            meta: {
              query,
              count: result.rows.length,
              normalized_query: result.normalizedQuery,
              search_backend: result.searchBackend,
              state: normalizeUsStateFilter(state) ?? null,
            },
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      },
    );

    this.server.tool(
      'get_job',
      'Get one public job listing by ID.',
      {
        job_id: z.string().min(1),
        include_raw_payload: z.boolean().optional().describe('Default false.'),
      },
      async ({ job_id, include_raw_payload = false }: {
        job_id: string;
        include_raw_payload?: boolean;
      }) => {
        try {
          const row = await db
            .prepare('SELECT * FROM inbound_jobs WHERE id = ? AND source_system IN (?, ?)')
            .bind(job_id, ...PUBLIC_SOURCES)
            .first<InboundJobRow>();

          if (!row) {
            return textResult({ error: `Job not found: ${job_id}` }, true);
          }

          return textResult({
            job: shapeInboundJob(row, { includeRawPayload: include_raw_payload }),
          });
        } catch (error) {
          return textResult({ error: String(error) }, true);
        }
      },
    );

    this.server.tool(
      'send_job_to_funnel',
      'Send a qualified public job listing into the Agency funnel. Writes to the shared database.',
      {
        job_id: z.string().min(1),
      },
      async ({ job_id }: { job_id: string }) => {
        try {
          const result = await handoffPublicJobToFunnel(db, job_id, {
            operatorEmail: this.env.MCP_OPERATOR_EMAIL?.trim() || 'abundance-jobs-mcp',
          });

          if (!result) {
            return textResult({ error: `Job not found: ${job_id}` }, true);
          }

          return textResult(result);
        } catch (error) {
          return textResult(
            { error: error instanceof Error ? error.message : String(error) },
            true,
          );
        }
      },
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return preflight();

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!checkBearer(request, env)) return unauthorized();
      return withCors(await AbundanceJobsMCP.serve('/mcp').fetch(request, env, ctx));
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      if (!checkBearer(request, env)) return unauthorized();
      return withCors(await AbundanceJobsMCP.serve('/sse').fetch(request, env, ctx));
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      const stats = env.DB ? await summarizePublicJobs(env.DB) : null;
      return withCors(
        new Response(
          JSON.stringify(
            {
              name: SERVER_NAME,
              version: SERVER_VERSION,
              description: 'Read-oriented MCP access to Abundance public job listings.',
              endpoints: { mcp: '/mcp', sse: '/sse' },
              sources: PUBLIC_SOURCES,
              stats,
              auth: env.MCP_BEARER_TOKEN ? 'Authorization: Bearer <MCP_BEARER_TOKEN>' : 'open',
            },
            null,
            2,
          ),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    }

    return withCors(new Response('Not found', { status: 404 }));
  },
};

async function summarizePublicJobs(db: D1Database) {
  const row = await db
    .prepare(
      `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) AS qualified,
          SUM(CASE WHEN source_system = 'adzuna' THEN 1 ELSE 0 END) AS adzuna,
          SUM(CASE WHEN source_system = 'exa' THEN 1 ELSE 0 END) AS exa
        FROM inbound_jobs
        WHERE source_system IN (?, ?)
      `,
    )
    .bind(...PUBLIC_SOURCES)
    .first<Record<string, unknown>>();

  return {
    total: coerceInteger(row?.total),
    qualified: coerceInteger(row?.qualified),
    by_source: {
      adzuna: coerceInteger(row?.adzuna),
      exa: coerceInteger(row?.exa),
    },
  };
}

async function handoffPublicJobToFunnel(
  db: D1Database,
  jobId: string,
  input: { operatorEmail: string },
): Promise<{ job_id: string; lead_id: string; created: boolean } | null> {
  const job = await db.prepare('SELECT * FROM inbound_jobs WHERE id = ?').bind(jobId).first<InboundJobRow>();
  if (!job) {
    return null;
  }

  if (job.status !== 'qualified') {
    throw new Error('Only qualified inbound jobs can be sent to the funnel.');
  }

  if (job.funnel_lead_id) {
    const existingLead = await db
      .prepare('SELECT id FROM leads WHERE id = ?')
      .bind(job.funnel_lead_id)
      .first<{ id: string }>();

    if (existingLead?.id) {
      return {
        job_id: job.id,
        lead_id: existingLead.id,
        created: false,
      };
    }
  }

  const leadId = generateId('lead');
  const now = new Date().toISOString();

  await db
    .prepare(
      `
        INSERT INTO leads (
          id,
          name,
          company,
          source,
          source_detail,
          campaign,
          stage,
          service_interest,
          first_touch_at,
          last_touch_at,
          notes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      leadId,
      job.title,
      job.employer,
      'abundance',
      ['Abundance inbound job', job.source_system, job.specialty].filter(Boolean).join(' · '),
      'abundance-network',
      'decision',
      'abundance recruiter handoff',
      now,
      now,
      buildLeadNotes(job, input.operatorEmail, now),
      now,
      now,
    )
    .run();

  await db
    .prepare(
      `
        UPDATE inbound_jobs
        SET funnel_lead_id = ?, funnel_handoff_at = ?, updated_at = ?
        WHERE id = ?
      `,
    )
    .bind(leadId, now, now, job.id)
    .run();

  return {
    job_id: job.id,
    lead_id: leadId,
    created: true,
  };
}

async function queryPublicJobs(
  db: D1Database,
  filters: {
    limit: number;
    offset: number;
    status?: InboundJobStatus;
    sourceSystem?: PublicSource;
    query?: string;
    location?: string;
    specialty?: string;
    state?: string;
    demoMode?: boolean;
  },
): Promise<{
  rows: ReturnType<typeof shapeInboundJob>[];
  searchBackend: 'none' | 'fts' | 'fallback_like';
  normalizedQuery: string | null;
}> {
  const { clauses, params } = buildPublicJobFilterClauses(filters, 'j');
  const expressions = buildPublicJobSqlExpressions('j');
  const statusOrderSql = buildStatusOrderSql('status');

  if (!filters.query) {
    const rows = await db
      .prepare(
        `
          WITH base AS (
            SELECT
              j.*,
              ${expressions.derivedState} AS derived_state,
              ${expressions.sortTimestamp} AS sort_timestamp,
              ${expressions.dedupeFingerprint} AS dedupe_fingerprint,
              ${expressions.demoScore} AS demo_score
            FROM inbound_jobs j
            WHERE ${clauses.join(' AND ')}
          ),
          deduped AS (
            SELECT
              *,
              ROW_NUMBER() OVER (
                PARTITION BY dedupe_fingerprint
                ORDER BY sort_timestamp DESC, id DESC
              ) AS dedupe_rank
            FROM base
          ),
          ranked AS (
            SELECT
              *,
              ROW_NUMBER() OVER (
                PARTITION BY LOWER(COALESCE(derived_state, 'unknown'))
                ORDER BY demo_score DESC, sort_timestamp DESC, id DESC
              ) AS state_rank
            FROM deduped
            WHERE dedupe_rank = 1
          )
          SELECT *
          FROM ranked
          ORDER BY
            ${filters.demoMode ? 'state_rank ASC,' : ''}
            ${filters.demoMode ? 'demo_score DESC,' : ''}
            ${statusOrderSql},
            sort_timestamp DESC
          LIMIT ? OFFSET ?
        `,
      )
      .bind(...params, filters.limit, filters.offset)
      .all<PublicJobSearchRow>();

    return {
      rows: (rows.results ?? []).map((row) => shapeInboundJob(row)),
      searchBackend: 'none',
      normalizedQuery: null,
    };
  }

  const normalizedQuery = normalizePublicJobFtsQuery(filters.query);
  let searchBackend: 'fts' | 'fallback_like' = 'fts';
  let rows: D1Result<PublicJobSearchRow>;

  try {
    rows = await db
      .prepare(
        `
          WITH matched AS (
            SELECT
              j.*,
              ${expressions.derivedState} AS derived_state,
              ${expressions.sortTimestamp} AS sort_timestamp,
              ${expressions.dedupeFingerprint} AS dedupe_fingerprint,
              ${expressions.demoScore} AS demo_score,
              bm25(inbound_jobs_public_fts, 8.0, 4.0, 3.0, 2.0, 3.0, 1.5, 1.0, 0.5, 0.25, 0.25) AS rank
            FROM inbound_jobs_public_fts
            JOIN inbound_jobs j ON j.id = inbound_jobs_public_fts.job_id
            WHERE inbound_jobs_public_fts MATCH ?
              AND ${clauses.join(' AND ')}
          ),
          deduped AS (
            SELECT
              *,
              ROW_NUMBER() OVER (
                PARTITION BY dedupe_fingerprint
                ORDER BY rank ASC, sort_timestamp DESC, id DESC
              ) AS dedupe_rank
            FROM matched
          )
          SELECT *
          FROM deduped
          WHERE dedupe_rank = 1
          ORDER BY
            rank ASC,
            ${statusOrderSql},
            sort_timestamp DESC
          LIMIT ? OFFSET ?
        `,
      )
      .bind(normalizedQuery, ...params, filters.limit, filters.offset)
      .all<PublicJobSearchRow>();
  } catch (error) {
    if (!String(error).includes('no such table: inbound_jobs_public_fts')) {
      throw error;
    }

    searchBackend = 'fallback_like';

    const searchGroups = buildPublicJobSearchGroups(filters.query);
    const searchDocumentSql = buildFallbackSearchDocumentSql('j');
    const fallbackClauses = [...clauses];
    const fallbackParams: Array<string | number> = [...params];

    for (const group of searchGroups) {
      fallbackClauses.push(`(${group.map(() => `${searchDocumentSql} LIKE ?`).join(' OR ')})`);
      for (const alias of group) {
        fallbackParams.push(`%${alias.toLowerCase()}%`);
      }
    }

    rows = await db
      .prepare(
        `
          WITH matched AS (
            SELECT
              j.*,
              ${expressions.derivedState} AS derived_state,
              ${expressions.sortTimestamp} AS sort_timestamp,
              ${expressions.dedupeFingerprint} AS dedupe_fingerprint,
              ${expressions.demoScore} AS demo_score,
              NULL AS rank
            FROM inbound_jobs j
            WHERE ${fallbackClauses.join(' AND ')}
          ),
          deduped AS (
            SELECT
              *,
              ROW_NUMBER() OVER (
                PARTITION BY dedupe_fingerprint
                ORDER BY demo_score DESC, sort_timestamp DESC, id DESC
              ) AS dedupe_rank
            FROM matched
          )
          SELECT *
          FROM deduped
          WHERE dedupe_rank = 1
          ORDER BY
            demo_score DESC,
            ${statusOrderSql},
            sort_timestamp DESC
          LIMIT ? OFFSET ?
        `,
      )
      .bind(...fallbackParams, filters.limit, filters.offset)
      .all<PublicJobSearchRow>();
  }

  return {
    rows: (rows.results ?? []).map((row) => shapeInboundJob(row)),
    searchBackend,
    normalizedQuery,
  };
}

function buildPublicJobFilterClauses(
  filters: {
    status?: InboundJobStatus;
    sourceSystem?: PublicSource;
    location?: string;
    specialty?: string;
    state?: string;
  },
  tableAlias: string,
): { clauses: string[]; params: Array<string | number> } {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const clauses = [`${prefix}source_system IN (?, ?)`];
  const params: Array<string | number> = [...PUBLIC_SOURCES];

  if (filters.status) {
    if (!isInboundJobStatus(filters.status)) {
      throw new Error(`Invalid status: ${filters.status}`);
    }
    clauses.push(`${prefix}status = ?`);
    params.push(filters.status);
  }

  if (filters.sourceSystem) {
    clauses.push(`${prefix}source_system = ?`);
    params.push(filters.sourceSystem);
  }

  if (filters.location) {
    clauses.push(`LOWER(IFNULL(${prefix}location, '')) LIKE ?`);
    params.push(`%${filters.location.toLowerCase()}%`);
  }

  if (filters.specialty) {
    clauses.push(`LOWER(IFNULL(${prefix}specialty, '')) LIKE ?`);
    params.push(`%${filters.specialty.toLowerCase()}%`);
  }

  const normalizedState = normalizeUsStateFilter(filters.state);
  if (normalizedState) {
    clauses.push(
      `(LOWER(COALESCE(${buildDerivedStateSql(tableAlias)}, '')) = ? OR LOWER(IFNULL(${prefix}location, '')) LIKE ?)`
    );
    params.push(normalizedState.toLowerCase(), `%${normalizedState.toLowerCase()}%`);
  }

  return { clauses, params };
}

function buildFallbackSearchDocumentSql(tableAlias: string): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';

  return `LOWER(
    COALESCE(${prefix}title, '') || ' ' ||
    COALESCE(${prefix}employer, '') || ' ' ||
    COALESCE(${prefix}location, '') || ' ' ||
    COALESCE(${prefix}category, '') || ' ' ||
    COALESCE(${prefix}specialty, '') || ' ' ||
    COALESCE(${prefix}facility_name, '') || ' ' ||
    COALESCE(${prefix}employment_type, '') || ' ' ||
    COALESCE(${prefix}shift, '') || ' ' ||
    COALESCE(${prefix}notes, '') || ' ' ||
    COALESCE(json_extract(${prefix}raw_payload, '$.description'), '') || ' ' ||
    COALESCE(json_extract(${prefix}raw_payload, '$.snippet'), '') || ' ' ||
    COALESCE(json_extract(${prefix}raw_payload, '$.text'), '')
  )`;
}

function buildPublicJobSqlExpressions(tableAlias: string) {
  const prefix = tableAlias ? `${tableAlias}.` : '';

  return {
    derivedState: buildDerivedStateSql(tableAlias),
    sortTimestamp: `COALESCE(${prefix}source_posted_at, ${prefix}last_seen_at, ${prefix}ingested_at)`,
    dedupeFingerprint: `LOWER(
      COALESCE(${prefix}title, '') || '|' ||
      COALESCE(${prefix}employer, '') || '|' ||
      COALESCE(${prefix}location, '') || '|' ||
      COALESCE(${prefix}specialty, '') || '|' ||
      COALESCE(CAST(${prefix}pay_min AS TEXT), '') || '|' ||
      COALESCE(CAST(${prefix}pay_max AS TEXT), '') || '|' ||
      COALESCE(${prefix}employment_type, '')
    )`,
    demoScore: `(
      CASE
        WHEN LOWER(COALESCE(${prefix}pay_period, '')) = 'week' THEN 40
        WHEN LOWER(COALESCE(${prefix}pay_period, '')) = 'hour' THEN 8
        ELSE 0
      END +
      CASE
        WHEN NULLIF(TRIM(COALESCE(${prefix}specialty, '')), '') IS NOT NULL THEN 20
        ELSE 0
      END +
      CASE
        WHEN LOWER(COALESCE(${prefix}title, '')) LIKE '%travel%' THEN 18
        ELSE 0
      END +
      CASE
        WHEN LOWER(COALESCE(${prefix}title, '')) LIKE '%rn%'
          OR LOWER(COALESCE(${prefix}title, '')) LIKE '%registered nurse%'
        THEN 14
        ELSE 0
      END +
      CASE
        WHEN LOWER(COALESCE(${prefix}source_system, '')) = 'adzuna' THEN 6
        ELSE 0
      END +
      CASE
        WHEN ${prefix}pay_min IS NOT NULL OR ${prefix}pay_max IS NOT NULL THEN 6
        ELSE 0
      END +
      CASE
        WHEN ${prefix}job_url IS NOT NULL THEN 4
        ELSE 0
      END
    )`,
  };
}

function buildDerivedStateSql(tableAlias: string): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';

  return `TRIM(COALESCE(
    json_extract(${prefix}raw_payload, '$.location.area[1]'),
    json_extract(${prefix}raw_payload, '$.state')
  ))`;
}

function buildStatusOrderSql(columnName: string): string {
  return `CASE ${columnName}
    WHEN 'qualified' THEN 1
    WHEN 'reviewing' THEN 2
    WHEN 'new' THEN 3
    ELSE 4
  END`;
}

function shapeInboundJob(row: InboundJobRow, options: { includeRawPayload?: boolean } = {}) {
  const base = {
    id: row.id,
    title: row.title,
    employer: row.employer ?? null,
    facility_name: row.facility_name ?? null,
    location: row.location ?? null,
    state: extractJobState({ rawPayload: row.raw_payload, location: row.location }),
    category: row.category ?? null,
    specialty: row.specialty ?? null,
    employment_type: row.employment_type ?? null,
    pay_min: coerceNullableNumber(row.pay_min),
    pay_max: coerceNullableNumber(row.pay_max),
    pay_period: row.pay_period ?? null,
    shift: row.shift ?? null,
    duration_weeks: coerceNullableInteger(row.duration_weeks),
    start_date: row.start_date ?? null,
    openings: coerceNullableInteger(row.openings),
    source_system: row.source_system ?? null,
    source_agent: row.source_agent,
    source_agents: parseJsonArray(row.source_agents),
    source_run_id: row.source_run_id ?? null,
    job_url: row.job_url ?? null,
    status: row.status,
    funnel_lead_id: row.funnel_lead_id ?? null,
    funnel_handoff_at: row.funnel_handoff_at ?? null,
    source_posted_at: row.source_posted_at ?? null,
    seen_count: coerceInteger(row.seen_count),
    ingested_at: row.ingested_at,
    last_seen_at: row.last_seen_at,
    notes: row.notes ?? null,
  };

  if (!options.includeRawPayload) {
    return base;
  }

  return {
    ...base,
    raw_payload: parseRawPayload(row.raw_payload),
  };
}

function buildLeadNotes(job: InboundJobRow, operatorEmail: string, handedOffAt: string): string {
  const lines = [
    'Abundance recruiter handoff',
    `Inbound job ID: ${job.id}`,
    `Title: ${job.title}`,
    job.employer ? `Employer: ${job.employer}` : null,
    job.facility_name ? `Facility: ${job.facility_name}` : null,
    job.location ? `Location: ${job.location}` : null,
    job.category ? `Category: ${job.category}` : null,
    job.specialty ? `Specialty: ${job.specialty}` : null,
    job.pay_min != null || job.pay_max != null ? `Compensation: ${formatPay(job)}` : null,
    job.shift ? `Shift: ${job.shift}` : null,
    job.duration_weeks != null ? `Duration: ${job.duration_weeks} weeks` : null,
    job.start_date ? `Start date: ${job.start_date}` : null,
    job.job_url ? `Posting URL: ${job.job_url}` : null,
    job.external_job_id ? `External job ID: ${job.external_job_id}` : null,
    job.source_system ? `Source system: ${job.source_system}` : null,
    job.source_run_id ? `Source run: ${job.source_run_id}` : null,
    `Source agents: ${parseJsonArray(job.source_agents).join(', ')}`,
    `Dedupe key: ${job.dedupe_key}`,
    job.notes ? `Operator notes: ${job.notes}` : null,
    `Handed off by: ${operatorEmail}`,
    `Handed off at: ${handedOffAt}`,
  ];

  return lines.filter(Boolean).join('\n');
}

function formatPay(job: Pick<InboundJobRow, 'pay_min' | 'pay_max' | 'pay_period'>): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  const min = coerceNullableNumber(job.pay_min);
  const max = coerceNullableNumber(job.pay_max);

  if (min != null && max != null && min !== max) {
    return `${formatter.format(min)}-${formatter.format(max)}${job.pay_period ? ` / ${job.pay_period}` : ''}`;
  }

  if (min != null) {
    return `${formatter.format(min)}${job.pay_period ? ` / ${job.pay_period}` : ''}`;
  }

  if (max != null) {
    return `${formatter.format(max)}${job.pay_period ? ` / ${job.pay_period}` : ''}`;
  }

  return 'Not set';
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function parseRawPayload(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isInboundJobStatus(value: string | null | undefined): value is InboundJobStatus {
  return INBOUND_JOB_STATUSES.includes(value as InboundJobStatus);
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(Math.trunc(value as number), max));
}

function coerceInteger(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function coerceNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  return coerceInteger(value);
}

function coerceNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
