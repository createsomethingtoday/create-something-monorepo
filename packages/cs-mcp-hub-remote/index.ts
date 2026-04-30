import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  buildOAuthAuthorizationServerMetadata,
  buildOAuthProtectedResourceMetadata,
  isOAuthAuthorizationServerPath,
  isOAuthProtectedResourcePath,
} from '../mcp-core/src/oauth-discovery.js';
import {
  buildHubAuthorizationRequest,
  blockedByPolicy,
  classifyHubRoute,
  evaluateAuthorizationRequest,
  getAuthzRollout,
  getPolicyManifest,
  recordAuthzDecisionEvent,
  requiresHumanReview,
  type AuthzDecisionEventRecord,
  type AuthzRolloutRow,
} from '@create-something/mcp-authz';

import discoveryPacksJson from '../../config/mcp-hub/discovery-packs.json';
import intentRoutesJson from '../../config/mcp-hub/intent-routes.json';
import registryJson from '../../config/mcp-hub/registry.json';

type StringMap = Record<string, string>;

type HttpServerConfig = {
  transport: 'http';
  url: string;
  http_headers?: StringMap;
  env_http_headers?: StringMap;
  bearer_token_env_var?: string;
  connect_timeout_ms?: number;
  list_tools_timeout_ms?: number;
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

type BraintrustSpan = {
  log(payload: unknown): void;
};

type BraintrustLogger = {
  flush(): Promise<void>;
  traced(
    callback: (span: BraintrustSpan) => void | Promise<void>,
    options: { name: string; type: string },
  ): Promise<void>;
};

type BraintrustLoggerConfig = {
  apiKey: string;
  projectName: string;
  asyncFlush: boolean;
  setCurrent: boolean;
  projectId?: string;
};

type BraintrustModule = {
  flush(): Promise<void>;
  initLogger(config: BraintrustLoggerConfig): BraintrustLogger;
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
  toolCallTimeoutMs: number;
  client: Client;
  tools: Tool[];
};

type ProxyRoute = {
  proxyToolName: string;
  serverName: string;
  downstreamToolName: string;
  serverTags: string[];
  call: (args: Record<string, unknown>, trace: InvocationTrace, accountId: string) => Promise<any>;
};

type ProxyCatalog = {
  toolDefinitions: Tool[];
  routes: Map<string, ProxyRoute>;
  warnings: string[];
};

type VisibleProxyCatalog = {
  toolDefinitions: Tool[];
  routes: Map<string, ProxyRoute>;
  definitionByName: Map<string, Tool>;
};

type ProxyRouteDiscoveryFilters = {
  query?: string | null;
  serverName?: string | null;
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

type ProxyFailureDetails = {
  errorMessage: string;
  rawMessage: string;
  code: string | number | null;
  missingScopes: string[] | null;
  authRelated: boolean;
  nextStep: string | null;
  reconnectProxyTool: string | null;
  toolkitSlug: string | null;
};

type DiscoveryMode = 'compact' | 'full';

type DiscoveryPreferences = {
  mode: DiscoveryMode;
  activeServers: string[];
  maxProxyTools: number | null;
};

type DiscoveryPackDefinition = {
  description?: string;
  mode?: DiscoveryMode;
  activeServers?: string[];
  maxProxyTools?: number | null;
};

type DiscoveryPackRegistry = {
  version: 1;
  packs: Record<string, DiscoveryPackDefinition>;
};

type ResolvedDiscoveryPack = {
  id: string;
  description: string;
  preferences: DiscoveryPreferences;
};

type IntentRouteDefinition = {
  proxyToolName: string;
  description?: string;
  synonyms?: string[];
  preferredServer?: string;
  fallbackQuery?: string;
};

type IntentRouteRegistry = {
  version: 1;
  intents: Record<string, IntentRouteDefinition>;
};

type IntentRouteCandidate = {
  source: 'allowlist' | 'discovery' | 'none';
  intent: string;
  normalizedIntent: string;
  proxyToolName: string | null;
  serverName: string | null;
  downstreamToolName: string | null;
  description: string;
  reason: string;
  alternatives: Array<{
    proxyToolName: string;
    serverName: string;
    downstreamToolName: string;
    description: string;
  }>;
};

type HubResourceDefinition = {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
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
  bound_host?: string | null;
  auth_mode?: string | null;
  tool_mode?: string;
  allowed_tool_prefixes?: unknown;
  service_tier?: string | null;
  entitlement_snapshot?: Record<string, unknown> | null;
  reason?: string;
};

type ResolvedAccountContext = {
  accountId: string;
  tenantId: string | null;
  userId: string | null;
  sessionId: string | null;
  authMode: string | null;
  toolMode: string | null;
  allowedToolPrefixes: string[] | null;
  boundHost: string | null;
  resourceHost: string | null;
  serviceTier: string | null;
  entitlementSnapshot: Record<string, unknown> | null;
  identitySource: 'session' | 'fallback';
};

type HubIdentityMode = 'session_required' | 'compat';

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

type WaitUntilContext = Pick<ExecutionContext, 'waitUntil'>;

const DOWNSTREAM_BEARER_ENV_FALLBACK: Record<string, string> = {
  'cs-telemetry': 'CS_TELEMETRY_OPERATOR_API_TOKEN',
  'halfdozen-telemetry': 'HALFDOZEN_TELEMETRY_OPERATOR_API_TOKEN',
};

interface Env {
  HUB_INSTANCE_ID?: string;
  HUB_API_TOKEN?: string;
  OAUTH_ISSUER_URL?: string;
  HUB_IDENTITY_MODE?: string;
  HUB_SESSION_RESOLVE_URL?: string;
  HUB_SESSION_RESOLVE_TOKEN?: string;
  HUB_SESSION_RESOLVE_TIMEOUT_MS?: string;
  HUB_LEGACY_BRIDGE_ENABLED?: string;
  HUB_LEGACY_SUNSET_AT?: string;
  HUB_TOOL_CALL_TIMEOUT_MS?: string;
  HUB_LIST_TOOLS_TIMEOUT_MS?: string;
  HUB_CONNECT_CONCURRENCY?: string;
  HUB_ENABLED_BUNDLES?: string;
  HUB_ENABLED_SERVERS?: string;
  HUB_DISABLED_SERVERS?: string;
  HUB_REFRESH_SECONDS?: string;
  HUB_CACHE_BUST?: string;
  HUB_ACCOUNT_ID?: string;
  HUB_DISCOVERY_MODE?: string;
  HUB_DISCOVERY_DEFAULT_SERVERS?: string;
  HUB_DISCOVERY_MAX_PROXY_TOOLS?: string;
  HUB_DISCOVERY_SHARED_PACK?: string;
  HUB_DISCOVERY_PAGE_SIZE?: string;
  HUB_ALLOW_DIRECT_PROXY_TOOLS?: string;
  HUB_DIRECT_PROXY_ALLOWED_PREFIXES?: string;
  HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW?: string;
  HUB_RATE_LIMIT_WINDOW_SECONDS?: string;
  HUB_RATE_LIMIT_SCOPE?: string;
  HUB_RATE_LIMIT_EXEMPT_SERVERS?: string;
  HUB_QUOTA_MAX_PROXY_CALLS_PER_PERIOD?: string;
  HUB_QUOTA_EXEMPT_SERVERS?: string;
  OSO_URL?: string;
  OSO_API_KEY?: string;
  OSO_FETCH_TIMEOUT_MS?: string;
  OSO_BOOTSTRAP_POLICY?: string;
  ENGINE_FALLBACK_ENABLED?: string;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_NAME?: string;
  BRAINTRUST_PROJECT_ID?: string;
  BRAINTRUST_ENABLED?: string;
  HUB_STATE_KV?: KVNamespace;
  TELEMETRY_DB?: D1Database;
  IDENTITY_WORKER?: Fetcher;
  [key: string]: unknown;
}

const HUB_NAME = 'create-something-hub-remote';
const HUB_VERSION = '1.0.0';
export const HUB_OVERVIEW_RESOURCE_URI = 'ui://hub/overview';
export const HUB_AUTH_WORKFLOW_RESOURCE_URI = 'ui://hub/auth-workflow';
const DEFAULT_REFRESH_SECONDS = 300;
const HUB_STATE_KV_PREFIX = 'hub_state_v1';
const HUB_ROUTE_AUTHZ_POLICY_ID = 'policy.hub-route-authorization.v1';
const SERVICE_TIER_AUTHZ_POLICY_ID = 'policy.service-tier-entitlement.v1';

const registry = registryJson as unknown as McpBundleRegistry;
const discoveryPackRegistry = discoveryPacksJson as unknown as DiscoveryPackRegistry;
const intentRouteRegistry = intentRoutesJson as unknown as IntentRouteRegistry;

export const MANAGEMENT_TOOLS: Tool[] = [
  {
    name: 'hub_status',
    description: 'Show active downstream MCP servers, proxy tool count, and warning state.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    _meta: {
      ui: {
        resourceUri: HUB_OVERVIEW_RESOURCE_URI,
      },
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
    description: 'List proxy tool names currently visible to the calling account/session.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_search_proxy_tools',
    description:
      'Search visible proxy tools with optional server filter and cursor pagination. Use hub_list_services first and pass serverName whenever known for scalable brokered discovery, especially for auth flows like __connection_status and __get_connect_link.',
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
    _meta: {
      ui: {
        resourceUri: HUB_AUTH_WORKFLOW_RESOURCE_URI,
      },
    },
  },
  {
    name: 'hub_route_intent',
    description:
      'Route a business intent to a preferred proxy tool using allowlisted mappings with optional discovery fallback.',
    inputSchema: {
      type: 'object',
      properties: {
        intent: { type: 'string' },
        query: { type: 'string' },
        serverName: { type: 'string' },
        allowDiscoveryFallback: { type: 'boolean' },
        limit: { type: 'number' },
      },
      required: ['intent'],
      additionalProperties: false,
    },
  },
  {
    name: 'hub_describe_proxy_tool',
    description:
      'Describe a visible proxy tool (schema + downstream route metadata). Use after hub_search_proxy_tools when you need argument shape before hub_execute_proxy_tool.',
    inputSchema: {
      type: 'object',
      properties: {
        proxyToolName: { type: 'string' },
      },
      required: ['proxyToolName'],
      additionalProperties: false,
    },
    _meta: {
      ui: {
        resourceUri: HUB_AUTH_WORKFLOW_RESOURCE_URI,
      },
    },
  },
  {
    name: 'hub_get_proxy_tool',
    description: 'Compatibility alias for hub_describe_proxy_tool.',
    inputSchema: {
      type: 'object',
      properties: {
        proxyToolName: { type: 'string' },
      },
      required: ['proxyToolName'],
      additionalProperties: false,
    },
  },
  {
    name: 'hub_run_intent',
    description:
      'Route a business intent and execute the resolved proxy tool in one call (allowlist first, discovery fallback optional).',
    inputSchema: {
      type: 'object',
      properties: {
        intent: { type: 'string' },
        args: {
          type: 'object',
          additionalProperties: true,
        },
        query: { type: 'string' },
        serverName: { type: 'string' },
        allowDiscoveryFallback: { type: 'boolean' },
        limit: { type: 'number' },
      },
      required: ['intent'],
      additionalProperties: false,
    },
  },
  {
    name: 'hub_execute_proxy_tool',
    description:
      'Execute a visible proxy tool by name with provided args. This is the canonical way to run downstream tools when direct proxy tools are disabled, including auth and reconnect tools like __connection_status and __get_connect_link.',
    inputSchema: {
      type: 'object',
      properties: {
        proxyToolName: { type: 'string' },
        args: {
          type: 'object',
          additionalProperties: true,
        },
      },
      required: ['proxyToolName'],
      additionalProperties: false,
    },
    _meta: {
      ui: {
        resourceUri: HUB_AUTH_WORKFLOW_RESOURCE_URI,
      },
    },
  },
  {
    name: 'hub_run_proxy_tool',
    description: 'Compatibility alias for hub_execute_proxy_tool.',
    inputSchema: {
      type: 'object',
      properties: {
        proxyToolName: { type: 'string' },
        args: {
          type: 'object',
          additionalProperties: true,
        },
      },
      required: ['proxyToolName'],
      additionalProperties: false,
    },
  },
  {
    name: 'hub_list_services',
    description:
      'List connected downstream services and current discovery exposure settings. Use this first to pick a service, then call hub_search_proxy_tools with serverName.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    _meta: {
      ui: {
        resourceUri: HUB_OVERVIEW_RESOURCE_URI,
      },
    },
  },
  {
    name: 'hub_list_discovery_packs',
    description: 'List available discovery packs. Discovery packs are the standard managed discovery baseline for shared hubs and can be applied with hub_set_discovery.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_set_discovery',
    description:
      'Set tool discovery exposure. Prefer applying a named discovery pack first; raw activeServers/mode/maxProxyTools overrides are exception or debugging surfaces.',
    inputSchema: {
      type: 'object',
      properties: {
        pack: { type: 'string' },
        mode: { type: 'string', enum: ['compact', 'full'] },
        activeServers: { type: 'array', items: { type: 'string' } },
        maxProxyTools: { type: 'number' },
        reset: { type: 'boolean' },
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
        setBundles: { type: 'array', items: { type: 'string' } },
        setServers: { type: 'array', items: { type: 'string' } },
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
    _meta: {
      ui: {
        resourceUri: HUB_OVERVIEW_RESOURCE_URI,
      },
    },
  },
];

export const HUB_RESOURCES: HubResourceDefinition[] = [
  {
    uri: 'hub://status',
    name: 'Hub Status',
    description: 'Runtime status, connected downstream servers, warnings, and proxy tool coverage.',
    mimeType: 'application/json',
  },
  {
    uri: 'hub://registry',
    name: 'Hub Registry',
    description: 'Configured server registry and bundle definitions.',
    mimeType: 'application/json',
  },
  {
    uri: 'hub://policy',
    name: 'Hub Policy',
    description: 'Active rate-limit and quota policy settings for this hub runtime.',
    mimeType: 'application/json',
  },
  {
    uri: 'hub://connections',
    name: 'Hub Connections',
    description: 'Connection status and tool counts per downstream server.',
    mimeType: 'application/json',
  },
  {
    uri: 'hub://proxy-tools',
    name: 'Visible Proxy Tools',
    description: 'Proxy tools visible to the calling account/session after discovery + policy filtering.',
    mimeType: 'application/json',
  },
  {
    uri: 'hub://discovery',
    name: 'Discovery Settings',
    description: 'Current discovery preferences and available discovery packs for this account. Discovery packs are the standard managed baseline for shared hubs.',
    mimeType: 'application/json',
  },
  {
    uri: HUB_OVERVIEW_RESOURCE_URI,
    name: 'Hub Overview',
    description: 'MCP App overview for the remote hub with key runtime metrics and quick-start guidance.',
    mimeType: 'text/html',
  },
  {
    uri: HUB_AUTH_WORKFLOW_RESOURCE_URI,
    name: 'Hub Auth Workflow',
    description: 'Recommended brokered workflow for toolkit connection checks, connect links, retries, and reconnects.',
    mimeType: 'text/html',
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

const rateLimitBuckets = new Map<string, { windowStartMs: number; count: number; lastSeenMs: number }>();
let rateLimitSweepCounter = 0;
const HUB_PROXY_PERIOD_COUNTER_SERVER = `${HUB_NAME}:proxy`;
const sessionResolveCache = new Map<
  string,
  { value: IdentitySessionResolveResponse | null; expiresAtMs: number }
>();
const DEFAULT_SESSION_RESOLVE_TIMEOUT_MS = 5000;
const DEFAULT_CONNECT_TIMEOUT_MS = 4000;
const DEFAULT_LIST_TOOLS_TIMEOUT_MS = 10000;
const DEFAULT_CONNECT_CONCURRENCY = 4;
const MAX_CONNECT_CONCURRENCY = 32;
const DEFAULT_TOOL_CALL_TIMEOUT_MS = 120_000;
const SESSION_RESOLVE_CACHE_MS = 30000;
const DEFAULT_DISCOVERY_MODE: DiscoveryMode = 'compact';
const DEFAULT_DISCOVERY_PAGE_SIZE = 100;
const MAX_DISCOVERY_PAGE_SIZE = 500;
const discoveryPreferencesByAccount = new Map<string, DiscoveryPreferences>();
const HUB_DISCOVERY_KV_PREFIX = 'hub_discovery_v1::';
const DEFAULT_REQUIRED_GLOBAL_SERVERS: string[] = [];
const DEFAULT_REQUIRED_DISCOVERY_SERVERS: string[] = [];
const DEFAULT_BRAINTRUST_PROJECT_NAME = 'CREATE SOMETHING';

let braintrustUnavailableLogged = false;
let braintrustLogger: BraintrustLogger | null = null;
let braintrustLoggerKey: string | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (isOAuthAuthorizationServerPath(url.pathname)) {
      return withCors(
        new Response(JSON.stringify(buildHubOAuthAuthorizationServerMetadata(url, env)), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        }),
      );
    }

    if (isOAuthProtectedResourcePath(url.pathname)) {
      return withCors(
        new Response(JSON.stringify(buildHubOAuthProtectedResourceMetadata(url, env)), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        }),
      );
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const normalizedRequest = normalizeInboundMcpRequest(request);
      const authFailure = await authorizeRequest(normalizedRequest, env);
      if (authFailure) {
        return withCors(authFailure);
      }

      if (normalizedRequest.method === 'GET') {
        const acceptHeader = (normalizedRequest.headers.get('accept') ?? '').toLowerCase();
        if (!acceptHeader.includes('text/event-stream')) {
          return withCors(
            jsonResponse({ error: 'Not Acceptable: Client must accept text/event-stream' }, 406),
          );
        }
      }

      try {
        const runtime = await getHubRuntime(env);
        const server = buildHubServer(runtime, env, ctx);
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });

        await server.connect(transport);
        const transportRequest = ensureStreamableHttpAcceptHeader(normalizedRequest);
        return withCors(await transport.handleRequest(transportRequest));
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
            auth_required: Boolean(readEnvString(env, 'HUB_API_TOKEN')),
            identity_mode: resolveHubIdentityMode(env),
            legacy_bridge: {
              enabled: readEnvString(env, 'HUB_LEGACY_BRIDGE_ENABLED') === 'true',
              sunset_at: readEnvString(env, 'HUB_LEGACY_SUNSET_AT') ?? null,
            },
            state_storage: env.HUB_STATE_KV ? 'kv' : 'env-only',
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
              enabled: isSessionResolverConfigured(env),
              has_token: Boolean(readEnvString(env, 'HUB_SESSION_RESOLVE_TOKEN')),
              has_binding: Boolean(env.IDENTITY_WORKER),
              timeout_ms: parsePositiveInt(
                readEnvString(env, 'HUB_SESSION_RESOLVE_TIMEOUT_MS'),
                DEFAULT_SESSION_RESOLVE_TIMEOUT_MS,
              ),
            },
            enabled_servers: runtime.stateResolution.enabledServerNames,
            connected_servers: runtime.connected.map((server) => ({
              name: server.name,
              tool_count: server.tools.length,
            })),
            failed_servers: runtime.failed,
            proxy_tool_count: runtime.proxies.toolDefinitions.length,
            warnings: uniqueSortedStrings([
              ...runtime.stateResolution.warnings,
              ...runtime.proxies.warnings,
            ]),
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

export function buildHubOAuthAuthorizationServerMetadata(url: URL, env: Env): Record<string, unknown> {
  const issuer = normalizeHubOAuthIssuer(readEnvString(env, 'OAUTH_ISSUER_URL') ?? 'https://id.createsomething.space');
  return buildOAuthAuthorizationServerMetadata(url.origin, { issuer, resourcePath: '/mcp' });
}

export function buildHubOAuthProtectedResourceMetadata(url: URL, env: Env): Record<string, unknown> {
  const issuer = normalizeHubOAuthIssuer(readEnvString(env, 'OAUTH_ISSUER_URL') ?? 'https://id.createsomething.space');
  return buildOAuthProtectedResourceMetadata(url.origin, { issuer, resourcePath: '/mcp' });
}

function normalizeHubOAuthIssuer(value: string): string {
  return value.replace(/\/+$/, '');
}

function ensureStreamableHttpAcceptHeader(request: Request): Request {
  const acceptHeader = request.headers.get('accept') ?? '';
  const normalizedAccept = acceptHeader.toLowerCase();
  const hasJson = normalizedAccept.includes('application/json');
  const hasEventStream = normalizedAccept.includes('text/event-stream');

  if (hasJson && hasEventStream) {
    return request;
  }

  const headers = new Headers(request.headers);
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
  return new Request(request, { headers });
}

export async function authorizeRequest(request: Request, env: Env): Promise<Response | null> {
  const protectedResourceMetadataUrl = `${new URL(request.url).origin}/mcp/.well-known/oauth-protected-resource`;
  const unauthorizedHeaders = {
    'WWW-Authenticate': `Bearer realm="create-something-hub", resource_metadata="${protectedResourceMetadataUrl}"`,
  };
  const requiredToken = readEnvString(env, 'HUB_API_TOKEN');
  if (!requiredToken) {
    return null;
  }

  const providedToken = getRequestToken(request);
  if (providedToken && timingSafeEqual(providedToken, requiredToken)) {
    return null;
  }

  if (!isSessionResolverConfigured(env)) {
    return jsonResponse({ error: 'Unauthorized' }, 401, unauthorizedHeaders);
  }

  const sessionHeaderToken = request.headers.get('x-mcp-session-token')?.trim() ?? null;
  const bearerToken = getRequestBearerToken(request);
  const bearerIsHubToken =
    bearerToken && requiredToken ? timingSafeEqual(bearerToken, requiredToken) : false;
  const identityToken = sessionHeaderToken ?? (bearerToken && !bearerIsHubToken ? bearerToken : null);
  if (!identityToken) {
    return jsonResponse({ error: 'Unauthorized' }, 401, unauthorizedHeaders);
  }

  const resolved = await resolveSessionForBearerToken(env, identityToken, extractResourceHostFromRequest(request));
  if (resolved?.valid === true && normalizeTraceValue(resolved.account_id)) {
    return null;
  }

  return jsonResponse({ error: 'Unauthorized' }, 401, unauthorizedHeaders);
}

export function normalizeInboundMcpRequest(request: Request): Request {
  const carrierToken = getNonHeaderRequestToken(request);
  if (!carrierToken) {
    return request;
  }

  const headers = new Headers(request.headers);
  if (headers.has('authorization')) {
    return request;
  }

  headers.set(
    'Authorization',
    carrierToken.toLowerCase().startsWith('bearer ') ? carrierToken : `Bearer ${carrierToken}`,
  );
  return new Request(request, { headers });
}

function getNonHeaderRequestToken(request: Request): string | null {
  const url = new URL(request.url);
  const mcpAccessToken = url.searchParams.get('mcp_access_token');
  if (mcpAccessToken?.trim()) {
    return mcpAccessToken.trim();
  }

  const queryToken = url.searchParams.get('token');
  if (queryToken?.trim()) {
    return queryToken.trim();
  }

  const apiKeyHeader = request.headers.get('x-api-key') ?? request.headers.get('api-key');
  if (apiKeyHeader?.trim()) {
    return apiKeyHeader.trim();
  }

  return null;
}

function getRequestToken(request: Request): string | null {
  const carrierToken = getNonHeaderRequestToken(request);
  if (carrierToken) {
    return carrierToken;
  }

  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader || !authHeader.trim()) {
    return null;
  }

  const trimmedAuth = authHeader.trim();
  const bearerMatch = trimmedAuth.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    return bearerMatch[1].trim();
  }

  // Compatibility fallback for clients that send raw token in Authorization.
  return trimmedAuth;
}

function getRequestBearerToken(request: Request): string | null {
  const carrierToken = getNonHeaderRequestToken(request);
  if (carrierToken) {
    return carrierToken;
  }

  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader || !authHeader.trim()) {
    return null;
  }

  return parseBearerToken(authHeader) ?? authHeader.trim();
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

  const connectConcurrency = resolveConnectConcurrency(env);
  const connectionResults = await mapWithConcurrency(
    stateResolution.enabledServerNames,
    connectConcurrency,
    async (serverName) => {
    const config = registry.servers[serverName];
    if (!config) {
      return {
        kind: 'failed' as const,
        failure: { name: serverName, error: `Server "${serverName}" not found in registry` },
      };
    }

    if (config.transport !== 'http') {
      return {
        kind: 'warning' as const,
        message: `Skipping "${serverName}": remote hub only supports HTTP downstream servers`,
      };
    }

    const result = await connectSingleDownstream(serverName, config, env);
    if ('client' in result) {
      return { kind: 'connected' as const, connected: result };
    }
    return { kind: 'failed' as const, failure: result };
    },
  );

  for (const result of connectionResults) {
    if (result.kind === 'connected') {
      connected.push(result.connected);
      continue;
    } else {
      if (result.kind === 'warning') {
        warnings.push(result.message);
      } else {
        failed.push(result.failure);
      }
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

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const boundedConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: boundedConcurrency }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

async function connectSingleDownstream(
  name: string,
  config: HttpServerConfig,
  env: Env,
): Promise<ConnectedDownstream | DownstreamFailure> {
  const connectTimeoutMs = resolveConnectTimeoutMs(config, env);
  const listToolsTimeoutMs = resolveListToolsTimeoutMs(config, env);
  const toolCallTimeoutMs = resolveToolCallTimeoutMs(config, env);
  const headers = resolveHttpHeaders(name, config, env);
  const requestInit: RequestInit = {};
  if (Object.keys(headers).length > 0) {
    requestInit.headers = headers;
  }

  const maxBootstrapAttempts = 2;
  for (let attempt = 1; attempt <= maxBootstrapAttempts; attempt += 1) {
    const client = new Client({
      name: `${HUB_NAME}:${name}`,
      version: HUB_VERSION,
    });

    try {
      const transport = new StreamableHTTPClientTransport(new URL(config.url), { requestInit });
      await withTimeout(
        client.connect(transport),
        connectTimeoutMs,
        `Connect to downstream "${name}"`,
      );

      const tools = await withTimeout(
        listAllTools(client),
        listToolsTimeoutMs,
        `List tools from downstream "${name}"`,
      );

      return { name, config, baseHeaders: headers, toolCallTimeoutMs, client, tools };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetry =
        attempt < maxBootstrapAttempts && isRetryableBootstrapTimeoutError(message, name);

      try {
        await client.close();
      } catch {
        // Best-effort cleanup.
      }

      if (shouldRetry) {
        console.warn(
          `[${HUB_NAME}] downstream bootstrap timed out for "${name}" (attempt ${attempt}/${maxBootstrapAttempts}); retrying once.`,
        );
        continue;
      }

      return { name, error: message };
    }
  }

  return { name, error: `Unknown downstream bootstrap failure for "${name}"` };
}

function isRetryableBootstrapTimeoutError(message: string, serverName: string): boolean {
  return (
    (message.includes(`Connect to downstream "${serverName}"`) ||
      message.includes(`List tools from downstream "${serverName}"`)) &&
    message.includes('timed out after')
  );
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

function resolveToolCallTimeoutMs(config: HttpServerConfig, env: Env): number {
  const fallback = parsePositiveInt(
    readEnvString(env, 'HUB_TOOL_CALL_TIMEOUT_MS'),
    DEFAULT_TOOL_CALL_TIMEOUT_MS,
  );
  return parsePositiveIntFromUnknown(config.tool_call_timeout_ms ?? config.timeout_ms, fallback);
}

function resolveConnectTimeoutMs(config: HttpServerConfig, env: Env): number {
  const fallback = parsePositiveInt(
    readEnvString(env, 'HUB_CONNECT_TIMEOUT_MS'),
    DEFAULT_CONNECT_TIMEOUT_MS,
  );
  return parsePositiveIntFromUnknown(config.connect_timeout_ms, fallback);
}

function resolveListToolsTimeoutMs(config: HttpServerConfig, env: Env): number {
  const fallback = parsePositiveInt(
    readEnvString(env, 'HUB_LIST_TOOLS_TIMEOUT_MS'),
    DEFAULT_LIST_TOOLS_TIMEOUT_MS,
  );
  return parsePositiveIntFromUnknown(config.list_tools_timeout_ms ?? config.timeout_ms, fallback);
}

function resolveConnectConcurrency(env: Env): number {
  const parsed = parsePositiveInt(
    readEnvString(env, 'HUB_CONNECT_CONCURRENCY'),
    DEFAULT_CONNECT_CONCURRENCY,
  );
  return Math.max(1, Math.min(parsed, MAX_CONNECT_CONCURRENCY));
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
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
    return await client.callTool(
      {
        name: toolName,
        arguments: args,
        _meta: {
          progressToken: trace.requestId,
          'io.modelcontextprotocol/related-task': {
            taskId: trace.correlationId,
          },
        },
      },
      undefined,
      {
        timeout: server.toolCallTimeoutMs,
      },
    );
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
        serverTags: [...(server.config.tags ?? [])],
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

function buildHubServer(runtime: HubRuntime, env: Env, executionCtx?: WaitUntilContext): Server {
  const rateLimitPolicy = resolveRateLimitPolicy(env);
  const quotaPolicy = resolveQuotaPolicy(env);
  const recordHubInvocationWithCtx = (log: HubInvocationLog): Promise<void> =>
    recordHubInvocation(env, log, executionCtx);
  const recordHubRouteInvocationWithCtx = (log: HubRouteLog): Promise<void> =>
    recordHubRouteInvocation(env, log, executionCtx);
  const server = new Server(
    {
      name: HUB_NAME,
      version: HUB_VERSION,
    },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {
          listChanged: false,
          subscribe: false,
        },
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const cursor = extractListCursor(request);
    const pageSize = resolveDiscoveryPageSize(env);
    const allTools = MANAGEMENT_TOOLS;
    const offset = decodeCursorOffset(cursor);
    const boundedOffset = Math.max(0, Math.min(offset, allTools.length));
    const nextOffset = boundedOffset + pageSize;

    return {
      tools: allTools.slice(boundedOffset, boundedOffset + pageSize),
      nextCursor: nextOffset < allTools.length ? encodeCursorOffset(nextOffset) : undefined,
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: HUB_RESOURCES,
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
    const uri = request.params.uri;
    const getDiscoveryContext = async () => {
      const accountContext = await resolveAccountContext(extra, env);
      const prefs = await getDiscoveryPreferences(accountContext.accountId, runtime, env);
      const visible = await buildAuthorizedVisibleProxyRoutes({
        runtime,
        prefs,
        accountContext,
        env,
        trace: extractInvocationTrace(request, extra),
        entrypoint: `resource:${uri}`,
      });
      return {
        accountContext,
        prefs,
        visible,
      };
    };

    switch (uri) {
      case 'hub://status':
        return toJsonResource(uri, {
          ...buildStatusPayload(runtime),
          policy: buildPolicyStatusPayload(rateLimitPolicy, quotaPolicy, env),
        });
      case 'hub://registry':
        return toJsonResource(uri, buildRegistryPayload(registry));
      case 'hub://policy':
        return toJsonResource(uri, buildPolicyStatusPayload(rateLimitPolicy, quotaPolicy, env));
      case 'hub://connections':
        return toJsonResource(uri, {
          enabledServerNames: runtime.stateResolution.enabledServerNames,
          connectedServers: runtime.connected.map((server) => ({
            name: server.name,
            toolCount: server.tools.length,
          })),
          failedServers: runtime.failed,
          builtAt: new Date(runtime.builtAt).toISOString(),
        });
      case 'hub://proxy-tools': {
        const { prefs, visible } = await getDiscoveryContext();
        return toJsonResource(uri, {
          count: visible.toolDefinitions.length,
          proxyTools: visible.toolDefinitions.map((tool) => tool.name),
          discovery: prefs,
        });
      }
      case 'hub://discovery': {
        const { prefs } = await getDiscoveryContext();
        return toJsonResource(uri, {
          discovery: prefs,
          packs: listDiscoveryPacks(runtime, env).map((pack) => ({
            id: pack.id,
            description: pack.description,
            mode: pack.preferences.mode,
            activeServers: pack.preferences.activeServers,
            maxProxyTools: pack.preferences.maxProxyTools,
          })),
        });
      }
      case HUB_OVERVIEW_RESOURCE_URI: {
        const { prefs, visible } = await getDiscoveryContext();
        return toHtmlResource(uri, buildHubOverviewHtml({
          runtime,
          rateLimitPolicy,
          quotaPolicy,
          env,
          prefs,
          visibleProxyToolCount: visible.toolDefinitions.length,
        }));
      }
      case HUB_AUTH_WORKFLOW_RESOURCE_URI:
        return toHtmlResource(uri, buildHubAuthWorkflowHtml());
      default:
        throw new Error(`Unknown resource "${uri}"`);
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const toolName = request.params.name;
    const args = normalizeArgs(request.params.arguments);
    const trace = extractInvocationTrace(request, extra);
    const accountContext = await resolveAccountContext(extra, env);
    const accountId = accountContext.accountId;
    const startedAt = Date.now();

    try {
      if (toolName === 'hub_status') {
        const result = toJsonResult({
          ...buildStatusPayload(runtime),
          policy: buildPolicyStatusPayload(rateLimitPolicy, quotaPolicy, env),
        });
        await recordHubInvocationWithCtx({
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
        await recordHubInvocationWithCtx({
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
        const prefs = await getDiscoveryPreferences(accountId, runtime, env);
        const visible = await buildAuthorizedVisibleProxyRoutes({
          runtime,
          prefs,
          accountContext,
          env,
          trace,
          entrypoint: 'hub_list_proxy_tools',
        });
        const result = toJsonResult({
          proxyTools: visible.toolDefinitions.map((tool) => tool.name),
          count: visible.toolDefinitions.length,
        });
        await recordHubInvocationWithCtx({
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

      if (toolName === 'hub_search_proxy_tools') {
        const prefs = await getDiscoveryPreferences(accountId, runtime, env);
        const filters = extractProxyRouteDiscoveryFilters(args);
        const visible = await buildAuthorizedVisibleProxyRoutes({
          runtime,
          prefs,
          accountContext,
          env,
          trace,
          entrypoint: 'hub_search_proxy_tools',
          filters,
        });
        const result = toJsonResult(searchProxyTools(visible, args));
        const query = stringArg(args.query);
        const serverName = stringArg(args.serverName);
        const cursor = stringArg(args.cursor);
        const limit = numberArg(args.limit, 25, 1, 100);
        await recordHubInvocationWithCtx({
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: 'management',
            query,
            serverName,
            limit,
            cursor,
            visibleProxyToolCount: visible.toolDefinitions.length,
          },
        });
        return result;
      }

      if (toolName === 'hub_route_intent') {
        const intent = stringArg(args.intent);
        if (!intent) {
          const errorResult = toErrorResult('"intent" is required');
          await recordHubInvocationWithCtx({
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: '"intent" is required',
            metadata: {
              type: 'management',
              operation: 'route_intent',
            },
          });
          return errorResult;
        }

        const prefs = await getDiscoveryPreferences(accountId, runtime, env);
        const visible = await buildAuthorizedVisibleProxyRoutes({
          runtime,
          prefs,
          accountContext,
          env,
          trace,
          entrypoint: 'hub_route_intent',
        });
        const candidate = resolveIntentRouteCandidate(visible, args);
        const result = toJsonResult(candidateToRoutePayload(candidate, visible));
        await recordHubInvocationWithCtx({
          accountId,
          toolName,
          success: candidate.source !== 'none',
          durationMs: Date.now() - startedAt,
          trace,
          errorMessage: candidate.source === 'none' ? candidate.reason : null,
          metadata: {
            type: 'management',
            operation: 'route_intent',
            source: candidate.source,
            intent: candidate.intent,
            normalizedIntent: candidate.normalizedIntent,
            proxyToolName: candidate.proxyToolName,
          },
        });
        return result;
      }

      if (toolName === 'hub_describe_proxy_tool' || toolName === 'hub_get_proxy_tool') {
        const proxyToolName = stringArg(args.proxyToolName);
        if (!proxyToolName) {
          const errorResult = toErrorResult('"proxyToolName" is required');
          await recordHubInvocationWithCtx({
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: '"proxyToolName" is required',
            metadata: {
              type: 'management',
              operation: 'describe_proxy_tool',
            },
          });
          return errorResult;
        }

        const prefs = await getDiscoveryPreferences(accountId, runtime, env);
        const match = await getAuthorizedExactVisibleProxyRoute({
          runtime,
          prefs,
          accountContext,
          env,
          trace,
          entrypoint: 'hub_describe_proxy_tool',
          proxyToolName,
        });
        if (!match) {
          const message = `Proxy tool "${proxyToolName}" is unknown or not visible for this session.`;
          const errorResult = toErrorResult(message);
          await recordHubInvocationWithCtx({
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: message,
            metadata: {
              type: 'management',
              operation: 'describe_proxy_tool',
              proxyToolName,
            },
          });
          return errorResult;
        }

        const { route, definition } = match;
        const result = toJsonResult({
          proxyToolName,
          serverName: route.serverName,
          downstreamToolName: route.downstreamToolName,
          description: definition.description ?? '',
          inputSchema: definition.inputSchema ?? { type: 'object', properties: {} },
          visible: true,
        });
        await recordHubInvocationWithCtx({
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: 'management',
            operation: 'describe_proxy_tool',
            proxyToolName,
            serverName: route.serverName,
            downstreamToolName: route.downstreamToolName,
          },
        });
        return result;
      }

      if (toolName === 'hub_run_intent') {
        const intent = stringArg(args.intent);
        if (!intent) {
          const errorResult = toErrorResult('"intent" is required');
          await recordHubInvocationWithCtx({
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: '"intent" is required',
            metadata: {
              type: 'management',
              operation: 'run_intent',
            },
          });
          return errorResult;
        }

        if (args.args !== undefined && !isRecord(args.args)) {
          const message = '"args" must be an object';
          const errorResult = toErrorResult(message);
          await recordHubInvocationWithCtx({
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: message,
            metadata: {
              type: 'management',
              operation: 'run_intent',
              intent,
            },
          });
          return errorResult;
        }

        const prefs = await getDiscoveryPreferences(accountId, runtime, env);
        const visible = await buildAuthorizedVisibleProxyRoutes({
          runtime,
          prefs,
          accountContext,
          env,
          trace,
          entrypoint: 'hub_run_intent',
        });
        const candidate = resolveIntentRouteCandidate(visible, args);
        if (!candidate.proxyToolName) {
          const message = candidate.reason || `No route found for intent "${intent}".`;
          const errorResult = toErrorResult(message);
          await recordHubInvocationWithCtx({
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: message,
            metadata: {
              type: 'management',
              operation: 'run_intent',
              source: candidate.source,
              intent: candidate.intent,
              normalizedIntent: candidate.normalizedIntent,
            },
          });
          return errorResult;
        }

        const route = visible.routes.get(candidate.proxyToolName);
        if (!route) {
          const message = `Resolved proxy tool "${candidate.proxyToolName}" is not visible for this session.`;
          const errorResult = toErrorResult(message);
          await recordHubInvocationWithCtx({
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: message,
            metadata: {
              type: 'management',
              operation: 'run_intent',
              source: candidate.source,
              intent: candidate.intent,
              normalizedIntent: candidate.normalizedIntent,
              proxyToolName: candidate.proxyToolName,
            },
          });
          return errorResult;
        }

        const executionArgs = normalizeArgs(args.args);
        return executeProxyRoute({
          env,
          executionCtx,
          route,
          definition: visible.definitionByName.get(route.proxyToolName),
          executionArgs,
          trace,
          accountContext,
          accountId,
          toolName,
          startedAt,
          rateLimitPolicy,
          quotaPolicy,
          entrypoint: 'hub_run_intent',
          entryProxyToolName: route.proxyToolName,
        });
      }

      if (toolName === 'hub_execute_proxy_tool' || toolName === 'hub_run_proxy_tool') {
        const proxyToolName = stringArg(args.proxyToolName);
        if (!proxyToolName) {
          const errorResult = toErrorResult('"proxyToolName" is required');
          await recordHubInvocationWithCtx({
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: '"proxyToolName" is required',
            metadata: {
              type: 'management',
              operation: 'execute_proxy_tool',
            },
          });
          return errorResult;
        }

        const prefs = await getDiscoveryPreferences(accountId, runtime, env);
        const match = await getAuthorizedExactVisibleProxyRoute({
          runtime,
          prefs,
          accountContext,
          env,
          trace,
          entrypoint: 'hub_execute_proxy_tool',
          proxyToolName,
        });
        if (!match) {
          const message = `Proxy tool "${proxyToolName}" is unknown or not visible for this session.`;
          const errorResult = toErrorResult(message);
          await recordHubInvocationWithCtx({
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: message,
            metadata: {
              type: 'management',
              operation: 'execute_proxy_tool',
              proxyToolName,
            },
          });
          return errorResult;
        }

        if (args.args !== undefined && !isRecord(args.args)) {
          const message = '"args" must be an object';
          const errorResult = toErrorResult(message);
          await recordHubInvocationWithCtx({
            accountId,
            toolName,
            success: false,
            durationMs: Date.now() - startedAt,
            trace,
            errorMessage: message,
            metadata: {
              type: 'management',
              operation: 'execute_proxy_tool',
              proxyToolName,
            },
          });
          return errorResult;
        }

        const executionArgs = normalizeArgs(args.args);
        return executeProxyRoute({
          env,
          executionCtx,
          route: match.route,
          definition: match.definition,
          executionArgs,
          trace,
          accountContext,
          accountId,
          toolName,
          startedAt,
          rateLimitPolicy,
          quotaPolicy,
          entrypoint: 'hub_execute_proxy_tool',
          entryProxyToolName: proxyToolName,
        });
      }

      if (toolName === 'hub_list_services') {
        const prefs = await getDiscoveryPreferences(accountId, runtime, env);
        const visible = buildVisibleProxyRoutes(runtime, prefs, accountContext);
        const result = toJsonResult(buildDiscoveryServicesPayload(runtime, prefs, visible));
        await recordHubInvocationWithCtx({
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: 'management',
            mode: prefs.mode,
            activeServerCount: prefs.activeServers.length,
            maxProxyTools: prefs.maxProxyTools,
            visibleProxyToolCount: visible.toolDefinitions.length,
            routeAuthorizationApplied: false,
          },
        });
        return result;
      }

      if (toolName === 'hub_list_discovery_packs') {
        const packs = listDiscoveryPacks(runtime, env);
        const result = toJsonResult({
          packs: packs.map((pack) => ({
            id: pack.id,
            description: pack.description,
            discovery: pack.preferences,
            activeServerCount: pack.preferences.activeServers.length,
          })),
        });
        await recordHubInvocationWithCtx({
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: 'management',
            packCount: packs.length,
          },
        });
        return result;
      }

      if (toolName === 'hub_set_discovery') {
        const reset = booleanArg(args.reset, false);
        const packId = stringArg(args.pack);
        let nextPrefs: DiscoveryPreferences;
        let appliedPack: ResolvedDiscoveryPack | null = null;
        if (reset) {
          nextPrefs = await clearDiscoveryPreferences(accountId, runtime, env);
          const defaultPackId = readEnvString(env, 'HUB_DISCOVERY_SHARED_PACK');
          appliedPack = defaultPackId ? resolveDiscoveryPack(defaultPackId, runtime, env) : null;
        } else {
          const current = await getDiscoveryPreferences(accountId, runtime, env);
          if (packId) {
            appliedPack = resolveDiscoveryPack(packId, runtime, env);
            if (!appliedPack) {
              const message = `Unknown discovery pack "${packId}".`;
              const errorResult = toErrorResult(message);
              await recordHubInvocationWithCtx({
                accountId,
                toolName,
                success: false,
                durationMs: Date.now() - startedAt,
                trace,
                errorMessage: message,
                metadata: {
                  type: 'management',
                  operation: 'set_discovery',
                  pack: packId,
                },
              });
              return errorResult;
            }
          }
          const basePrefs = appliedPack?.preferences ?? current;
          nextPrefs = {
            mode: parseDiscoveryMode(stringArg(args.mode)) ?? basePrefs.mode,
            activeServers: resolveDiscoveryActiveServers(
              optionalStringArrayArg(args.activeServers, 'activeServers') ?? basePrefs.activeServers,
              runtime,
            ),
            maxProxyTools: resolveDiscoveryMaxProxyTools(
              optionalNumberArg(args.maxProxyTools, 'maxProxyTools') ?? basePrefs.maxProxyTools,
            ),
          };
          await persistDiscoveryPreferences(accountId, nextPrefs, env);
        }

        const visibleTools = buildVisibleProxyRoutes(runtime, nextPrefs, accountContext).toolDefinitions;
        try {
          await server.sendToolListChanged();
        } catch {
          // Best-effort hint for clients with long-lived sessions.
        }

        const result = toJsonResult({
          discovery: nextPrefs,
          appliedPack: appliedPack
            ? {
                id: appliedPack.id,
                description: appliedPack.description,
              }
            : null,
          visibleProxyToolCount: visibleTools.length,
          totalProxyToolCount: runtime.proxies.toolDefinitions.length,
          sampleVisibleProxyTools: visibleTools.slice(0, 25).map((tool) => tool.name),
          note: 'Refresh tools/list to pick up the updated discovery view.',
        });
        await recordHubInvocationWithCtx({
          accountId,
          toolName,
          success: true,
          durationMs: Date.now() - startedAt,
          trace,
          metadata: {
            type: 'management',
            mode: nextPrefs.mode,
            activeServers: nextPrefs.activeServers,
            maxProxyTools: nextPrefs.maxProxyTools,
            reset,
            pack: appliedPack?.id ?? null,
            visibleProxyToolCount: visibleTools.length,
          },
        });
        return result;
      }

      if (toolName === 'hub_refresh_connections') {
        const refreshed = await getHubRuntime(env, { force: true });
        const result = toJsonResult(buildStatusPayload(refreshed));
        await recordHubInvocationWithCtx({
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
        const writeCodexRequested = booleanArg(args.writeCodexConfig, false);
        const patch = {
          setBundles: optionalStringArrayArg(args.setBundles, 'setBundles'),
          setServers: optionalStringArrayArg(args.setServers, 'setServers'),
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

        await recordHubInvocationWithCtx({
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
          await recordHubInvocationWithCtx({
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
        await recordHubInvocationWithCtx({
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

      if (toolName === 'hub_policy_status') {
        const result = toJsonResult(buildPolicyStatusPayload(rateLimitPolicy, quotaPolicy, env));
        await recordHubInvocationWithCtx({
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

      const directProxyRoute = runtime.proxies.routes.get(toolName) ?? null;
      if (directProxyRoute) {
        if (!isDirectProxyToolAllowed(env, toolName)) {
          const message =
            'Direct proxy tools are disabled. Use hub_list_services first, then hub_search_proxy_tools to find the proxyToolName, then call hub_execute_proxy_tool with proxyToolName + args.';
          const durationMs = Date.now() - startedAt;
          await Promise.all([
            recordHubInvocationWithCtx({
              accountId,
              toolName,
              success: false,
              durationMs,
              trace,
              errorMessage: message,
              metadata: {
                type: 'policy',
                policy: 'broker_only',
                entrypoint: 'direct_proxy_disabled',
                proxyToolName: toolName,
                downstreamServer: directProxyRoute.serverName,
                downstreamTool: directProxyRoute.downstreamToolName,
              },
            }),
            recordHubRouteInvocationWithCtx({
              accountId,
              downstreamServer: directProxyRoute.serverName,
              downstreamTool: directProxyRoute.downstreamToolName,
              success: false,
              durationMs,
              trace,
              errorMessage: message,
              metadata: {
                proxyToolName: toolName,
                blockedByPolicy: 'broker_only',
                entrypoint: 'direct_proxy_disabled',
              },
            }),
          ]);
          return toErrorResult(message, {
            next_step: 'brokered_execution_required',
            instructions: [
              'Call hub_list_services first, then hub_search_proxy_tools to find the proxyToolName.',
              'Optionally call hub_describe_proxy_tool if argument shape is unclear.',
              'Call hub_execute_proxy_tool with proxyToolName + args.',
            ],
            example: {
              search: {
                name: 'hub_search_proxy_tools',
                arguments: {
                  serverName: directProxyRoute.serverName,
                  query: directProxyRoute.downstreamToolName,
                  limit: 5,
                },
              },
              execute: {
                name: 'hub_execute_proxy_tool',
                arguments: {
                  proxyToolName: directProxyRoute.proxyToolName,
                  args: {},
                },
              },
            },
          });
        }

        return executeProxyRoute({
          env,
          executionCtx,
          route: directProxyRoute,
          executionArgs: args,
          trace,
          accountContext,
          accountId,
          toolName,
          startedAt,
          rateLimitPolicy,
          quotaPolicy,
          entrypoint: 'direct_proxy_tool',
          entryProxyToolName: toolName,
        });
      }

      const errorResult = toErrorResult(`Unknown tool "${toolName}"`);
      await recordHubInvocationWithCtx({
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startedAt;
      await recordHubInvocationWithCtx({
        accountId,
        toolName,
        success: false,
        durationMs,
        trace,
        errorMessage: message,
        metadata: {
          type: 'management',
          downstreamServer: null,
          downstreamTool: null,
          tenantId: accountContext.tenantId,
          userId: accountContext.userId,
          sessionId: accountContext.sessionId,
          authMode: accountContext.authMode,
          identitySource: accountContext.identitySource,
        },
      });
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
    setBundles?: string[];
    setServers?: string[];
    enableBundles: string[];
    disableBundles: string[];
    enableServers: string[];
    disableServers: string[];
  },
): Promise<Record<string, unknown>> {
  const current = await readHubState(env, registry);
  const next = updateState(registry, current, env, patch);
  const write = await writeHubState(env, next);

  return {
    updatedState: next,
    storage: write,
  };
}

export function buildVisibleProxyRoutes(
  runtime: HubRuntime,
  prefs: DiscoveryPreferences,
  accountContext: ResolvedAccountContext,
): VisibleProxyCatalog {
  const sessionScoped = runtime.proxies.toolDefinitions
    .map((tool) => {
      const route = runtime.proxies.routes.get(tool.name);
      if (!route) return null;
      return { tool, route };
    })
    .filter((entry): entry is { tool: Tool; route: ProxyRoute } => Boolean(entry))
    .filter((entry) => isRouteAllowedForSession(entry.route, accountContext.allowedToolPrefixes));

  const discoveryScoped = prefs.mode === 'full'
    ? sessionScoped
    : sessionScoped.filter((entry) => prefs.activeServers.includes(entry.route.serverName));

  const capped = prefs.maxProxyTools && prefs.maxProxyTools > 0
    ? discoveryScoped.slice(0, prefs.maxProxyTools)
    : discoveryScoped;

  const toolDefinitions = capped.map((entry) => entry.tool);
  const routes = new Map(capped.map((entry) => [entry.route.proxyToolName, entry.route]));
  const definitionByName = new Map(toolDefinitions.map((tool) => [tool.name, tool]));

  return {
    toolDefinitions,
    routes,
    definitionByName,
  };
}

function hubAuthzHybridConfig(env: Env) {
  const fetchTimeoutRaw = readEnvString(env, 'OSO_FETCH_TIMEOUT_MS');
  const fetchTimeoutMillis = fetchTimeoutRaw ? parsePositiveInt(fetchTimeoutRaw, 5000) : undefined;
  return {
    mode: 'hybrid' as const,
    fallbackEnabled: parseBooleanWithDefault(readEnvString(env, 'ENGINE_FALLBACK_ENABLED'), true),
    oso: {
      url: readEnvString(env, 'OSO_URL'),
      apiKey: readEnvString(env, 'OSO_API_KEY'),
      fetchTimeoutMillis,
      bootstrapPolicy: parseBooleanWithDefault(readEnvString(env, 'OSO_BOOTSTRAP_POLICY'), false),
    },
  };
}

async function getHubRouteAuthzRollout(env: Env): Promise<AuthzRolloutRow> {
  const manifest = getPolicyManifest(HUB_ROUTE_AUTHZ_POLICY_ID);
  return getAuthzRollout(
    env.TELEMETRY_DB,
    {
      scopeType: 'policy',
      policyId: HUB_ROUTE_AUTHZ_POLICY_ID,
    },
    manifest,
  );
}

async function getServiceTierAuthzRollout(env: Env): Promise<AuthzRolloutRow> {
  const manifest = getPolicyManifest(SERVICE_TIER_AUTHZ_POLICY_ID);
  return getAuthzRollout(
    env.TELEMETRY_DB,
    {
      scopeType: 'policy',
      policyId: SERVICE_TIER_AUTHZ_POLICY_ID,
    },
    manifest,
  );
}

function toHubAuthzEvent(params: {
  policyId: string;
  accountContext: ResolvedAccountContext;
  route: ProxyRoute;
  definition?: Tool;
  trace: InvocationTrace;
  evaluation: Awaited<ReturnType<typeof evaluateAuthorizationRequest>>;
  actionName: 'discover' | 'execute';
  entrypoint: string;
  invocationAction?: string | null;
}): AuthzDecisionEventRecord {
  const {
    policyId,
    accountContext,
    route,
    definition,
    trace,
    evaluation,
    actionName,
    entrypoint,
    invocationAction,
  } = params;
  const classification = classifyHubRoute(route, definition, { invocationAction });
  return {
    id: crypto.randomUUID(),
    scopeKey: `policy:${policyId}`,
    scopeType: 'policy',
    policyId: evaluation.final.policyId,
    accountId: accountContext.accountId,
    tenantId: accountContext.tenantId,
    entityType: null,
    entityId: null,
    actorId: accountContext.userId ?? accountContext.accountId,
    actorRole: null,
    actionName,
    resourceKind: 'hub_route',
    resourceId: route.proxyToolName,
    resourceAccessType: classification.accessType,
    rolloutMode: evaluation.final.rolloutMode,
    canaryPercent: evaluation.final.canaryPercent,
    sampledPolar: evaluation.final.sampledPolar ? 1 : 0,
    mismatch: evaluation.final.mismatch ? 1 : 0,
    evaluationPath: evaluation.final.evaluationPath,
    fallbackUsed: evaluation.polar.evaluationPath === 'fallback' ? 1 : 0,
    fallbackReason: evaluation.polar.fallbackReason,
    legacyDecision: evaluation.legacy.decision,
    polarDecision: evaluation.polar.decision,
    finalDecision: evaluation.final.decision,
    matchedRuleIdsJson: JSON.stringify(evaluation.final.matchedRuleIds ?? []),
    reason: evaluation.final.reason,
    policyHash: evaluation.final.policyHash,
    compilerVersion: evaluation.final.compilerVersion,
    correlationId: trace.correlationId,
    metadataJson: safeJsonStringify({
      entrypoint,
      proxyToolName: route.proxyToolName,
      serverName: route.serverName,
      downstreamToolName: route.downstreamToolName,
      invocationAction: invocationAction ?? null,
      oauthRequired: classification.oauthRequired,
      sessionId: accountContext.sessionId,
      toolMode: accountContext.toolMode,
      serviceTier: accountContext.serviceTier,
      entitlementSnapshot: accountContext.entitlementSnapshot,
      identitySource: accountContext.identitySource,
      latency_ms: evaluation.final.latencyMs,
    }) ?? '{}',
  };
}

function hasProtectedHubActorContext(env: Env, accountContext: ResolvedAccountContext): boolean {
  const identityMode = resolveHubIdentityMode(env);
  const protectedRemoteExecution =
    identityMode === 'session_required' || Boolean(readEnvString(env, 'HUB_API_TOKEN'));

  if (!protectedRemoteExecution) {
    return true;
  }

  if (identityMode === 'compat') {
    return Boolean(accountContext.accountId);
  }

  if (accountContext.identitySource !== 'session') {
    return false;
  }

  if (!accountContext.accountId || !accountContext.tenantId) {
    return false;
  }

  return true;
}

async function evaluateHubRouteAuthorization(params: {
  env: Env;
  accountContext: ResolvedAccountContext;
  route: ProxyRoute;
  definition?: Tool;
  trace: InvocationTrace;
  rollout: AuthzRolloutRow;
  actionName: 'discover' | 'execute';
  entrypoint: string;
  invocationAction?: string | null;
  recordDecision?: boolean;
}): Promise<Awaited<ReturnType<typeof evaluateAuthorizationRequest>>> {
  const {
    env,
    accountContext,
    route,
    definition,
    trace,
    rollout,
    actionName,
    entrypoint,
    invocationAction,
    recordDecision = true,
  } = params;
  const request = buildHubAuthorizationRequest({
    accountId: accountContext.accountId,
    tenantId: accountContext.tenantId,
    userId: accountContext.userId,
    sessionId: accountContext.sessionId,
    readOnly: accountContext.toolMode === 'read_only',
    toolMode: accountContext.toolMode,
    identitySource: accountContext.identitySource,
    introspectionOk: hasProtectedHubActorContext(env, accountContext),
    proxyToolName: route.proxyToolName,
    serverName: route.serverName,
    downstreamToolName: route.downstreamToolName,
    serverTags: route.serverTags,
    actionName,
    definition,
    invocationAction,
    context: {
      serviceTier: accountContext.serviceTier,
      entitlementSnapshot: accountContext.entitlementSnapshot,
    },
  });

  const serviceTierRollout = await getServiceTierAuthzRollout(env);
  const serviceTierEvaluation = await evaluateAuthorizationRequest(
    SERVICE_TIER_AUTHZ_POLICY_ID,
    request,
    {
      mode: serviceTierRollout.mode,
      canaryPercent: serviceTierRollout.canaryPercent,
    },
    hubAuthzHybridConfig(env),
  );

  if (serviceTierEvaluation.final.decision !== 'allow') {
    if (recordDecision) {
      await recordAuthzDecisionEvent(
        env.TELEMETRY_DB,
        toHubAuthzEvent({
          policyId: SERVICE_TIER_AUTHZ_POLICY_ID,
          accountContext,
          route,
          definition,
          trace,
          evaluation: serviceTierEvaluation,
          actionName,
          entrypoint,
          invocationAction,
        }),
      );
    }
    return serviceTierEvaluation;
  }

  const evaluation = await evaluateAuthorizationRequest(
    HUB_ROUTE_AUTHZ_POLICY_ID,
    request,
    {
      mode: rollout.mode,
      canaryPercent: rollout.canaryPercent,
    },
    hubAuthzHybridConfig(env),
  );

  if (recordDecision) {
    await recordAuthzDecisionEvent(
      env.TELEMETRY_DB,
      toHubAuthzEvent({
        policyId: HUB_ROUTE_AUTHZ_POLICY_ID,
        accountContext,
        route,
        definition,
        trace,
        evaluation,
        actionName,
        entrypoint,
        invocationAction,
      }),
    );
  }

  return evaluation;
}

export async function buildAuthorizedVisibleProxyRoutes(params: {
  runtime: HubRuntime;
  prefs: DiscoveryPreferences;
  accountContext: ResolvedAccountContext;
  env: Env;
  trace: InvocationTrace;
  entrypoint: string;
  filters?: ProxyRouteDiscoveryFilters;
}): Promise<VisibleProxyCatalog> {
  const base = filterVisibleProxyCatalog(
    buildVisibleProxyRoutes(params.runtime, params.prefs, params.accountContext),
    params.filters,
  );
  if (base.toolDefinitions.length === 0) {
    return base;
  }

  const rollout = await getHubRouteAuthzRollout(params.env);
  const allowed: Array<{ tool: Tool; route: ProxyRoute }> = [];

  for (const tool of base.toolDefinitions) {
    const route = base.routes.get(tool.name);
    if (!route) continue;
    const evaluation = await evaluateHubRouteAuthorization({
      env: params.env,
      accountContext: params.accountContext,
      route,
      definition: tool,
      trace: params.trace,
      rollout,
      actionName: 'discover',
      entrypoint: params.entrypoint,
      recordDecision: false,
    });
    if (evaluation.final.decision === 'allow') {
      allowed.push({ tool, route });
    } else {
      await recordAuthzDecisionEvent(
        params.env.TELEMETRY_DB,
        toHubAuthzEvent({
          policyId: evaluation.final.policyId,
          accountContext: params.accountContext,
          route,
          definition: tool,
          trace: params.trace,
          evaluation,
          actionName: 'discover',
          entrypoint: params.entrypoint,
        }),
      );
    }
  }

  return {
    toolDefinitions: allowed.map((entry) => entry.tool),
    routes: new Map(allowed.map((entry) => [entry.route.proxyToolName, entry.route])),
    definitionByName: new Map(allowed.map((entry) => [entry.tool.name, entry.tool])),
  };
}

async function getAuthorizedExactVisibleProxyRoute(params: {
  runtime: HubRuntime;
  prefs: DiscoveryPreferences;
  accountContext: ResolvedAccountContext;
  env: Env;
  trace: InvocationTrace;
  entrypoint: string;
  proxyToolName: string;
}): Promise<{ route: ProxyRoute; definition: Tool } | null> {
  const base = buildVisibleProxyRoutes(params.runtime, params.prefs, params.accountContext);
  const route = base.routes.get(params.proxyToolName);
  const definition = base.definitionByName.get(params.proxyToolName);
  if (!route || !definition) {
    return null;
  }

  const evaluation = await evaluateHubRouteAuthorization({
    env: params.env,
    accountContext: params.accountContext,
    route,
    definition,
    trace: params.trace,
    rollout: await getHubRouteAuthzRollout(params.env),
    actionName: 'discover',
    entrypoint: params.entrypoint,
    recordDecision: false,
  });
  if (evaluation.final.decision === 'allow') {
    return { route, definition };
  }

  await recordAuthzDecisionEvent(
    params.env.TELEMETRY_DB,
    toHubAuthzEvent({
      policyId: evaluation.final.policyId,
      accountContext: params.accountContext,
      route,
      definition,
      trace: params.trace,
      evaluation,
      actionName: 'discover',
      entrypoint: params.entrypoint,
    }),
  );

  return null;
}

export async function executeProxyRoute(params: {
  env: Env;
  executionCtx?: WaitUntilContext;
  route: ProxyRoute;
  definition?: Tool;
  executionArgs: Record<string, unknown>;
  trace: InvocationTrace;
  accountContext: ResolvedAccountContext;
  accountId: string;
  toolName: string;
  startedAt: number;
  rateLimitPolicy: RateLimitPolicy;
  quotaPolicy: QuotaPolicy;
  entrypoint: 'hub_execute_proxy_tool' | 'hub_run_intent' | 'direct_proxy_tool';
  entryProxyToolName: string;
}): Promise<any> {
  const {
    env,
    executionCtx,
    route,
    definition,
    executionArgs,
    trace,
    accountContext,
    accountId,
    toolName,
    startedAt,
    rateLimitPolicy,
    quotaPolicy,
    entrypoint,
    entryProxyToolName,
  } = params;
  const recordHubInvocationWithCtx = (log: HubInvocationLog): Promise<void> =>
    recordHubInvocation(env, log, executionCtx);
  const recordHubRouteInvocationWithCtx = (log: HubRouteLog): Promise<void> =>
    recordHubRouteInvocation(env, log, executionCtx);
  const identityTraceMetadata = {
    tenantId: accountContext.tenantId,
    userId: accountContext.userId,
    sessionId: accountContext.sessionId,
    authMode: accountContext.authMode,
    identitySource: accountContext.identitySource,
    boundHost: accountContext.boundHost,
    resourceHost: accountContext.resourceHost,
  };
  const invocationAction = extractRouteInvocationAction(executionArgs);

  if (!isRouteAllowedForSession(route, accountContext.allowedToolPrefixes)) {
    const message =
      `Tool "${entryProxyToolName}" is not enabled for this session. ` +
      'Request a new MCP session with the required toolkit profile.';
    const durationMs = Date.now() - startedAt;
    await Promise.all([
      recordHubInvocationWithCtx({
        accountId,
        toolName,
        success: false,
        durationMs,
        trace,
        errorMessage: message,
        metadata: {
          type: 'policy',
          policy: 'session_scope',
          entrypoint,
          proxyToolName: entryProxyToolName,
          downstreamServer: route.serverName,
          downstreamTool: route.downstreamToolName,
          ...identityTraceMetadata,
          allowedToolPrefixes: accountContext.allowedToolPrefixes ?? null,
        },
      }),
      recordHubRouteInvocationWithCtx({
        accountId,
        downstreamServer: route.serverName,
        downstreamTool: route.downstreamToolName,
        success: false,
        durationMs,
        trace,
        errorMessage: message,
        metadata: {
          proxyToolName: entryProxyToolName,
          blockedByPolicy: 'session_scope',
          entrypoint,
          ...identityTraceMetadata,
        },
      }),
    ]);
    return toErrorResult(message);
  }

  const routeDefinition = definition ?? {
    name: route.proxyToolName,
    description: '',
    inputSchema: { type: 'object', properties: {} },
  };
  const authzEvaluation = await evaluateHubRouteAuthorization({
    env,
    accountContext,
    route,
    definition: routeDefinition,
    trace,
    rollout: await getHubRouteAuthzRollout(env),
    actionName: 'execute',
    entrypoint,
    invocationAction,
  });
  if (authzEvaluation.final.decision !== 'allow') {
    const durationMs = Date.now() - startedAt;
    const message = requiresHumanReview(authzEvaluation.final)
      ? `${authzEvaluation.final.reason} Review policy=${authzEvaluation.final.policyId}.`
      : `${authzEvaluation.final.reason} Blocked by policy=${blockedByPolicy(authzEvaluation.final)}.`;
    const policyMode = requiresHumanReview(authzEvaluation.final) ? 'authz_review' : 'authz_block';

    await Promise.all([
      recordHubInvocationWithCtx({
        accountId,
        toolName,
        success: false,
        durationMs,
        trace,
        errorMessage: message,
        metadata: {
          type: 'policy',
          policy: policyMode,
          entrypoint,
          proxyToolName: entryProxyToolName,
          downstreamServer: route.serverName,
          downstreamTool: route.downstreamToolName,
          policyId: authzEvaluation.final.policyId,
          policyHash: authzEvaluation.final.policyHash,
          evaluationPath: authzEvaluation.final.evaluationPath,
          fallbackReason: authzEvaluation.final.fallbackReason,
          matchedRuleIds: authzEvaluation.final.matchedRuleIds,
          invocationAction,
          ...identityTraceMetadata,
        },
      }),
      recordHubRouteInvocationWithCtx({
        accountId,
        downstreamServer: route.serverName,
        downstreamTool: route.downstreamToolName,
        success: false,
        durationMs,
        trace,
        errorMessage: message,
        metadata: {
          proxyToolName: entryProxyToolName,
          blockedByPolicy: authzEvaluation.final.policyId,
          requiresHumanReview: requiresHumanReview(authzEvaluation.final),
          evaluationPath: authzEvaluation.final.evaluationPath,
          invocationAction,
          ...identityTraceMetadata,
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
      recordHubInvocationWithCtx({
        accountId,
        toolName,
        success: false,
        durationMs,
        trace,
        errorMessage: message,
        metadata: {
          type: 'policy',
          policy: 'rate_limit',
          entrypoint,
          proxyToolName: entryProxyToolName,
          downstreamServer: route.serverName,
          downstreamTool: route.downstreamToolName,
          scope: rateLimitDecision.scope,
          key: rateLimitDecision.key,
          remaining: rateLimitDecision.remaining,
          resetAt: rateLimitDecision.resetAt,
          maxCalls: rateLimitDecision.maxCalls,
          windowSeconds: rateLimitDecision.windowSeconds,
          ...identityTraceMetadata,
        },
      }),
      recordHubRouteInvocationWithCtx({
        accountId,
        downstreamServer: route.serverName,
        downstreamTool: route.downstreamToolName,
        success: false,
        durationMs,
        trace,
        errorMessage: message,
        metadata: {
          proxyToolName: entryProxyToolName,
          blockedByPolicy: 'rate_limit',
          entrypoint,
          scope: rateLimitDecision.scope,
          remaining: rateLimitDecision.remaining,
          resetAt: rateLimitDecision.resetAt,
          maxCalls: rateLimitDecision.maxCalls,
          windowSeconds: rateLimitDecision.windowSeconds,
          ...identityTraceMetadata,
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
      recordHubInvocationWithCtx({
        accountId,
        toolName,
        success: false,
        durationMs,
        trace,
        errorMessage: message,
        metadata: {
          type: 'policy',
          policy: 'quota',
          entrypoint,
          proxyToolName: entryProxyToolName,
          reason: quotaDecision.reason ?? null,
          downstreamServer: route.serverName,
          downstreamTool: route.downstreamToolName,
          remaining: quotaDecision.remaining,
          currentCount: quotaDecision.currentCount,
          maxCallsPerPeriod: quotaDecision.maxCallsPerPeriod,
          period: quotaDecision.period,
          ...identityTraceMetadata,
        },
      }),
      recordHubRouteInvocationWithCtx({
        accountId,
        downstreamServer: route.serverName,
        downstreamTool: route.downstreamToolName,
        success: false,
        durationMs,
        trace,
        errorMessage: message,
        metadata: {
          proxyToolName: entryProxyToolName,
          blockedByPolicy: 'quota',
          entrypoint,
          reason: quotaDecision.reason ?? null,
          remaining: quotaDecision.remaining,
          currentCount: quotaDecision.currentCount,
          maxCallsPerPeriod: quotaDecision.maxCallsPerPeriod,
          period: quotaDecision.period,
          ...identityTraceMetadata,
        },
      }),
    ]);

    return toErrorResult(message);
  }

  try {
    const proxiedResult = await route.call(executionArgs, trace, accountId);
    const proxyFailure = classifyProxyFailure(proxiedResult, route, entryProxyToolName);
    const proxiedSuccess = proxyFailure === null;
    const durationMs = Date.now() - startedAt;
    await Promise.all([
      recordHubInvocationWithCtx({
        accountId,
        toolName,
        success: proxiedSuccess,
        durationMs,
        trace,
        errorMessage: proxiedSuccess ? null : proxyFailure?.rawMessage ?? 'Downstream MCP returned isError response',
        metadata: {
          type: 'proxy',
          entrypoint,
          proxyToolName: entryProxyToolName,
          downstreamServer: route.serverName,
          downstreamTool: route.downstreamToolName,
          invocationAction,
          ...identityTraceMetadata,
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
          downstreamFailure: proxiedSuccess
            ? null
            : {
                code: proxyFailure?.code ?? null,
                missingScopes: proxyFailure?.missingScopes ?? null,
                authRelated: proxyFailure?.authRelated ?? false,
              },
        },
      }),
      recordHubRouteInvocationWithCtx({
        accountId,
        downstreamServer: route.serverName,
        downstreamTool: route.downstreamToolName,
        success: proxiedSuccess,
        durationMs,
        trace,
        errorMessage: proxiedSuccess ? null : proxyFailure?.rawMessage ?? 'Downstream MCP returned isError response',
        metadata: {
          proxyToolName: entryProxyToolName,
          entrypoint,
          invocationAction,
          ...identityTraceMetadata,
          downstreamFailure: proxiedSuccess
            ? null
            : {
                code: proxyFailure?.code ?? null,
                missingScopes: proxyFailure?.missingScopes ?? null,
                authRelated: proxyFailure?.authRelated ?? false,
              },
        },
      }),
    ]);

    if (proxyFailure) {
      return toErrorResult(proxyFailure.errorMessage, {
        next_step: proxyFailure.nextStep,
        toolkit: proxyFailure.toolkitSlug,
        reconnect_proxy_tool: proxyFailure.reconnectProxyTool,
        missing_scopes: proxyFailure.missingScopes,
        auth_related: proxyFailure.authRelated,
        retry_guidance: proxyFailure.authRelated
          ? 'If the toolkit is disconnected or missing scopes, execute the reconnect proxy tool, present the link to the user, then retry only after the user confirms auth completed.'
          : null,
      });
    }

    return proxiedResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const proxyFailure = classifyProxyFailureMessage(message, route, entryProxyToolName, null);
    const durationMs = Date.now() - startedAt;
    await Promise.all([
      recordHubInvocationWithCtx({
        accountId,
        toolName,
        success: false,
        durationMs,
        trace,
        errorMessage: proxyFailure.rawMessage,
        metadata: {
          type: 'proxy',
          entrypoint,
          proxyToolName: entryProxyToolName,
          downstreamServer: route.serverName,
          downstreamTool: route.downstreamToolName,
          invocationAction,
          ...identityTraceMetadata,
          downstreamFailure: {
            code: proxyFailure.code,
            missingScopes: proxyFailure.missingScopes,
            authRelated: proxyFailure.authRelated,
          },
        },
      }),
      recordHubRouteInvocationWithCtx({
        accountId,
        downstreamServer: route.serverName,
        downstreamTool: route.downstreamToolName,
        success: false,
        durationMs,
        trace,
        errorMessage: proxyFailure.rawMessage,
        metadata: {
          proxyToolName: entryProxyToolName,
          entrypoint,
          invocationAction,
          ...identityTraceMetadata,
          downstreamFailure: {
            code: proxyFailure.code,
            missingScopes: proxyFailure.missingScopes,
            authRelated: proxyFailure.authRelated,
          },
        },
      }),
    ]);
    return toErrorResult(proxyFailure.errorMessage, {
      next_step: proxyFailure.nextStep,
      toolkit: proxyFailure.toolkitSlug,
      reconnect_proxy_tool: proxyFailure.reconnectProxyTool,
      missing_scopes: proxyFailure.missingScopes,
      auth_related: proxyFailure.authRelated,
      retry_guidance: proxyFailure.authRelated
        ? 'If the toolkit is disconnected or missing scopes, execute the reconnect proxy tool, present the link to the user, then retry only after the user confirms auth completed.'
        : null,
    });
  }
}

export function searchProxyTools(
  visible: VisibleProxyCatalog,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const filters = extractProxyRouteDiscoveryFilters(args);
  const query = filters.query ?? null;
  const serverNameFilter = filters.serverName ?? null;
  const cursor = stringArg(args.cursor);
  const limit = numberArg(args.limit, 25, 1, 100);
  const startIndex = cursor ? numberArg(Number(cursor), 0, 0, Number.MAX_SAFE_INTEGER) : 0;

  const all = Array.from(visible.routes.values())
    .map((route) => {
      const definition = visible.definitionByName.get(route.proxyToolName);
      return {
        proxyToolName: route.proxyToolName,
        serverName: route.serverName,
        downstreamToolName: route.downstreamToolName,
        description: definition?.description ?? '',
      };
    })
    .sort((a, b) => a.proxyToolName.localeCompare(b.proxyToolName));

  const filtered = all.filter((item) => matchesProxySearchItem(item, filters));

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

function extractRouteInvocationAction(args: Record<string, unknown>): string | null {
  return stringArg(args.action)
    ?? stringArg(args.operation)
    ?? stringArg(args.method);
}

function extractProxyRouteDiscoveryFilters(
  args: Record<string, unknown>,
): ProxyRouteDiscoveryFilters {
  return {
    query: stringArg(args.query),
    serverName: stringArg(args.serverName),
  };
}

function matchesProxySearchItem(
  item: {
    proxyToolName: string;
    serverName: string;
    downstreamToolName: string;
    description: string;
  },
  filters: ProxyRouteDiscoveryFilters,
): boolean {
  if (filters.serverName && item.serverName !== filters.serverName) {
    return false;
  }

  if (!filters.query) {
    return true;
  }

  const query = filters.query.toLowerCase();
  return (
    item.proxyToolName.toLowerCase().includes(query) ||
    item.serverName.toLowerCase().includes(query) ||
    item.downstreamToolName.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query)
  );
}

function filterVisibleProxyCatalog(
  visible: VisibleProxyCatalog,
  filters: ProxyRouteDiscoveryFilters | undefined,
): VisibleProxyCatalog {
  if (!filters?.query && !filters?.serverName) {
    return visible;
  }

  const filteredEntries = visible.toolDefinitions
    .map((tool) => {
      const route = visible.routes.get(tool.name);
      if (!route) return null;
      return { tool, route };
    })
    .filter((entry): entry is { tool: Tool; route: ProxyRoute } => Boolean(entry))
    .filter((entry) =>
      matchesProxySearchItem(
        {
          proxyToolName: entry.route.proxyToolName,
          serverName: entry.route.serverName,
          downstreamToolName: entry.route.downstreamToolName,
          description: entry.tool.description ?? '',
        },
        filters,
      ));

  const toolDefinitions = filteredEntries.map((entry) => entry.tool);
  return {
    toolDefinitions,
    routes: new Map(filteredEntries.map((entry) => [entry.route.proxyToolName, entry.route])),
    definitionByName: new Map(toolDefinitions.map((tool) => [tool.name, tool])),
  };
}

export function resolveIntentRouteCandidate(
  visible: VisibleProxyCatalog,
  args: Record<string, unknown>,
): IntentRouteCandidate {
  const intent = stringArg(args.intent) ?? '';
  const normalizedIntent = normalizeIntentKey(intent);
  const allowDiscoveryFallback = booleanArg(args.allowDiscoveryFallback, true);
  const limit = numberArg(args.limit, 5, 1, 25);
  const explicitServerName = stringArg(args.serverName);

  if (!intent || !normalizedIntent) {
    return {
      source: 'none',
      intent,
      normalizedIntent,
      proxyToolName: null,
      serverName: null,
      downstreamToolName: null,
      description: '',
      reason: 'Intent is required.',
      alternatives: [],
    };
  }

  const allowlistMatch = findAllowlistIntentMatch(normalizedIntent);
  if (allowlistMatch && visible.routes.has(allowlistMatch.definition.proxyToolName)) {
    const route = visible.routes.get(allowlistMatch.definition.proxyToolName)!;
    return {
      source: 'allowlist',
      intent,
      normalizedIntent,
      proxyToolName: route.proxyToolName,
      serverName: route.serverName,
      downstreamToolName: route.downstreamToolName,
      description: allowlistMatch.definition.description ?? '',
      reason: `Matched allowlisted intent "${allowlistMatch.intentId}".`,
      alternatives: [],
    };
  }

  if (!allowDiscoveryFallback) {
    const reason = allowlistMatch
      ? `Allowlisted route "${allowlistMatch.definition.proxyToolName}" is not visible for this session.`
      : `No allowlisted route found for intent "${intent}".`;
    return {
      source: 'none',
      intent,
      normalizedIntent,
      proxyToolName: null,
      serverName: null,
      downstreamToolName: null,
      description: '',
      reason,
      alternatives: [],
    };
  }

  const query = stringArg(args.query)
    ?? allowlistMatch?.definition.fallbackQuery
    ?? normalizedIntent.replaceAll('_', ' ');
  const serverName = explicitServerName ?? allowlistMatch?.definition.preferredServer ?? null;
  const discoveryFetchLimit = Math.min(Math.max(limit * 5, 20), 100);
  const discovered = searchProxyTools(visible, { query, serverName, limit: discoveryFetchLimit });
  const tools = Array.isArray((discovered as Record<string, unknown>).tools)
    ? (discovered as Record<string, unknown>).tools as Array<Record<string, unknown>>
    : [];
  const rankedTools = rankDiscoveryFallbackTools(tools, query).slice(0, limit);

  const first = rankedTools[0] ?? null;
  if (first) {
    return {
      source: 'discovery',
      intent,
      normalizedIntent,
      proxyToolName: stringArg(first.proxyToolName) ?? null,
      serverName: stringArg(first.serverName) ?? null,
      downstreamToolName: stringArg(first.downstreamToolName) ?? null,
      description: stringArg(first.description) ?? '',
      reason: allowlistMatch
        ? `Allowlisted route unavailable; selected discovery fallback for intent "${intent}".`
        : `Selected discovery fallback for intent "${intent}".`,
      alternatives: rankedTools.map((tool) => ({
        proxyToolName: stringArg(tool.proxyToolName) ?? '',
        serverName: stringArg(tool.serverName) ?? '',
        downstreamToolName: stringArg(tool.downstreamToolName) ?? '',
        description: stringArg(tool.description) ?? '',
      })),
    };
  }

  return {
    source: 'none',
    intent,
    normalizedIntent,
    proxyToolName: null,
    serverName: null,
    downstreamToolName: null,
    description: '',
    reason: `No route found for intent "${intent}" in allowlist or discovery.`,
    alternatives: [],
  };
}

function candidateToRoutePayload(
  candidate: IntentRouteCandidate,
  visible: VisibleProxyCatalog,
): Record<string, unknown> {
  const definition = candidate.proxyToolName
    ? visible.definitionByName.get(candidate.proxyToolName)
    : undefined;

  return {
    intent: candidate.intent,
    normalizedIntent: candidate.normalizedIntent,
    matched: candidate.source !== 'none' && Boolean(candidate.proxyToolName),
    source: candidate.source,
    proxyToolName: candidate.proxyToolName,
    serverName: candidate.serverName,
    downstreamToolName: candidate.downstreamToolName,
    description: candidate.description || definition?.description || '',
    inputSchema: definition?.inputSchema ?? null,
    reason: candidate.reason,
    alternatives: candidate.alternatives,
  };
}

function normalizeIntentKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const ROUTER_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'for',
  'from',
  'i',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'please',
  'that',
  'the',
  'to',
  'with',
  'you',
]);

const MIN_HEURISTIC_ALLOWLIST_SCORE = 120;

function canonicalizeRouterToken(token: string): string {
  const lower = token.trim().toLowerCase();
  if (!lower) return '';
  if (lower.endsWith('ies') && lower.length > 4) {
    return `${lower.slice(0, -3)}y`;
  }
  if (lower.endsWith('s') && lower.length > 3 && !lower.endsWith('ss')) {
    return lower.slice(0, -1);
  }
  return lower;
}

function tokenizeRouterText(value: string): string[] {
  const normalized = normalizeIntentKey(value);
  if (!normalized) return [];
  const tokens = normalized
    .split('_')
    .map((token) => canonicalizeRouterToken(token))
    .filter((token) => token.length > 1 && !ROUTER_STOP_WORDS.has(token));
  return Array.from(new Set(tokens));
}

function countTokenOverlap(queryTokens: Set<string>, candidateTokens: string[]): number {
  if (!queryTokens.size || !candidateTokens.length) return 0;
  const unique = new Set(candidateTokens);
  let count = 0;
  for (const token of unique) {
    if (queryTokens.has(token)) count += 1;
  }
  return count;
}

function scoreAllowlistIntentHeuristic(
  queryTokens: Set<string>,
  intentId: string,
  definition: IntentRouteDefinition,
): number {
  if (!queryTokens.size) return 0;
  const idTokens = tokenizeRouterText(intentId);
  const synonymTokens = (definition.synonyms ?? []).flatMap((synonym) => tokenizeRouterText(synonym));
  const descriptionTokens = tokenizeRouterText(definition.description ?? '');
  const preferredServerTokens = tokenizeRouterText(definition.preferredServer ?? '');

  let score = 0;
  score += countTokenOverlap(queryTokens, idTokens) * 45;
  score += countTokenOverlap(queryTokens, synonymTokens) * 30;
  score += countTokenOverlap(queryTokens, descriptionTokens) * 12;
  score += countTokenOverlap(queryTokens, preferredServerTokens) * 8;

  const actionToken = idTokens[0];
  if (actionToken && queryTokens.has(actionToken)) {
    score += 25;
  }

  return score;
}

function isDeprecatedDescription(description: string): boolean {
  return /\bdeprecated\b/i.test(description);
}

function rankDiscoveryFallbackTools(
  tools: Array<Record<string, unknown>>,
  query: string,
): Array<Record<string, unknown>> {
  if (!tools.length) return tools;
  const queryTokens = new Set(tokenizeRouterText(query));
  const scored = tools.map((tool) => {
    const proxyToolName = stringArg(tool.proxyToolName) ?? '';
    const serverName = stringArg(tool.serverName) ?? '';
    const downstreamToolName = stringArg(tool.downstreamToolName) ?? '';
    const description = stringArg(tool.description) ?? '';
    const deprecated = isDeprecatedDescription(description);

    let score = 0;
    for (const token of queryTokens) {
      if (proxyToolName.toLowerCase().includes(token)) score += 8;
      if (downstreamToolName.toLowerCase().includes(token)) score += 7;
      if (serverName.toLowerCase().includes(token)) score += 4;
      if (description.toLowerCase().includes(token)) score += 3;
    }

    if (deprecated) {
      score -= 60;
    }

    return {
      tool,
      score,
      deprecated,
      proxyToolName,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.deprecated !== b.deprecated) return a.deprecated ? 1 : -1;
    return a.proxyToolName.localeCompare(b.proxyToolName);
  });

  return scored.map((entry) => entry.tool);
}

function findAllowlistIntentMatch(
  normalizedIntent: string,
): { intentId: string; definition: IntentRouteDefinition } | null {
  const queryTokens = new Set(tokenizeRouterText(normalizedIntent));
  let best:
    | {
      score: number;
      intentId: string;
      definition: IntentRouteDefinition;
    }
    | null = null;

  for (const [intentId, definition] of Object.entries(intentRouteRegistry.intents ?? {})) {
    if (!definition?.proxyToolName) continue;
    const idNorm = normalizeIntentKey(intentId);
    const synonymNorms = (definition.synonyms ?? []).map((synonym) => normalizeIntentKey(synonym));
    const keys = [idNorm, ...synonymNorms].filter(Boolean);

    let score = 0;
    if (keys.some((key) => key === normalizedIntent)) {
      score = idNorm === normalizedIntent ? 1000 : 900;
    } else if (keys.some((key) => key && (normalizedIntent.includes(key) || key.includes(normalizedIntent)))) {
      score = 500;
    } else {
      score = scoreAllowlistIntentHeuristic(queryTokens, intentId, definition);
    }

    if (!best || score > best.score) {
      best = {
        score,
        intentId,
        definition,
      };
    }
  }

  return best && best.score >= MIN_HEURISTIC_ALLOWLIST_SCORE
    ? { intentId: best.intentId, definition: best.definition }
    : null;
}

function buildDiscoveryServicesPayload(
  runtime: HubRuntime,
  prefs: DiscoveryPreferences,
  visible: VisibleProxyCatalog,
): Record<string, unknown> {
  const byServer = new Map<string, number>();
  for (const tool of runtime.proxies.toolDefinitions) {
    const route = runtime.proxies.routes.get(tool.name);
    if (!route) continue;
    byServer.set(route.serverName, (byServer.get(route.serverName) ?? 0) + 1);
  }

  const visibleByServer = new Map<string, number>();
  for (const tool of visible.toolDefinitions) {
    const route = runtime.proxies.routes.get(tool.name);
    if (!route) continue;
    visibleByServer.set(route.serverName, (visibleByServer.get(route.serverName) ?? 0) + 1);
  }

  return {
    discovery: prefs,
    recommendedFlow: [
      'hub_list_services',
      'hub_search_proxy_tools(serverName=<service>)',
      'hub_describe_proxy_tool',
      'hub_execute_proxy_tool',
    ],
    services: runtime.connected.map((server) => ({
      name: server.name,
      totalProxyTools: byServer.get(server.name) ?? 0,
      visibleProxyTools: visibleByServer.get(server.name) ?? 0,
      activeInDiscovery: prefs.activeServers.includes(server.name),
    })),
    totalProxyToolCount: runtime.proxies.toolDefinitions.length,
    visibleProxyToolCount: visible.toolDefinitions.length,
    note:
      'Service visibility reflects session + discovery scope. Discovery packs are the standard managed baseline for shared hubs. Choose a service here, then call hub_search_proxy_tools with serverName for per-tool authorized discovery.',
  };
}

async function getDiscoveryPreferences(
  accountId: string,
  runtime: HubRuntime,
  env: Env,
): Promise<DiscoveryPreferences> {
  const cacheKey = buildDiscoveryCacheKey(env, accountId);
  const kvReadTimeoutMs = parsePositiveInt(
    readEnvString(env, 'HUB_DISCOVERY_READ_TIMEOUT_MS'),
    500,
  );
  const cached = discoveryPreferencesByAccount.get(cacheKey);
  if (cached) {
    const normalized = normalizeDiscoveryPreferences(cached, runtime, env);
    discoveryPreferencesByAccount.set(cacheKey, normalized);
    return normalized;
  }

  const kv = env.HUB_STATE_KV;
  if (kv) {
    try {
      const raw = await withTimeout(
        kv.get(buildDiscoveryKvKey(env, accountId)),
        kvReadTimeoutMs,
        `Read discovery preferences for ${accountId}`,
      );
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const fromKv = normalizeDiscoveryPreferences(
            {
              mode: parseDiscoveryMode(typeof parsed.mode === 'string' ? parsed.mode : null) ?? DEFAULT_DISCOVERY_MODE,
              activeServers: parseStateStringArray(parsed.activeServers),
              maxProxyTools: resolveDiscoveryMaxProxyTools(
                typeof parsed.maxProxyTools === 'number' ? parsed.maxProxyTools : null,
              ),
            },
            runtime,
            env,
          );
          discoveryPreferencesByAccount.set(cacheKey, fromKv);
          return fromKv;
        } catch {
          // Ignore malformed KV payload and fall back to defaults.
        }
      }
    } catch {
      // Ignore slow/unavailable KV reads and fall back to defaults.
    }
  }

  const defaults = buildDefaultDiscoveryPreferences(runtime, env);
  discoveryPreferencesByAccount.set(cacheKey, defaults);
  return defaults;
}

function buildDefaultDiscoveryPreferences(runtime: HubRuntime, env: Env): DiscoveryPreferences {
  const sharedPackId = readEnvString(env, 'HUB_DISCOVERY_SHARED_PACK');
  const sharedPack = sharedPackId ? resolveDiscoveryPack(sharedPackId, runtime, env) : null;
  const modeFromEnv = parseDiscoveryMode(readEnvString(env, 'HUB_DISCOVERY_MODE'));
  const activeServersFromEnv = parseList(readEnvString(env, 'HUB_DISCOVERY_DEFAULT_SERVERS'));
  const maxProxyToolsRaw = readEnvString(env, 'HUB_DISCOVERY_MAX_PROXY_TOOLS');
  const maxProxyToolsFromEnv = maxProxyToolsRaw !== undefined
    ? resolveDiscoveryMaxProxyTools(parsePositiveInt(maxProxyToolsRaw, 0))
    : undefined;

  return normalizeDiscoveryPreferences({
    mode: modeFromEnv ?? sharedPack?.preferences.mode ?? DEFAULT_DISCOVERY_MODE,
    activeServers: resolveDiscoveryActiveServers(
      activeServersFromEnv ?? sharedPack?.preferences.activeServers ?? [],
      runtime,
    ),
    maxProxyTools: maxProxyToolsFromEnv ?? sharedPack?.preferences.maxProxyTools ?? null,
  }, runtime, env);
}

function getRequiredGlobalServers(currentRegistry: McpBundleRegistry, env?: Env): string[] {
  const raw = env?.HUB_REQUIRED_GLOBAL_SERVERS;
  const configured =
    typeof raw === 'string'
      ? parseList(raw) ?? []
      : DEFAULT_REQUIRED_GLOBAL_SERVERS;
  return configured.filter((serverName) => Boolean(currentRegistry.servers[serverName]));
}

function getRequiredDiscoveryServers(runtime: HubRuntime, env?: Env): string[] {
  const raw = env?.HUB_REQUIRED_DISCOVERY_SERVERS;
  const configured =
    typeof raw === 'string'
      ? parseList(raw) ?? []
      : DEFAULT_REQUIRED_DISCOVERY_SERVERS;
  return configured.filter((serverName) =>
    runtime.connected.some((server) => server.name === serverName),
  );
}

async function persistDiscoveryPreferences(
  accountId: string,
  prefs: DiscoveryPreferences,
  env: Env,
): Promise<void> {
  const cacheKey = buildDiscoveryCacheKey(env, accountId);
  discoveryPreferencesByAccount.set(cacheKey, prefs);
  const kv = env.HUB_STATE_KV;
  if (!kv) return;
  await kv.put(buildDiscoveryKvKey(env, accountId), JSON.stringify(prefs));
}

async function clearDiscoveryPreferences(
  accountId: string,
  runtime: HubRuntime,
  env: Env,
): Promise<DiscoveryPreferences> {
  const cacheKey = buildDiscoveryCacheKey(env, accountId);
  discoveryPreferencesByAccount.delete(cacheKey);
  const kv = env.HUB_STATE_KV;
  if (kv) {
    await kv.delete(buildDiscoveryKvKey(env, accountId));
  }
  const defaults = buildDefaultDiscoveryPreferences(runtime, env);
  discoveryPreferencesByAccount.set(cacheKey, defaults);
  return defaults;
}

function normalizeDiscoveryPreferences(
  prefs: DiscoveryPreferences,
  runtime: HubRuntime,
  env?: Env,
): DiscoveryPreferences {
  const requiredActiveServers = getRequiredDiscoveryServers(runtime, env);
  return {
    mode: prefs.mode,
    activeServers: resolveDiscoveryActiveServers(
      [...prefs.activeServers, ...requiredActiveServers],
      runtime,
    ),
    maxProxyTools: resolveDiscoveryMaxProxyTools(prefs.maxProxyTools),
  };
}

function buildDiscoveryKvKey(env: Env, accountId: string): string {
  return `${HUB_DISCOVERY_KV_PREFIX}${resolveHubInstanceId(env)}::${accountId}`;
}

function buildDiscoveryCacheKey(env: Env, accountId: string): string {
  return `${resolveHubInstanceId(env)}::${accountId}`;
}

function parseDiscoveryMode(value: string | null | undefined): DiscoveryMode | null {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'full') return 'full';
  if (normalized === 'compact') return 'compact';
  return null;
}

function resolveDiscoveryActiveServers(servers: string[], runtime: HubRuntime): string[] {
  const allowed = new Set(runtime.connected.map((server) => server.name));
  return uniqueSortedStrings(servers.filter((server) => allowed.has(server)));
}

function resolveDiscoveryMaxProxyTools(value: number | null): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const floored = Math.floor(value);
  return floored > 0 ? floored : null;
}

function resolveDiscoveryPageSize(env: Env): number {
  const parsed = parsePositiveInt(readEnvString(env, 'HUB_DISCOVERY_PAGE_SIZE'), DEFAULT_DISCOVERY_PAGE_SIZE);
  return Math.min(Math.max(parsed, 1), MAX_DISCOVERY_PAGE_SIZE);
}

function listDiscoveryPacks(runtime: HubRuntime, env?: Env): ResolvedDiscoveryPack[] {
  return Object.entries(discoveryPackRegistry.packs ?? {})
    .map(([packId, definition]) => resolveDiscoveryPackDefinition(packId, definition, runtime, env))
    .filter((pack): pack is ResolvedDiscoveryPack => pack !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function resolveDiscoveryPack(packId: string, runtime: HubRuntime, env?: Env): ResolvedDiscoveryPack | null {
  const key = packId.trim();
  if (!key) return null;
  const definition = discoveryPackRegistry.packs?.[key];
  if (!definition) return null;
  return resolveDiscoveryPackDefinition(key, definition, runtime, env);
}

function resolveDiscoveryPackDefinition(
  packId: string,
  definition: DiscoveryPackDefinition | undefined,
  runtime: HubRuntime,
  env?: Env,
): ResolvedDiscoveryPack | null {
  if (!definition) return null;
  const mode = parseDiscoveryMode(typeof definition.mode === 'string' ? definition.mode : null) ?? DEFAULT_DISCOVERY_MODE;
  const activeServers = parseStateStringArray(definition.activeServers);
  const maxProxyTools = resolveDiscoveryMaxProxyTools(
    typeof definition.maxProxyTools === 'number' ? definition.maxProxyTools : null,
  );

  return {
    id: packId,
    description: typeof definition.description === 'string' ? definition.description : '',
    preferences: normalizeDiscoveryPreferences({
      mode,
      activeServers,
      maxProxyTools,
    }, runtime, env),
  };
}

function extractListCursor(request: unknown): string | null {
  const requestRecord = asRecord(request);
  const params = asRecord(requestRecord?.params);
  return stringArg(params?.cursor);
}

function encodeCursorOffset(offset: number): string {
  return String(Math.max(0, Math.floor(offset)));
}

function decodeCursorOffset(cursor: string | null): number {
  if (!cursor) return 0;
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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

function optionalStringArrayArg(raw: unknown, fieldName: string): string[] | undefined {
  if (raw === undefined) return undefined;
  return stringArrayArg(raw, fieldName);
}

function optionalNumberArg(raw: unknown, fieldName: string): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    throw new Error(`"${fieldName}" must be a finite number`);
  }
  return raw;
}

function resultIsError(value: unknown): boolean {
  const record = asRecord(value);
  return record?.isError === true;
}

function classifyProxyFailure(
  proxiedResult: unknown,
  route: ProxyRoute,
  proxyToolName: string,
): ProxyFailureDetails | null {
  const resultRecord = asRecord(proxiedResult);
  if (!resultRecord) {
    return null;
  }

  const structured = asRecord(resultRecord.structuredContent);
  const data = asRecord(structured?.data);
  const dataSuccess = typeof data?.success === 'boolean' ? data.success : undefined;
  const rootSuccess = typeof structured?.successful === 'boolean' ? structured.successful : undefined;
  const hasRootError = structured?.error !== undefined && structured.error !== null;

  const semanticFailure = dataSuccess === false || rootSuccess === false || hasRootError;
  if (!resultIsError(proxiedResult) && !semanticFailure) {
    return null;
  }

  const rawMessage = extractProxyFailureRawMessage(resultRecord, structured, data)
    ?? 'Downstream MCP returned an error response.';
  const code = extractProxyFailureCode(structured, data);
  return classifyProxyFailureMessage(rawMessage, route, proxyToolName, code);
}

function classifyProxyFailureMessage(
  rawMessageInput: string,
  route: ProxyRoute,
  proxyToolName: string,
  code: string | number | null,
): ProxyFailureDetails {
  const rawMessage = normalizeFailureMessage(rawMessageInput);
  const missingScopes = extractMissingScopes(rawMessage);
  const authRelated = Boolean(
    missingScopes ||
      /connectedaccountnotfound|no connected account found|invalid access token|unauthorized|invalid[_\s-]?grant|token/i
        .test(rawMessage),
  );

  const toolkitSlug = extractToolkitSlug(route.serverName);
  const reconnectProxyTool = `${route.serverName}__get_connect_link`;

  let errorMessage: string;
  if (missingScopes && missingScopes.length > 0) {
    errorMessage =
      `Missing OAuth scopes for toolkit "${toolkitSlug}" while calling "${route.downstreamToolName}": ` +
      `${missingScopes.join(', ')}. ` +
      `Re-auth by calling hub_execute_proxy_tool with proxyToolName="${reconnectProxyTool}".`;
  } else if (authRelated) {
    errorMessage =
      `Authentication failed for toolkit "${toolkitSlug}" while calling "${route.downstreamToolName}". ` +
      `Re-auth by calling hub_execute_proxy_tool with proxyToolName="${reconnectProxyTool}". ` +
      `Downstream message: ${rawMessage}`;
  } else if (code !== null) {
    errorMessage = `Tool "${proxyToolName}" failed (code ${String(code)}): ${rawMessage}`;
  } else {
    errorMessage = `Tool "${proxyToolName}" failed: ${rawMessage}`;
  }

  return {
    errorMessage,
    rawMessage,
    code,
    missingScopes: missingScopes ?? null,
    authRelated,
    nextStep: authRelated ? 'search_and_execute_connect_link' : null,
    reconnectProxyTool: authRelated ? reconnectProxyTool : null,
    toolkitSlug,
  };
}

function extractProxyFailureRawMessage(
  resultRecord: Record<string, unknown>,
  structured: Record<string, unknown> | null,
  data: Record<string, unknown> | null,
): string | null {
  const dataMessage = typeof data?.message === 'string' ? data.message : null;
  if (dataMessage) return dataMessage;

  if (typeof data?.error === 'string') return data.error;
  if (data?.error !== undefined && data.error !== null) return JSON.stringify(data.error);

  if (typeof structured?.message === 'string') return structured.message;
  if (typeof structured?.error === 'string') return structured.error;
  if (structured?.error !== undefined && structured.error !== null) return JSON.stringify(structured.error);

  const content = resultRecord.content;
  if (Array.isArray(content)) {
    for (const entry of content) {
      const item = asRecord(entry);
      if (!item || typeof item.text !== 'string') continue;

      const text = item.text.trim();
      if (!text) continue;

      const parsed = parseJsonObject(text);
      if (parsed) {
        const parsedData = asRecord(parsed.data);
        if (typeof parsedData?.message === 'string') return parsedData.message;
        if (typeof parsedData?.error === 'string') return parsedData.error;
        if (parsedData?.error !== undefined && parsedData.error !== null) {
          return JSON.stringify(parsedData.error);
        }
        if (typeof parsed.message === 'string') return parsed.message;
        if (typeof parsed.error === 'string') return parsed.error;
        if (parsed.error !== undefined && parsed.error !== null) return JSON.stringify(parsed.error);
      }

      return text;
    }
  }

  return null;
}

function extractProxyFailureCode(
  structured: Record<string, unknown> | null,
  data: Record<string, unknown> | null,
): string | number | null {
  if (typeof data?.code === 'number' || typeof data?.code === 'string') {
    return data.code;
  }

  if (typeof structured?.code === 'number' || typeof structured?.code === 'string') {
    return structured.code;
  }

  return null;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function normalizeFailureMessage(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function extractMissingScopes(message: string): string[] | null {
  const match = message.match(/does not contain scopes:\[([^\]]+)\]/i);
  if (!match?.[1]) {
    return null;
  }

  const scopes = match[1]
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);

  return scopes.length > 0 ? scopes : null;
}

function extractToolkitSlug(serverName: string): string {
  return serverName.startsWith('composio-toolkit-')
    ? serverName.replace('composio-toolkit-', '')
    : serverName;
}

function toJsonResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function toJsonResource(uri: string, payload: unknown) {
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

function toHtmlResource(uri: string, html: string) {
  return {
    contents: [
      {
        uri,
        mimeType: 'text/html',
        text: html,
      },
    ],
  };
}

function toErrorResult(message: string, structuredContent?: Record<string, unknown>) {
  const result: Record<string, unknown> = {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
  if (structuredContent) {
    result.structuredContent = structuredContent;
  }
  return result;
}

function buildHubOverviewHtml(params: {
  runtime: HubRuntime;
  rateLimitPolicy: RateLimitPolicy;
  quotaPolicy: QuotaPolicy;
  env: Env;
  prefs: DiscoveryPreferences;
  visibleProxyToolCount: number;
}): string {
  const { runtime, rateLimitPolicy, quotaPolicy, env, prefs, visibleProxyToolCount } = params;
  const policy = buildPolicyStatusPayload(rateLimitPolicy, quotaPolicy, env);
  const health = {
    hub: {
      name: HUB_NAME,
      version: HUB_VERSION,
    },
    builtAt: new Date(runtime.builtAt).toISOString(),
    connectedServers: runtime.connected.length,
    failedServers: runtime.failed.length,
    totalProxyToolCount: runtime.proxies.toolDefinitions.length,
    visibleProxyToolCount,
    discovery: prefs,
    policy,
    note:
      'Use hub_list_services -> hub_search_proxy_tools (with serverName when known) -> hub_describe_proxy_tool -> hub_execute_proxy_tool for scalable brokered execution.',
    discoveryPackNote:
      'For shared hubs, use named discovery packs as the managed baseline and treat raw hub_set_discovery overrides as temporary operator exceptions.',
    authNote:
      'For toolkit auth or reconnects, search for __connection_status or __get_connect_link and execute that proxy tool via hub_execute_proxy_tool.',
  };

  const escaped = escapeHtml(JSON.stringify(health, null, 2));
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(HUB_NAME)} Overview</title>`,
    '  <style>',
    '    :root { color-scheme: dark; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }',
    '    body { margin: 0; background: #0b0e14; color: #d6deeb; }',
    '    main { max-width: 980px; margin: 0 auto; padding: 24px; }',
    '    h1 { margin: 0 0 12px; font-size: 22px; }',
    '    p { margin: 0 0 16px; color: #9aa4b2; }',
    '    pre { background: #111826; border: 1px solid #25324a; border-radius: 10px; padding: 16px; overflow: auto; }',
    '    code { font-size: 12px; line-height: 1.5; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main>',
    `    <h1>${escapeHtml(HUB_NAME)} MCP Overview</h1>`,
    '    <p>This MCP App snapshot is generated by the remote hub runtime.</p>',
    `    <pre><code>${escaped}</code></pre>`,
    '  </main>',
    '</body>',
    '</html>',
  ].join('\n');
}

function buildHubAuthWorkflowHtml(): string {
  const defaultSequence = [
    'List services with hub_list_services and choose the target service first.',
    'Search for the right proxy tool with hub_search_proxy_tools and pass serverName whenever known.',
    'Describe it with hub_describe_proxy_tool if you need the exact schema.',
    'Execute it with hub_execute_proxy_tool using proxyToolName + args.',
  ];
  const discoveryAdminSequence = [
    'For shared hubs, treat named discovery packs as the default managed baseline.',
    'Use hub_list_discovery_packs before changing discovery scope.',
    'Use hub_set_discovery(pack=...) for managed changes and reserve raw activeServers overrides for temporary operator exceptions.',
  ];
  const authSequence = [
    'Before first toolkit use, run __connection_status if the task depends on external auth.',
    'If disconnected, run __get_connect_link.',
    'Show the returned link to the user and stop.',
    'Retry only after the user confirms auth is complete.',
  ];
  const reconnectSequence = [
    'If a downstream tool returns auth failure or missing scopes, stop retrying the business tool.',
    'Run the reconnect proxy tool, usually <serverName>__get_connect_link, through hub_execute_proxy_tool.',
    'Show the link, wait for the user to authenticate, then retry the original tool.',
  ];
  const reminders = [
    'Direct proxy tools may be disabled even when they exist in the catalog.',
    'When the hub returns a connect link, present it to the user instead of continuing silently.',
    'Treat auth config missing errors as deployment/configuration issues, not user errors.',
  ];

  const renderList = (items: string[], ordered = false) => {
    const tag = ordered ? 'ol' : 'ul';
    const rendered = items.map((item) => `        <li>${escapeHtml(item)}</li>`).join('\n');
    return [`      <${tag}>`, rendered, `      </${tag}>`].join('\n');
  };

  const searchStatusExample = escapeHtml(
    JSON.stringify(
      {
        name: 'hub_search_proxy_tools',
        arguments: {
          serverName: 'composio-toolkit-airtable',
          query: 'connection_status',
          limit: 5,
        },
      },
      null,
      2,
    ),
  );
  const executeStatusExample = escapeHtml(
    JSON.stringify(
      {
        name: 'hub_execute_proxy_tool',
        arguments: {
          proxyToolName: 'composio-toolkit-airtable__connection_status',
          args: {},
        },
      },
      null,
      2,
    ),
  );
  const executeConnectExample = escapeHtml(
    JSON.stringify(
      {
        name: 'hub_execute_proxy_tool',
        arguments: {
          proxyToolName: 'composio-toolkit-airtable__get_connect_link',
          args: {},
        },
      },
      null,
      2,
    ),
  );

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <title>Hub Auth Workflow</title>',
    '  <style>',
    '    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }',
    '    body { margin: 0; background: #0b0e14; color: #d6deeb; }',
    '    main { max-width: 980px; margin: 0 auto; padding: 24px; }',
    '    h1 { margin: 0 0 8px; font-size: 22px; }',
    '    h2 { margin: 0 0 10px; font-size: 15px; }',
    '    p { margin: 0 0 16px; color: #9aa4b2; line-height: 1.55; }',
    '    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 20px; }',
    '    .card { background: #111826; border: 1px solid #25324a; border-radius: 12px; padding: 16px; }',
    '    .callout { margin-top: 16px; background: #0f1724; border: 1px solid #25324a; border-radius: 12px; padding: 14px 16px; }',
    '    ol, ul { margin: 0; padding-left: 20px; color: #d6deeb; }',
    '    li { margin: 0 0 8px; line-height: 1.5; }',
    '    pre { margin: 10px 0 0; background: #0b1220; border: 1px solid #25324a; border-radius: 10px; padding: 14px; overflow: auto; }',
    '    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.5; }',
    '    .eyebrow { color: #7dd3fc; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main>',
    '    <div class="eyebrow">Brokered Toolkit Execution</div>',
    '    <h1>Hub Auth Workflow</h1>',
    '    <p>Use this sequence for brokered toolkit auth, reconnects, and retries. The goal is to find the right proxy tool, check auth only when needed, and avoid looping on downstream failures.</p>',
    '    <div class="grid">',
    '      <section class="card">',
    '        <h2>Default Sequence</h2>',
             renderList(defaultSequence, true),
    '      </section>',
    '      <section class="card">',
    '        <h2>Discovery Packs</h2>',
             renderList(discoveryAdminSequence, true),
    '      </section>',
    '      <section class="card">',
    '        <h2>Auth Check</h2>',
             renderList(authSequence, true),
    '      </section>',
    '      <section class="card">',
    '        <h2>Reconnect</h2>',
             renderList(reconnectSequence, true),
    '      </section>',
    '      <section class="card">',
    '        <h2>Reminders</h2>',
             renderList(reminders),
    '      </section>',
    '    </div>',
    '    <div class="grid">',
    '      <section class="card">',
    '        <h2>Find Auth Status</h2>',
    `        <pre><code>${searchStatusExample}</code></pre>`,
    '      </section>',
    '      <section class="card">',
    '        <h2>Check Status</h2>',
    `        <pre><code>${executeStatusExample}</code></pre>`,
    '      </section>',
    '      <section class="card">',
    '        <h2>Start Reconnect</h2>',
    `        <pre><code>${executeConnectExample}</code></pre>`,
    '      </section>',
    '    </div>',
    '    <div class="callout">',
    '      <h2>When This Adds Value</h2>',
    '      <p>This is useful when the model needs a reminder about the broker flow. It is not a substitute for the live tool list. If it becomes noisy, the cleaner option is to stop auto-attaching this resource to routine tool calls.</p>',
    '    </div>',
    '  </main>',
    '</body>',
    '</html>',
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

export async function resolveAccountContext(extra: unknown, env: Env): Promise<ResolvedAccountContext> {
  const extraRecord = asRecord(extra);
  const authorization = getHeaderValue(extraRecord?.requestInfo, 'authorization');
  const sessionHeaderToken = getHeaderValue(extraRecord?.requestInfo, 'x-mcp-session-token');
  const identityMode = resolveHubIdentityMode(env);
  const resourceHost = extractResourceHostFromExtra(extra);

  if (identityMode === 'session_required') {
    if (!isSessionResolverConfigured(env)) {
      throw new Error(
        'HUB_IDENTITY_MODE=session_required requires HUB_SESSION_RESOLVE_URL and HUB_SESSION_RESOLVE_TOKEN.',
      );
    }
    const bearerToken = authorization ? parseBearerToken(authorization) : null;
    const staticHubToken = readEnvString(env, 'HUB_API_TOKEN');
    const bearerIsHubToken =
      bearerToken && staticHubToken ? timingSafeEqual(bearerToken, staticHubToken) : false;
    const identityToken = sessionHeaderToken ?? (bearerToken && !bearerIsHubToken ? bearerToken : null);
    if (!identityToken) {
      throw new Error('Missing X-MCP-Session-Token header or bearer token.');
    }
    return resolveSessionAccountContext(env, identityToken, resourceHost);
  }

  const bearerToken = authorization ? parseBearerToken(authorization) : null;
  const staticHubToken = readEnvString(env, 'HUB_API_TOKEN');
  const bearerIsHubToken =
    bearerToken && staticHubToken ? timingSafeEqual(bearerToken, staticHubToken) : false;
  const compatIdentityToken = sessionHeaderToken ?? bearerToken;

  if (compatIdentityToken && isSessionResolverConfigured(env)) {
    try {
      return await resolveSessionAccountContext(env, compatIdentityToken, resourceHost);
    } catch (error) {
      const allowFallback =
        bearerIsHubToken &&
        !sessionHeaderToken &&
        compatIdentityToken === bearerToken;
      if (!allowFallback) {
        throw error;
      }
    }
  }

  return resolveFallbackAccountContext(extra, env, resourceHost);
}

async function resolveSessionAccountContext(
  env: Env,
  token: string,
  resourceHost: string | null,
): Promise<ResolvedAccountContext> {
  const resolved = await resolveSessionForBearerToken(env, token, resourceHost);
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
    authMode: normalizeResolvedAuthMode(resolved),
    toolMode: normalizeTraceValue(resolved.tool_mode),
    allowedToolPrefixes:
      resolved.allowed_tool_prefixes == null ? null : parseAllowedToolPrefixes(resolved.allowed_tool_prefixes),
    boundHost: normalizeTraceValue(resolved.bound_host),
    resourceHost,
    identitySource: 'session',
    serviceTier: normalizeTraceValue(resolved.service_tier),
    entitlementSnapshot: asRecord(resolved.entitlement_snapshot),
  };
}

function resolveFallbackAccountContext(
  extra: unknown,
  env: Env,
  resourceHost: string | null,
): ResolvedAccountContext {
  const extraRecord = asRecord(extra);
  const authInfo = asRecord(extraRecord?.authInfo);
  const trustClientAccountHeaders = parseBooleanWithDefault(
    readEnvString(env, 'HUB_COMPAT_TRUST_CLIENT_ACCOUNT_HEADERS'),
    false,
  );
  const authorization = getHeaderValue(extraRecord?.requestInfo, 'authorization');
  const accountHeader = trustClientAccountHeaders
    ? getHeaderValue(extraRecord?.requestInfo, 'x-mcp-account-id') ??
      getHeaderValue(extraRecord?.requestInfo, 'x-hub-account-id')
    : null;
  const staticHubToken = readEnvString(env, 'HUB_API_TOKEN');
  const rawBearer = authorization ? parseBearerToken(authorization) : null;
  // Guard against identity spoofing when gateway auth is provided by query/api-key headers.
  // In protected mode (HUB_API_TOKEN configured), Authorization should not influence fallback account identity.
  const fromBearer = staticHubToken ? null : rawBearer;
  const fromAuth =
    normalizeTraceValue(authInfo?.accountId) ??
    normalizeTraceValue(authInfo?.tenantId) ??
    normalizeTraceValue(authInfo?.clientId) ??
    normalizeTraceValue(authInfo?.sub);
  return {
    accountId:
      accountHeader ?? fromBearer ?? fromAuth ?? readEnvString(env, 'HUB_ACCOUNT_ID') ?? 'operator',
    tenantId: normalizeTraceValue(authInfo?.tenantId) ?? null,
    userId: normalizeTraceValue(authInfo?.sub) ?? null,
    sessionId: null,
    authMode: 'fallback',
    toolMode: resolveCompatFallbackToolMode(env),
    allowedToolPrefixes: null,
    boundHost: null,
    resourceHost,
    serviceTier: null,
    entitlementSnapshot: null,
    identitySource: 'fallback',
  };
}

function isSessionResolverConfigured(env: Env): boolean {
  return Boolean(
    readEnvString(env, 'HUB_SESSION_RESOLVE_TOKEN') &&
      (env.IDENTITY_WORKER || readEnvString(env, 'HUB_SESSION_RESOLVE_URL')),
  );
}

export function resolveHubIdentityMode(env: Env): HubIdentityMode {
  const raw = readEnvString(env, 'HUB_IDENTITY_MODE')?.trim().toLowerCase();
  if (raw === 'compat') {
    return 'compat';
  }
  if (raw === 'resolved_identity_required') {
    return 'session_required';
  }
  return 'session_required';
}

function normalizeResolvedAuthMode(resolved: IdentitySessionResolveResponse): string | null {
  const authMode = normalizeTraceValue(resolved.auth_mode);
  if (authMode) {
    return authMode;
  }
  return normalizeTraceValue(resolved.session_id) ? 'session' : 'resolved';
}

function resolveCompatFallbackToolMode(env: Env): string {
  const raw = readEnvString(env, 'HUB_COMPAT_FALLBACK_TOOL_MODE')?.trim().toLowerCase();
  if (raw === 'read_only') {
    return 'read_only';
  }
  return 'read_write';
}

async function resolveSessionForBearerToken(
  env: Env,
  token: string,
  resourceHost: string | null = null,
): Promise<IdentitySessionResolveResponse | null> {
  const now = Date.now();
  const cacheKey = buildSessionResolveCacheKey(token, resourceHost);
  const cached = sessionResolveCache.get(cacheKey);
  if (cached && cached.expiresAtMs > now) {
    return cached.value;
  }

  const resolveUrl = readEnvString(env, 'HUB_SESSION_RESOLVE_URL');
  const resolveToken = readEnvString(env, 'HUB_SESSION_RESOLVE_TOKEN');
  const identityWorker = env.IDENTITY_WORKER;
  if (!resolveToken || (!identityWorker && !resolveUrl)) {
    return null;
  }

  const timeoutMs = parsePositiveInt(
    readEnvString(env, 'HUB_SESSION_RESOLVE_TIMEOUT_MS'),
    DEFAULT_SESSION_RESOLVE_TIMEOUT_MS,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const request = new Request(resolveUrl ?? 'https://identity-worker.internal/v1/mcp/sessions/resolve', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolveToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, resource_host: resourceHost }),
      signal: controller.signal,
    });
    const response = identityWorker ? await identityWorker.fetch(request) : await fetch(request);

    if (!response.ok) {
      const value = { valid: false, reason: `resolver_http_${response.status}` };
      sessionResolveCache.set(cacheKey, { value, expiresAtMs: now + SESSION_RESOLVE_CACHE_MS });
      maybeSweepSessionResolveCache(now);
      return value;
    }

    const payload = (await response.json()) as IdentitySessionResolveResponse;
    sessionResolveCache.set(cacheKey, { value: payload, expiresAtMs: now + SESSION_RESOLVE_CACHE_MS });
    maybeSweepSessionResolveCache(now);
    return payload;
  } catch (error) {
    const value = {
      valid: false,
      reason: error instanceof Error ? `resolver_error:${error.name}` : 'resolver_error',
    };
    sessionResolveCache.set(cacheKey, { value, expiresAtMs: now + SESSION_RESOLVE_CACHE_MS });
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

function buildSessionResolveCacheKey(token: string, resourceHost: string | null): string {
  return `${resourceHost ?? '*'}::${token}`;
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

function normalizeResourceHostValue(value: unknown): string | null {
  const raw = normalizeTraceValue(value);
  if (!raw) return null;
  const candidate = raw.toLowerCase().replace(/^[a-z]+:\/\//, '');
  const hostPort = candidate.split('/')[0] ?? candidate;
  const hostname = hostPort.split('@').pop() ?? hostPort;
  const label = hostname.split(':')[0]?.split('.')[0] ?? hostname;
  if (!label) return null;
  const normalized = label.replace(/[^a-z0-9._-]/g, '_').slice(0, 64);
  return normalized || null;
}

function extractResourceHostFromRequest(request: Request): string | null {
  try {
    return normalizeResourceHostValue(new URL(request.url).host);
  } catch {
    return (
      normalizeResourceHostValue(request.headers.get('x-forwarded-host')) ??
      normalizeResourceHostValue(request.headers.get('host'))
    );
  }
}

function extractResourceHostFromExtra(extra: unknown): string | null {
  const extraRecord = asRecord(extra);
  const requestInfo = asRecord(extraRecord?.requestInfo);
  return (
    normalizeResourceHostValue(requestInfo?.url) ??
    normalizeResourceHostValue(getHeaderValue(requestInfo, 'x-forwarded-host')) ??
    normalizeResourceHostValue(getHeaderValue(requestInfo, 'host'))
  );
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

async function loadBraintrustModule(): Promise<BraintrustModule | null> {
  if (!braintrustUnavailableLogged) {
    console.warn(`[${HUB_NAME}] braintrust disabled: package is not bundled in this worker build`);
    braintrustUnavailableLogged = true;
  }

  return null;
}

async function getBraintrustLogger(env: Env): Promise<BraintrustLogger | null> {
  const rawEnabled = readEnvString(env, 'BRAINTRUST_ENABLED');
  if (rawEnabled && rawEnabled.trim().toLowerCase() === 'false') {
    return null;
  }

  const apiKey = readEnvString(env, 'BRAINTRUST_API_KEY')?.trim();
  if (!apiKey) return null;
  const braintrust = await loadBraintrustModule();
  if (!braintrust) return null;

  const projectName =
    readEnvString(env, 'BRAINTRUST_PROJECT_NAME')?.trim() || DEFAULT_BRAINTRUST_PROJECT_NAME;
  const projectId = readEnvString(env, 'BRAINTRUST_PROJECT_ID')?.trim();
  const nextKey = `${apiKey}::${projectId ?? ''}::${projectName}`;

  if (!braintrustLogger || braintrustLoggerKey !== nextKey) {
    const loggerConfig: BraintrustLoggerConfig = {
      apiKey,
      projectName,
      asyncFlush: true,
      setCurrent: true,
    };

    if (projectId) {
      (loggerConfig as Record<string, unknown>).projectId = projectId;
    }

    braintrustLogger = braintrust.initLogger(loggerConfig);
    braintrustLoggerKey = nextKey;
  }

  return braintrustLogger;
}

async function flushBraintrust(logger: BraintrustLogger): Promise<void> {
  try {
    await logger.flush();
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] braintrust logger flush failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    const braintrust = await loadBraintrustModule();
    if (!braintrust) return;
    await braintrust.flush();
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] braintrust global flush failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function enqueueWithWaitUntil(task: Promise<void>, executionCtx?: WaitUntilContext): void {
  if (executionCtx) {
    executionCtx.waitUntil(task);
    return;
  }
  void task;
}

async function emitHubInvocationToBraintrust(env: Env, log: HubInvocationLog): Promise<void> {
  const logger = await getBraintrustLogger(env);
  if (!logger) return;
  const metadata = asRecord(log.metadata);
  try {
    await logger.traced(
      (span: BraintrustSpan) => {
        span.log({
          input: {
            tool: log.toolName,
            accountId: log.accountId,
            correlationId: log.trace.correlationId,
            requestId: log.trace.requestId,
          },
          output: {
            success: log.success,
            durationMs: Math.max(0, Math.floor(log.durationMs)),
            error: log.errorMessage ?? null,
          },
          error: log.errorMessage ?? undefined,
          tags: buildHubBraintrustTags(['mcp', HUB_NAME, log.toolName], metadata),
          metadata: {
            server: HUB_NAME,
            tool: log.toolName,
            accountId: log.accountId,
            success: log.success,
            durationMs: Math.max(0, Math.floor(log.durationMs)),
            correlationId: log.trace.correlationId,
            requestId: log.trace.requestId,
            ...(metadata ?? {}),
          },
        });
      },
      {
        name: `mcp:${HUB_NAME}:${log.toolName}`,
        type: 'tool',
      },
    );
    await flushBraintrust(logger);
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] braintrust hub emit failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function emitHubRouteToBraintrust(env: Env, log: HubRouteLog): Promise<void> {
  const logger = await getBraintrustLogger(env);
  if (!logger) return;
  const metadata = asRecord(log.metadata);
  try {
    await logger.traced(
      (span: BraintrustSpan) => {
        span.log({
          input: {
            downstreamServer: log.downstreamServer,
            downstreamTool: log.downstreamTool,
            accountId: log.accountId,
            correlationId: log.trace.correlationId,
            requestId: log.trace.requestId,
          },
          output: {
            success: log.success,
            durationMs: Math.max(0, Math.floor(log.durationMs)),
            error: log.errorMessage ?? null,
          },
          error: log.errorMessage ?? undefined,
          tags: buildHubBraintrustTags(
            ['mcp', HUB_NAME, log.downstreamServer, log.downstreamTool],
            metadata,
          ),
          metadata: {
            server: HUB_NAME,
            accountId: log.accountId,
            downstreamServer: log.downstreamServer,
            downstreamTool: log.downstreamTool,
            success: log.success,
            durationMs: Math.max(0, Math.floor(log.durationMs)),
            correlationId: log.trace.correlationId,
            requestId: log.trace.requestId,
            ...(metadata ?? {}),
          },
        });
      },
      {
        name: `mcp:${log.downstreamServer}:${log.downstreamTool}`,
        type: 'tool',
      },
    );
    await flushBraintrust(logger);
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] braintrust route emit failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function buildHubBraintrustTags(
  baseTags: string[],
  metadata: Record<string, unknown> | null,
): string[] {
  const policy =
    typeof metadata?.policy === 'string' && metadata.policy.length > 0
      ? `policy:${metadata.policy}`
      : null;
  const type =
    typeof metadata?.type === 'string' && metadata.type.length > 0
      ? `type:${metadata.type}`
      : null;
  const entrypoint =
    typeof metadata?.entrypoint === 'string' && metadata.entrypoint.length > 0
      ? `entry:${metadata.entrypoint}`
      : null;

  return [...baseTags, policy, type, entrypoint].filter((value): value is string => Boolean(value));
}

async function recordHubInvocation(
  env: Env,
  log: HubInvocationLog,
  executionCtx?: WaitUntilContext,
): Promise<void> {
  enqueueWithWaitUntil(emitHubInvocationToBraintrust(env, log), executionCtx);

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

async function recordHubRouteInvocation(
  env: Env,
  log: HubRouteLog,
  executionCtx?: WaitUntilContext,
): Promise<void> {
  enqueueWithWaitUntil(emitHubRouteToBraintrust(env, log), executionCtx);

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
    return enforceRequiredHubStateServers(fromKv, currentRegistry, env);
  }
  return enforceRequiredHubStateServers(readStateFromEnv(env, currentRegistry), currentRegistry, env);
}

async function readHubStateFromKv(env: Env): Promise<HubState | null> {
  const kv = env.HUB_STATE_KV;
  if (!kv) return null;

  const raw = await kv.get(buildHubStateKvKey(env));
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

  const key = buildHubStateKvKey(env);
  await kv.put(key, JSON.stringify(state));
  return {
    persisted: true,
    key,
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

function enforceRequiredHubStateServers(state: HubState, currentRegistry: McpBundleRegistry, env: Env): HubState {
  const requiredServers = getRequiredGlobalServers(currentRegistry, env);
  if (requiredServers.length === 0) {
    return {
      enabledBundles: uniqueSortedStrings(state.enabledBundles),
      enabledServers: uniqueSortedStrings(state.enabledServers),
      disabledServers: uniqueSortedStrings(state.disabledServers),
    };
  }

  const requiredSet = new Set(requiredServers);
  return {
    enabledBundles: uniqueSortedStrings(state.enabledBundles),
    enabledServers: uniqueSortedStrings([...(state.enabledServers ?? []), ...requiredServers]),
    disabledServers: uniqueSortedStrings((state.disabledServers ?? []).filter((name) => !requiredSet.has(name))),
  };
}

function updateState(
  currentRegistry: McpBundleRegistry,
  current: HubState,
  env: Env,
  patch: {
    setBundles?: string[];
    setServers?: string[];
    enableBundles?: string[];
    disableBundles?: string[];
    enableServers?: string[];
    disableServers?: string[];
  },
): HubState {
  const knownBundles = new Set(Object.keys(currentRegistry.bundles));
  const knownServers = new Set(Object.keys(currentRegistry.servers));
  const resolvedBaseline = resolveState(currentRegistry, current).state;
  const baseline: HubState = {
    enabledBundles: resolvedBaseline.enabledBundles.filter((bundle) => knownBundles.has(bundle)),
    enabledServers: resolvedBaseline.enabledServers.filter((server) => knownServers.has(server)),
    disabledServers: resolvedBaseline.disabledServers.filter((server) => knownServers.has(server)),
  };

  const unknownBundles = [
    ...(patch.setBundles ?? []),
    ...(patch.enableBundles ?? []),
    ...(patch.disableBundles ?? []),
  ].filter((bundle) => !knownBundles.has(bundle));

  const unknownServers = [
    ...(patch.setServers ?? []),
    ...(patch.enableServers ?? []),
    ...(patch.disableServers ?? []),
  ].filter((server) => !knownServers.has(server));

  if (unknownBundles.length > 0 || unknownServers.length > 0) {
    const details: string[] = [];
    if (unknownBundles.length > 0) {
      details.push(`bundles=${uniqueSortedStrings(unknownBundles).join(',')}`);
    }
    if (unknownServers.length > 0) {
      details.push(`servers=${uniqueSortedStrings(unknownServers).join(',')}`);
    }
    throw new Error(`Unknown hub state entries: ${details.join(' ')}`);
  }

  const enabledBundles = new Set<string>(patch.setBundles ?? baseline.enabledBundles);
  const enabledServers = new Set<string>(patch.setServers ?? baseline.enabledServers);
  const disabledServers = new Set<string>(patch.setServers ? [] : baseline.disabledServers);

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

  return enforceRequiredHubStateServers(
    {
      enabledBundles: [...enabledBundles].sort(),
      enabledServers: [...enabledServers].sort(),
      disabledServers: [...disabledServers].sort(),
    },
    currentRegistry,
    env,
  );
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

function resolveHubInstanceId(env: Env): string {
  return readEnvString(env, 'HUB_INSTANCE_ID') ?? HUB_NAME;
}

function buildHubStateKvKey(env: Env): string {
  return `${HUB_STATE_KV_PREFIX}::${resolveHubInstanceId(env)}`;
}

function readEnvString(env: Env, key: string): string | undefined {
  const value = env[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseBooleanWithDefault(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

function isDirectProxyToolAllowed(env: Env, proxyToolName: string): boolean {
  const directProxyEnabled = parseBooleanWithDefault(
    readEnvString(env, 'HUB_ALLOW_DIRECT_PROXY_TOOLS'),
    false,
  );
  if (!directProxyEnabled) return false;

  const allowedPrefixes = parseList(readEnvString(env, 'HUB_DIRECT_PROXY_ALLOWED_PREFIXES'));
  if (!allowedPrefixes || allowedPrefixes.length === 0) return true;
  return allowedPrefixes.some((prefix) => proxyToolName.startsWith(prefix));
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

function jsonResponse(data: unknown, status = 200, initHeaders?: HeadersInit): Response {
  const headers = new Headers(initHeaders);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers,
  });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-MCP-Session-Token',
      'X-MCP-Account-ID',
      'X-Hub-Account-ID',
      'X-Correlation-ID',
      'X-Request-ID',
      'X-API-Key',
      'API-Key',
    ].join(', '),
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
