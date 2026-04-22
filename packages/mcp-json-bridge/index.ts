import {
  buildBridgeInitializeRequest,
  deleteUpstreamSession,
  Env,
  isBridgeAuthorized,
  isJsonRpcRequestEnvelope,
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcResponse,
  makeJsonRpcErrorResponse,
  normalizeUpstreamJsonRpcResponse,
  normalizeValue,
  parseTransportResponse,
  postUpstreamJsonRpc,
  resolveStaticUpstreamHeaders,
  sendInitializedNotification,
} from './src/bridge.ts';

const CORS_ALLOW_HEADERS =
  'authorization, content-type, mcp-protocol-version, mcp-session-id, x-api-key, api-key';
const CORS_EXPOSE_HEADERS = 'mcp-session-id';

export default {
  fetch: handleRequest,
};

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/health') {
    return healthResponse(env);
  }

  if (url.pathname !== '/mcp') {
    return json({ error: 'Not Found' }, 404, env);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(env),
    });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405, env);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return rpc(makeJsonRpcErrorResponse(null, -32700, 'Parse error: request body must be valid JSON.'), env);
  }

  if (Array.isArray(payload)) {
    return rpc(
      makeJsonRpcErrorResponse(null, -32600, 'Batch JSON-RPC requests are not supported by this bridge.'),
      env,
    );
  }

  if (!isBridgeAuthorized(request, env)) {
    return rpc(makeJsonRpcErrorResponse(null, -32001, 'Unauthorized bridge request.'), env);
  }

  if (!isJsonRpcRequestEnvelope(payload)) {
    return rpc(
      makeJsonRpcErrorResponse(null, -32600, 'Invalid JSON-RPC request envelope.'),
      env,
    );
  }

  const rpcRequest = payload as JsonRpcRequest;

  try {
    return await handleRpcRequest(request, env, rpcRequest);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return rpc(
      makeJsonRpcErrorResponse(rpcRequest.id ?? null, -32000, 'Bridge request failed.', {
        cause: message,
      }),
      env,
    );
  }
}

async function handleRpcRequest(request: Request, env: Env, rpcRequest: JsonRpcRequest): Promise<Response> {
  if (rpcRequest.method === 'notifications/initialized') {
    return new Response(null, {
      status: 202,
      headers: corsHeaders(env),
    });
  }

  if (rpcRequest.method === 'initialize') {
    const upstreamResponse = await postUpstreamJsonRpc(request, env, rpcRequest);
    const parsed = await parseTransportResponse(upstreamResponse);
    const jsonBody = normalizeUpstreamJsonRpcResponse(
      parsed,
      rpcRequest.id ?? null,
      upstreamResponse.status,
      upstreamResponse.statusText,
    );
    const bridgeSessionId = parsed.sessionId ?? `bridge-${crypto.randomUUID()}`;
    await deleteUpstreamSession(request, env, parsed.sessionId);
    return rpc(jsonBody, env, bridgeSessionId);
  }

  const upstreamSessionId = await initializeUpstreamSession(request, env);

  try {
    await sendInitializedNotification(request, env, upstreamSessionId);

    const upstreamResponse = await postUpstreamJsonRpc(request, env, rpcRequest, upstreamSessionId);
    const parsed = await parseTransportResponse(upstreamResponse);
    const jsonBody = normalizeUpstreamJsonRpcResponse(
      parsed,
      rpcRequest.id ?? null,
      upstreamResponse.status,
      upstreamResponse.statusText,
    );

    return rpc(jsonBody, env);
  } finally {
    await deleteUpstreamSession(request, env, upstreamSessionId);
  }
}

async function initializeUpstreamSession(request: Request, env: Env): Promise<string | null> {
  const initializeRequest = buildBridgeInitializeRequest(env);
  const upstreamResponse = await postUpstreamJsonRpc(request, env, initializeRequest);
  const parsed = await parseTransportResponse(upstreamResponse);
  const jsonBody = normalizeUpstreamJsonRpcResponse(
    parsed,
    initializeRequest.id ?? null,
    upstreamResponse.status,
    upstreamResponse.statusText,
  );

  if (jsonBody.error) {
    throw new Error(`Upstream initialize failed: ${JSON.stringify(jsonBody.error)}`);
  }

  return parsed.sessionId;
}

function healthResponse(env: Env): Response {
  let staticHeaderKeys: string[] = [];
  let configError: string | null = null;

  try {
    staticHeaderKeys = Object.keys(resolveStaticUpstreamHeaders(env)).sort();
  } catch (error) {
    configError = error instanceof Error ? error.message : String(error);
  }

  const status = configError ? 'degraded' : 'ok';
  return json(
    {
      status,
      bridge: {
        auth: {
          bearer: Boolean(normalizeValue(env.BRIDGE_BEARER_TOKEN)),
          apiKey: Boolean(normalizeValue(env.BRIDGE_API_KEY)),
        },
        clientName: normalizeValue(env.BRIDGE_CLIENT_NAME) ?? 'mcp-json-bridge',
        clientVersion: normalizeValue(env.BRIDGE_CLIENT_VERSION) ?? '0.1.0',
        protocolVersion: normalizeValue(env.BRIDGE_PROTOCOL_VERSION) ?? '2025-03-26',
      },
      upstream: {
        configured: Boolean(normalizeValue(env.UPSTREAM_MCP_URL)),
        hasBearerToken: Boolean(normalizeValue(env.UPSTREAM_BEARER_TOKEN)),
        staticHeaderKeys,
      },
      configError,
    },
    configError ? 500 : 200,
    env,
  );
}

function rpc(body: JsonRpcResponse, env: Env, sessionId?: string): Response {
  const headers = corsHeaders(env);
  headers.set('content-type', 'application/json; charset=utf-8');
  if (sessionId) {
    headers.set('mcp-session-id', sessionId);
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers,
  });
}

function json(body: unknown, status: number, env: Env): Response {
  const headers = corsHeaders(env);
  headers.set('content-type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

function corsHeaders(env: Env): Headers {
  const headers = new Headers();
  headers.set('access-control-allow-origin', normalizeValue(env.BRIDGE_CORS_ORIGIN) ?? '*');
  headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
  headers.set('access-control-allow-headers', CORS_ALLOW_HEADERS);
  headers.set('access-control-expose-headers', CORS_EXPOSE_HEADERS);
  return headers;
}
