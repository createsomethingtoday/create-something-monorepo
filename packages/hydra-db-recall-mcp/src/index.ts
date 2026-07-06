import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { jsonContent } from '@create-something/mcp-core';
import { z } from 'zod';

export const SERVER_NAME = 'hydra-db-recall-mcp';
export const SERVER_VERSION = '1.0.0';
export const DEFAULT_BASE_URL = 'https://api.hydradb.com';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 512 * 1024;
export const DEFAULT_RETENTION_DAYS = 180;
export const DEFAULT_RECALL_SCOPE: RecallScope = 'knowledge';

type RecallScope = 'knowledge' | 'memory' | 'boolean';
type HydraEndpoint = '/recall/full_recall' | '/recall/recall_preferences' | '/recall/boolean_recall' | '/list/data' | '/fetch/content';

export interface HydraDbProviderConfig {
  apiKey?: string;
  tenantId?: string;
  subTenantId?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  retentionDays?: number;
  defaultRecallScope?: string;
}

export interface HydraDbRecallServerOptions {
  getProviderConfig: () => HydraDbProviderConfig;
}

interface ResolvedHydraDbProviderConfig {
  apiKey: string;
  tenantId: string;
  subTenantId: string;
  baseUrl: string;
  timeoutMs: number;
  maxResponseBytes: number;
  retentionDays: number;
  defaultRecallScope: RecallScope;
}

interface HydraDbProviderStatus {
  hydra_db_key_configured: boolean;
  tenant_configured: boolean;
  sub_tenant_id: string | null;
  base_url: string;
  timeout_ms: number;
  max_response_bytes: number;
  default_recall_scope: RecallScope;
}

export interface HydraDbRecallPolicy {
  lane: string;
  read_only_tools: string[];
  blocked_upstream_tools: string[];
  blocked_upstream_endpoints: string[];
  sync_rules: string[];
  monitoring_rules: string[];
  retention_rules: {
    retention_days: number;
    delete_review_required: boolean;
    delete_path: string;
  };
}

const RECALL_SCOPE_TO_ENDPOINT: Record<RecallScope, HydraEndpoint> = {
  knowledge: '/recall/full_recall',
  memory: '/recall/recall_preferences',
  boolean: '/recall/boolean_recall',
};

const READ_ONLY_TOOL_NAMES = [
  'hydra_db_recall_search',
  'hydra_db_list_sources',
  'hydra_db_fetch_content',
  'hydra_db_recall_policy',
];

const BLOCKED_UPSTREAM_TOOLS = ['hydra_db_store', 'hydra_db_ingest_conversation', 'hydra_db_delete_memory'];
const BLOCKED_UPSTREAM_ENDPOINTS = [
  'POST /memories/add_memory',
  'DELETE /memories/delete_memory',
  'POST /knowledge/delete_knowledge',
  'POST /ingestion/upload_knowledge',
];

const recallSearchSchema = {
  query: requiredStringParam('Recall query.'),
  scope: optionalRecallScopeParam('HydraDB recall scope. Defaults to HYDRA_DB_DEFAULT_RECALL_SCOPE or knowledge.'),
  sub_tenant_id: optionalStringParam('Optional sub-tenant override for a narrower internal operator lane.'),
  max_results: optionalIntParam('Maximum number of returned chunks or memory results. Default 8, max 25.', 1, 25),
  mode: optionalEnumParam(['fast', 'thinking'], 'HydraDB recall mode.'),
  alpha: optionalNumberParam('Hybrid search weight from 0.0 keyword to 1.0 semantic.', 0, 1),
  recency_bias: optionalNumberParam('Recency boost from 0.0 to 1.0.', 0, 1),
  graph_context: optionalBooleanParam('Whether to request graph-enriched context. Defaults to true.'),
  search_forceful_relations: optionalBooleanParam('Whether to force relation search when graph_context is enabled.'),
  metadata_filters: optionalRecordParam('Structured HydraDB metadata filters for deterministic narrowing.'),
};

const listSourcesSchema = {
  data_type: optionalEnumParam(['knowledge', 'memories', 'sources'], 'Data type to browse. Defaults to knowledge.'),
  sub_tenant_id: optionalStringParam('Optional sub-tenant override for a narrower internal operator lane.'),
  page: optionalIntParam('HydraDB page number. Default 1.', 1, 10_000),
  page_size: optionalIntParam('HydraDB page size. Default 20, max 100.', 1, 100),
  metadata_filters: optionalRecordParam('Structured HydraDB metadata filters for deterministic narrowing.'),
};

const fetchContentSchema = {
  source_id: requiredStringParam('HydraDB source ID to fetch.'),
  sub_tenant_id: optionalStringParam('Optional sub-tenant override for a narrower internal operator lane.'),
};

export function listHydraDbRecallToolNames(): string[] {
  return [...READ_ONLY_TOOL_NAMES];
}

export function createHydraDbRecallServer(options: HydraDbRecallServerOptions): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerHydraDbRecallTools(server, options);
  return server;
}

export function registerHydraDbRecallTools(server: McpServer, options: HydraDbRecallServerOptions): void {
  server.resource(
    'hydra-db-recall-policy',
    'hydra://recall/policy',
    {
      description: 'Governed HydraDB recall policy, sync, monitoring, and retention rules.',
      mimeType: 'application/json',
    },
    async () => resourceJson('hydra://recall/policy', getHydraDbRecallPolicy(options.getProviderConfig())),
  );

  server.resource(
    'hydra-db-recall-status',
    'hydra://recall/status',
    {
      description: 'HydraDB recall wrapper configuration status with no secret values.',
      mimeType: 'application/json',
    },
    async () => resourceJson('hydra://recall/status', getHydraDbProviderStatus(options.getProviderConfig())),
  );

  server.tool(
    'hydra_db_recall_search',
    'Search HydraDB recall context through read-only recall endpoints. Does not store, ingest, or delete memories.',
    recallSearchSchema,
    async (input) => executeHydraDb(() => buildRecallRequest(normalizeInput(input), options.getProviderConfig())),
  );

  server.tool(
    'hydra_db_list_sources',
    'Browse HydraDB stored knowledge or memories through the read-only list endpoint.',
    listSourcesSchema,
    async (input) => executeHydraDb(() => buildListRequest(normalizeInput(input), options.getProviderConfig())),
  );

  server.tool(
    'hydra_db_fetch_content',
    'Fetch original HydraDB source content by source ID through the read-only fetch endpoint.',
    fetchContentSchema,
    async (input) => executeHydraDb(() => buildFetchRequest(normalizeInput(input), options.getProviderConfig())),
  );

  server.tool(
    'hydra_db_recall_policy',
    'Return the governed HydraDB recall policy, including blocked write/delete tools and retention rules.',
    {},
    async () => jsonContent(getHydraDbRecallPolicy(options.getProviderConfig())),
  );
}

async function executeHydraDb(buildRequest: () => PreparedHydraRequest): Promise<CallToolResult> {
  try {
    return await callHydraDb(buildRequest());
  } catch (error) {
    return toolErrorContent({
      ok: false,
      provider: 'hydradb',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function getHydraDbProviderStatus(config: HydraDbProviderConfig): HydraDbProviderStatus {
  const resolved = resolveProviderConfig(config);
  return {
    hydra_db_key_configured: Boolean(resolved.apiKey),
    tenant_configured: Boolean(resolved.tenantId),
    sub_tenant_id: resolved.subTenantId || null,
    base_url: resolved.baseUrl,
    timeout_ms: resolved.timeoutMs,
    max_response_bytes: resolved.maxResponseBytes,
    default_recall_scope: resolved.defaultRecallScope,
  };
}

export function getHydraDbRecallPolicy(config: HydraDbProviderConfig): HydraDbRecallPolicy {
  const resolved = resolveProviderConfig(config);
  return {
    lane: 'internal-operator-governed-recall',
    read_only_tools: listHydraDbRecallToolNames(),
    blocked_upstream_tools: [...BLOCKED_UPSTREAM_TOOLS],
    blocked_upstream_endpoints: [...BLOCKED_UPSTREAM_ENDPOINTS],
    sync_rules: [
      'Repeatable sync is performed outside this recall wrapper by an operator-only HydraDB write lane.',
      'Every sync records source, sub_tenant_id, item count, run identifier, and validation evidence in Linear.',
      'Recall requests should use sub_tenant_id and metadata_filters to stay inside the intended operating lane.',
    ],
    monitoring_rules: [
      'Use /health for deployment configuration status without secret values.',
      'Use D1 and Langfuse telemetry from the wrapper for MCP invocation evidence.',
      'Investigate upstream 401, 403, 429, and 5xx responses before widening catalog exposure.',
    ],
    retention_rules: {
      retention_days: resolved.retentionDays,
      delete_review_required: true,
      delete_path: 'Operator-only upstream HydraDB delete path with Linear evidence; this recall wrapper never deletes.',
    },
  };
}

function requiredStringParam(description: string) {
  return z
    .preprocess((value) => (value === null || value === undefined ? '' : value), z.string().trim().min(1))
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

function optionalIntParam(description: string, min: number, max: number) {
  return z
    .preprocess(
      (value) => (value === null || value === undefined || value === '' ? undefined : value),
      z.coerce.number().int().min(min).max(max).optional(),
    )
    .describe(description);
}

function optionalNumberParam(description: string, min: number, max: number) {
  return z
    .preprocess(
      (value) => (value === null || value === undefined || value === '' ? undefined : value),
      z.coerce.number().min(min).max(max).optional(),
    )
    .describe(description);
}

function optionalBooleanParam(description: string) {
  return z
    .preprocess((value) => {
      if (value === null || value === undefined || value === '') return undefined;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
      }
      return value;
    }, z.boolean().optional())
    .describe(description);
}

function optionalRecordParam(description: string) {
  return z
    .preprocess(
      (value) => (value === null || value === undefined || value === '' ? undefined : value),
      z.record(z.unknown()).optional(),
    )
    .describe(description);
}

function optionalEnumParam<T extends [string, ...string[]]>(values: T, description: string) {
  return z
    .preprocess(
      (value) => (value === null || value === undefined || value === '' ? undefined : value),
      z.enum(values).optional(),
    )
    .describe(description);
}

function optionalRecallScopeParam(description: string) {
  return optionalEnumParam(['knowledge', 'memory', 'boolean'], description);
}

function normalizeInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function buildRecallRequest(input: Record<string, unknown>, config: HydraDbProviderConfig): PreparedHydraRequest {
  const provider = resolveProviderConfig(config);
  const scope = readRecallScope(input.scope) ?? provider.defaultRecallScope;
  const body: Record<string, unknown> = {
    tenant_id: provider.tenantId,
    query: readRequiredString(input.query, 'query'),
    max_results: readOptionalInt(input.max_results) ?? 8,
    mode: readOptionalString(input.mode) ?? 'fast',
    graph_context: readOptionalBoolean(input.graph_context) ?? true,
  };

  const subTenantId = readOptionalString(input.sub_tenant_id) ?? provider.subTenantId;
  if (subTenantId) body.sub_tenant_id = subTenantId;

  const alpha = readOptionalNumber(input.alpha);
  if (alpha !== null) body.alpha = alpha;

  const recencyBias = readOptionalNumber(input.recency_bias);
  if (recencyBias !== null) body.recency_bias = recencyBias;

  const searchForcefulRelations = readOptionalBoolean(input.search_forceful_relations);
  if (searchForcefulRelations !== null) body.search_forceful_relations = searchForcefulRelations;

  const metadataFilters = readOptionalRecord(input.metadata_filters);
  if (metadataFilters) body.metadata_filters = metadataFilters;

  return {
    provider,
    endpoint: RECALL_SCOPE_TO_ENDPOINT[scope],
    operation: 'recall_search',
    body,
    correlationId: crypto.randomUUID(),
  };
}

function buildListRequest(input: Record<string, unknown>, config: HydraDbProviderConfig): PreparedHydraRequest {
  const provider = resolveProviderConfig(config);
  const body: Record<string, unknown> = {
    tenant_id: provider.tenantId,
    data_type: readOptionalString(input.data_type) ?? 'knowledge',
    page: readOptionalInt(input.page) ?? 1,
    page_size: readOptionalInt(input.page_size) ?? 20,
  };

  const subTenantId = readOptionalString(input.sub_tenant_id) ?? provider.subTenantId;
  if (subTenantId) body.sub_tenant_id = subTenantId;

  const metadataFilters = readOptionalRecord(input.metadata_filters);
  if (metadataFilters) body.metadata_filters = metadataFilters;

  return {
    provider,
    endpoint: '/list/data',
    operation: 'list_sources',
    body,
    correlationId: crypto.randomUUID(),
  };
}

function buildFetchRequest(input: Record<string, unknown>, config: HydraDbProviderConfig): PreparedHydraRequest {
  const provider = resolveProviderConfig(config);
  const body: Record<string, unknown> = {
    tenant_id: provider.tenantId,
    source_id: readRequiredString(input.source_id, 'source_id'),
  };

  const subTenantId = readOptionalString(input.sub_tenant_id) ?? provider.subTenantId;
  if (subTenantId) body.sub_tenant_id = subTenantId;

  return {
    provider,
    endpoint: '/fetch/content',
    operation: 'fetch_content',
    body,
    correlationId: crypto.randomUUID(),
  };
}

interface PreparedHydraRequest {
  provider: ResolvedHydraDbProviderConfig;
  endpoint: HydraEndpoint;
  operation: string;
  body: Record<string, unknown>;
  correlationId: string;
}

async function callHydraDb(request: PreparedHydraRequest): Promise<CallToolResult> {
  if (!request.provider.apiKey) {
    return toolErrorContent({
      ok: false,
      provider: 'hydradb',
      operation: request.operation,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: 'HYDRA_DB_API_KEY is not configured.',
    });
  }

  if (!request.provider.tenantId) {
    return toolErrorContent({
      ok: false,
      provider: 'hydradb',
      operation: request.operation,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: 'HYDRA_DB_TENANT_ID is not configured.',
    });
  }

  let url: string;
  try {
    url = buildProviderUrl(request.provider.baseUrl, request.endpoint);
  } catch (error) {
    return toolErrorContent({
      ok: false,
      provider: 'hydradb',
      operation: request.operation,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const headers = new Headers({
    Accept: 'application/json',
    Authorization: `Bearer ${request.provider.apiKey}`,
    'Content-Type': 'application/json',
    'X-CS-Correlation-ID': request.correlationId,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.provider.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
    const body = await readLimitedResponse(response, request.provider.maxResponseBytes);
    const parsed = parseProviderBody(body.text, response.headers.get('content-type'));
    const result = {
      ok: response.ok,
      provider: 'hydradb',
      operation: request.operation,
      endpoint: request.endpoint,
      method: 'POST',
      status: response.status,
      correlation_id: request.correlationId,
      response_truncated: body.truncated,
      policy: {
        read_only_wrapper: true,
        blocked_upstream_tools: BLOCKED_UPSTREAM_TOOLS,
      },
      data: parsed,
    };

    return response.ok ? jsonContent(result) : toolErrorContent(result);
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `HydraDB request timed out after ${request.provider.timeoutMs}ms.`
        : error instanceof Error
          ? error.message
          : String(error);

    return toolErrorContent({
      ok: false,
      provider: 'hydradb',
      operation: request.operation,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: message,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function resolveProviderConfig(config: HydraDbProviderConfig): ResolvedHydraDbProviderConfig {
  return {
    apiKey: config.apiKey?.trim() ?? '',
    tenantId: config.tenantId?.trim() ?? '',
    subTenantId: config.subTenantId?.trim() ?? '',
    baseUrl: normalizeBaseUrl(config.baseUrl) ?? DEFAULT_BASE_URL,
    timeoutMs: config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS,
    maxResponseBytes:
      config.maxResponseBytes && config.maxResponseBytes > 0 ? config.maxResponseBytes : DEFAULT_MAX_RESPONSE_BYTES,
    retentionDays: config.retentionDays && config.retentionDays > 0 ? config.retentionDays : DEFAULT_RETENTION_DAYS,
    defaultRecallScope: readRecallScope(config.defaultRecallScope) ?? DEFAULT_RECALL_SCOPE,
  };
}

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const url = new URL(trimmed);
  if (url.protocol !== 'https:') {
    throw new Error('HYDRA_DB_BASE_URL must use https.');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/+$/, '');
}

function buildProviderUrl(baseUrl: string, endpoint: HydraEndpoint): string {
  const url = new URL(endpoint, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  return url.toString();
}

function readRequiredString(value: unknown, field: string): string {
  const normalized = readOptionalString(value);
  if (!normalized) throw new Error(`Missing required field "${field}".`);
  return normalized;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

function readOptionalRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readRecallScope(value: unknown): RecallScope | null {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized === 'knowledge' || normalized === 'memory' || normalized === 'boolean' ? normalized : null;
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

function resourceJson(uri: string, payload: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function toolErrorContent(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    isError: true,
  };
}
