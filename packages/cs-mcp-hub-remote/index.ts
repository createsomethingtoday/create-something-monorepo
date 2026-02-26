import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { initLogger, type Logger, type Span } from 'braintrust';

import registryJson from '../../config/mcp-hub/registry.json';

type StringMap = Record<string, string>;

type HttpServerConfig = {
  transport: 'http';
  url: string;
  http_headers?: StringMap;
  env_http_headers?: StringMap;
  bearer_token_env_var?: string;
  tool_call_timeout_ms?: number;
  timeout_ms?: number;
  headers?: StringMap;
  description?: string;
  tags?: string[];
};

type StdioServerConfig = {
  transport: 'stdio';
  command: string;
  args?: string[];
  env?: StringMap;
  cwd?: string;
  description?: string;
  tags?: string[];
};

type McpServerConfig = HttpServerConfig | StdioServerConfig;

type McpBundleRegistry = {
  version: 1;
  servers: Record<string, McpServerConfig>;
  bundles: Record<string, string[]>;
  defaults?: {
    enabledBundles?: string[];
    enabledServers?: string[];
    disabledServers?: string[];
  };
};

type HubState = {
  enabledBundles: string[];
  enabledServers: string[];
  disabledServers: string[];
};

type StateResolution = {
  state: HubState;
  enabledServerNames: string[];
  warnings: string[];
};

type DownstreamFailure = {
  name: string;
  error: string;
};

type ConnectedDownstream = {
  name: string;
  config: HttpServerConfig;
  baseHeaders: Record<string, string>;
  requestHeaders: Record<string, string>;
  toolCallTimeoutMs: number;
  callQueue: Promise<void>;
  client: Client;
  tools: Tool[];
};

type ProxyRoute = {
  proxyToolName: string;
  serverName: string;
  downstreamToolName: string;
  call: (args: Record<string, unknown>, trace: InvocationTrace, accountId: string) => Promise<any>;
};

type ProxyCatalog = {
  toolDefinitions: Tool[];
  routes: Map<string, ProxyRoute>;
  warnings: string[];
};

type HubRuntime = {
  builtAt: number;
  stateResolution: StateResolution;
  connected: ConnectedDownstream[];
  failed: DownstreamFailure[];
  proxies: ProxyCatalog;
};

type RateLimitScope = 'account' | 'account_server' | 'account_server_tool';

type RateLimitPolicy = {
  enabled: boolean;
  maxCalls: number;
  windowMs: number;
  windowSeconds: number;
  scope: RateLimitScope;
  exemptServers: Set<string>;
};

type RateLimitDecision = {
  allowed: boolean;
  key: string;
  remaining: number;
  resetAt: string;
  scope: RateLimitScope;
  maxCalls: number;
  windowSeconds: number;
};

type QuotaPolicy = {
  enabled: boolean;
  maxCallsPerPeriod: number;
  exemptServers: Set<string>;
};

type QuotaDecision = {
  allowed: boolean;
  key: string;
  remaining: number;
  currentCount: number;
  maxCallsPerPeriod: number;
  period: string;
  reason?: string;
};

type InvocationTrace = {
  requestId: string;
  correlationId: string;
  transportRequestId: string;
};

type IdentitySessionResolveResponse = {
  valid?: boolean;
  session_id?: string;
  account_id?: string;
  tenant_id?: string;
  user_id?: string;
  allowed_tool_prefixes?: unknown;
  reason?: string;
};

type ResolvedAccountContext = {
  accountId: string;
  tenantId: string | null;
  userId: string | null;
  sessionId: string | null;
  allowedToolPrefixes: string[] | null;
  identitySource: 'session' | 'fallback';
};

type HubInvocationLog = {
  accountId: string;
  toolName: string;
  success: boolean;
  durationMs: number;
  errorMessage?: string | null;
  trace: InvocationTrace;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
};

type HubRouteLog = {
  accountId: string;
  downstreamServer: string;
  downstreamTool: string;
  success: boolean;
  durationMs: number;
  errorMessage?: string | null;
  trace: InvocationTrace;
  metadata?: Record<string, unknown>;
};

const DOWNSTREAM_BEARER_ENV_FALLBACK: Record<string, string> = {
  'cs-telemetry': 'CS_TELEMETRY_OPERATOR_API_TOKEN',
  'halfdozen-telemetry': 'HALFDOZEN_TELEMETRY_OPERATOR_API_TOKEN',
};

interface Env {
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_ID?: string;
  BRAINTRUST_PROJECT_NAME?: string;
  BRAINTRUST_ENABLED?: string;
  HUB_API_TOKEN?: string;
  HUB_TOOL_CALL_TIMEOUT_MS?: string;
  HUB_SESSION_RESOLVE_URL?: string;
  HUB_SESSION_RESOLVE_TOKEN?: string;
  HUB_SESSION_RESOLVE_TIMEOUT_MS?: string;
  HUB_ENABLED_BUNDLES?: string;
  HUB_ENABLED_SERVERS?: string;
  HUB_DISABLED_SERVERS?: string;
  HUB_REFRESH_SECONDS?: string;
  HUB_CACHE_BUST?: string;
  HUB_ACCOUNT_ID?: string;
  HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW?: string;
  HUB_RATE_LIMIT_WINDOW_SECONDS?: string;
  HUB_RATE_LIMIT_SCOPE?: string;
  HUB_RATE_LIMIT_EXEMPT_SERVERS?: string;
  HUB_QUOTA_MAX_PROXY_CALLS_PER_PERIOD?: string;
  HUB_QUOTA_EXEMPT_SERVERS?: string;
  HUB_STATE_KV?: KVNamespace;
  TELEMETRY_DB?: D1Database;
  [key: string]: unknown;
}

const HUB_NAME = 'create-something-hub-remote';
const HUB_VERSION = '1.0.0';
const DEFAULT_REFRESH_SECONDS = 300;
const HUB_STATE_KV_KEY = 'hub_state_v1';
const DEFAULT_BRAINTRUST_PROJECT_NAME = 'CREATE SOMETHING';
const REDACTED = '[REDACTED]';
const TRUNCATED = '[TRUNCATED]';
const MAX_REDACTION_DEPTH = 6;
const MAX_REDACTION_KEYS = 100;
const MAX_REDACTION_ARRAY_ITEMS = 50;
const MAX_REDACTION_STRING_LENGTH = 4_000;
const SENSITIVE_FIELD_PATTERNS: RegExp[] = [
  /(^|_|-)(api[-_]?key|token|secret|password|authorization|cookie|session|bearer)(_|-|$)/i,
  /(^|_|-)(accountid|account_id)(_|-|$)/i,
];

const registry = registryJson as unknown as McpBundleRegistry;

const MANAGEMENT_TOOLS: Tool[] = [
  {
    name: 'hub_status',
    description: 'Show active downstream MCP servers, proxy tool count, and warning state.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_list_registry',
    description: 'List all servers and bundles known by this remote hub registry.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_list_proxy_tools',
    description: 'List proxy tool names currently available from connected downstream MCPs.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_search_proxy_tools',
    description: 'Search proxy tools with optional server filter and cursor pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        serverName: { type: 'string' },
        cursor: { type: 'string' },
        limit: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'hub_refresh_connections',
    description: 'Force-refresh downstream MCP connections and proxy tool catalog.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_update_state',
    description:
      'Enable/disable bundles or servers in remote hub state (persisted in HUB_STATE_KV) and refresh connections.',
    inputSchema: {
      type: 'object',
      properties: {
        enableBundles: { type: 'array', items: { type: 'string' } },
        disableBundles: { type: 'array', items: { type: 'string' } },
        enableServers: { type: 'array', items: { type: 'string' } },
        disableServers: { type: 'array', items: { type: 'string' } },
        writeCodexConfig: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'hub_trace_lookup',
    description: 'Lookup hub and downstream telemetry records by correlation ID.',
    inputSchema: {
      type: 'object',
      properties: {
        correlationId: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['correlationId'],
      additionalProperties: false,
    },
  },
  {
    name: 'hub_policy_status',
    description: 'Show active proxy policy settings (rate limits + quotas) for this hub runtime.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
];

let runtimeCache:
  | {
      key: string;
      runtime: HubRuntime;
      builtAt: number;
    }
  | null = null;

let pendingRuntimeLoad:
  | {
      key: string;
      promise: Promise<HubRuntime>;
    }
  | null = null;

let hubRouteTableReady = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let braintrustLogger: Logger<any> | null = null;
let braintrustLoggerKey: string | null = null;

const rateLimitBuckets = new Map<string, { windowStartMs: number; count: number; lastSeenMs: number }>();
let rateLimitSweepCounter = 0;
const HUB_PROXY_PERIOD_COUNTER_SERVER = `${HUB_NAME}:proxy`;
const sessionResolveCache = new Map<
  string,
  { value: IdentitySessionResolveResponse | null; expiresAtMs: number }
>();
const DEFAULT_SESSION_RESOLVE_TIMEOUT_MS = 5000;
const SESSION_RESOLVE_CACHE_MS = 30000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authFailure = authorizeRequest(request, env);
      if (authFailure) {
        return withCors(authFailure);
      }

      try {
        const runtime = await getHubRuntime(env);
        const server = buildHubServer(runtime, env);
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });

        await server.connect(transport);
        return withCors(await transport.handleRequest(request));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return withCors(jsonResponse({ error: message }, 500));
      }
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      try {
        const fullHealth =
          url.searchParams.get('full') === '1' || url.searchParams.get('full') === 'true';
        const runtime = fullHealth
          ? await getHubRuntime(env, { force: true })
          : runtimeCache?.runtime ?? null;
        const runtimeSource = fullHealth ? 'full' : runtime ? 'cache' : 'none';
        const braintrustProject = resolveBraintrustProjectConfig(env);

        const rateLimitPolicy = resolveRateLimitPolicy(env);
        const quotaPolicy = resolveQuotaPolicy(env);
        return withCors(
          jsonResponse({
            name: HUB_NAME,
            version: HUB_VERSION,
            endpoints: {
              mcp: '/mcp',
              health: '/health',
            },
            auth_required: Boolean(readEnvString(env, 'HUB_API_TOKEN')),
            state_storage: env.HUB_STATE_KV ? 'kv' : 'env-only',
            braintrust: {
              enabled: parseBooleanFlag(
                readEnvString(env, 'BRAINTRUST_ENABLED'),
                Boolean(readEnvString(env, 'BRAINTRUST_API_KEY')),
              ),
              configured: Boolean(readEnvString(env, 'BRAINTRUST_API_KEY')),
              project: braintrustProject.display,
              project_id_configured: Boolean(braintrustProject.projectId),
            },
            policy: buildPolicyStatusPayload(rateLimitPolicy, quotaPolicy, env),
            downstream_auth_config: {
              has_cs_telemetry_operator_token: Boolean(
                readEnvString(env, 'CS_TELEMETRY_OPERATOR_API_TOKEN'),
              ),
              has_halfdozen_telemetry_operator_token: Boolean(
                readEnvString(env, 'HALFDOZEN_TELEMETRY_OPERATOR_API_TOKEN'),
              ),
            },
            session_resolver: {
              enabled: Boolean(readEnvString(env, 'HUB_SESSION_RESOLVE_URL')),
              has_token: Boolean(readEnvString(env, 'HUB_SESSION_RESOLVE_TOKEN')),
              timeout_ms: parsePositiveInt(
                readEnvString(env, 'HUB_SESSION_RESOLVE_TIMEOUT_MS'),
                DEFAULT_SESSION_RESOLVE_TIMEOUT_MS,
              ),
            },
            runtime: {
              source: runtimeSource,
              loading: Boolean(pendingRuntimeLoad),
              full_check: fullHealth,
              built_at: runtime ? new Date(runtime.builtAt).toISOString() : null,
              age_ms: runtime ? Math.max(0, Date.now() - runtime.builtAt) : null,
            },
            enabled_servers: runtime?.stateResolution.enabledServerNames ?? [],
            connected_servers:
              runtime?.connected.map((server) => ({
                name: server.name,
                tool_count: server.tools.length,
              })) ?? [],
            failed_servers: runtime?.failed ?? [],
            proxy_tool_count: runtime?.proxies.toolDefinitions.length ?? 0,
            warnings: runtime
              ? runtime.stateResolution.warnings.concat(runtime.proxies.warnings)
              : [],
            built_at: runtime ? new Date(runtime.builtAt).toISOString() : null,
            full_check_hint:
              'Append ?full=1 to include a live runtime refresh in this response.',
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return withCors(jsonResponse({ error: message }, 500));
      }
    }

    return withCors(new Response('Not found', { status: 404 }));
  },
};

function authorizeRequest(request: Request, env: Env): Response | null {
  const requiredToken = readEnvString(env, 'HUB_API_TOKEN');
  if (!requiredToken) {
    return null;
  }

  const providedToken = getRequestToken(request);
  if (!providedToken || !timingSafeEqual(providedToken, requiredToken)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  return null;
}

function getRequestToken(request: Request): string | null {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    return queryToken;
  }

  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

async function getHubRuntime(env: Env, options: { force?: boolean } = {}): Promise<HubRuntime> {
  const persistedState = await readHubState(env, registry);
  const resolution = resolveState(registry, persistedState);
  const key = buildRuntimeCacheKey(env, resolution.state);
  const ttlMs = parsePositiveInt(readEnvString(env, 'HUB_REFRESH_SECONDS'), DEFAULT_REFRESH_SECONDS) * 1000;

  if (!options.force && runtimeCache && runtimeCache.key === key && Date.now() - runtimeCache.builtAt <= ttlMs) {
    return runtimeCache.runtime;
  }

  if (!options.force && pendingRuntimeLoad && pendingRuntimeLoad.key === key) {
    if (runtimeCache && runtimeCache.key === key) {
      return runtimeCache.runtime;
    }
    return pendingRuntimeLoad.promise;
  }

  const refreshPromise = startRuntimeLoad(env, resolution, key);

  if (!options.force && runtimeCache && runtimeCache.key === key) {
    return runtimeCache.runtime;
  }

  return refreshPromise;
}

function startRuntimeLoad(env: Env, resolution: StateResolution, key: string): Promise<HubRuntime> {
  const promise = buildHubRuntime(env, resolution)
    .then((runtime) => {
      const previousRuntime = runtimeCache?.runtime;
      runtimeCache = {
        key,
        runtime,
        builtAt: runtime.builtAt,
      };
      if (previousRuntime && previousRuntime !== runtime) {
        void closeHubRuntime(previousRuntime);
      }
      return runtime;
    })
    .finally(() => {
      if (pendingRuntimeLoad?.key === key) {
        pendingRuntimeLoad = null;
      }
    });

  pendingRuntimeLoad = { key, promise };
  return promise;
}

async function buildHubRuntime(env: Env, stateResolution: StateResolution): Promise<HubRuntime> {
  const connected: ConnectedDownstream[] = [];
  const failed: DownstreamFailure[] = [];
  const warnings = [...stateResolution.warnings];

  const connectionResults = await Promise.all(
    stateResolution.enabledServerNames.map(async (serverName) => {
      const config = registry.servers[serverName];
      if (!config) {
        return {
          type: 'failed' as const,
          payload: { name: serverName, error: `Server "${serverName}" not found in registry` },
        };
      }

      if (config.transport !== 'http') {
        return {
          type: 'warning' as const,
          payload: `Skipping "${serverName}": remote hub only supports HTTP downstream servers`,
        };
      }

      const result = await connectSingleDownstream(serverName, config, env);
      if ('client' in result) {
        return { type: 'connected' as const, payload: result };
      }

      return { type: 'failed' as const, payload: result };
    }),
  );

  for (const result of connectionResults) {
    if (result.type === 'connected') {
      connected.push(result.payload);
      continue;
    }

    if (result.type === 'failed') {
      failed.push(result.payload);
      continue;
    }

    warnings.push(result.payload);
  }

  connected.sort((a, b) => a.name.localeCompare(b.name));
  failed.sort((a, b) => a.name.localeCompare(b.name));

  const proxies = buildProxyCatalog(connected);
  proxies.warnings.unshift(...warnings);

  return {
    builtAt: Date.now(),
    stateResolution,
    connected,
    failed,
    proxies,
  };
}

async function connectSingleDownstream(
  name: string,
  config: HttpServerConfig,
  env: Env,
): Promise<ConnectedDownstream | DownstreamFailure> {
  const client = new Client({
    name: `${HUB_NAME}:${name}`,
    version: HUB_VERSION,
  });

  try {
    const requestInit: RequestInit = {};
    const baseHeaders = resolveHttpHeaders(name, config, env);
    const requestHeaders = { ...baseHeaders };
    requestInit.headers = requestHeaders;

    const toolCallTimeoutMs = resolveToolCallTimeoutMs(config, env);
    const connectTimeoutMs = resolveDownstreamConnectTimeoutMs(config);

    const transport = new StreamableHTTPClientTransport(new URL(config.url), { requestInit });
    await withTimeout(
      client.connect(transport),
      connectTimeoutMs,
      `Timeout connecting to downstream MCP "${name}"`,
    );

    const tools = await withTimeout(
      listAllTools(client),
      connectTimeoutMs,
      `Timeout listing tools from downstream MCP "${name}"`,
    );
    return {
      name,
      config,
      baseHeaders,
      requestHeaders,
      toolCallTimeoutMs,
      callQueue: Promise.resolve(),
      client,
      tools,
    };
  } catch (error) {
    try {
      await client.close();
    } catch {
      // Best-effort cleanup.
    }
    const message = error instanceof Error ? error.message : String(error);
    return { name, error: message };
  }
}

function resolveDownstreamConnectTimeoutMs(config: HttpServerConfig): number {
  return parsePositiveIntFromUnknown(config.timeout_ms, 8_000);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  });
}

function resolveToolCallTimeoutMs(config: HttpServerConfig, env: Env): number {
  const defaultTimeoutMs = parsePositiveInt(readEnvString(env, 'HUB_TOOL_CALL_TIMEOUT_MS'), 120_000);
  return parsePositiveIntFromUnknown(config.tool_call_timeout_ms ?? config.timeout_ms, defaultTimeoutMs);
}

function resolveHttpHeaders(
  serverName: string,
  config: HttpServerConfig,
  env: Env,
): Record<string, string> {
  const headers: Record<string, string> = {
    ...(config.http_headers ?? {}),
    ...(config.headers ?? {}),
  };

  if (config.env_http_headers) {
    for (const [headerName, envVarName] of Object.entries(config.env_http_headers)) {
      const value = readEnvString(env, envVarName);
      if (value) {
        headers[headerName] = value;
      }
    }
  }

  if (!headers.Authorization) {
    const tokenEnvVar = config.bearer_token_env_var ?? DOWNSTREAM_BEARER_ENV_FALLBACK[serverName];
    const token = tokenEnvVar ? readEnvString(env, tokenEnvVar) : undefined;
    if (token) {
      headers.Authorization = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
    }
  }

  return headers;
}

async function listAllTools(client: Client): Promise<Tool[]> {
  const allTools: Tool[] = [];
  let cursor: string | undefined;

  while (true) {
    const page = await client.listTools(cursor ? { cursor } : undefined);
    allTools.push(...page.tools);
    if (!page.nextCursor) {
      return allTools;
    }
    cursor = page.nextCursor;
  }
}

async function callDownstreamToolWithTrace(
  server: ConnectedDownstream,
  toolName: string,
  args: Record<string, unknown>,
  trace: InvocationTrace,
  accountId: string,
): Promise<any> {
  return queueDownstreamCall(server, async () => {
    const traceHeaders = buildDownstreamTraceHeaders(server, toolName, trace, accountId);
    const previousHeaders = applyRequestHeaders(server.requestHeaders, traceHeaders);

    try {
      return await server.client.callTool(
        buildDownstreamCallRequest(toolName, args, trace),
        undefined,
        { timeout: server.toolCallTimeoutMs },
      );
    } catch (error) {
      if (!shouldFallbackToFreshClient(error)) {
        throw error;
      }

      return callDownstreamToolWithFreshClient(server, toolName, args, trace, accountId);
    } finally {
      restoreRequestHeaders(server.requestHeaders, previousHeaders);
    }
  });
}

async function callDownstreamToolWithFreshClient(
  server: ConnectedDownstream,
  toolName: string,
  args: Record<string, unknown>,
  trace: InvocationTrace,
  accountId: string,
): Promise<any> {
  const client = new Client({
    name: `${HUB_NAME}:${server.name}:proxy`,
    version: HUB_VERSION,
  });

  const headers = {
    ...server.baseHeaders,
    ...buildDownstreamTraceHeaders(server, toolName, trace, accountId),
  };

  const transport = new StreamableHTTPClientTransport(new URL(server.config.url), {
    requestInit: {
      headers,
    },
  });

  await client.connect(transport);
  try {
    return await client.callTool(
      buildDownstreamCallRequest(toolName, args, trace),
      undefined,
      { timeout: server.toolCallTimeoutMs },
    );
  } finally {
    try {
      await client.close();
    } catch {
      // Best-effort cleanup.
    }
  }
}

function queueDownstreamCall<T>(
  server: ConnectedDownstream,
  operation: () => Promise<T>,
): Promise<T> {
  const scheduled = server.callQueue.then(operation, operation);
  server.callQueue = scheduled.then(
    () => undefined,
    () => undefined,
  );
  return scheduled;
}

function buildDownstreamCallRequest(
  toolName: string,
  args: Record<string, unknown>,
  trace: InvocationTrace,
): Parameters<Client['callTool']>[0] {
  return {
    name: toolName,
    arguments: args,
    _meta: {
      progressToken: trace.requestId,
      'io.modelcontextprotocol/related-task': {
        taskId: trace.correlationId,
      },
    },
  };
}

function buildDownstreamTraceHeaders(
  server: ConnectedDownstream,
  toolName: string,
  trace: InvocationTrace,
  accountId: string,
): Record<string, string> {
  return {
    'x-correlation-id': trace.correlationId,
    'x-request-id': trace.requestId,
    'x-hub-server': HUB_NAME,
    'x-hub-downstream-server': server.name,
    'x-hub-downstream-tool': toolName,
    'x-mcp-account-id': accountId,
    'x-hub-account-id': accountId,
  };
}

function applyRequestHeaders(
  target: Record<string, string>,
  updates: Record<string, string>,
): Record<string, string | undefined> {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(updates)) {
    previous[key] = target[key];
    target[key] = value;
  }
  return previous;
}

function restoreRequestHeaders(
  target: Record<string, string>,
  previous: Record<string, string | undefined>,
): void {
  for (const [key, value] of Object.entries(previous)) {
    if (typeof value === 'string') {
      target[key] = value;
    } else {
      delete target[key];
    }
  }
}

function shouldFallbackToFreshClient(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('session') ||
    message.includes('not initialized') ||
    message.includes('transport is closed') ||
    message.includes('connection closed')
  );
}

function buildProxyCatalog(connectedServers: ConnectedDownstream[]): ProxyCatalog {
  const toolDefinitions: Tool[] = [];
  const routes = new Map<string, ProxyRoute>();
  const warnings: string[] = [];

  for (const server of connectedServers) {
    for (const tool of server.tools) {
      const baseProxyName = buildProxyToolName(server.name, tool.name);
      const proxyName = reserveProxyName(baseProxyName, routes, warnings);

      toolDefinitions.push({
        ...tool,
        name: proxyName,
        description: `[${server.name}] ${tool.description ?? ''}`.trim(),
        inputSchema: tool.inputSchema ?? { type: 'object', properties: {} },
      });

      routes.set(proxyName, {
        proxyToolName: proxyName,
        serverName: server.name,
        downstreamToolName: tool.name,
        call: (args, trace, accountId) =>
          callDownstreamToolWithTrace(server, tool.name, args, trace, accountId),
      });
    }
  }

  return {
    toolDefinitions,
    routes,
    warnings,
  };
}

function buildHubServer(runtime: HubRuntime, env: Env): Server {
  const rateLimitPolicy = resolveRateLimitPolicy(env);
  const quotaPolicy = resolveQuotaPolicy(env);
  const server = new Server(
    {
      name: HUB_NAME,
      version: HUB_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...MANAGEMENT_TOOLS, ...runtime.proxies.toolDefinitions],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const toolName = request.params.name;
    const args = normalizeArgs(request.params.arguments);
    const trace = extractInvocationTrace(request, extra);
    const accountContext = await resolveAccountContext(extra, env);
    const accountId = accountContext.accountId;
    const startedAt = Date.now();
    let route: ProxyRoute | null = null;

    try {
      if (toolName === 'hub_status') {
        const result = toJsonResult({
          ...buildStatusPayload(runtime),
          policy: buildPolicyStatusPayload(rateLimitPolicy, quotaPolicy, env),
        });
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          input: args,
          output: result,
          metadata: {
            type: 'management',
          },
        });
        return result;
      }

      if (toolName === 'hub_list_registry') {
        const result = toJsonResult(buildRegistryPayload(registry));
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          input: args,
          output: result,
          metadata: {
            type: 'management',
          },
        });
        return result;
      }

      if (toolName === 'hub_list_proxy_tools') {
        const result = toJsonResult({
          proxyTools: runtime.proxies.toolDefinitions.map((tool) => tool.name),
          count: runtime.proxies.toolDefinitions.length,
        });
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          input: args,
          output: result,
          metadata: {
            type: 'management',
          },
        });
        return result;
      }

      if (toolName === 'hub_search_proxy_tools') {
        const result = toJsonResult(searchProxyTools(runtime.proxies, args));
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          input: args,
          output: result,
          metadata: {
            type: 'management',
            query: stringArg(args.query),
            serverName: stringArg(args.serverName),
            limit: numberArg(args.limit, 25, 1, 100),
            cursor: stringArg(args.cursor),
          },
        });
        return result;
      }

      if (toolName === 'hub_refresh_connections') {
        const refreshed = await getHubRuntime(env, { force: true });
        const result = toJsonResult(buildStatusPayload(refreshed));
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          input: args,
          output: result,
          metadata: {
            type: 'management',
            refreshed: true,
          },
        });
        return result;
      }

      if (toolName === 'hub_update_state') {
        const writeCodexRequested = booleanArg(args.writeCodexConfig, false);
        const patch = {
          enableBundles: stringArrayArg(args.enableBundles, 'enableBundles'),
          disableBundles: stringArrayArg(args.disableBundles, 'disableBundles'),
          enableServers: stringArrayArg(args.enableServers, 'enableServers'),
          disableServers: stringArrayArg(args.disableServers, 'disableServers'),
        };

        const stateUpdate = await applyRemoteStateUpdate(env, patch);
        const refreshed = await getHubRuntime(env, { force: true });
        const result = toJsonResult({
          ...stateUpdate,
          enabledServerNames: refreshed.stateResolution.enabledServerNames,
          warnings: refreshed.stateResolution.warnings,
          codexWrite: writeCodexRequested
            ? {
                supported: false,
                reason: 'Remote hub does not write local .codex/config.toml files.',
              }
            : null,
          note: 'State persisted remotely. Proxy tool list refreshed from live downstream connections.',
        });

        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          input: args,
          output: result,
          metadata: {
            type: 'management',
            patch,
          },
        });
        return result;
      }

      if (toolName === 'hub_trace_lookup') {
        const correlationId = stringArg(args.correlationId) ?? '';
        if (!correlationId) {
          const errorResult = toErrorResult('"correlationId" is required');
          await recordHubInvocation(env, {
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: '"correlationId" is required',
            input: args,
            output: errorResult,
            metadata: {
              type: 'management',
            },
          });
          return errorResult;
        }
        const limit = numberArg(args.limit, 50, 1, 200);
        const lookup = await queryTraceByCorrelation(env, correlationId, limit);
        const result = toJsonResult(lookup);
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          input: args,
          output: result,
          metadata: {
            type: 'management',
            correlationId,
            limit,
          },
        });
        return result;
      }

      if (toolName === 'hub_policy_status') {
        const result = toJsonResult(buildPolicyStatusPayload(rateLimitPolicy, quotaPolicy, env));
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          input: args,
          output: result,
          metadata: {
            type: 'management',
          },
        });
        return result;
      }

      route = runtime.proxies.routes.get(toolName) ?? null;
      if (!route) {
        const errorResult = toErrorResult(`Unknown tool "${toolName}"`);
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: false,
          durationMs: Date.now() - startedAt,
          trace,
          errorMessage: `Unknown tool "${toolName}"`,
          input: args,
          output: errorResult,
          metadata: {
            type: 'unknown-tool',
          },
        });
        return errorResult;
      }

      if (!isRouteAllowedForSession(route, accountContext.allowedToolPrefixes)) {
        const message =
          `Tool "${toolName}" is not enabled for this session. ` +
          'Request a new MCP session with the required toolkit profile.';
        const durationMs = Date.now() - startedAt;
        await Promise.all([
          recordHubInvocation(env, {
            accountId,
            toolName,
            success: false,
            durationMs,
            trace,
            errorMessage: message,
            input: args,
            output: toErrorResult(message),
            metadata: {
              type: 'policy',
              policy: 'session_scope',
              downstreamServer: route.serverName,
              downstreamTool: route.downstreamToolName,
              tenantId: accountContext.tenantId,
              sessionId: accountContext.sessionId,
              identitySource: accountContext.identitySource,
              allowedToolPrefixes: accountContext.allowedToolPrefixes ?? null,
            },
          }),
          recordHubRouteInvocation(env, {
            accountId,
            downstreamServer: route.serverName,
            downstreamTool: route.downstreamToolName,
            success: false,
            durationMs,
            trace,
            errorMessage: message,
            metadata: {
              proxyToolName: toolName,
              blockedByPolicy: 'session_scope',
              tenantId: accountContext.tenantId,
              sessionId: accountContext.sessionId,
            },
          }),
        ]);
        return toErrorResult(message);
      }

      const rateLimitDecision = applyRateLimit(rateLimitPolicy, accountId, route);
      if (!rateLimitDecision.allowed) {
        const durationMs = Date.now() - startedAt;
        const message =
          `Rate limit exceeded (${rateLimitDecision.maxCalls} calls per ${rateLimitDecision.windowSeconds}s, scope=${rateLimitDecision.scope}). ` +
          `Retry after ${rateLimitDecision.resetAt}.`;

        await Promise.all([
          recordHubInvocation(env, {
            accountId,
            toolName,
            success: false,
            durationMs,
            trace,
            errorMessage: message,
            input: args,
            output: toErrorResult(message),
            metadata: {
              type: 'policy',
              policy: 'rate_limit',
              downstreamServer: route.serverName,
              downstreamTool: route.downstreamToolName,
              scope: rateLimitDecision.scope,
              key: rateLimitDecision.key,
              remaining: rateLimitDecision.remaining,
              resetAt: rateLimitDecision.resetAt,
              maxCalls: rateLimitDecision.maxCalls,
              windowSeconds: rateLimitDecision.windowSeconds,
            },
          }),
          recordHubRouteInvocation(env, {
            accountId,
            downstreamServer: route.serverName,
            downstreamTool: route.downstreamToolName,
            success: false,
            durationMs,
            trace,
            errorMessage: message,
            metadata: {
              proxyToolName: toolName,
              blockedByPolicy: 'rate_limit',
              scope: rateLimitDecision.scope,
              remaining: rateLimitDecision.remaining,
              resetAt: rateLimitDecision.resetAt,
              maxCalls: rateLimitDecision.maxCalls,
              windowSeconds: rateLimitDecision.windowSeconds,
            },
          }),
        ]);

        return toErrorResult(message);
      }

      const quotaDecision = await applyQuotaPolicy(env, quotaPolicy, accountId, route);
      if (!quotaDecision.allowed) {
        const durationMs = Date.now() - startedAt;
        const message =
          `Quota exceeded (${quotaDecision.maxCallsPerPeriod} proxy calls per period=${quotaDecision.period}). ` +
          `Remaining ${quotaDecision.remaining}.`;

        await Promise.all([
          recordHubInvocation(env, {
            accountId,
            toolName,
            success: false,
            durationMs,
            trace,
            errorMessage: message,
            input: args,
            output: toErrorResult(message),
            metadata: {
              type: 'policy',
              policy: 'quota',
              reason: quotaDecision.reason ?? null,
              downstreamServer: route.serverName,
              downstreamTool: route.downstreamToolName,
              remaining: quotaDecision.remaining,
              currentCount: quotaDecision.currentCount,
              maxCallsPerPeriod: quotaDecision.maxCallsPerPeriod,
              period: quotaDecision.period,
            },
          }),
          recordHubRouteInvocation(env, {
            accountId,
            downstreamServer: route.serverName,
            downstreamTool: route.downstreamToolName,
            success: false,
            durationMs,
            trace,
            errorMessage: message,
            metadata: {
              proxyToolName: toolName,
              blockedByPolicy: 'quota',
              reason: quotaDecision.reason ?? null,
              remaining: quotaDecision.remaining,
              currentCount: quotaDecision.currentCount,
              maxCallsPerPeriod: quotaDecision.maxCallsPerPeriod,
              period: quotaDecision.period,
            },
          }),
        ]);

        return toErrorResult(message);
      }

      const proxiedResult = await route.call(args, trace, accountId);
      const proxiedSuccess = !resultIsError(proxiedResult);
      const durationMs = Date.now() - startedAt;
      await Promise.all([
        recordHubInvocation(env, {
          accountId,
          toolName,
          success: proxiedSuccess,
          durationMs,
          trace,
          errorMessage: proxiedSuccess ? null : 'Downstream MCP returned isError response',
          input: args,
          output: proxiedResult,
          metadata: {
            type: 'proxy',
            downstreamServer: route.serverName,
            downstreamTool: route.downstreamToolName,
            tenantId: accountContext.tenantId,
            userId: accountContext.userId,
            sessionId: accountContext.sessionId,
            identitySource: accountContext.identitySource,
            rateLimit: {
              scope: rateLimitDecision.scope,
              remaining: rateLimitDecision.remaining,
              resetAt: rateLimitDecision.resetAt,
              maxCalls: rateLimitDecision.maxCalls,
              windowSeconds: rateLimitDecision.windowSeconds,
            },
            quota: {
              remaining: quotaDecision.remaining,
              currentCount: quotaDecision.currentCount,
              maxCallsPerPeriod: quotaDecision.maxCallsPerPeriod,
              period: quotaDecision.period,
              reason: quotaDecision.reason ?? null,
            },
          },
        }),
        recordHubRouteInvocation(env, {
          accountId,
          downstreamServer: route.serverName,
          downstreamTool: route.downstreamToolName,
          success: proxiedSuccess,
          durationMs,
          trace,
          errorMessage: proxiedSuccess ? null : 'Downstream MCP returned isError response',
          metadata: {
            proxyToolName: toolName,
          },
        }),
      ]);
      return proxiedResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startedAt;
      await recordHubInvocation(env, {
        accountId,
        toolName,
        success: false,
        durationMs,
        trace,
        errorMessage: message,
        input: args,
        output: toErrorResult(`Tool "${toolName}" failed: ${message}`),
        metadata: {
          type: route ? 'proxy' : 'management',
          downstreamServer: route?.serverName ?? null,
          downstreamTool: route?.downstreamToolName ?? null,
          tenantId: accountContext.tenantId,
          userId: accountContext.userId,
          sessionId: accountContext.sessionId,
          identitySource: accountContext.identitySource,
        },
      });
      if (route) {
        await recordHubRouteInvocation(env, {
          accountId,
          downstreamServer: route.serverName,
          downstreamTool: route.downstreamToolName,
          success: false,
          durationMs,
          trace,
          errorMessage: message,
          metadata: {
            proxyToolName: toolName,
          },
        });
      }
      return toErrorResult(`Tool "${toolName}" failed: ${message}`);
    }
  });

  return server;
}

function buildStatusPayload(runtime: HubRuntime): Record<string, unknown> {
  return {
    hub: {
      name: HUB_NAME,
      version: HUB_VERSION,
    },
    state: runtime.stateResolution.state,
    enabledServerNames: runtime.stateResolution.enabledServerNames,
    connectedServers: runtime.connected.map((server) => ({
      name: server.name,
      toolCount: server.tools.length,
    })),
    failedServers: runtime.failed,
    proxyToolCount: runtime.proxies.toolDefinitions.length,
    warnings: runtime.proxies.warnings,
    builtAt: new Date(runtime.builtAt).toISOString(),
    note: 'Use hub_update_state for live toggles and hub_refresh_connections to force reconnect + rebuild proxy catalog.',
  };
}

function buildRegistryPayload(currentRegistry: McpBundleRegistry): Record<string, unknown> {
  const servers = Object.entries(currentRegistry.servers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, config]) => ({
      name,
      transport: config.transport,
      target: config.transport === 'http' ? config.url : `${config.command} ${(config.args ?? []).join(' ')}`.trim(),
      tags: config.tags ?? [],
      description: config.description ?? '',
    }));

  const bundles = Object.entries(currentRegistry.bundles)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, bundleServers]) => ({
      name,
      servers: bundleServers,
    }));

  return {
    servers,
    bundles,
    defaults: currentRegistry.defaults ?? {},
  };
}

function buildPolicyStatusPayload(
  rateLimitPolicy: RateLimitPolicy,
  quotaPolicy: QuotaPolicy,
  env: Env,
): Record<string, unknown> {
  const period = getCurrentPeriod();

  return {
    rateLimit: {
      enabled: rateLimitPolicy.enabled,
      scope: rateLimitPolicy.scope,
      maxCallsPerWindow: rateLimitPolicy.maxCalls,
      windowSeconds: rateLimitPolicy.windowSeconds,
      exemptServers: [...rateLimitPolicy.exemptServers].sort(),
      activeBucketCount: rateLimitBuckets.size,
    },
    quota: {
      enabled: quotaPolicy.enabled,
      maxCallsPerPeriod: quotaPolicy.maxCallsPerPeriod,
      period,
      counterServerName: HUB_PROXY_PERIOD_COUNTER_SERVER,
      telemetryDbConfigured: Boolean(env.TELEMETRY_DB),
      exemptServers: [...quotaPolicy.exemptServers].sort(),
    },
    note: [
      rateLimitPolicy.enabled
        ? 'Rate limiting applies only to proxied downstream tool calls.'
        : 'Rate limiting is disabled. Set HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW > 0 to enable.',
      quotaPolicy.enabled
        ? `Quota enforcement uses TELEMETRY_DB mcp_run_counts with server_name=${HUB_PROXY_PERIOD_COUNTER_SERVER}.`
        : 'Quota is disabled. Set HUB_QUOTA_MAX_PROXY_CALLS_PER_PERIOD > 0 to enable.',
    ].join(' '),
  };
}

function resolveRateLimitPolicy(env: Env): RateLimitPolicy {
  const maxCallsRaw = readEnvString(env, 'HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW');
  const maxCalls = parsePositiveInt(maxCallsRaw, 0);
  const windowSeconds = parsePositiveInt(readEnvString(env, 'HUB_RATE_LIMIT_WINDOW_SECONDS'), 60);
  const scope = parseRateLimitScope(readEnvString(env, 'HUB_RATE_LIMIT_SCOPE'));
  const exemptServers = new Set(parseList(readEnvString(env, 'HUB_RATE_LIMIT_EXEMPT_SERVERS')) ?? []);

  const enabled = maxCalls > 0;
  return {
    enabled,
    maxCalls,
    windowMs: windowSeconds * 1000,
    windowSeconds,
    scope,
    exemptServers,
  };
}

function parseRateLimitScope(raw: string | undefined): RateLimitScope {
  const normalized = (raw ?? '').trim().toLowerCase();
  if (normalized === 'account_server') return 'account_server';
  if (normalized === 'account_server_tool') return 'account_server_tool';
  return 'account';
}

function resolveQuotaPolicy(env: Env): QuotaPolicy {
  const maxCallsPerPeriod = parsePositiveInt(
    readEnvString(env, 'HUB_QUOTA_MAX_PROXY_CALLS_PER_PERIOD'),
    0,
  );
  const exemptServers = new Set(parseList(readEnvString(env, 'HUB_QUOTA_EXEMPT_SERVERS')) ?? []);

  return {
    enabled: maxCallsPerPeriod > 0,
    maxCallsPerPeriod,
    exemptServers,
  };
}

function applyRateLimit(
  policy: RateLimitPolicy,
  accountId: string,
  route: ProxyRoute,
): RateLimitDecision {
  if (!policy.enabled || policy.exemptServers.has(route.serverName)) {
    return {
      allowed: true,
      key: 'disabled',
      remaining: Number.MAX_SAFE_INTEGER,
      resetAt: new Date(Date.now()).toISOString(),
      scope: policy.scope,
      maxCalls: policy.maxCalls,
      windowSeconds: policy.windowSeconds,
    };
  }

  const now = Date.now();
  const key = buildRateLimitKey(policy.scope, accountId, route);
  const current = rateLimitBuckets.get(key);
  const windowStartMs = current ? current.windowStartMs : now;
  const windowExpired = now >= windowStartMs + policy.windowMs;

  const bucket = !current || windowExpired
    ? { windowStartMs: now, count: 0, lastSeenMs: now }
    : current;

  if (bucket.count >= policy.maxCalls) {
    bucket.lastSeenMs = now;
    rateLimitBuckets.set(key, bucket);
    maybeSweepRateLimitBuckets(now, policy.windowMs);
    return {
      allowed: false,
      key,
      remaining: 0,
      resetAt: new Date(bucket.windowStartMs + policy.windowMs).toISOString(),
      scope: policy.scope,
      maxCalls: policy.maxCalls,
      windowSeconds: policy.windowSeconds,
    };
  }

  bucket.count += 1;
  bucket.lastSeenMs = now;
  rateLimitBuckets.set(key, bucket);
  maybeSweepRateLimitBuckets(now, policy.windowMs);

  return {
    allowed: true,
    key,
    remaining: Math.max(0, policy.maxCalls - bucket.count),
    resetAt: new Date(bucket.windowStartMs + policy.windowMs).toISOString(),
    scope: policy.scope,
    maxCalls: policy.maxCalls,
    windowSeconds: policy.windowSeconds,
  };
}

async function applyQuotaPolicy(
  env: Env,
  policy: QuotaPolicy,
  accountId: string,
  route: ProxyRoute,
): Promise<QuotaDecision> {
  const period = getCurrentPeriod();
  const key = `${accountId}::${period}`;

  if (!policy.enabled || policy.exemptServers.has(route.serverName)) {
    return {
      allowed: true,
      key,
      remaining: Number.MAX_SAFE_INTEGER,
      currentCount: 0,
      maxCallsPerPeriod: policy.maxCallsPerPeriod,
      period,
      reason: 'disabled_or_exempt',
    };
  }

  const db = env.TELEMETRY_DB;
  if (!db) {
    return {
      allowed: true,
      key,
      remaining: Number.MAX_SAFE_INTEGER,
      currentCount: 0,
      maxCallsPerPeriod: policy.maxCallsPerPeriod,
      period,
      reason: 'telemetry_db_unavailable',
    };
  }

  try {
    const currentCount = await getQuotaCount(db, accountId, period);
    if (currentCount >= policy.maxCallsPerPeriod) {
      return {
        allowed: false,
        key,
        remaining: 0,
        currentCount,
        maxCallsPerPeriod: policy.maxCallsPerPeriod,
        period,
      };
    }

    const updatedCount = await incrementQuotaCount(db, accountId, period);
    return {
      allowed: true,
      key,
      remaining: Math.max(0, policy.maxCallsPerPeriod - updatedCount),
      currentCount: updatedCount,
      maxCallsPerPeriod: policy.maxCallsPerPeriod,
      period,
    };
  } catch (error) {
    return {
      allowed: true,
      key,
      remaining: Number.MAX_SAFE_INTEGER,
      currentCount: 0,
      maxCallsPerPeriod: policy.maxCallsPerPeriod,
      period,
      reason: `quota_check_failed:${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function getQuotaCount(db: D1Database, accountId: string, period: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT runs_this_period
       FROM mcp_run_counts
       WHERE server_name = ? AND account_id = ? AND period_start = ?
       LIMIT 1`,
    )
    .bind(HUB_PROXY_PERIOD_COUNTER_SERVER, accountId, period)
    .first<{ runs_this_period: number | null }>();

  const count = row?.runs_this_period;
  return typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

async function incrementQuotaCount(db: D1Database, accountId: string, period: string): Promise<number> {
  await db
    .prepare(
      `INSERT INTO mcp_run_counts (server_name, account_id, period_start, runs_this_period, updated_at)
       VALUES (?, ?, ?, 1, datetime('now'))
       ON CONFLICT(server_name, account_id, period_start) DO UPDATE SET
         runs_this_period = mcp_run_counts.runs_this_period + 1,
         updated_at = datetime('now')`,
    )
    .bind(HUB_PROXY_PERIOD_COUNTER_SERVER, accountId, period)
    .run();

  return getQuotaCount(db, accountId, period);
}

function buildRateLimitKey(
  scope: RateLimitScope,
  accountId: string,
  route: ProxyRoute,
): string {
  if (scope === 'account_server_tool') {
    return `${accountId}::${route.serverName}::${route.downstreamToolName}`;
  }
  if (scope === 'account_server') {
    return `${accountId}::${route.serverName}`;
  }
  return accountId;
}

function maybeSweepRateLimitBuckets(nowMs: number, windowMs: number): void {
  rateLimitSweepCounter += 1;
  if (rateLimitSweepCounter % 100 !== 0) return;

  const staleBefore = nowMs - Math.max(windowMs * 2, 120_000);
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.lastSeenMs < staleBefore) {
      rateLimitBuckets.delete(key);
    }
  }
}

async function applyRemoteStateUpdate(
  env: Env,
  patch: {
    enableBundles: string[];
    disableBundles: string[];
    enableServers: string[];
    disableServers: string[];
  },
): Promise<Record<string, unknown>> {
  const current = await readHubState(env, registry);
  const next = updateState(registry, current, patch);
  const write = await writeHubState(env, next);

  return {
    updatedState: next,
    storage: write,
  };
}

function searchProxyTools(
  proxies: ProxyCatalog,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const query = stringArg(args.query);
  const serverNameFilter = stringArg(args.serverName);
  const cursor = stringArg(args.cursor);
  const limit = numberArg(args.limit, 25, 1, 100);
  const startIndex = cursor ? numberArg(Number(cursor), 0, 0, Number.MAX_SAFE_INTEGER) : 0;

  const definitionByName = new Map(proxies.toolDefinitions.map((tool) => [tool.name, tool]));
  const all = Array.from(proxies.routes.values())
    .map((route) => {
      const definition = definitionByName.get(route.proxyToolName);
      return {
        proxyToolName: route.proxyToolName,
        serverName: route.serverName,
        downstreamToolName: route.downstreamToolName,
        description: definition?.description ?? '',
      };
    })
    .sort((a, b) => a.proxyToolName.localeCompare(b.proxyToolName));

  const filtered = all.filter((item) => {
    if (serverNameFilter && item.serverName !== serverNameFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    const q = query.toLowerCase();
    return (
      item.proxyToolName.toLowerCase().includes(q) ||
      item.serverName.toLowerCase().includes(q) ||
      item.downstreamToolName.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  const page = filtered.slice(startIndex, startIndex + limit);
  const nextCursor = startIndex + page.length < filtered.length
    ? String(startIndex + page.length)
    : null;

  return {
    query,
    serverName: serverNameFilter,
    total: filtered.length,
    limit,
    cursor: cursor ?? '0',
    nextCursor,
    tools: page,
  };
}

function normalizeArgs(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) {
    return {};
  }
  return raw;
}

function stringArg(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberArg(raw: unknown, fallback: number, min: number, max: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

function booleanArg(raw: unknown, fallback: boolean): boolean {
  if (typeof raw !== 'boolean') {
    return fallback;
  }
  return raw;
}

function stringArrayArg(raw: unknown, fieldName: string): string[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== 'string')) {
    throw new Error(`"${fieldName}" must be an array of strings`);
  }
  return uniqueSortedStrings(raw as string[]);
}

function resultIsError(value: unknown): boolean {
  const record = asRecord(value);
  return record?.isError === true;
}

function toJsonResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function toErrorResult(message: string) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
}

function buildProxyToolName(serverName: string, downstreamToolName: string): string {
  return `${sanitizeName(serverName)}__${sanitizeName(downstreamToolName)}`;
}

function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function reserveProxyName(baseName: string, routes: Map<string, ProxyRoute>, warnings: string[]): string {
  if (!routes.has(baseName)) {
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName}_${suffix}`;
  while (routes.has(candidate)) {
    suffix += 1;
    candidate = `${baseName}_${suffix}`;
  }

  warnings.push(`Proxy tool name collision for "${baseName}", renamed to "${candidate}"`);
  return candidate;
}

function extractInvocationTrace(request: unknown, extra: unknown): InvocationTrace {
  const requestRecord = asRecord(request);
  const extraRecord = asRecord(extra);
  const meta = asRecord(extraRecord?._meta);
  const relatedTask = asRecord(meta?.['io.modelcontextprotocol/related-task']);

  const headerRequestId = getHeaderValue(extraRecord?.requestInfo, 'x-request-id');
  const requestId =
    headerRequestId ??
    normalizeTraceValue(extraRecord?.requestId) ??
    normalizeTraceValue(requestRecord?.id) ??
    createFallbackRequestId();

  const correlationId =
    getHeaderValue(extraRecord?.requestInfo, 'x-correlation-id') ??
    normalizeTraceValue(relatedTask?.taskId) ??
    normalizeTraceValue(meta?.progressToken) ??
    requestId;

  return {
    requestId,
    correlationId,
    transportRequestId: normalizeTraceValue(extraRecord?.requestId) ?? requestId,
  };
}

async function resolveAccountContext(extra: unknown, env: Env): Promise<ResolvedAccountContext> {
  const extraRecord = asRecord(extra);
  const authorization = getHeaderValue(extraRecord?.requestInfo, 'authorization');
  const bearerToken = authorization ? parseBearerToken(authorization) : null;
  const sessionHeaderToken = getHeaderValue(extraRecord?.requestInfo, 'x-mcp-session-token');
  const staticHubToken = readEnvString(env, 'HUB_API_TOKEN');
  const bearerIsHubToken =
    bearerToken && staticHubToken ? timingSafeEqual(bearerToken, staticHubToken) : false;
  const sessionToken = sessionHeaderToken ?? (bearerToken && !bearerIsHubToken ? bearerToken : null);

  if (sessionToken && isSessionResolverConfigured(env)) {
    const resolved = await resolveSessionForBearerToken(env, sessionToken);
    const accountId = normalizeTraceValue(resolved?.account_id);
    if (!resolved || resolved.valid !== true || !accountId) {
      const reason = normalizeTraceValue(resolved?.reason);
      throw new Error(reason ? `Unauthorized MCP session token: ${reason}` : 'Unauthorized MCP session token');
    }

    return {
      accountId,
      tenantId: normalizeTraceValue(resolved.tenant_id),
      userId: normalizeTraceValue(resolved.user_id),
      sessionId: normalizeTraceValue(resolved.session_id),
      allowedToolPrefixes: parseAllowedToolPrefixes(resolved.allowed_tool_prefixes),
      identitySource: 'session',
    };
  }

  return resolveFallbackAccountContext(extra, env);
}

function resolveFallbackAccountContext(extra: unknown, env: Env): ResolvedAccountContext {
  const extraRecord = asRecord(extra);
  const authInfo = asRecord(extraRecord?.authInfo);
  const authorization = getHeaderValue(extraRecord?.requestInfo, 'authorization');
  const staticHubToken = readEnvString(env, 'HUB_API_TOKEN');
  const fromHeader =
    getHeaderValue(extraRecord?.requestInfo, 'x-mcp-account-id') ??
    getHeaderValue(extraRecord?.requestInfo, 'x-account-id') ??
    getHeaderValue(extraRecord?.requestInfo, 'x-tenant-id') ??
    getHeaderValue(extraRecord?.requestInfo, 'x-hub-account-id');
  const rawBearer = authorization ? parseBearerToken(authorization) : null;
  const fromBearer =
    rawBearer && staticHubToken && timingSafeEqual(rawBearer, staticHubToken) ? null : rawBearer;
  const fromAuth =
    normalizeTraceValue(authInfo?.accountId) ??
    normalizeTraceValue(authInfo?.tenantId) ??
    normalizeTraceValue(authInfo?.clientId) ??
    normalizeTraceValue(authInfo?.sub);
  return {
    accountId: fromHeader ?? fromBearer ?? fromAuth ?? readEnvString(env, 'HUB_ACCOUNT_ID') ?? 'operator',
    tenantId: normalizeTraceValue(authInfo?.tenantId) ?? null,
    userId: normalizeTraceValue(authInfo?.sub) ?? null,
    sessionId: null,
    allowedToolPrefixes: null,
    identitySource: 'fallback',
  };
}

function isSessionResolverConfigured(env: Env): boolean {
  return Boolean(readEnvString(env, 'HUB_SESSION_RESOLVE_URL') && readEnvString(env, 'HUB_SESSION_RESOLVE_TOKEN'));
}

async function resolveSessionForBearerToken(
  env: Env,
  token: string,
): Promise<IdentitySessionResolveResponse | null> {
  const now = Date.now();
  const cached = sessionResolveCache.get(token);
  if (cached && cached.expiresAtMs > now) {
    return cached.value;
  }

  const resolveUrl = readEnvString(env, 'HUB_SESSION_RESOLVE_URL');
  const resolveToken = readEnvString(env, 'HUB_SESSION_RESOLVE_TOKEN');
  if (!resolveUrl || !resolveToken) {
    return null;
  }

  const timeoutMs = parsePositiveInt(
    readEnvString(env, 'HUB_SESSION_RESOLVE_TIMEOUT_MS'),
    DEFAULT_SESSION_RESOLVE_TIMEOUT_MS,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(resolveUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolveToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const value = { valid: false, reason: `resolver_http_${response.status}` };
      sessionResolveCache.set(token, { value, expiresAtMs: now + SESSION_RESOLVE_CACHE_MS });
      maybeSweepSessionResolveCache(now);
      return value;
    }

    const payload = (await response.json()) as IdentitySessionResolveResponse;
    sessionResolveCache.set(token, { value: payload, expiresAtMs: now + SESSION_RESOLVE_CACHE_MS });
    maybeSweepSessionResolveCache(now);
    return payload;
  } catch (error) {
    const value = {
      valid: false,
      reason: error instanceof Error ? `resolver_error:${error.name}` : 'resolver_error',
    };
    sessionResolveCache.set(token, { value, expiresAtMs: now + SESSION_RESOLVE_CACHE_MS });
    maybeSweepSessionResolveCache(now);
    return value;
  } finally {
    clearTimeout(timeout);
  }
}

function maybeSweepSessionResolveCache(nowMs: number): void {
  if (sessionResolveCache.size < 256) return;
  for (const [key, value] of sessionResolveCache.entries()) {
    if (value.expiresAtMs <= nowMs) {
      sessionResolveCache.delete(key);
    }
  }
}

function parseAllowedToolPrefixes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 500);
}

function isRouteAllowedForSession(route: ProxyRoute, allowedToolPrefixes: string[] | null): boolean {
  if (allowedToolPrefixes === null) {
    return true;
  }
  if (allowedToolPrefixes.length === 0) {
    return false;
  }

  if (allowedToolPrefixes.some((prefix) => route.proxyToolName.startsWith(prefix))) {
    return true;
  }

  const directPrefix = `${sanitizeName(route.serverName)}__`;
  if (allowedToolPrefixes.includes(directPrefix)) {
    return true;
  }

  return false;
}

function normalizeTraceValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 256) : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  return null;
}

function createFallbackRequestId(): string {
  return `hub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getHeaderValue(requestInfo: unknown, name: string): string | null {
  const infoRecord = asRecord(requestInfo);
  const headers = infoRecord?.headers;
  if (!headers) return null;

  if (headers instanceof Headers) {
    const value = headers.get(name);
    return normalizeTraceValue(value);
  }

  if (Array.isArray(headers)) {
    for (const item of headers) {
      if (!Array.isArray(item) || item.length < 2) continue;
      if (String(item[0]).toLowerCase() !== name.toLowerCase()) continue;
      return normalizeTraceValue(item[1]);
    }
    return null;
  }

  const headerRecord = asRecord(headers);
  if (!headerRecord) return null;

  for (const [key, value] of Object.entries(headerRecord)) {
    if (key.toLowerCase() !== name.toLowerCase()) continue;
    if (typeof value === 'string') return normalizeTraceValue(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        const normalized = normalizeTraceValue(item);
        if (normalized) return normalized;
      }
    }
  }

  return null;
}

function parseBearerToken(value: string): string | null {
  const match = value.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]?.trim();
  return token ? token : null;
}

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function resolveBraintrustProjectName(env: Env): string {
  const configured = readEnvString(env, 'BRAINTRUST_PROJECT_NAME')?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BRAINTRUST_PROJECT_NAME;
}

function resolveBraintrustProjectConfig(
  env: Env,
): { projectId?: string; projectName?: string; display: string } {
  const projectId = readEnvString(env, 'BRAINTRUST_PROJECT_ID')?.trim();
  if (projectId && projectId.length > 0) {
    return {
      projectId,
      display: projectId,
    };
  }

  const projectName = resolveBraintrustProjectName(env);
  return {
    projectName,
    display: projectName,
  };
}

function parseBooleanFlag(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBraintrustLogger(env: Env): Logger<any> | null {
  const hasApiKey = Boolean(readEnvString(env, 'BRAINTRUST_API_KEY'));
  const enabled = parseBooleanFlag(readEnvString(env, 'BRAINTRUST_ENABLED'), hasApiKey);
  if (!enabled) {
    return null;
  }

  const apiKey = readEnvString(env, 'BRAINTRUST_API_KEY');
  if (!apiKey) {
    return null;
  }

  const project = resolveBraintrustProjectConfig(env);
  const projectKey = project.projectId ?? project.projectName ?? DEFAULT_BRAINTRUST_PROJECT_NAME;
  const nextKey = `${apiKey}::${projectKey}`;
  if (braintrustLogger && braintrustLoggerKey === nextKey) {
    return braintrustLogger;
  }

  try {
    braintrustLogger = initLogger({
      apiKey,
      projectName: project.projectName,
      projectId: project.projectId,
      asyncFlush: true,
      setCurrent: true,
    });
    braintrustLoggerKey = nextKey;
    return braintrustLogger;
  } catch (error) {
    console.warn(`[${HUB_NAME}] braintrust logger init failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function looksSensitiveField(key: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

function redactString(value: string): string {
  const trimmed = value.trim();
  if (/^Bearer\s+/i.test(trimmed)) {
    return 'Bearer [REDACTED]';
  }
  if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(trimmed) && trimmed.length > 24) {
    return REDACTED;
  }
  if (trimmed.length > MAX_REDACTION_STRING_LENGTH) {
    return `${trimmed.slice(0, MAX_REDACTION_STRING_LENGTH)}...`;
  }
  return value;
}

function redactForBraintrust(value: unknown, depth = 0, keyHint = ''): unknown {
  if (depth > MAX_REDACTION_DEPTH) return TRUNCATED;
  if (value === null || value === undefined) return value;

  if (looksSensitiveField(keyHint)) {
    return REDACTED;
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    const limited = value.slice(0, MAX_REDACTION_ARRAY_ITEMS).map((entry) =>
      redactForBraintrust(entry, depth + 1, keyHint),
    );
    if (value.length > MAX_REDACTION_ARRAY_ITEMS) {
      limited.push({
        truncatedItems: value.length - MAX_REDACTION_ARRAY_ITEMS,
      });
    }
    return limited;
  }

  if (isRecord(value)) {
    const output: Record<string, unknown> = {};
    const entries = Object.entries(value);
    for (const [index, [key, entryValue]] of entries.entries()) {
      if (index >= MAX_REDACTION_KEYS) {
        output.__truncatedKeys = entries.length - MAX_REDACTION_KEYS;
        break;
      }
      output[key] = looksSensitiveField(key) ? REDACTED : redactForBraintrust(entryValue, depth + 1, key);
    }
    return output;
  }

  return redactString(String(value));
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function emitBraintrustHubInvocation(env: Env, log: HubInvocationLog, accountId: string): void {
  const logger = getBraintrustLogger(env);
  if (!logger) return;

  const accountRef = `acct_${hashString(accountId)}`;
  const metadata = redactForBraintrust(log.metadata) as Record<string, unknown> | null;
  const input = redactForBraintrust(log.input);
  const output = redactForBraintrust(log.output);

  try {
    const tracedResult = logger.traced(
      (span: Span) => {
        span.log({
          input,
          output,
          error: log.errorMessage ?? undefined,
          tags: ['mcp', 'hub', HUB_NAME, log.toolName, log.success ? 'success' : 'error'],
          metadata: {
            server: HUB_NAME,
            tool: log.toolName,
            accountRef,
            success: log.success,
            durationMs: Math.max(0, Math.floor(log.durationMs)),
            correlationId: log.trace.correlationId,
            requestId: log.trace.requestId,
            metadata,
          },
        });
      },
      {
        name: `mcp:${HUB_NAME}:${log.toolName}`,
        type: 'tool',
      },
    );

    if (tracedResult && typeof (tracedResult as Promise<void>).catch === 'function') {
      void (tracedResult as Promise<void>).catch((error: unknown) => {
        console.warn(
          `[${HUB_NAME}] braintrust emit failed for ${log.toolName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] braintrust emit failed for ${log.toolName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function recordHubInvocation(env: Env, log: HubInvocationLog): Promise<void> {
  const accountId = (log.accountId || 'operator').slice(0, 256);
  emitBraintrustHubInvocation(env, log, accountId);

  const db = env.TELEMETRY_DB;
  if (!db) return;

  const period = getCurrentPeriod();
  const errorMessage = log.errorMessage ? log.errorMessage.slice(0, 500) : null;
  const metadataJson = safeJsonStringify(log.metadata);

  try {
    await db
      .prepare(
        `INSERT INTO mcp_run_counts (server_name, account_id, period_start, runs_this_period, updated_at)
         VALUES (?, ?, ?, 1, datetime('now'))
         ON CONFLICT(server_name, account_id, period_start) DO UPDATE SET
           runs_this_period = mcp_run_counts.runs_this_period + 1,
           updated_at = datetime('now')`,
      )
      .bind(HUB_NAME, accountId, period)
      .run();
  } catch (error) {
    console.warn(`[${HUB_NAME}] telemetry run count write failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    await db
      .prepare(
        `INSERT INTO mcp_tool_invocations (server_name, account_id, tool_name, success, duration_ms, error_message, correlation_id, request_id, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        HUB_NAME,
        accountId,
        log.toolName,
        log.success ? 1 : 0,
        Math.max(0, Math.floor(log.durationMs)),
        errorMessage,
        log.trace.correlationId,
        log.trace.requestId,
        metadataJson,
      )
      .run();
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missingMetadata = isMissingColumnError(message, 'metadata_json');
    const missingTrace =
      isMissingColumnError(message, 'correlation_id') || isMissingColumnError(message, 'request_id');

    if (!missingMetadata && !missingTrace) {
      console.warn(`[${HUB_NAME}] telemetry invocation write failed: ${message}`);
      return;
    }

    if (!missingTrace) {
      try {
        await db
          .prepare(
            `INSERT INTO mcp_tool_invocations (server_name, account_id, tool_name, success, duration_ms, error_message, correlation_id, request_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            HUB_NAME,
            accountId,
            log.toolName,
            log.success ? 1 : 0,
            Math.max(0, Math.floor(log.durationMs)),
            errorMessage,
            log.trace.correlationId,
            log.trace.requestId,
          )
          .run();
        return;
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        if (
          !isMissingColumnError(fallbackMessage, 'correlation_id') &&
          !isMissingColumnError(fallbackMessage, 'request_id')
        ) {
          console.warn(`[${HUB_NAME}] telemetry fallback write failed: ${fallbackMessage}`);
          return;
        }
      }
    }
  }

  try {
    await db
      .prepare(
        `INSERT INTO mcp_tool_invocations (server_name, account_id, tool_name, success, duration_ms, error_message)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        HUB_NAME,
        accountId,
        log.toolName,
        log.success ? 1 : 0,
        Math.max(0, Math.floor(log.durationMs)),
        errorMessage,
      )
      .run();
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] telemetry basic write failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function ensureHubRouteTable(db: D1Database): Promise<void> {
  if (hubRouteTableReady) return;

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS mcp_hub_routes (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         hub_server_name TEXT NOT NULL,
         account_id TEXT NOT NULL,
         downstream_server_name TEXT NOT NULL,
         downstream_tool_name TEXT NOT NULL,
         success INTEGER NOT NULL DEFAULT 1,
         duration_ms INTEGER,
         error_message TEXT,
         correlation_id TEXT,
         request_id TEXT,
         metadata_json TEXT,
         created_at TEXT NOT NULL DEFAULT (datetime('now'))
       )`,
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_mcp_hub_routes_correlation_time
         ON mcp_hub_routes(correlation_id, created_at)`,
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_mcp_hub_routes_downstream_time
         ON mcp_hub_routes(downstream_server_name, created_at)`,
    )
    .run();

  hubRouteTableReady = true;
}

async function recordHubRouteInvocation(env: Env, log: HubRouteLog): Promise<void> {
  const db = env.TELEMETRY_DB;
  if (!db) return;

  try {
    await ensureHubRouteTable(db);
  } catch (error) {
    console.warn(`[${HUB_NAME}] failed creating mcp_hub_routes table: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  try {
    await db
      .prepare(
        `INSERT INTO mcp_hub_routes (
           hub_server_name,
           account_id,
           downstream_server_name,
           downstream_tool_name,
           success,
           duration_ms,
           error_message,
           correlation_id,
           request_id,
           metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        HUB_NAME,
        (log.accountId || 'operator').slice(0, 256),
        log.downstreamServer,
        log.downstreamTool,
        log.success ? 1 : 0,
        Math.max(0, Math.floor(log.durationMs)),
        log.errorMessage ? log.errorMessage.slice(0, 500) : null,
        log.trace.correlationId,
        log.trace.requestId,
        safeJsonStringify(log.metadata),
      )
      .run();
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] route telemetry write failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function queryTraceByCorrelation(
  env: Env,
  correlationId: string,
  limit: number,
): Promise<Record<string, unknown>> {
  const db = env.TELEMETRY_DB;
  if (!db) {
    return {
      correlationId,
      count: 0,
      error: 'TELEMETRY_DB binding is not configured on this hub deployment.',
    };
  }

  const baseBind = [correlationId, limit];
  try {
    const rows = await db
      .prepare(
        `SELECT server_name, account_id, tool_name, success, duration_ms, error_message, correlation_id, request_id, metadata_json, created_at
         FROM mcp_tool_invocations
         WHERE correlation_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(...baseBind)
      .all<{
        server_name: string;
        account_id: string;
        tool_name: string;
        success: number;
        duration_ms: number | null;
        error_message: string | null;
        correlation_id: string | null;
        request_id: string | null;
        metadata_json: string | null;
        created_at: string;
      }>();

    const routeRows = await queryHubRouteRowsByCorrelation(db, correlationId, limit);
    return formatTraceLookupResult(correlationId, rows.results, routeRows);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missingMetadata = isMissingColumnError(message, 'metadata_json');
    if (!missingMetadata) {
      return {
        correlationId,
        count: 0,
        error: message,
      };
    }

    const fallbackRows = await db
      .prepare(
        `SELECT server_name, account_id, tool_name, success, duration_ms, error_message, correlation_id, request_id, NULL as metadata_json, created_at
         FROM mcp_tool_invocations
         WHERE correlation_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(...baseBind)
      .all<{
        server_name: string;
        account_id: string;
        tool_name: string;
        success: number;
        duration_ms: number | null;
        error_message: string | null;
        correlation_id: string | null;
        request_id: string | null;
        metadata_json: string | null;
        created_at: string;
      }>();

    const routeRows = await queryHubRouteRowsByCorrelation(db, correlationId, limit);
    return formatTraceLookupResult(correlationId, fallbackRows.results, routeRows);
  }
}

async function queryHubRouteRowsByCorrelation(
  db: D1Database,
  correlationId: string,
  limit: number,
): Promise<
  Array<{
    hub_server_name: string;
    account_id: string;
    downstream_server_name: string;
    downstream_tool_name: string;
    success: number;
    duration_ms: number | null;
    error_message: string | null;
    correlation_id: string | null;
    request_id: string | null;
    metadata_json: string | null;
    created_at: string;
  }>
> {
  try {
    await ensureHubRouteTable(db);
  } catch {
    return [];
  }

  try {
    const rows = await db
      .prepare(
        `SELECT hub_server_name, account_id, downstream_server_name, downstream_tool_name, success, duration_ms, error_message, correlation_id, request_id, metadata_json, created_at
         FROM mcp_hub_routes
         WHERE correlation_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(correlationId, limit)
      .all<{
        hub_server_name: string;
        account_id: string;
        downstream_server_name: string;
        downstream_tool_name: string;
        success: number;
        duration_ms: number | null;
        error_message: string | null;
        correlation_id: string | null;
        request_id: string | null;
        metadata_json: string | null;
        created_at: string;
      }>();

    return rows.results;
  } catch {
    return [];
  }
}

function formatTraceLookupResult(
  correlationId: string,
  rows: Array<{
    server_name: string;
    account_id: string;
    tool_name: string;
    success: number;
    duration_ms: number | null;
    error_message: string | null;
    correlation_id: string | null;
    request_id: string | null;
    metadata_json: string | null;
    created_at: string;
  }>,
  routeRows: Array<{
    hub_server_name: string;
    account_id: string;
    downstream_server_name: string;
    downstream_tool_name: string;
    success: number;
    duration_ms: number | null;
    error_message: string | null;
    correlation_id: string | null;
    request_id: string | null;
    metadata_json: string | null;
    created_at: string;
  }>,
): Record<string, unknown> {
  const invocations = rows.map((row) => ({
    server: row.server_name,
    accountId: row.account_id,
    tool: row.tool_name,
    success: row.success === 1,
    durationMs: row.duration_ms,
    error: row.error_message,
    correlationId: row.correlation_id,
    requestId: row.request_id,
    metadata: parseMetadataJson(row.metadata_json),
    timestamp: row.created_at,
    where: row.server_name === HUB_NAME ? 'hub' : 'downstream',
  }));

  const routedDownstreamInvocations = routeRows.map((row) => ({
    hub: row.hub_server_name,
    server: row.downstream_server_name,
    accountId: row.account_id,
    tool: row.downstream_tool_name,
    success: row.success === 1,
    durationMs: row.duration_ms,
    error: row.error_message,
    correlationId: row.correlation_id,
    requestId: row.request_id,
    metadata: parseMetadataJson(row.metadata_json),
    timestamp: row.created_at,
    where: 'hub-route',
  }));

  return {
    correlationId,
    count: invocations.length,
    hubInvocations: invocations.filter((entry) => entry.where === 'hub'),
    downstreamInvocations: invocations.filter((entry) => entry.where !== 'hub'),
    routedDownstreamInvocations,
    invocations,
  };
}

function parseMetadataJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function safeJsonStringify(value: Record<string, unknown> | undefined): string | null {
  if (!value || Object.keys(value).length === 0) {
    return null;
  }
  try {
    const serialized = JSON.stringify(value);
    return serialized.length > 4000 ? `${serialized.slice(0, 3997)}...` : serialized;
  } catch {
    return null;
  }
}

function isMissingColumnError(message: string, column: string): boolean {
  return message.includes(`no such column: ${column}`) || message.includes(`no column named ${column}`);
}

async function readHubState(env: Env, currentRegistry: McpBundleRegistry): Promise<HubState> {
  const fromKv = await readHubStateFromKv(env);
  if (fromKv) {
    return fromKv;
  }
  return readStateFromEnv(env, currentRegistry);
}

async function readHubStateFromKv(env: Env): Promise<HubState | null> {
  const kv = env.HUB_STATE_KV;
  if (!kv) return null;

  const raw = await kv.get(HUB_STATE_KV_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      enabledBundles: parseStateStringArray(parsed.enabledBundles),
      enabledServers: parseStateStringArray(parsed.enabledServers),
      disabledServers: parseStateStringArray(parsed.disabledServers),
    };
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] failed to parse HUB_STATE_KV payload; falling back to env/defaults: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

async function writeHubState(env: Env, state: HubState): Promise<Record<string, unknown>> {
  const kv = env.HUB_STATE_KV;
  if (!kv) {
    throw new Error('HUB_STATE_KV binding is not configured on this hub deployment.');
  }

  await kv.put(HUB_STATE_KV_KEY, JSON.stringify(state));
  return {
    persisted: true,
    key: HUB_STATE_KV_KEY,
    storage: 'kv',
  };
}

function readStateFromEnv(env: Env, currentRegistry: McpBundleRegistry): HubState {
  const defaults = currentRegistry.defaults ?? {};

  const enabledBundles =
    parseList(readEnvString(env, 'HUB_ENABLED_BUNDLES')) ??
    uniqueSortedStrings(defaults.enabledBundles ?? []);

  const enabledServers =
    parseList(readEnvString(env, 'HUB_ENABLED_SERVERS')) ??
    uniqueSortedStrings(defaults.enabledServers ?? []);

  const disabledServers =
    parseList(readEnvString(env, 'HUB_DISABLED_SERVERS')) ??
    uniqueSortedStrings(defaults.disabledServers ?? []);

  return {
    enabledBundles,
    enabledServers,
    disabledServers,
  };
}

function updateState(
  currentRegistry: McpBundleRegistry,
  current: HubState,
  patch: {
    enableBundles?: string[];
    disableBundles?: string[];
    enableServers?: string[];
    disableServers?: string[];
  },
): HubState {
  const baseline = resolveState(currentRegistry, current).state;

  const enabledBundles = new Set<string>(baseline.enabledBundles);
  const enabledServers = new Set<string>(baseline.enabledServers);
  const disabledServers = new Set<string>(baseline.disabledServers);

  for (const bundle of patch.enableBundles ?? []) {
    enabledBundles.add(bundle);
  }
  for (const bundle of patch.disableBundles ?? []) {
    enabledBundles.delete(bundle);
  }

  for (const server of patch.enableServers ?? []) {
    enabledServers.add(server);
    disabledServers.delete(server);
  }
  for (const server of patch.disableServers ?? []) {
    enabledServers.delete(server);
    disabledServers.add(server);
  }

  return {
    enabledBundles: [...enabledBundles].sort(),
    enabledServers: [...enabledServers].sort(),
    disabledServers: [...disabledServers].sort(),
  };
}

function resolveState(currentRegistry: McpBundleRegistry, state: HubState): StateResolution {
  const warnings: string[] = [];

  const resolved: HubState = {
    enabledBundles: uniqueSortedStrings(state.enabledBundles),
    enabledServers: uniqueSortedStrings(state.enabledServers),
    disabledServers: uniqueSortedStrings(state.disabledServers),
  };

  const enabledServerNames = new Set<string>();

  for (const bundleName of resolved.enabledBundles) {
    const bundleServers = currentRegistry.bundles[bundleName];
    if (!bundleServers) {
      warnings.push(`Unknown bundle "${bundleName}" in hub state`);
      continue;
    }

    for (const serverName of bundleServers) {
      if (!currentRegistry.servers[serverName]) {
        warnings.push(`Bundle "${bundleName}" references unknown server "${serverName}"`);
        continue;
      }
      enabledServerNames.add(serverName);
    }
  }

  for (const serverName of resolved.enabledServers) {
    if (!currentRegistry.servers[serverName]) {
      warnings.push(`Unknown enabled server "${serverName}" in hub state`);
      continue;
    }
    enabledServerNames.add(serverName);
  }

  for (const serverName of resolved.disabledServers) {
    if (!currentRegistry.servers[serverName]) {
      warnings.push(`Unknown disabled server "${serverName}" in hub state`);
      continue;
    }
    enabledServerNames.delete(serverName);
  }

  return {
    state: resolved,
    enabledServerNames: [...enabledServerNames].sort(),
    warnings,
  };
}

function buildRuntimeCacheKey(env: Env, state: HubState): string {
  const cacheBust = readEnvString(env, 'HUB_CACHE_BUST') ?? '';
  return JSON.stringify({
    enabledBundles: state.enabledBundles,
    enabledServers: state.enabledServers,
    disabledServers: state.disabledServers,
    cacheBust,
  });
}

function parseList(raw: string | undefined): string[] | null {
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')) {
        return uniqueSortedStrings(parsed);
      }
      return [];
    } catch {
      return [];
    }
  }

  return uniqueSortedStrings(trimmed.split(',').map((part) => part.trim()).filter(Boolean));
}

function parseStateStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueSortedStrings(
    value
      .filter((entry) => typeof entry === 'string')
      .map((entry) => String(entry).trim())
      .filter(Boolean),
  );
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parsePositiveIntFromUnknown(raw: unknown, fallback: number): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
  }
  if (typeof raw === 'string') {
    return parsePositiveInt(raw, fallback);
  }
  return fallback;
}

async function closeHubRuntime(runtime: HubRuntime): Promise<void> {
  await Promise.all(
    runtime.connected.map(async (server) => {
      try {
        await server.client.close();
      } catch {
        // Best-effort shutdown.
      }
    }),
  );
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function readEnvString(env: Env, key: string): string | undefined {
  const value = env[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
