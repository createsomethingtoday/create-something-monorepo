import { jsonContent } from '@create-something/mcp-core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { ZodRawShape, ZodTypeAny } from 'zod';

import { LINKEDIN_RAPIDAPI_TOOLS } from './generated-tools.js';

export const SERVER_NAME = 'linkedin-mcp';
export const SERVER_VERSION = '1.0.0';
export const DEFAULT_RAPIDAPI_HOST = 'linkedin-data-api.p.rapidapi.com';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 512 * 1024;

export interface LinkedInProviderConfig {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export interface LinkedInServerOptions {
  getProviderConfig: () => LinkedInProviderConfig;
}

type HttpMethod = 'GET' | 'POST';

type JsonSchemaProperty = {
  type?: string;
  description?: string;
  default?: unknown;
  example?: unknown;
  in?: string;
  items?: { type?: string };
  hidden?: boolean;
};

interface LinkedInToolDefinition {
  name: string;
  description: string;
  endpoint: string;
  method: HttpMethod;
  params: string[];
  required: string[];
  schema: ZodRawShape;
}

interface ProviderRequest {
  tool: LinkedInToolDefinition;
  endpoint: string;
  method: HttpMethod;
  query: Record<string, string>;
  body: Record<string, unknown>;
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
  'Internal migration override. Use only for a known RapidAPI LinkedIn Data API relative path.';

const INTERNAL_METHOD_DESCRIPTION =
  'Internal migration override. Defaults to the imported RapidAPI method.';

export const LINKEDIN_TOOLS: LinkedInToolDefinition[] = LINKEDIN_RAPIDAPI_TOOLS.map((tool) => {
  const properties = (tool.inputSchema.properties ?? {}) as Record<string, JsonSchemaProperty>;
  const endpoint = readDefaultString(properties._endpoint?.default) ?? '/';
  const method = readMethod(properties._method?.default) ?? 'GET';
  const params = Object.keys(properties).filter(
    (name) => !name.startsWith('_') && name !== 'externalDocs'
  );
  const required = readRequiredParams(tool.inputSchema).filter((name) => params.includes(name));

  return {
    name: tool.name,
    description: tool.description,
    endpoint,
    method,
    params,
    required,
    schema: buildToolSchema(properties, required)
  };
});

export function listLinkedInToolNames(): string[] {
  return LINKEDIN_TOOLS.map((tool) => tool.name);
}

export function createLinkedInServer(options: LinkedInServerOptions): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  registerLinkedInTools(server, options);
  return server;
}

export function registerLinkedInTools(server: McpServer, options: LinkedInServerOptions): void {
  for (const tool of LINKEDIN_TOOLS) {
    server.tool(tool.name, tool.description, tool.schema, async (input) => {
      const normalizedInput = normalizeInput(input);
      const request = prepareProviderRequest(tool, normalizedInput);
      return callRapidApi(request, options.getProviderConfig());
    });
  }
}

export function getLinkedInProviderStatus(config: LinkedInProviderConfig): ProviderStatus {
  const resolved = resolveProviderConfig(config);
  return {
    rapidapi_key_configured: Boolean(resolved.apiKey),
    rapidapi_host: resolved.host,
    base_url: resolved.baseUrl,
    timeout_ms: resolved.timeoutMs,
    max_response_bytes: resolved.maxResponseBytes
  };
}

function buildToolSchema(
  properties: Record<string, JsonSchemaProperty>,
  required: readonly string[]
): ZodRawShape {
  const shape: Record<string, ZodTypeAny> = {};

  for (const [name, property] of Object.entries(properties)) {
    if (name === 'externalDocs') continue;

    if (name === '_endpoint') {
      shape[name] = optionalStringParam(INTERNAL_ENDPOINT_DESCRIPTION);
      continue;
    }

    if (name === '_method') {
      shape[name] = optionalMethodParam();
      continue;
    }

    const param = providerParam(property).describe(buildParamDescription(name, property));
    shape[name] = required.includes(name) ? param : param.optional();
  }

  return shape as ZodRawShape;
}

function readRequiredParams(inputSchema: unknown): string[] {
  if (!inputSchema || typeof inputSchema !== 'object' || Array.isArray(inputSchema)) return [];
  const required = (inputSchema as { required?: unknown }).required;
  if (!Array.isArray(required)) return [];
  return required.filter((name): name is string => typeof name === 'string');
}

function providerParam(property: JsonSchemaProperty): ZodTypeAny {
  switch (property.type) {
    case 'integer':
    case 'number':
      return z.preprocess(normalizeEmpty, z.union([z.number(), z.string().trim().min(1)]));
    case 'array':
      return z.preprocess(
        normalizeEmpty,
        z.union([z.array(z.unknown()), z.string().trim().min(1)])
      );
    case 'object':
      return z.preprocess(
        normalizeEmpty,
        z.union([z.record(z.string(), z.unknown()), z.string().trim().min(1)])
      );
    default:
      return z.preprocess(
        normalizeEmpty,
        z.union([z.string().trim().min(1), z.number(), z.boolean(), z.array(z.unknown())])
      );
  }
}

function normalizeEmpty(value: unknown): unknown {
  return value === null || value === undefined || value === '' ? undefined : value;
}

function optionalStringParam(description: string) {
  return z.preprocess(normalizeEmpty, z.string().trim().optional()).describe(description);
}

function optionalMethodParam() {
  return z
    .preprocess(
      (value) =>
        value === null || value === undefined || value === ''
          ? undefined
          : String(value).toUpperCase(),
      z.union([z.literal('GET'), z.literal('POST')]).optional()
    )
    .describe(INTERNAL_METHOD_DESCRIPTION);
}

function buildParamDescription(name: string, property: JsonSchemaProperty): string {
  const parts = [
    property.description?.trim(),
    `RapidAPI LinkedIn Data API parameter: ${name}.`
  ].filter(Boolean);
  if (property.default !== undefined) parts.push(`Default example: ${String(property.default)}.`);
  if (property.example !== undefined) parts.push(`Example: ${String(property.example)}.`);
  return parts.join(' ');
}

function normalizeInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function prepareProviderRequest(
  tool: LinkedInToolDefinition,
  input: Record<string, unknown>
): ProviderRequest {
  const endpoint = normalizeEndpoint(readOptionalString(input._endpoint) ?? tool.endpoint);
  const method = readHttpMethod(input._method) ?? tool.method;
  const params = pickProviderParams(input, tool.params);

  return {
    tool,
    endpoint,
    method,
    query: method === 'GET' ? stringifyQueryParams(params) : {},
    body: method === 'POST' ? params : {},
    correlationId: crypto.randomUUID()
  };
}

function resolveProviderConfig(config: LinkedInProviderConfig): Required<LinkedInProviderConfig> {
  const host = normalizeHost(config.host) ?? DEFAULT_RAPIDAPI_HOST;
  const baseUrl = normalizeBaseUrl(config.baseUrl) ?? `https://${host}`;

  return {
    apiKey: config.apiKey?.trim() ?? '',
    host,
    baseUrl,
    timeoutMs: config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS,
    maxResponseBytes:
      config.maxResponseBytes && config.maxResponseBytes > 0
        ? config.maxResponseBytes
        : DEFAULT_MAX_RESPONSE_BYTES
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
    throw new Error('LINKEDIN_RAPIDAPI_BASE_URL must use https.');
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

function readDefaultString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readMethod(value: unknown): HttpMethod | null {
  const method = readDefaultString(value)?.toUpperCase();
  return method === 'GET' || method === 'POST' ? method : null;
}

function readHttpMethod(value: unknown): HttpMethod | null {
  return readMethod(value);
}

function pickProviderParams(
  input: Record<string, unknown>,
  names: string[]
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  for (const name of names) {
    const value = input[name];
    if (value !== null && value !== undefined && value !== '') {
      params[name] = value;
    }
  }

  return params;
}

function stringifyQueryParams(params: Record<string, unknown>): Record<string, string> {
  const query: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    const normalized = stringifyProviderParam(value);
    if (normalized !== null) query[key] = normalized;
  }

  return query;
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

async function callRapidApi(
  request: ProviderRequest,
  config: LinkedInProviderConfig
): Promise<CallToolResult> {
  let provider: Required<LinkedInProviderConfig>;

  try {
    provider = resolveProviderConfig(config);
  } catch (error) {
    return toolErrorContent({
      ok: false,
      provider: 'rapidapi',
      tool: request.tool.name,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: error instanceof Error ? error.message : String(error)
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
      error: 'LINKEDIN_RAPIDAPI_KEY or RAPIDAPI_KEY is not configured.'
    });
  }

  let url: string;
  try {
    url = buildProviderUrl(provider.baseUrl, request.endpoint, request.query);
  } catch (error) {
    return toolErrorContent({
      ok: false,
      provider: 'rapidapi',
      provider_host: provider.host,
      tool: request.tool.name,
      endpoint: request.endpoint,
      correlation_id: request.correlationId,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  const headers = new Headers({
    Accept: 'application/json',
    'X-RapidAPI-Key': provider.apiKey,
    'X-RapidAPI-Host': provider.host,
    'X-CS-Correlation-ID': request.correlationId
  });

  if (request.method === 'POST') {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), provider.timeoutMs);

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.method === 'POST' ? JSON.stringify(request.body) : undefined,
      signal: controller.signal
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
      data: parsed
    };

    return response.ok ? jsonContent(result) : toolErrorContent(result);
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `RapidAPI LinkedIn Data API request timed out after ${provider.timeoutMs}ms.`
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
      error: message
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildProviderUrl(
  baseUrl: string,
  endpoint: string,
  params: Record<string, string>
): string {
  const url = new URL(endpoint, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function readLimitedResponse(
  response: Response,
  maxBytes: number
): Promise<{ text: string; truncated: boolean }> {
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

  const looksJson =
    contentType?.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[');
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
    isError: true
  };
}
