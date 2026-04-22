export interface Env {
  UPSTREAM_MCP_URL: string;
  UPSTREAM_BEARER_TOKEN?: string;
  UPSTREAM_HEADERS_JSON?: string;
  BRIDGE_BEARER_TOKEN?: string;
  BRIDGE_API_KEY?: string;
  BRIDGE_CORS_ORIGIN?: string;
  BRIDGE_PROTOCOL_VERSION?: string;
  BRIDGE_CLIENT_NAME?: string;
  BRIDGE_CLIENT_VERSION?: string;
}

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
}

export interface ParsedTransportResponse {
  body: unknown;
  sessionId: string | null;
}

const JSON_RPC_VERSION = '2.0';
const DEFAULT_PROTOCOL_VERSION = '2025-03-26';
const DEFAULT_CLIENT_NAME = 'mcp-json-bridge';
const DEFAULT_CLIENT_VERSION = '0.1.0';

export function normalizeValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export function extractBearerToken(authorization: string | null | undefined): string | null {
  const normalized = normalizeValue(authorization);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^Bearer\s+(.+)$/i);
  return match ? normalizeValue(match[1]) : null;
}

export function extractApiKey(request: Request): string | null {
  return (
    normalizeValue(request.headers.get('x-api-key')) ??
    normalizeValue(request.headers.get('api-key'))
  );
}

export function isBridgeAuthorized(request: Request, env: Env): boolean {
  const requiredBearer = normalizeValue(env.BRIDGE_BEARER_TOKEN);
  const requiredApiKey = normalizeValue(env.BRIDGE_API_KEY);
  if (!requiredBearer && !requiredApiKey) {
    return true;
  }

  const providedBearer = extractBearerToken(request.headers.get('authorization'));
  if (requiredBearer && providedBearer && timingSafeEqual(providedBearer, requiredBearer)) {
    return true;
  }

  const providedApiKey = extractApiKey(request);
  if (requiredApiKey && providedApiKey && timingSafeEqual(providedApiKey, requiredApiKey)) {
    return true;
  }

  return false;
}

export function ensureStreamableHttpAcceptHeader(headers: Headers): void {
  const acceptHeader = headers.get('accept') ?? '';
  const normalized = acceptHeader.toLowerCase();
  const hasJson = normalized.includes('application/json');
  const hasEventStream = normalized.includes('text/event-stream');

  if (hasJson && hasEventStream) {
    return;
  }

  const parts = acceptHeader
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (!hasJson) {
    parts.push('application/json');
  }
  if (!hasEventStream) {
    parts.push('text/event-stream');
  }

  headers.set('Accept', parts.join(', '));
}

export function resolveStaticUpstreamHeaders(env: Env): Record<string, string> {
  const source = normalizeValue(env.UPSTREAM_HEADERS_JSON);
  if (!source) {
    return {};
  }

  const parsed = JSON.parse(source) as Record<string, unknown>;
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      resolved[key] = value.trim();
    }
  }
  return resolved;
}

export function resolveUpstreamUrl(request: Request, env: Env): string {
  const upstreamUrl = new URL(env.UPSTREAM_MCP_URL);
  const incomingUrl = new URL(request.url);
  upstreamUrl.search = incomingUrl.search;
  return upstreamUrl.toString();
}

export function buildBridgeInitializeRequest(env: Env): JsonRpcRequest {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id: 'bridge-initialize',
    method: 'initialize',
    params: {
      protocolVersion: normalizeValue(env.BRIDGE_PROTOCOL_VERSION) ?? DEFAULT_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: normalizeValue(env.BRIDGE_CLIENT_NAME) ?? DEFAULT_CLIENT_NAME,
        version: normalizeValue(env.BRIDGE_CLIENT_VERSION) ?? DEFAULT_CLIENT_VERSION,
      },
    },
  };
}

export function buildUpstreamHeaders(request: Request, env: Env, sessionId?: string | null): Headers {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  headers.set('accept', 'application/json, text/event-stream');

  const protocolVersion = normalizeValue(request.headers.get('mcp-protocol-version'));
  if (protocolVersion) {
    headers.set('mcp-protocol-version', protocolVersion);
  }

  const upstreamToken = normalizeValue(env.UPSTREAM_BEARER_TOKEN);
  if (upstreamToken) {
    headers.set('authorization', `Bearer ${upstreamToken}`);
  } else {
    const incomingAuthorization = normalizeValue(request.headers.get('authorization'));
    if (incomingAuthorization) {
      headers.set('authorization', incomingAuthorization);
    }
  }

  if (sessionId) {
    headers.set('mcp-session-id', sessionId);
  }

  const staticHeaders = resolveStaticUpstreamHeaders(env);
  for (const [key, value] of Object.entries(staticHeaders)) {
    headers.set(key, value);
  }

  ensureStreamableHttpAcceptHeader(headers);
  return headers;
}

export async function postUpstreamJsonRpc(
  request: Request,
  env: Env,
  body: JsonRpcRequest,
  sessionId?: string | null,
): Promise<Response> {
  const headers = buildUpstreamHeaders(request, env, sessionId);
  return fetch(
    new Request(resolveUpstreamUrl(request, env), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      redirect: 'manual',
    }),
  );
}

export async function deleteUpstreamSession(
  request: Request,
  env: Env,
  sessionId: string | null,
): Promise<void> {
  if (!sessionId) {
    return;
  }

  const headers = buildUpstreamHeaders(request, env, sessionId);
  try {
    await fetch(
      new Request(resolveUpstreamUrl(request, env), {
        method: 'DELETE',
        headers,
        redirect: 'manual',
      }),
    );
  } catch {
    // Upstream cleanup is best-effort. The bridge should still return the tool result.
  }
}

export async function sendInitializedNotification(
  request: Request,
  env: Env,
  sessionId: string | null,
): Promise<void> {
  try {
    await postUpstreamJsonRpc(
      request,
      env,
      {
        jsonrpc: JSON_RPC_VERSION,
        method: 'notifications/initialized',
      },
      sessionId,
    );
  } catch {
    // Some upstreams do not care about the notification. The actual tool call remains authoritative.
  }
}

export function extractSseDataPayloads(bodyText: string): string[] {
  const payloads: string[] = [];
  const currentData: string[] = [];

  for (const rawLine of bodyText.split(/\r?\n/)) {
    const line = rawLine.replace(/\r$/, '');
    if (line.length === 0) {
      if (currentData.length > 0) {
        payloads.push(currentData.join('\n'));
        currentData.length = 0;
      }
      continue;
    }

    if (!line.startsWith('data:')) {
      continue;
    }

    currentData.push(line.slice('data:'.length).trimStart());
  }

  if (currentData.length > 0) {
    payloads.push(currentData.join('\n'));
  }

  return payloads.filter((payload) => payload.length > 0);
}

export async function parseTransportResponse(response: Response): Promise<ParsedTransportResponse> {
  const sessionId = normalizeValue(response.headers.get('mcp-session-id'));
  const contentType = response.headers.get('content-type') ?? '';
  const bodyText = await response.text();

  if (bodyText.trim().length === 0) {
    return { body: null, sessionId };
  }

  if (contentType.includes('text/event-stream')) {
    const payloads = extractSseDataPayloads(bodyText);
    for (let index = payloads.length - 1; index >= 0; index -= 1) {
      try {
        return { body: JSON.parse(payloads[index]), sessionId };
      } catch {
        // Keep scanning until the last JSON payload is found.
      }
    }

    return {
      body: payloads.length > 0 ? payloads[payloads.length - 1] : bodyText,
      sessionId,
    };
  }

  try {
    return { body: JSON.parse(bodyText), sessionId };
  } catch {
    return { body: bodyText, sessionId };
  }
}

export function makeJsonRpcErrorResponse(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id,
    error: data === undefined ? { code, message } : { code, message, data },
  };
}

export function normalizeUpstreamJsonRpcResponse(
  parsed: ParsedTransportResponse,
  fallbackId: JsonRpcId,
  upstreamStatus: number,
  upstreamStatusText: string,
): JsonRpcResponse {
  if (isJsonRpcResponseEnvelope(parsed.body)) {
    return parsed.body;
  }

  if (upstreamStatus >= 400) {
    return makeJsonRpcErrorResponse(
      fallbackId,
      -32000,
      `Upstream MCP request failed (${upstreamStatus} ${upstreamStatusText})`,
      parsed.body,
    );
  }

  return {
    jsonrpc: JSON_RPC_VERSION,
    id: fallbackId,
    result: parsed.body,
  };
}

export function isJsonRpcRequestEnvelope(value: unknown): value is JsonRpcRequest {
  if (!isRecord(value)) {
    return false;
  }

  if (value.jsonrpc !== JSON_RPC_VERSION) {
    return false;
  }

  if (typeof value.method !== 'string' || value.method.trim().length === 0) {
    return false;
  }

  if (value.id !== undefined && !isJsonRpcId(value.id)) {
    return false;
  }

  return true;
}

export function isJsonRpcResponseEnvelope(value: unknown): value is JsonRpcResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (value.jsonrpc !== JSON_RPC_VERSION || !('id' in value)) {
    return false;
  }

  return 'result' in value || 'error' in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return value === null || typeof value === 'string' || typeof value === 'number';
}
