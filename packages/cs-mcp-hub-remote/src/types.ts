import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export type StringMap = Record<string, string>;

export type CatalogCategory = 'create-something' | 'workway';
export type ServerLifecycle = 'active' | 'dormant' | 'local';

export type ServerCatalogConfig = {
  include: boolean;
  name?: string;
  slug?: string;
  category: CatalogCategory;
  description?: string;
  transports?: Array<'http' | 'sse'>;
  requiresAuth?: boolean;
  authType?: 'bearer' | 'oauth';
  setupNotes?: string;
};

export type HttpServerConfig = {
  transport: 'http';
  url: string;
  http_headers?: StringMap;
  env_http_headers?: StringMap;
  bearer_token_env_var?: string;
  headers?: StringMap;
  description?: string;
  tags?: string[];
  lifecycle?: ServerLifecycle;
  package_path?: string;
  catalog?: ServerCatalogConfig;
};

export type StdioServerConfig = {
  transport: 'stdio';
  command: string;
  args?: string[];
  env?: StringMap;
  cwd?: string;
  description?: string;
  tags?: string[];
  lifecycle?: ServerLifecycle;
  package_path?: string;
  catalog?: ServerCatalogConfig;
};

export type McpServerConfig = HttpServerConfig | StdioServerConfig;

export type McpBundleRegistry = {
  version: 1;
  servers: Record<string, McpServerConfig>;
  bundles: Record<string, string[]>;
  defaults?: {
    enabledBundles?: string[];
    enabledServers?: string[];
    disabledServers?: string[];
  };
};

export type HubState = {
  enabledBundles: string[];
  enabledServers: string[];
  disabledServers: string[];
};

export type StateResolution = {
  state: HubState;
  enabledServerNames: string[];
  warnings: string[];
};

export type DownstreamFailure = {
  name: string;
  error: string;
};

export type ConnectedDownstream = {
  name: string;
  config: HttpServerConfig;
  baseHeaders: Record<string, string>;
  client: Client;
  tools: Tool[];
};

export type InvocationTrace = {
  requestId: string;
  correlationId: string;
  transportRequestId: string;
};

export type ProxyRoute = {
  proxyToolName: string;
  serverName: string;
  downstreamToolName: string;
  call: (args: Record<string, unknown>, trace: InvocationTrace) => Promise<unknown>;
};

export type ProxyCatalog = {
  toolDefinitions: Tool[];
  routes: Map<string, ProxyRoute>;
  warnings: string[];
};

export type ReadWriteMode = 'read' | 'write';

export type CatalogToolEntry = {
  toolRef: string;
  serverName: string;
  downstreamToolName: string;
  proxyToolName: string;
  dottedAlias: string;
  aliases: string[];
  description: string;
  inputSchema: Record<string, unknown>;
  connector: string;
  category: CatalogCategory | 'unknown';
  lifecycle: ServerLifecycle | 'unknown';
  tags: string[];
  searchText: string;
  schemaHash: string;
  readWrite: ReadWriteMode;
  active: boolean;
};

export type ToolCatalog = {
  entries: CatalogToolEntry[];
  byToolRef: Map<string, CatalogToolEntry>;
  byName: Map<string, CatalogToolEntry>;
};

export type HubRuntime = {
  builtAt: number;
  stateResolution: StateResolution;
  connected: ConnectedDownstream[];
  failed: DownstreamFailure[];
  proxies: ProxyCatalog;
  catalog: ToolCatalog;
};

export type HubInvocationLog = {
  accountId: string;
  toolName: string;
  success: boolean;
  durationMs: number;
  errorMessage?: string | null;
  trace: InvocationTrace;
  metadata?: Record<string, unknown>;
};

export type HubRouteLog = {
  accountId: string;
  downstreamServer: string;
  downstreamTool: string;
  success: boolean;
  durationMs: number;
  errorMessage?: string | null;
  trace: InvocationTrace;
  metadata?: Record<string, unknown>;
};

export type DiscoveryMode = 'compat' | 'broker';

export interface Env {
  HUB_API_TOKEN?: string;
  HUB_ENABLED_BUNDLES?: string;
  HUB_ENABLED_SERVERS?: string;
  HUB_DISABLED_SERVERS?: string;
  HUB_REFRESH_SECONDS?: string;
  HUB_CACHE_BUST?: string;
  HUB_ACCOUNT_ID?: string;
  HUB_DISCOVERY_MODE?: DiscoveryMode;
  HUB_LIST_PAGE_SIZE?: string;
  TELEMETRY_DB?: D1Database;
  HUB_DB?: D1Database;
  [key: string]: unknown;
}

export type HubErrorCode =
  | 'HUB_TOOL_NOT_FOUND'
  | 'HUB_POLICY_DENIED'
  | 'HUB_QUOTA_EXCEEDED'
  | 'HUB_DOWNSTREAM_FAILURE'
  | 'HUB_INVALID_CURSOR';

export class HubError extends Error {
  readonly code: HubErrorCode;
  readonly meta?: Record<string, unknown>;

  constructor(code: HubErrorCode, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.name = 'HubError';
    this.code = code;
    this.meta = meta;
  }
}

export type TenantContext = {
  tenantId: string;
  accountId: string;
};

export type PolicyCheckInput = {
  tenantId: string;
  toolRef: string;
  serverName: string;
  connector: string;
  readWrite: ReadWriteMode;
};
