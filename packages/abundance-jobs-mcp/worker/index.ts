import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry, type LangfuseTelemetryInvocation, type TelemetryBackendOptions } from '@create-something/mcp-core';
import {
  DEFAULT_RAPIDAPI_HOST,
  DEFAULT_TIMEOUT_MS,
  getRapidApiProviderStatus,
  ingestRapidApiJobs,
  listAbundanceJobToolNames,
  normalizeNursingJobsIngestInput,
  probeRapidApiExpired,
  registerAbundanceJobsTools,
  SERVER_NAME,
  SERVER_VERSION,
  type AbundanceJobsProviderConfig,
  type NursingJobsIngestInput,
  type RapidApiActiveJobsEndpoint,
  type RapidApiIngestInput,
} from '../src/index.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  CHATGPT_MCP_OBJECT?: DurableObjectNamespace;
  JOBS_DB?: D1Database;
  TELEMETRY_DB?: D1Database;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_NAME?: string;
  BRAINTRUST_PROJECT_ID?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_BASE_URL?: string;
  LANGFUSE_HOST?: string;
  MCP_API_KEY?: string;
  ABUNDANCE_MCP_BEARER_TOKEN?: string;
  ABUNDANCE_JOBS_MCP_API_KEY?: string;
  MCP_ACCOUNT_ID?: string;
  ACTIVE_JOBS_RAPIDAPI_KEY?: string;
  ACTIVE_JOBS_RAPIDAPI_HOST?: string;
  ACTIVE_JOBS_RAPIDAPI_BASE_URL?: string;
  ACTIVE_JOBS_RAPIDAPI_TIMEOUT_MS?: string;
  ACTIVE_JOBS_RAPIDAPI_MAX_RESPONSE_BYTES?: string;
  ACTIVE_JOBS_ALLOW_EXPIRED_INGEST?: string;
}

const DEFAULT_BRAINTRUST_PROJECT_NAME = 'CREATE SOMETHING';
const DEFAULT_ACCOUNT_ID = 'abundance-jobs-agent';
const CHATGPT_PUBLIC_ACCOUNT_ID = 'abundance-jobs-chatgpt-public';
const RAPIDAPI_ACTIVE_JOB_ENDPOINTS: RapidApiActiveJobsEndpoint[] = ['/active-ats-7d', '/modified-ats-24h'];
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type, MCP-Protocol-Version, Mcp-Session-Id, X-API-Key, X-MCP-Account-ID, X-Account-ID',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function resolveBraintrustProjectName(env: Env): string {
  const configured = env.BRAINTRUST_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BRAINTRUST_PROJECT_NAME;
}

function resolveLangfuseHost(env: Env): string | undefined {
  return env.LANGFUSE_BASE_URL?.trim() || env.LANGFUSE_HOST?.trim() || undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstTextContent(value: unknown): string | undefined {
  const content = asRecord(value).content;
  if (!Array.isArray(content)) return undefined;
  const firstText = content.find((entry) => asRecord(entry).type === 'text');
  const text = asRecord(firstText).text;
  return typeof text === 'string' ? text : undefined;
}

function parseToolOutput(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const structured = asRecord(record.structuredContent);
  if (Object.keys(structured).length > 0) return structured;

  const text = firstTextContent(value);
  if (!text) return {};
  try {
    return asRecord(JSON.parse(text));
  } catch {
    return {};
  }
}

function inferQueryType(input: unknown): string | undefined {
  const query = String(asRecord(input).query ?? '').toLowerCase();
  if (!query) return undefined;
  if (/\bcna\b|certified nursing assistant|certified nurse aide/.test(query)) return 'cna';
  if (/\blvn\b|licensed vocational nurse/.test(query)) return 'lvn';
  if (/\blpn\b|licensed practical nurse/.test(query)) return 'lpn';
  if (/\bnurse practitioner\b|\bnp\b/.test(query)) return 'nurse_practitioner';
  if (/\bicu\b|intensive care/.test(query)) return 'icu';
  if (/\ber\b|\bed\b|emergency/.test(query)) return 'emergency';
  if (/labor|delivery|l&d/.test(query)) return 'labor_delivery';
  if (/travel/.test(query)) return 'travel';
  if (/\brn\b|registered nurse/.test(query)) return 'registered_nurse';
  if (/nurs/.test(query)) return 'generic_nurse';
  return 'other';
}

function inferLocationIntent(input: unknown): string | undefined {
  const record = asRecord(input);
  const query = String(record.query ?? '').toLowerCase();
  const location = String(record.location ?? '').trim();
  const state = String(record.state ?? '').trim();
  if (/\bdfw\b|dallas|fort worth|arlington|tarrant/.test(query) || /dfw|dallas|fort worth|arlington|tarrant/i.test(location)) {
    return 'dfw_metro';
  }
  if (location && state) return 'city_state';
  if (location) return 'location';
  if (state || /\b[a-z]{2}\b|texas|california|florida|new york/.test(query)) return 'state';
  return query ? 'query_only' : undefined;
}

function summarizeAbundanceOutput(output: unknown): Record<string, unknown> {
  const data = parseToolOutput(output);
  const fallback = asRecord(data.fallback);
  const results = Array.isArray(data.results) ? data.results : undefined;
  const jobs = Array.isArray(data.jobs) ? data.jobs : undefined;
  const requestCount = typeof data.request_count === 'number' ? data.request_count : undefined;
  const skipped = typeof data.skipped === 'boolean' ? data.skipped : undefined;
  const resultCount =
    results?.length ??
    jobs?.length ??
    (typeof data.result_count === 'number' ? data.result_count : undefined);

  return {
    result_count: resultCount,
    zero_result: typeof resultCount === 'number' ? resultCount === 0 : undefined,
    fallback_reason: typeof fallback.reason === 'string' ? fallback.reason : undefined,
    fallback_applied: typeof fallback.applied === 'boolean' ? fallback.applied : undefined,
    rapidapi_request_count: requestCount,
    rapidapi_request_avoided: skipped === true || requestCount === 0 ? true : undefined,
    ingestion_skipped: skipped,
  };
}

function telemetryOptions(env: Env, visibility: 'authenticated' | 'chatgpt-public'): TelemetryBackendOptions {
  return {
    braintrust: {
      apiKey: env.BRAINTRUST_API_KEY,
      projectName: resolveBraintrustProjectName(env),
      projectId: env.BRAINTRUST_PROJECT_ID,
    },
    langfuse: {
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      secretKey: env.LANGFUSE_SECRET_KEY,
      host: resolveLangfuseHost(env),
      environment: 'prod',
      tags: ['abundance-jobs', visibility],
      metadata: {
        business_workflow: 'abundance_nurse_jobs',
        mcp_visibility: visibility,
        chatgpt_public: visibility === 'chatgpt-public',
        raw_payloads_embedded: false,
      },
      getMetadata: (invocation: LangfuseTelemetryInvocation) => ({
        query_type: inferQueryType(invocation.input),
        location_intent: inferLocationIntent(invocation.input),
        ...summarizeAbundanceOutput(invocation.output),
      }),
    },
  };
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return undefined;
}

function resolveProviderConfig(env: Env): AbundanceJobsProviderConfig {
  return {
    rapidApiKey: env.ACTIVE_JOBS_RAPIDAPI_KEY?.trim(),
    rapidApiHost: env.ACTIVE_JOBS_RAPIDAPI_HOST?.trim() || DEFAULT_RAPIDAPI_HOST,
    rapidApiBaseUrl: env.ACTIVE_JOBS_RAPIDAPI_BASE_URL?.trim(),
    timeoutMs: parsePositiveInt(env.ACTIVE_JOBS_RAPIDAPI_TIMEOUT_MS) ?? DEFAULT_TIMEOUT_MS,
    maxResponseBytes: parsePositiveInt(env.ACTIVE_JOBS_RAPIDAPI_MAX_RESPONSE_BYTES),
    allowExpiredIngest: parseBoolean(env.ACTIVE_JOBS_ALLOW_EXPIRED_INGEST) ?? false,
  };
}

function resolveMcpApiKey(env: Env): string | null {
  return (
    env.ABUNDANCE_MCP_BEARER_TOKEN?.trim() ||
    env.ABUNDANCE_JOBS_MCP_API_KEY?.trim() ||
    env.MCP_API_KEY?.trim() ||
    null
  );
}

function extractProvidedApiKey(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const apiKeyHeader = request.headers.get('X-API-Key');
  return apiKeyHeader?.trim() || null;
}

async function digestToken(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

async function constantTimeTokenEqual(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([digestToken(a), digestToken(b)]);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

async function validateApiKey(request: Request, env: Env): Promise<Response | null> {
  const configured = resolveMcpApiKey(env);
  if (!configured) {
    return jsonResponse(
      {
        error: 'ServerMisconfigured',
        message: 'ABUNDANCE_MCP_BEARER_TOKEN, ABUNDANCE_JOBS_MCP_API_KEY, or MCP_API_KEY is not configured.',
      },
      500,
    );
  }

  const provided = extractProvidedApiKey(request);
  if (!provided || !(await constantTimeTokenEqual(provided, configured))) {
    return jsonResponse(
      {
        error: 'Unauthorized',
        message: 'Valid API key required. Use Authorization: Bearer <token> or X-API-Key.',
      },
      401,
    );
  }

  return null;
}

function getAccountIdFromRequest(request: Request, env: Env): string {
  return (
    request.headers.get('X-MCP-Account-ID')?.trim() ||
    request.headers.get('X-Account-ID')?.trim() ||
    request.headers.get('X-CS-Account-ID')?.trim() ||
    env.MCP_ACCOUNT_ID?.trim() ||
    DEFAULT_ACCOUNT_ID
  );
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.body) return {};
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function normalizeIngestBody(body: Record<string, unknown>): RapidApiIngestInput {
  const endpoints = Array.isArray(body.endpoints)
    ? body.endpoints.filter(isRapidApiActiveJobsEndpoint)
    : undefined;
  return {
    title_filter: typeof body.title_filter === 'string' ? body.title_filter : undefined,
    location_filter: typeof body.location_filter === 'string' ? body.location_filter : undefined,
    organization_filter: typeof body.organization_filter === 'string' ? body.organization_filter : undefined,
    limit: typeof body.limit === 'number' || typeof body.limit === 'string' ? Number(body.limit) : undefined,
    offset: typeof body.offset === 'number' || typeof body.offset === 'string' ? Number(body.offset) : undefined,
    endpoints,
    include_backfill: typeof body.include_backfill === 'boolean' ? body.include_backfill : undefined,
    force_refresh: typeof body.force_refresh === 'boolean' ? body.force_refresh : undefined,
    freshness_window_minutes:
      typeof body.freshness_window_minutes === 'number' || typeof body.freshness_window_minutes === 'string'
        ? Number(body.freshness_window_minutes)
        : undefined,
    dry_run: typeof body.dry_run === 'boolean' ? body.dry_run : undefined,
  };
}

function normalizeNursingJobsIngestBody(body: Record<string, unknown>): NursingJobsIngestInput {
  return {
    location_filter: typeof body.location_filter === 'string' ? body.location_filter : undefined,
    limit: typeof body.limit === 'number' || typeof body.limit === 'string' ? Number(body.limit) : undefined,
    offset: typeof body.offset === 'number' || typeof body.offset === 'string' ? Number(body.offset) : undefined,
    include_backfill: typeof body.include_backfill === 'boolean' ? body.include_backfill : undefined,
    force_refresh: typeof body.force_refresh === 'boolean' ? body.force_refresh : undefined,
    freshness_window_minutes:
      typeof body.freshness_window_minutes === 'number' || typeof body.freshness_window_minutes === 'string'
        ? Number(body.freshness_window_minutes)
        : undefined,
    dry_run: typeof body.dry_run === 'boolean' ? body.dry_run : undefined,
  };
}

function isRapidApiActiveJobsEndpoint(value: unknown): value is RapidApiActiveJobsEndpoint {
  return typeof value === 'string' && RAPIDAPI_ACTIVE_JOB_ENDPOINTS.includes(value as RapidApiActiveJobsEndpoint);
}

export class AbundanceJobsMCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  private currentAccountId = DEFAULT_ACCOUNT_ID;

  override async fetch(request: Request): Promise<Response> {
    this.currentAccountId = getAccountIdFromRequest(request, this.env);
    return super.fetch(request);
  }

  async init() {
    enableTelemetry(this.server, this.env.TELEMETRY_DB, SERVER_NAME, () => this.currentAccountId, telemetryOptions(this.env, 'authenticated'));

    registerAbundanceJobsTools(this.server, {
      getDb: () => this.env.JOBS_DB,
    });
  }
}

export class AbundanceJobsChatGPTMCP extends McpAgent<Env> {
  server = new McpServer({
    name: `${SERVER_NAME}-chatgpt-public`,
    version: SERVER_VERSION,
  });

  private currentAccountId = CHATGPT_PUBLIC_ACCOUNT_ID;

  override async fetch(request: Request): Promise<Response> {
    this.currentAccountId =
      request.headers.get('X-MCP-Account-ID')?.trim() ||
      request.headers.get('X-Account-ID')?.trim() ||
      request.headers.get('X-CS-Account-ID')?.trim() ||
      CHATGPT_PUBLIC_ACCOUNT_ID;
    return super.fetch(request);
  }

  async init() {
    enableTelemetry(
      this.server,
      this.env.TELEMETRY_DB,
      `${SERVER_NAME}:chatgpt-public`,
      () => this.currentAccountId,
      telemetryOptions(this.env, 'chatgpt-public'),
    );

    registerAbundanceJobsTools(
      this.server,
      {
        getDb: () => this.env.JOBS_DB,
      },
      {
        includeFunnelTool: false,
      },
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = await validateApiKey(request, env);
      if (authError) return authError;
      return AbundanceJobsMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = await validateApiKey(request, env);
      if (authError) return authError;
      return AbundanceJobsMCP.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/chatgpt/mcp' || url.pathname.startsWith('/chatgpt/mcp/')) {
      return AbundanceJobsChatGPTMCP.serve('/chatgpt/mcp', { binding: 'CHATGPT_MCP_OBJECT' }).fetch(request, env, ctx);
    }

    if (url.pathname === '/admin/ingest/rapidapi') {
      const authError = await validateApiKey(request, env);
      if (authError) return authError;
      if (request.method !== 'POST') return jsonResponse({ error: 'MethodNotAllowed' }, 405);
      if (!env.JOBS_DB) return jsonResponse({ error: 'ServerMisconfigured', message: 'JOBS_DB is not configured.' }, 500);
      try {
        const body = await readJsonBody(request);
        const result = await ingestRapidApiJobs({
          db: env.JOBS_DB,
          config: resolveProviderConfig(env),
          request: normalizeIngestBody(body),
        });
        return jsonResponse(result);
      } catch (error) {
        return jsonResponse(
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
          500,
        );
      }
    }

    if (url.pathname === '/admin/ingest/rapidapi/nursing-jobs' || url.pathname === '/admin/ingest/nursing-jobs') {
      const authError = await validateApiKey(request, env);
      if (authError) return authError;
      if (request.method !== 'POST') return jsonResponse({ error: 'MethodNotAllowed' }, 405);
      if (!env.JOBS_DB) return jsonResponse({ error: 'ServerMisconfigured', message: 'JOBS_DB is not configured.' }, 500);
      try {
        const body = await readJsonBody(request);
        const result = await ingestRapidApiJobs({
          db: env.JOBS_DB,
          config: resolveProviderConfig(env),
          request: normalizeNursingJobsIngestInput(normalizeNursingJobsIngestBody(body)),
        });
        return jsonResponse(result);
      } catch (error) {
        return jsonResponse(
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
          500,
        );
      }
    }

    if (url.pathname === '/admin/probe/rapidapi-expired') {
      const authError = await validateApiKey(request, env);
      if (authError) return authError;
      if (request.method !== 'POST') return jsonResponse({ error: 'MethodNotAllowed' }, 405);
      try {
        const body = await readJsonBody(request);
        const result = await probeRapidApiExpired({
          config: resolveProviderConfig(env),
          limitBytes: typeof body.limit_bytes === 'number' || typeof body.limit_bytes === 'string' ? Number(body.limit_bytes) : undefined,
        });
        return jsonResponse(result, result.ok ? 200 : 502);
      } catch (error) {
        return jsonResponse(
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
          500,
        );
      }
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      const provider = resolveProviderConfig(env);
      return jsonResponse({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        description: 'Governed Abundance Jobs MCP over normalized public jobs and RapidAPI Active Jobs ingestion.',
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
          chatgpt_mcp: '/chatgpt/mcp',
          ingest_rapidapi: '/admin/ingest/rapidapi',
          ingest_nursing_jobs: '/admin/ingest/rapidapi/nursing-jobs',
          probe_expired: '/admin/probe/rapidapi-expired',
        },
        auth: {
          configured: Boolean(resolveMcpApiKey(env)),
          transport: 'Authorization: Bearer <ABUNDANCE_MCP_BEARER_TOKEN> or X-API-Key',
          chatgpt_public: 'No Auth on /chatgpt/mcp with read-only tools only',
        },
        jobs_db_configured: Boolean(env.JOBS_DB),
        provider: getRapidApiProviderStatus(provider),
        telemetry: {
          d1_configured: Boolean(env.TELEMETRY_DB),
          braintrust_configured: Boolean(env.BRAINTRUST_API_KEY),
          braintrust_project_name: resolveBraintrustProjectName(env),
          braintrust_project_id_configured: Boolean(env.BRAINTRUST_PROJECT_ID),
          langfuse_configured: Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY),
          langfuse_host_configured: Boolean(resolveLangfuseHost(env)),
          observability_mode: 'd1_braintrust_langfuse',
        },
        tools: listAbundanceJobToolNames(),
        chatgpt_public_tools: listAbundanceJobToolNames({ includeFunnelTool: false }),
      });
    }

    return jsonResponse({ error: 'NotFound' }, 404);
  },
};
