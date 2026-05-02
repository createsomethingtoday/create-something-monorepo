import { jsonContent } from '@create-something/mcp-core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { ZodRawShape } from 'zod';

export const SERVER_NAME = 'active-jobs-mcp';
export const SERVER_VERSION = '1.0.0';
export const DEFAULT_RAPIDAPI_HOST = 'active-jobs-db.p.rapidapi.com';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 512 * 1024;

export interface ActiveJobsProviderConfig {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export interface ActiveJobsServerOptions {
  getProviderConfig: () => ActiveJobsProviderConfig;
}

type HttpMethod = 'GET';

interface ActiveJobsToolDefinition {
  name: string;
  description: string;
  endpoint: string;
  method: HttpMethod;
  params: string[];
  schema: ZodRawShape;
}

interface ProviderRequest {
  tool: ActiveJobsToolDefinition;
  endpoint: string;
  method: HttpMethod;
  params: Record<string, string>;
  correlationId: string;
}

interface ProviderStatus {
  rapidapi_key_configured: boolean;
  rapidapi_host: string;
  base_url: string;
  timeout_ms: number;
  max_response_bytes: number;
}

const INTERNAL_ENDPOINT_DESCRIPTION =
  'Internal migration override. Use only for a known RapidAPI Active Jobs DB relative path.';

const INTERNAL_METHOD_DESCRIPTION = 'Internal migration override. Defaults to GET.';

const PARAMETER_DESCRIPTIONS: Record<string, string> = {
  advanced_description_filter:
    'Advanced job description filter. Use only for specific searches; broad description searches can time out on backfill endpoints.',
  advanced_organization_filter:
    'Advanced organization filter with PostgreSQL-style operators such as &, |, !, <->, quoted phrases, and prefix wildcard syntax.',
  advanced_title_filter:
    'Advanced title filter with PostgreSQL-style operators. Do not combine with title_filter.',
  agency: 'Filter recruitment agencies and job boards. false returns regular companies; true returns staffing agencies.',
  ai_education_requirements_filter: 'Filter on AI-derived education requirements. Contact provider before relying on this filter.',
  ai_employment_type_filter:
    'Filter on AI-derived employment types such as FULL_TIME, PART_TIME, CONTRACTOR, TEMPORARY, INTERN, VOLUNTEER, PER_DIEM, or OTHER.',
  ai_experience_level_filter: 'Filter on AI-derived experience levels such as 0-2, 2-5, 5-10, or 10+.',
  ai_has_salary: 'Set true to include only jobs with salary data.',
  ai_taxonomies_a_exclusion_filter: 'Exclude top-level AI taxonomies with a comma-delimited list.',
  ai_taxonomies_a_filter: 'Filter on one or more top-level AI taxonomies with a comma-delimited list.',
  ai_taxonomies_a_primary_filter: 'Filter on one or more primary top-level AI taxonomies with a comma-delimited list.',
  ai_visa_sponsorship_filter: 'Set true to include jobs that mention visa sponsorship.',
  ai_work_arrangement_filter:
    'Filter on AI-derived work arrangement values such as On-site, Hybrid, Remote OK, or Remote Solely.',
  date_filter: 'Return jobs posted after a UTC date or timestamp, such as 2025-01-01T14:00:00.',
  description_filter: 'Search job descriptions. Use specific terms to avoid provider timeouts.',
  description_type: 'Description format. Use text or html; omit to return data without job descriptions when supported.',
  id: 'Provider job ID.',
  include_ai: 'Set true to include provider AI fields.',
  include_li: 'Set true to include LinkedIn company profile fields when available.',
  li_industry_filter: 'Filter on exact LinkedIn industry names. Use comma-delimited values for multiple industries.',
  li_organization_description_filter: 'Filter on LinkedIn organization descriptions.',
  li_organization_employees_gte: 'Filter on organizations with employee counts greater than or equal to this value.',
  li_organization_employees_lte: 'Filter on organizations with employee counts less than or equal to this value.',
  li_organization_slug_exclusion_filter: 'Exclude exact LinkedIn company slugs with a comma-delimited list.',
  li_organization_slug_filter: 'Filter on exact LinkedIn company slugs with a comma-delimited list.',
  li_organization_specialties_filter: 'Filter on LinkedIn organization specialties.',
  limit: 'Maximum number of jobs to return. Backfill endpoints support up to 500 jobs per call.',
  location_filter:
    'Filter on full location names. Avoid abbreviations; use values such as United States, New York, or United Kingdom.',
  offset: 'Pagination offset.',
  organization_exclusion_filter: 'Exclude exact organization names with a comma-delimited list.',
  organization_filter: 'Filter on exact organization names with a comma-delimited list.',
  remote: 'Set true for remote jobs only, false for non-remote jobs only, or omit for both.',
  source: 'Filter on ATS source names such as workday or greenhouse. Use comma-delimited values for multiple sources.',
  source_exclusion: 'Exclude ATS source names with a comma-delimited list.',
  title_filter: 'Search job titles. Do not combine with advanced_title_filter.',
};

const BASE_JOB_PARAMS = [
  'advanced_description_filter',
  'advanced_organization_filter',
  'advanced_title_filter',
  'agency',
  'ai_employment_type_filter',
  'ai_experience_level_filter',
  'ai_has_salary',
  'ai_taxonomies_a_exclusion_filter',
  'ai_taxonomies_a_filter',
  'ai_taxonomies_a_primary_filter',
  'ai_visa_sponsorship_filter',
  'ai_work_arrangement_filter',
  'description_filter',
  'description_type',
  'include_ai',
  'include_li',
  'li_industry_filter',
  'li_organization_description_filter',
  'li_organization_employees_lte',
  'li_organization_slug_exclusion_filter',
  'li_organization_slug_filter',
  'li_organization_specialties_filter',
  'limit',
  'location_filter',
  'offset',
  'organization_exclusion_filter',
  'organization_filter',
  'remote',
  'source',
  'source_exclusion',
  'title_filter',
] as const;

const TWENTY_FOUR_HOUR_PARAMS = [
  ...BASE_JOB_PARAMS.slice(0, 4),
  'ai_education_requirements_filter',
  ...BASE_JOB_PARAMS.slice(4, 12),
  'date_filter',
  ...BASE_JOB_PARAMS.slice(12, 18),
  'li_organization_employees_gte',
  ...BASE_JOB_PARAMS.slice(18),
] as const;

const HOURLY_PARAMS = [
  ...BASE_JOB_PARAMS.slice(0, 4),
  'ai_education_requirements_filter',
  ...BASE_JOB_PARAMS.slice(4, 18),
  'li_organization_employees_gte',
  ...BASE_JOB_PARAMS.slice(18, 22),
  ...BASE_JOB_PARAMS.slice(23),
] as const;

const BACKFILL_PARAMS = ['id', ...BASE_JOB_PARAMS] as const;

const MODIFIED_PARAMS = [
  ...BASE_JOB_PARAMS.slice(0, 4),
  'ai_education_requirements_filter',
  ...BASE_JOB_PARAMS.slice(4),
] as const;

function optionalProviderParam(name: string) {
  const description = PARAMETER_DESCRIPTIONS[name] ?? `RapidAPI Active Jobs DB parameter: ${name}.`;
  return z
    .preprocess(
      (value) => (value === null || value === undefined || value === '' ? undefined : value),
      z.union([z.string(), z.number(), z.boolean()]).optional(),
    )
    .describe(description);
}

function optionalStringParam(description: string) {
  return z
    .preprocess(
      (value) => (value === null || value === undefined || value === '' ? undefined : value),
      z.string().trim().optional(),
    )
    .describe(description);
}

function optionalMethodParam() {
  return z
    .preprocess(
      (value) => (value === null || value === undefined || value === '' ? undefined : String(value).toUpperCase()),
      z.literal('GET').optional(),
    )
    .describe(INTERNAL_METHOD_DESCRIPTION);
}

function withOverrides(schema: ZodRawShape): ZodRawShape {
  return {
    ...schema,
    _endpoint: optionalStringParam(INTERNAL_ENDPOINT_DESCRIPTION),
    _method: optionalMethodParam(),
  };
}

function paramsSchema(params: readonly string[]): ZodRawShape {
  const shape: ZodRawShape = {};
  for (const param of params) {
    shape[param] = optionalProviderParam(param);
  }
  return withOverrides(shape);
}

export const ACTIVE_JOBS_TOOLS: ActiveJobsToolDefinition[] = [
  {
    name: 'Get_Jobs_Backfill_-_6M',
    description:
      'Backfill Active Jobs DB job listings before moving on to the 7-day, 24-hour, or hourly endpoint.',
    endpoint: '/active-ats-6m',
    method: 'GET',
    params: [...BACKFILL_PARAMS],
    schema: paramsSchema(BACKFILL_PARAMS),
  },
  {
    name: 'Get_Jobs_24h_indexed',
    description: 'Get Active Jobs DB listings indexed by the provider during the last 24 hours.',
    endpoint: '/active-ats-24h',
    method: 'GET',
    params: [...TWENTY_FOUR_HOUR_PARAMS],
    schema: paramsSchema(TWENTY_FOUR_HOUR_PARAMS),
  },
  {
    name: 'Get_Jobs_Hourly',
    description: 'Get Active Jobs DB listings discovered during the last hour.',
    endpoint: '/active-ats-1h',
    method: 'GET',
    params: [...HOURLY_PARAMS],
    schema: paramsSchema(HOURLY_PARAMS),
  },
  {
    name: 'Ultra_-_Get_Expired_Jobs',
    description: 'Get Active Jobs DB IDs for jobs flagged as expired yesterday.',
    endpoint: '/active-ats-expired',
    method: 'GET',
    params: [],
    schema: paramsSchema([]),
  },
  {
    name: 'Ultra_-_Get_Modified_Jobs_24h',
    description: 'Search and retrieve Active Jobs DB listings modified during the last 24 hours.',
    endpoint: '/modified-ats-24h',
    method: 'GET',
    params: [...MODIFIED_PARAMS],
    schema: paramsSchema(MODIFIED_PARAMS),
  },
  {
    name: 'Get_Jobs_7_days_posted',
    description: 'Get Active Jobs DB listings posted during the last 7 days.',
    endpoint: '/active-ats-7d',
    method: 'GET',
    params: [...TWENTY_FOUR_HOUR_PARAMS],
    schema: paramsSchema(TWENTY_FOUR_HOUR_PARAMS),
  },
];

export function listActiveJobsToolNames(): string[] {
  return ACTIVE_JOBS_TOOLS.map((tool) => tool.name);
}

export function createActiveJobsServer(options: ActiveJobsServerOptions): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerActiveJobsTools(server, options);
  return server;
}

export function registerActiveJobsTools(server: McpServer, options: ActiveJobsServerOptions): void {
  for (const tool of ACTIVE_JOBS_TOOLS) {
    server.tool(tool.name, tool.description, tool.schema, async (input) => {
      const normalizedInput = normalizeInput(input);
      const request = prepareProviderRequest(tool, normalizedInput);
      return callRapidApi(request, options.getProviderConfig());
    });
  }
}

export function getActiveJobsProviderStatus(config: ActiveJobsProviderConfig): ProviderStatus {
  const resolved = resolveProviderConfig(config);
  return {
    rapidapi_key_configured: Boolean(resolved.apiKey),
    rapidapi_host: resolved.host,
    base_url: resolved.baseUrl,
    timeout_ms: resolved.timeoutMs,
    max_response_bytes: resolved.maxResponseBytes,
  };
}

function normalizeInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function prepareProviderRequest(tool: ActiveJobsToolDefinition, input: Record<string, unknown>): ProviderRequest {
  const endpoint = normalizeEndpoint(readOptionalString(input._endpoint) ?? tool.endpoint);
  const method = readHttpMethod(input._method) ?? tool.method;
  const params = pickProviderParams(input, tool.params);

  return {
    tool,
    endpoint,
    method,
    params,
    correlationId: crypto.randomUUID(),
  };
}

function resolveProviderConfig(config: ActiveJobsProviderConfig): Required<ActiveJobsProviderConfig> {
  const host = normalizeHost(config.host) ?? DEFAULT_RAPIDAPI_HOST;
  const baseUrl = normalizeBaseUrl(config.baseUrl) ?? `https://${host}`;

  return {
    apiKey: config.apiKey?.trim() ?? '',
    host,
    baseUrl,
    timeoutMs: config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS,
    maxResponseBytes:
      config.maxResponseBytes && config.maxResponseBytes > 0 ? config.maxResponseBytes : DEFAULT_MAX_RESPONSE_BYTES,
  };
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
  if (url.protocol !== 'https:') {
    throw new Error('ACTIVE_JOBS_RAPIDAPI_BASE_URL must use https.');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/+$/, '');
}

function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    throw new Error('_endpoint must be a relative RapidAPI path beginning with /.');
  }
  return trimmed;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readHttpMethod(value: unknown): HttpMethod | null {
  return readOptionalString(value)?.toUpperCase() === 'GET' ? 'GET' : null;
}

function pickProviderParams(input: Record<string, unknown>, names: string[]): Record<string, string> {
  const params: Record<string, string> = {};

  for (const name of names) {
    const value = input[name];
    const normalized = stringifyProviderParam(value);
    if (normalized !== null) {
      params[name] = normalized;
    }
  }

  return params;
}

function stringifyProviderParam(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const joined = value
      .map((entry) => stringifyProviderParam(entry))
      .filter((entry): entry is string => Boolean(entry))
      .join(',');
    return joined.length > 0 ? joined : null;
  }
  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : null;
}

async function callRapidApi(request: ProviderRequest, config: ActiveJobsProviderConfig): Promise<CallToolResult> {
  let provider: Required<ActiveJobsProviderConfig>;

  try {
    provider = resolveProviderConfig(config);
  } catch (error) {
    return toolErrorContent({
      ok: false,
      provider: 'rapidapi',
      tool: request.tool.name,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!provider.apiKey) {
    return toolErrorContent({
      ok: false,
      provider: 'rapidapi',
      provider_host: provider.host,
      tool: request.tool.name,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: 'ACTIVE_JOBS_RAPIDAPI_KEY or RAPIDAPI_KEY is not configured.',
    });
  }

  let url: string;
  try {
    url = buildProviderUrl(provider.baseUrl, request.endpoint, request.params);
  } catch (error) {
    return toolErrorContent({
      ok: false,
      provider: 'rapidapi',
      provider_host: provider.host,
      tool: request.tool.name,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const headers = new Headers({
    Accept: 'application/json',
    'X-RapidAPI-Key': provider.apiKey,
    'X-RapidAPI-Host': provider.host,
    'X-CS-Correlation-ID': request.correlationId,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), provider.timeoutMs);

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      signal: controller.signal,
    });
    const body = await readLimitedResponse(response, provider.maxResponseBytes);
    const parsed = parseProviderBody(body.text, response.headers.get('content-type'));
    const result = {
      ok: response.ok,
      provider: 'rapidapi',
      provider_host: provider.host,
      tool: request.tool.name,
      endpoint: request.endpoint,
      method: request.method,
      status: response.status,
      correlation_id: request.correlationId,
      response_truncated: body.truncated,
      data: parsed,
    };

    return response.ok ? jsonContent(result) : toolErrorContent(result);
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `RapidAPI Active Jobs DB request timed out after ${provider.timeoutMs}ms.`
        : error instanceof Error
          ? error.message
          : String(error);

    return toolErrorContent({
      ok: false,
      provider: 'rapidapi',
      provider_host: provider.host,
      tool: request.tool.name,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: message,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildProviderUrl(baseUrl: string, endpoint: string, params: Record<string, string>): string {
  const url = new URL(endpoint, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function readLimitedResponse(response: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) {
    return { text: await response.text(), truncated: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytesRead = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const remaining = maxBytes - bytesRead;
      if (remaining <= 0) {
        truncated = true;
        await reader.cancel();
        break;
      }

      if (value.byteLength > remaining) {
        chunks.push(decoder.decode(value.slice(0, remaining), { stream: true }));
        bytesRead += remaining;
        truncated = true;
        await reader.cancel();
        break;
      }

      chunks.push(decoder.decode(value, { stream: true }));
      bytesRead += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  chunks.push(decoder.decode());
  return { text: chunks.join(''), truncated };
}

function parseProviderBody(text: string, contentType: string | null): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const looksJson = contentType?.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[');
  if (!looksJson) return trimmed;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

function toolErrorContent(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    isError: true,
  };
}
