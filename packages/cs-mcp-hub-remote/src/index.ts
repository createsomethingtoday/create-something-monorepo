import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';

import registryJson from '../../../config/mcp-hub/registry.json';
import policyJson from '../../../config/mcp-hub/policy.json';
import {
  AuthError,
  authModeLabel,
  authorizeHttpRequest,
  resolveAuthContextFromExtra,
  type AuthContext,
} from './auth';
import {
  describeCatalog,
  getCatalogLastRefreshAt,
  getCatalogTool,
  refreshCatalog,
  searchCatalog,
  toToolRef,
  type CatalogConnectedServer,
  type CatalogRefreshResult,
  type HubToolCatalogRow,
} from './catalog';
import { executeWithRetry } from './invoke';
import {
  evaluateAuthorization,
  normalizeCapabilityClass,
  normalizeRiskTier,
  resolveRetryProfile,
  type CapabilityClass,
  type HubPolicyConfig,
  type PolicyEnv,
  type ToolPolicyMetadata,
} from './policy';
import { buildInvocationMetadata, buildLegacyDeprecationMetadata } from './telemetry';
import { MANAGEMENT_TOOLS } from './tools';

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
  capabilityClass?: CapabilityClass;
  riskTier?: 'low' | 'medium' | 'high';
  retryProfile?: string;
  requiredScopes?: string[];
};

type StdioServerConfig = {
  transport: 'stdio';
  command: string;
  args?: string[];
  env?: StringMap;
  cwd?: string;
  description?: string;
  tags?: string[];
  capabilityClass?: CapabilityClass;
  riskTier?: 'low' | 'medium' | 'high';
  retryProfile?: string;
  requiredScopes?: string[];
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
  toolRef: string;
  capabilityClass: CapabilityClass;
  riskTier: 'low' | 'medium' | 'high';
  retryProfile?: string;
  requiredScopes: string[];
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
  catalogRefresh: CatalogRefreshResult | null;
  legacyProxyEnabled: boolean;
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
  HUB_AUTH_REQUIRED?: string;
  HUB_AUTH_JWKS_URL?: string;
  HUB_AUTH_ISSUER?: string;
  HUB_AUTH_AUDIENCE?: string;
  HUB_AUTH_CLOCK_SKEW_SECONDS?: string;
  HUB_ALLOW_STATIC_OPERATOR_TOKEN?: string;
  HUB_ENABLED_BUNDLES?: string;
  HUB_ENABLED_SERVERS?: string;
  HUB_DISABLED_SERVERS?: string;
  HUB_REFRESH_SECONDS?: string;
  HUB_CACHE_BUST?: string;
  HUB_ACCOUNT_ID?: string;
  HUB_ENABLE_LEGACY_PROXY_TOOLS?: string;
  HUB_BROKER_DEFAULT_LIMIT?: string;
  HUB_RETRY_PROFILE_DEFAULT?: string;
  HUB_CATALOG_TTL_SECONDS?: string;
  HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW?: string;
  HUB_RATE_LIMIT_WINDOW_SECONDS?: string;
  HUB_RATE_LIMIT_SCOPE?: string;
  HUB_RATE_LIMIT_EXEMPT_SERVERS?: string;
  HUB_QUOTA_MAX_PROXY_CALLS_PER_PERIOD?: string;
  HUB_QUOTA_EXEMPT_SERVERS?: string;
  HUB_STATE_KV?: KVNamespace;
  TELEMETRY_DB?: D1Database;
  HUB_CONTROL_DB?: D1Database;
  [key: string]: unknown;
}

const HUB_NAME = 'create-something-hub-remote';
const HUB_VERSION = '1.0.0';
const DEFAULT_REFRESH_SECONDS = 300;
const HUB_STATE_KV_KEY = 'hub_state_v1';

const registry = registryJson as unknown as McpBundleRegistry;
const hubPolicyConfig = policyJson as HubPolicyConfig;

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

const rateLimitBuckets = new Map<string, { windowStartMs: number; count: number; lastSeenMs: number }>();
let rateLimitSweepCounter = 0;
const HUB_PROXY_PERIOD_COUNTER_SERVER = `${HUB_NAME}:proxy`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authFailure = await authorizeRequest(request, env);
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
            auth_required: authModeLabel(env) !== 'disabled',
            auth_mode: authModeLabel(env),
            state_storage: env.HUB_STATE_KV ? 'kv' : 'env-only',
            policy: buildPolicyStatusPayload(
              rateLimitPolicy,
              quotaPolicy,
              env,
              runtime.catalogRefresh?.finishedAt ?? null,
            ),
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

async function authorizeRequest(request: Request, env: Env): Promise<Response | null> {
  try {
    await authorizeHttpRequest(request, env);
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
}

async function getHubRuntime(env: Env, options: { force?: boolean } = {}): Promise<HubRuntime> {
  const persistedState = await readHubState(env, registry);
  const resolution = resolveState(registry, persistedState);
  const key = buildRuntimeCacheKey(env, resolution.state);
  const ttlSeconds =
    parsePositiveInt(readEnvString(env, 'HUB_CATALOG_TTL_SECONDS'), 0) ||
    parsePositiveInt(readEnvString(env, 'HUB_REFRESH_SECONDS'), DEFAULT_REFRESH_SECONDS);
  const ttlMs = ttlSeconds * 1000;

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

  const legacyProxyEnabled = isLegacyProxyEnabled(env);
  const proxies = buildProxyCatalog(connected, legacyProxyEnabled);
  const catalogRefresh = await refreshCatalog(
    env,
    connected.map<CatalogConnectedServer>((server) => ({
      name: server.name,
      tools: server.tools,
    })),
    registry,
  );
  if (!catalogRefresh.success && catalogRefresh.error) {
    warnings.push(`Catalog refresh failed: ${catalogRefresh.error}`);
  }
  proxies.warnings.unshift(...warnings);

  return {
    builtAt: Date.now(),
    stateResolution,
    connected,
    failed,
    proxies,
    catalogRefresh,
    legacyProxyEnabled,
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

function buildProxyCatalog(connectedServers: ConnectedDownstream[], legacyEnabled: boolean): ProxyCatalog {
  const toolDefinitions: Tool[] = [];
  const routes = new Map<string, ProxyRoute>();
  const warnings: string[] = [];

  if (!legacyEnabled) {
    warnings.push('Legacy proxy tools are disabled; use hub_tools_search/hub_tools_describe/hub_tools_invoke.');
    return {
      toolDefinitions,
      routes,
      warnings,
    };
  }

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
        toolRef: toToolRef(server.name, tool.name),
        capabilityClass: normalizeCapabilityClass(server.config.capabilityClass),
        riskTier: normalizeRiskTier(server.config.riskTier),
        retryProfile: server.config.retryProfile,
        requiredScopes: uniqueSortedStrings(server.config.requiredScopes ?? []),
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
    const startedAt = Date.now();
    let route: ProxyRoute | null = null;
    let invocationPath: 'management' | 'legacy_proxy' | 'broker' = 'management';
    let outcomeSuccess = true;
    let outcomeErrorMessage: string | null = null;
    const fail = (message: string) => {
      outcomeSuccess = false;
      outcomeErrorMessage = message;
      return toErrorResult(message);
    };

    let authContext: AuthContext | null = null;
    try {
      authContext = await resolveAuthContextFromExtra(extra, env);
    } catch (error) {
      const message = error instanceof AuthError ? error.message : String(error);
      const status = error instanceof AuthError ? error.status : 500;
      return toErrorResult(`[${status}] ${message}`);
    }

    if (authContext === null && authModeLabel(env) === 'disabled') {
      const now = Math.floor(Date.now() / 1000);
      const fallbackAccountId = resolveAccountId(extra, env);
      authContext = {
        accountId: fallbackAccountId,
        tenantId: fallbackAccountId,
        subject: 'operator',
        scopes: ['*'],
        issuer: 'auth-disabled',
        audience: HUB_NAME,
        issuedAt: now,
        expiresAt: now + 3600,
        mode: 'static-operator' as const,
      };
    }

    const accountId = authContext?.accountId ?? resolveAccountId(extra, env);

    try {
      if (toolName === 'hub_status') {
        return toJsonResult({
          ...buildStatusPayload(runtime),
          policy: buildPolicyStatusPayload(
            rateLimitPolicy,
            quotaPolicy,
            env,
            runtime.catalogRefresh?.finishedAt ?? null,
          ),
        });
      }

      if (toolName === 'hub_list_registry') {
        return toJsonResult(buildRegistryPayload(registry));
      }

      if (toolName === 'hub_list_proxy_tools') {
        return toJsonResult({
          deprecated: true,
          proxyTools: runtime.proxies.toolDefinitions.map((tool) => tool.name),
          count: runtime.proxies.toolDefinitions.length,
        });
      }

      if (toolName === 'hub_search_proxy_tools') {
        return toJsonResult({
          deprecated: true,
          ...searchProxyTools(runtime.proxies, args),
        });
      }

      if (toolName === 'hub_tools_search') {
        const input = {
          query: stringArg(args.query),
          serverName: stringArg(args.serverName),
          tags: stringArrayArg(args.tags, 'tags'),
          readWrite: parseOptionalCapabilityClass(stringArg(args.readWrite)),
          riskTier: parseOptionalRiskTier(stringArg(args.riskTier)),
          cursor: stringArg(args.cursor),
          limit: typeof args.limit === 'number' ? args.limit : null,
        };
        const payload =
          (await searchCatalog(env, input)) ??
          searchBrokerFallback(runtime, input, numberArg(args.limit, 25, 1, 100));
        return toJsonResult(payload);
      }

      if (toolName === 'hub_tools_describe') {
        const toolRefs = stringArrayArg(args.toolRefs, 'toolRefs');
        const payload = (await describeCatalog(env, toolRefs)) ?? describeBrokerFallback(runtime, toolRefs);
        return toJsonResult(payload);
      }

      if (toolName === 'hub_tools_invoke') {
        invocationPath = 'broker';
        const toolRef = stringArg(args.toolRef) ?? '';
        if (!toolRef) {
          return fail('"toolRef" is required');
        }
        route = findRouteByToolRef(runtime, toolRef);
        if (!route) {
          return fail(`Unknown toolRef "${toolRef}"`);
        }

        const catalogTool = await getCatalogTool(env, toolRef);
        const metadata = resolveToolPolicyMetadata(route, catalogTool);
        const authz = evaluateAuthorization(authContext, metadata, hubPolicyConfig);
        if (!authz.allowed) {
          return fail(`[403] Authorization denied (${authz.reason}) for ${toolRef}`);
        }

        const rateLimitDecision = applyRateLimit(rateLimitPolicy, accountId, route);
        if (!rateLimitDecision.allowed) {
          return fail(
            `Rate limit exceeded (${rateLimitDecision.maxCalls} calls per ${rateLimitDecision.windowSeconds}s, scope=${rateLimitDecision.scope}). Retry after ${rateLimitDecision.resetAt}.`,
          );
        }

        const quotaDecision = await applyQuotaPolicy(env, quotaPolicy, accountId, route);
        if (!quotaDecision.allowed) {
          return fail(
            `Quota exceeded (${quotaDecision.maxCallsPerPeriod} proxy calls per period=${quotaDecision.period}). Remaining ${quotaDecision.remaining}.`,
          );
        }

        const idempotencyKey = stringArg(args.idempotencyKey);
        if ((metadata.capabilityClass === 'write' || metadata.capabilityClass === 'mixed') && !idempotencyKey) {
          return fail('[400] idempotencyKey is required for write/mixed broker invocations');
        }

        const retryProfile = resolveRetryProfile(env as PolicyEnv, hubPolicyConfig, metadata.retryProfile);
        const callArgs = isRecord(args.args) ? args.args : {};
        const execution = await executeWithRetry({
          call: async () => route!.call(callArgs, trace, accountId),
          retryProfile,
          capabilityClass: metadata.capabilityClass,
          idempotencyKey: idempotencyKey ?? undefined,
          path: 'broker',
        });
        await recordHubRouteInvocation(env, {
          accountId,
          downstreamServer: metadata.serverName,
          downstreamTool: metadata.toolName,
          success: !resultIsError(execution.result),
          durationMs: Date.now() - startedAt,
          trace,
          errorMessage: resultIsError(execution.result) ? 'Downstream MCP returned isError response' : null,
          metadata: {
            proxyToolName: route.proxyToolName,
            toolRef,
            path: 'broker',
            attempts: execution.attempts,
            retried: execution.retried,
            retryProfile: retryProfile.name,
          },
        });
        if (resultIsError(execution.result)) {
          outcomeSuccess = false;
          outcomeErrorMessage = 'Downstream MCP returned isError response';
        }
        return execution.result;
      }

      if (toolName === 'hub_refresh_connections') {
        const refreshed = await getHubRuntime(env, { force: true });
        return toJsonResult(buildStatusPayload(refreshed));
      }

      if (toolName === 'hub_refresh_catalog') {
        const serverNames = stringArrayArg(args.serverNames, 'serverNames');
        const payload = await refreshCatalog(
          env,
          runtime.connected.map<CatalogConnectedServer>((connectedServer) => ({
            name: connectedServer.name,
            tools: connectedServer.tools,
          })),
          registry,
          serverNames.length > 0 ? serverNames : undefined,
        );
        return toJsonResult(payload);
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
        return result;
      }

      if (toolName === 'hub_trace_lookup') {
        const correlationId = stringArg(args.correlationId) ?? '';
        if (!correlationId) {
          return fail('"correlationId" is required');
        }
        const limit = numberArg(args.limit, 50, 1, 200);
        const lookup = await queryTraceByCorrelation(env, correlationId, limit);
        return toJsonResult(lookup);
      }

      if (toolName === 'hub_policy_status') {
        const lastCatalogRefreshAt = runtime.catalogRefresh?.finishedAt ?? await getCatalogLastRefreshAt(env);
        return toJsonResult(buildPolicyStatusPayload(rateLimitPolicy, quotaPolicy, env, lastCatalogRefreshAt));
      }

      route = runtime.proxies.routes.get(toolName) ?? null;
      if (!route) {
        return fail(`Unknown tool "${toolName}"`);
      }
      invocationPath = 'legacy_proxy';

      const metadata = resolveToolPolicyMetadata(route);
      const authz = evaluateAuthorization(authContext, metadata, hubPolicyConfig);
      if (!authz.allowed) {
        return fail(`[403] Authorization denied (${authz.reason}) for ${route.toolRef}`);
      }

      const rateLimitDecision = applyRateLimit(rateLimitPolicy, accountId, route);
      if (!rateLimitDecision.allowed) {
        return fail(
          `Rate limit exceeded (${rateLimitDecision.maxCalls} calls per ${rateLimitDecision.windowSeconds}s, scope=${rateLimitDecision.scope}). Retry after ${rateLimitDecision.resetAt}.`,
        );
      }

      const quotaDecision = await applyQuotaPolicy(env, quotaPolicy, accountId, route);
      if (!quotaDecision.allowed) {
        return fail(
          `Quota exceeded (${quotaDecision.maxCallsPerPeriod} proxy calls per period=${quotaDecision.period}). Remaining ${quotaDecision.remaining}.`,
        );
      }

      const retryProfile = resolveRetryProfile(env as PolicyEnv, hubPolicyConfig, metadata.retryProfile);
      const execution = await executeWithRetry({
        call: async () => route!.call(args, trace, accountId),
        retryProfile,
        capabilityClass: metadata.capabilityClass,
        path: 'legacy_proxy',
      });
      await recordHubRouteInvocation(env, {
        accountId,
        downstreamServer: route.serverName,
        downstreamTool: route.downstreamToolName,
        success: !resultIsError(execution.result),
        durationMs: Date.now() - startedAt,
        trace,
        errorMessage: resultIsError(execution.result) ? 'Downstream MCP returned isError response' : null,
        metadata: {
          proxyToolName: toolName,
          toolRef: route.toolRef,
          path: 'legacy_proxy',
          attempts: execution.attempts,
          retried: execution.retried,
          retryProfile: retryProfile.name,
        },
      });
      if (resultIsError(execution.result)) {
        outcomeSuccess = false;
        outcomeErrorMessage = 'Downstream MCP returned isError response';
      }
      return appendLegacyDeprecationMetadata(execution.result, route);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outcomeSuccess = false;
      outcomeErrorMessage = message;
      const durationMs = Date.now() - startedAt;
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
            toolRef: route.toolRef,
          },
        });
      }
      return toErrorResult(`Tool "${toolName}" failed: ${message}`);
    } finally {
      const durationMs = Date.now() - startedAt;
      await recordHubInvocation(env, {
        accountId,
        toolName,
        success: outcomeSuccess,
        durationMs,
        trace,
        errorMessage: outcomeErrorMessage,
        metadata: {
          ...buildInvocationMetadata({
            path: invocationPath,
            accountId,
            toolName,
            downstreamServer: route?.serverName ?? undefined,
            downstreamTool: route?.downstreamToolName ?? undefined,
            toolRef: route?.toolRef,
            deprecatedLegacyProxy: Boolean(route),
          }),
        },
      });
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
    legacyProxyToolsEnabled: runtime.legacyProxyEnabled,
    catalogRefresh: runtime.catalogRefresh,
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
  lastCatalogRefreshAt: string | null = null,
): Record<string, unknown> {
  const period = getCurrentPeriod();

  return {
    auth: {
      mode: authModeLabel(env),
      required: authModeLabel(env) !== 'disabled',
      allowStaticOperatorToken: parseBoolean(readEnvString(env, 'HUB_ALLOW_STATIC_OPERATOR_TOKEN'), false),
    },
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
    broker: {
      policyVersion: hubPolicyConfig.version,
      legacyProxyMode: isLegacyProxyEnabled(env) ? 'enabled' : 'disabled',
      defaultLimit: parsePositiveInt(readEnvString(env, 'HUB_BROKER_DEFAULT_LIMIT'), 25),
      defaultRetryProfile: readEnvString(env, 'HUB_RETRY_PROFILE_DEFAULT') ?? 'standard',
      lastCatalogRefreshAt,
      controlDbConfigured: Boolean(env.HUB_CONTROL_DB),
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

function isLegacyProxyEnabled(env: Env): boolean {
  return parseBoolean(readEnvString(env, 'HUB_ENABLE_LEGACY_PROXY_TOOLS'), true);
}

function searchBrokerFallback(
  runtime: HubRuntime,
  input: {
    query: string | null;
    serverName: string | null;
    tags: string[];
    readWrite: CapabilityClass | null;
    riskTier: 'low' | 'medium' | 'high' | null;
    cursor: string | null;
  },
  limit: number,
): Record<string, unknown> {
  const allRows: HubToolCatalogRow[] = [];
  for (const route of runtime.proxies.routes.values()) {
    allRows.push({
      toolRef: route.toolRef,
      serverName: route.serverName,
      downstreamToolName: route.downstreamToolName,
      description: '',
      inputSchema: { type: 'object', properties: {} },
      tags: [],
      capabilityClass: route.capabilityClass,
      riskTier: route.riskTier,
      retryProfile: route.retryProfile ?? null,
      requiredScopes: route.requiredScopes,
      discoveredAt: new Date(runtime.builtAt).toISOString(),
      updatedAt: new Date(runtime.builtAt).toISOString(),
      enabled: true,
    });
  }

  const q = input.query?.toLowerCase() ?? null;
  const filtered = allRows
    .filter((row) => {
      if (input.serverName && row.serverName !== input.serverName) return false;
      if (input.readWrite && row.capabilityClass !== input.readWrite) return false;
      if (input.riskTier && row.riskTier !== input.riskTier) return false;
      if (input.tags.length > 0 && !input.tags.every((tag) => row.tags.includes(tag))) return false;
      if (!q) return true;
      return (
        row.toolRef.toLowerCase().includes(q) ||
        row.serverName.toLowerCase().includes(q) ||
        row.downstreamToolName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.toolRef.localeCompare(b.toolRef));

  const offset = safeOffset(input.cursor ?? '0');
  const page = filtered.slice(offset, offset + limit);
  const nextCursor = offset + page.length < filtered.length ? String(offset + page.length) : null;

  return {
    query: input.query,
    serverName: input.serverName,
    tags: input.tags,
    readWrite: input.readWrite,
    riskTier: input.riskTier,
    total: filtered.length,
    limit,
    cursor: input.cursor ?? '0',
    nextCursor,
    tools: page,
    source: 'runtime-fallback',
  };
}

function describeBrokerFallback(runtime: HubRuntime, toolRefs: string[]): Record<string, unknown> {
  const found: HubToolCatalogRow[] = [];
  const missingToolRefs: string[] = [];

  for (const toolRef of toolRefs) {
    const route = findRouteByToolRef(runtime, toolRef);
    if (!route) {
      missingToolRefs.push(toolRef);
      continue;
    }

    found.push({
      toolRef: route.toolRef,
      serverName: route.serverName,
      downstreamToolName: route.downstreamToolName,
      description: '',
      inputSchema: { type: 'object', properties: {} },
      tags: [],
      capabilityClass: route.capabilityClass,
      riskTier: route.riskTier,
      retryProfile: route.retryProfile ?? null,
      requiredScopes: route.requiredScopes,
      discoveredAt: new Date(runtime.builtAt).toISOString(),
      updatedAt: new Date(runtime.builtAt).toISOString(),
      enabled: true,
    });
  }

  return {
    tools: found,
    missingToolRefs,
    source: 'runtime-fallback',
  };
}

function findRouteByToolRef(runtime: HubRuntime, toolRef: string): ProxyRoute | null {
  for (const route of runtime.proxies.routes.values()) {
    if (route.toolRef === toolRef) {
      return route;
    }
  }
  return null;
}

function resolveToolPolicyMetadata(route: ProxyRoute, catalogTool?: HubToolCatalogRow | null): ToolPolicyMetadata {
  return {
    serverName: route.serverName,
    toolName: route.downstreamToolName,
    requiredScopes: catalogTool?.requiredScopes ?? route.requiredScopes,
    capabilityClass: catalogTool?.capabilityClass ?? route.capabilityClass,
    riskTier: catalogTool?.riskTier ?? route.riskTier,
    retryProfile: catalogTool?.retryProfile ?? route.retryProfile,
  };
}

function appendLegacyDeprecationMetadata(result: unknown, route: ProxyRoute): unknown {
  if (!isRecord(result)) {
    return result;
  }

  const deprecation = buildLegacyDeprecationMetadata(route.serverName, route.downstreamToolName);
  const next = { ...result };
  const existingStructured = isRecord(next.structuredContent) ? next.structuredContent : {};
  next.structuredContent = {
    ...existingStructured,
    legacyProxyDeprecation: deprecation,
  };
  return next;
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
  const fromAuth =
    normalizeTraceValue(authInfo?.accountId) ??
    normalizeTraceValue(authInfo?.tenantId) ??
    normalizeTraceValue(authInfo?.clientId) ??
    normalizeTraceValue(authInfo?.sub);
  return fromAuth ?? readEnvString(env, 'HUB_ACCOUNT_ID') ?? 'operator';
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
    legacyProxyEnabled: isLegacyProxyEnabled(env),
    catalogTtlSeconds: parsePositiveInt(readEnvString(env, 'HUB_CATALOG_TTL_SECONDS'), 300),
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

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function safeOffset(cursor: string): number {
  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function parseOptionalCapabilityClass(value: string | null): CapabilityClass | null {
  if (value === null) return null;
  if (value === 'read' || value === 'write' || value === 'mixed') {
    return value;
  }
  return null;
}

function parseOptionalRiskTier(value: string | null): 'low' | 'medium' | 'high' | null {
  if (value === null) return null;
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return null;
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
