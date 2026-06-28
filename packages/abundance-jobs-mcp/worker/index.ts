import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry, recordMcpToolInvocation } from '@create-something/mcp-core';
import {
  DEFAULT_RAPIDAPI_HOST,
  DEFAULT_TIMEOUT_MS,
  getPublicJob,
  getRapidApiProviderStatus,
  ingestRapidApiJobs,
  listAbundanceJobToolNames,
  normalizeNursingJobsIngestInput,
  probeRapidApiExpired,
  queryPublicJobs,
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

function jsonRpcResponse(id: unknown, result: unknown, status = 200): Response {
  return jsonResponse({ jsonrpc: '2.0', id: id ?? null, result }, status);
}

function jsonRpcError(id: unknown, code: number, message: string, status = 200): Response {
  return jsonResponse({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, status);
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

function readChatGptAccountId(request: Request): string {
  return (
    request.headers.get('X-MCP-Account-ID')?.trim() ||
    request.headers.get('X-Account-ID')?.trim() ||
    request.headers.get('X-CS-Account-ID')?.trim() ||
    CHATGPT_PUBLIC_ACCOUNT_ID
  );
}

function readRpcParams(body: Record<string, unknown>): Record<string, unknown> {
  const params = body.params;
  return params && typeof params === 'object' && !Array.isArray(params) ? (params as Record<string, unknown>) : {};
}

function readToolArguments(params: Record<string, unknown>): Record<string, unknown> {
  const args = params.arguments;
  return args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readOptionalInteger(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

function textToolResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function chatGptPublicTools() {
  return [
    {
      name: 'list_public_jobs',
      description: 'List current public nursing job listings from the normalized Abundance jobs database. Read-only.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 25 },
          offset: { type: 'number', minimum: 0 },
          status: { type: 'string', enum: ['open', 'closed', 'expired', 'unknown'] },
          state: { type: 'string' },
          specialty: { type: 'string' },
          source_system: { type: 'string' },
        },
      },
    },
    {
      name: 'search_public_jobs',
      description: 'Search current public nursing jobs by title, employer, location, specialty, source, or category. Read-only.',
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string' },
          location: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 25 },
          offset: { type: 'number', minimum: 0 },
          status: { type: 'string', enum: ['open', 'closed', 'expired', 'unknown'] },
          state: { type: 'string' },
          specialty: { type: 'string' },
          source_system: { type: 'string' },
        },
      },
    },
    {
      name: 'get_job',
      description: 'Get one public nursing job listing by Abundance public job ID. Read-only.',
      inputSchema: {
        type: 'object',
        required: ['job_id'],
        properties: {
          job_id: { type: 'string' },
        },
      },
    },
  ];
}

async function executeChatGptPublicTool(env: Env, name: string, args: Record<string, unknown>) {
  if (!env.JOBS_DB) {
    return textToolResult({ ok: false, error: 'JOBS_DB is not configured for this deployment.' });
  }

  if (name === 'list_public_jobs') {
    return textToolResult(
      await queryPublicJobs(env.JOBS_DB, {
        limit: readOptionalInteger(args.limit),
        offset: readOptionalInteger(args.offset),
        status: readOptionalString(args.status),
        source_system: readOptionalString(args.source_system),
        specialty: readOptionalString(args.specialty),
        state: readOptionalString(args.state),
      }),
    );
  }

  if (name === 'search_public_jobs') {
    const query = readOptionalString(args.query);
    if (!query) return textToolResult({ ok: false, error: 'query is required.' });
    return textToolResult(
      await queryPublicJobs(env.JOBS_DB, {
        query,
        location: readOptionalString(args.location),
        limit: readOptionalInteger(args.limit),
        offset: readOptionalInteger(args.offset),
        status: readOptionalString(args.status),
        source_system: readOptionalString(args.source_system),
        specialty: readOptionalString(args.specialty),
        state: readOptionalString(args.state),
      }),
    );
  }

  if (name === 'get_job') {
    return getPublicJob(env.JOBS_DB, {
      job_id: readOptionalString(args.job_id),
      include_raw_payload: false,
    });
  }

  return textToolResult({ ok: false, error: `Unknown public ChatGPT tool: ${name}` });
}

async function handleChatGptMcp(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'POST') return jsonResponse({ error: 'MethodNotAllowed' }, 405);

  const body = await readJsonBody(request);
  const id = body.id ?? null;
  const method = readOptionalString(body.method);

  if (method === 'initialize') {
    return jsonRpcResponse(id, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: `${SERVER_NAME}-chatgpt-public`,
        version: SERVER_VERSION,
      },
    });
  }

  if (method === 'tools/list') {
    return jsonRpcResponse(id, {
      tools: chatGptPublicTools(),
    });
  }

  if (method === 'tools/call') {
    const params = readRpcParams(body);
    const name = readOptionalString(params.name);
    if (!name) return jsonRpcError(id, -32602, 'Tool name is required.');

    const args = readToolArguments(params);
    const accountId = readChatGptAccountId(request);
    const start = Date.now();
    try {
      const result = await executeChatGptPublicTool(env, name, args);
      const durationMs = Date.now() - start;
      ctx.waitUntil(
        recordMcpToolInvocation({
          db: env.TELEMETRY_DB,
          braintrust: {
            apiKey: env.BRAINTRUST_API_KEY,
            projectName: resolveBraintrustProjectName(env),
            projectId: env.BRAINTRUST_PROJECT_ID,
          },
          serverName: `${SERVER_NAME}:chatgpt-public`,
          toolName: name,
          accountId,
          input: args,
          output: result,
          durationMs,
          success: true,
        }).catch((error) => console.warn(`[telemetry] chatgpt public metering failed for ${name}:`, error)),
      );
      return jsonRpcResponse(id, result);
    } catch (error) {
      const durationMs = Date.now() - start;
      ctx.waitUntil(
        recordMcpToolInvocation({
          db: env.TELEMETRY_DB,
          braintrust: {
            apiKey: env.BRAINTRUST_API_KEY,
            projectName: resolveBraintrustProjectName(env),
            projectId: env.BRAINTRUST_PROJECT_ID,
          },
          serverName: `${SERVER_NAME}:chatgpt-public`,
          toolName: name,
          accountId,
          input: args,
          output: { error: error instanceof Error ? error.message : String(error) },
          durationMs,
          success: false,
          error,
        }).catch((telemetryError) => console.warn(`[telemetry] chatgpt public metering failed for ${name}:`, telemetryError)),
      );
      return jsonRpcError(id, -32603, error instanceof Error ? error.message : String(error));
    }
  }

  return jsonRpcError(id, -32601, `Unsupported method: ${method ?? 'unknown'}`);
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
    enableTelemetry(this.server, this.env.TELEMETRY_DB, SERVER_NAME, () => this.currentAccountId, {
      apiKey: this.env.BRAINTRUST_API_KEY,
      projectName: resolveBraintrustProjectName(this.env),
      projectId: this.env.BRAINTRUST_PROJECT_ID,
    });

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
    enableTelemetry(this.server, this.env.TELEMETRY_DB, `${SERVER_NAME}:chatgpt-public`, () => this.currentAccountId, {
      apiKey: this.env.BRAINTRUST_API_KEY,
      projectName: resolveBraintrustProjectName(this.env),
      projectId: this.env.BRAINTRUST_PROJECT_ID,
    });

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
      return handleChatGptMcp(request, env, ctx);
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
        },
        tools: listAbundanceJobToolNames(),
        chatgpt_public_tools: listAbundanceJobToolNames({ includeFunnelTool: false }),
      });
    }

    return jsonResponse({ error: 'NotFound' }, 404);
  },
};
