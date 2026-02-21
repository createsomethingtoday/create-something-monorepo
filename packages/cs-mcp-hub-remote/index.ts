import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';

import registryJson from '../../config/mcp-hub/registry.json';

type StringMap = Record<string, string>;

type HttpServerConfig = {
  transport: 'http';
  url: string;
  http_headers?: StringMap;
  env_http_headers?: StringMap;
  bearer_token_env_var?: string;
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

type InvocationTrace = {
  requestId: string;
  correlationId: string;
  transportRequestId: string;
};

type HubInvocationLog = {
  accountId: string;
  toolName: string;
  success: boolean;
  durationMs: number;
  errorMessage?: string | null;
  trace: InvocationTrace;
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
  HUB_API_TOKEN?: string;
  HUB_ENABLED_BUNDLES?: string;
  HUB_ENABLED_SERVERS?: string;
  HUB_DISABLED_SERVERS?: string;
  HUB_REFRESH_SECONDS?: string;
  HUB_CACHE_BUST?: string;
  HUB_ACCOUNT_ID?: string;
  HUB_STATE_KV?: KVNamespace;
  TELEMETRY_DB?: D1Database;
  [key: string]: unknown;
}

const HUB_NAME = 'create-something-hub-remote';
const HUB_VERSION = '1.0.0';
const DEFAULT_REFRESH_SECONDS = 300;
const HUB_STATE_KV_KEY = 'hub_state_v1';

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
        const runtime = await getHubRuntime(env);
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
            downstream_auth_config: {
              has_cs_telemetry_operator_token: Boolean(
                readEnvString(env, 'CS_TELEMETRY_OPERATOR_API_TOKEN'),
              ),
              has_halfdozen_telemetry_operator_token: Boolean(
                readEnvString(env, 'HALFDOZEN_TELEMETRY_OPERATOR_API_TOKEN'),
              ),
            },
            enabled_servers: runtime.stateResolution.enabledServerNames,
            connected_servers: runtime.connected.map((server) => ({
              name: server.name,
              tool_count: server.tools.length,
            })),
            failed_servers: runtime.failed,
            proxy_tool_count: runtime.proxies.toolDefinitions.length,
            warnings: runtime.stateResolution.warnings.concat(runtime.proxies.warnings),
            built_at: new Date(runtime.builtAt).toISOString(),
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
    return pendingRuntimeLoad.promise;
  }

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

  for (const serverName of stateResolution.enabledServerNames) {
    const config = registry.servers[serverName];
    if (!config) {
      failed.push({ name: serverName, error: `Server "${serverName}" not found in registry` });
      continue;
    }

    if (config.transport !== 'http') {
      warnings.push(`Skipping "${serverName}": remote hub only supports HTTP downstream servers`);
      continue;
    }

    const result = await connectSingleDownstream(serverName, config, env);
    if ('client' in result) {
      connected.push(result);
    } else {
      failed.push(result);
    }
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
    const headers = resolveHttpHeaders(name, config, env);
    if (Object.keys(headers).length > 0) {
      requestInit.headers = headers;
    }

    const transport = new StreamableHTTPClientTransport(new URL(config.url), { requestInit });
    await client.connect(transport);

    const tools = await listAllTools(client);
    return { name, config, baseHeaders: headers, client, tools };
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
  const client = new Client({
    name: `${HUB_NAME}:${server.name}:proxy`,
    version: HUB_VERSION,
  });

  const headers: Record<string, string> = {
    ...server.baseHeaders,
    'x-correlation-id': trace.correlationId,
    'x-request-id': trace.requestId,
    'x-hub-server': HUB_NAME,
    'x-hub-downstream-server': server.name,
    'x-hub-downstream-tool': toolName,
    'x-mcp-account-id': accountId,
    'x-hub-account-id': accountId,
  };

  const transport = new StreamableHTTPClientTransport(new URL(server.config.url), {
    requestInit: {
      headers,
    },
  });

  await client.connect(transport);
  try {
    return await client.callTool({
      name: toolName,
      arguments: args,
      _meta: {
        progressToken: trace.requestId,
        'io.modelcontextprotocol/related-task': {
          taskId: trace.correlationId,
        },
      },
    });
  } finally {
    try {
      await client.close();
    } catch {
      // Best-effort cleanup.
    }
  }
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
    const accountId = resolveAccountId(extra, env);
    const startedAt = Date.now();
    let route: ProxyRoute | null = null;

    try {
      if (toolName === 'hub_status') {
        const result = toJsonResult(buildStatusPayload(runtime));
        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
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
          metadata: {
            type: 'management',
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
          metadata: {
            type: 'management',
            refreshed: true,
          },
        });
        return result;
      }

      if (toolName === 'hub_update_state') {
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
          note: 'State persisted remotely. Proxy tool list refreshed from live downstream connections.',
        });

        await recordHubInvocation(env, {
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
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
          metadata: {
            type: 'management',
            correlationId,
            limit,
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
          metadata: {
            type: 'unknown-tool',
          },
        });
        return errorResult;
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
          metadata: {
            type: 'proxy',
            downstreamServer: route.serverName,
            downstreamTool: route.downstreamToolName,
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
        metadata: {
          type: route ? 'proxy' : 'management',
          downstreamServer: route?.serverName ?? null,
          downstreamTool: route?.downstreamToolName ?? null,
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

function resolveAccountId(extra: unknown, env: Env): string {
  const extraRecord = asRecord(extra);
  const authInfo = asRecord(extraRecord?.authInfo);
  const authorization = getHeaderValue(extraRecord?.requestInfo, 'authorization');
  const fromHeader =
    getHeaderValue(extraRecord?.requestInfo, 'x-mcp-account-id') ??
    getHeaderValue(extraRecord?.requestInfo, 'x-account-id') ??
    getHeaderValue(extraRecord?.requestInfo, 'x-tenant-id') ??
    getHeaderValue(extraRecord?.requestInfo, 'x-hub-account-id');
  const fromBearer = authorization ? parseBearerToken(authorization) : null;
  const fromAuth =
    normalizeTraceValue(authInfo?.accountId) ??
    normalizeTraceValue(authInfo?.tenantId) ??
    normalizeTraceValue(authInfo?.clientId) ??
    normalizeTraceValue(authInfo?.sub);
  return fromHeader ?? fromBearer ?? fromAuth ?? readEnvString(env, 'HUB_ACCOUNT_ID') ?? 'operator';
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

async function recordHubInvocation(env: Env, log: HubInvocationLog): Promise<void> {
  const db = env.TELEMETRY_DB;
  if (!db) return;

  const accountId = (log.accountId || 'operator').slice(0, 256);
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
