export type StringMap = Record<string, string>;

export type CatalogCategory = 'create-something' | 'workway';

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

export type ServerLifecycle = 'active' | 'dormant' | 'local';
export type CatalogExposureMode = 'direct' | 'brokered' | 'exception_direct' | 'dormant';

export type ServerMetadata = {
  lifecycle?: ServerLifecycle;
  package_path?: string;
  /**
   * Declares how this server's tool catalog should be exposed to agents.
   * Large or variable connector surfaces should use brokered discovery.
   */
  catalog_exposure_mode?: CatalogExposureMode;
  /**
   * Approximate tool count used for registry validation and exposure policy checks.
   */
  estimated_tool_count?: number;
  /**
   * Required when using exception_direct exposure mode, or when direct exposure
   * is justified for mid-size surfaces.
   */
  exposure_exception_reason?: string;
  /**
   * Required when using exception_direct exposure mode, or when direct exposure
   * is justified for mid-size surfaces.
   */
  exposure_review_owner?: string;
  /**
   * Preferred per-server timeout override (milliseconds) for downstream tool calls.
   */
  tool_call_timeout_ms?: number;
  /**
   * Backward-compat alias for tool_call_timeout_ms.
   */
  timeout_ms?: number;
  catalog?: ServerCatalogConfig;
};

export type HttpServerConfig = {
  transport: 'http';
  url: string;
  /**
   * Preferred Codex key for static headers.
   */
  http_headers?: StringMap;
  /**
   * Map header name -> env var name (resolved at runtime by the hub and emitted
   * as env_http_headers in Codex config).
   */
  env_http_headers?: StringMap;
  /**
   * Env var containing bearer token value (without "Bearer " prefix).
   */
  bearer_token_env_var?: string;
  /**
   * Backward-compat alias. Prefer http_headers.
   */
  headers?: StringMap;
  /**
   * Per-server connect timeout (milliseconds) for the downstream MCP transport.
   */
  connect_timeout_ms?: number;
  /**
   * Per-server list-tools timeout (milliseconds) for the initial tool inventory.
   */
  list_tools_timeout_ms?: number;
  description?: string;
  tags?: string[];
} & ServerMetadata;

export type StdioServerConfig = {
  transport: 'stdio';
  command: string;
  args?: string[];
  env?: StringMap;
  cwd?: string;
  description?: string;
  tags?: string[];
} & ServerMetadata;

export type McpServerConfig = HttpServerConfig | StdioServerConfig;

export type McpBundleRegistry = {
  version: 1;
  servers: Record<string, McpServerConfig>;
  bundles: Record<string, string[]>;
  defaults?: {
    enabledBundles?: string[];
    enabledServers?: string[];
    disabledServers?: string[];
    codexConfigPath?: string;
  };
};

export type McpHubState = {
  enabledBundles?: string[];
  enabledServers?: string[];
  disabledServers?: string[];
  updatedAt?: string;
};

export type ResolvedState = {
  enabledBundles: string[];
  enabledServers: string[];
  disabledServers: string[];
};

export type StateResolution = {
  state: ResolvedState;
  enabledServerNames: string[];
  warnings: string[];
};

export type RegistryPaths = {
  rootDir: string;
  registryPath: string;
  statePath: string;
  codexConfigPath: string;
  routingPath: string;
};

export type StatePatch = {
  enableBundles?: string[];
  disableBundles?: string[];
  enableServers?: string[];
  disableServers?: string[];
};

export type OauthApprovalStatus = 'approved' | 'pending' | 'blocked';

export type TenantRoutingPolicy = {
  allowServers?: string[];
  denyServers?: string[];
  allowTags?: string[];
  denyTags?: string[];
  allowToolPrefixes?: string[];
  denyToolPrefixes?: string[];
};

export type RoutedAliasCandidate = {
  server: string;
  tool: string;
  provider?: string;
  oauthApproval?: OauthApprovalStatus;
  note?: string;
};

export type RoutedAliasConfig = {
  description?: string;
  inputSchema?: Record<string, unknown>;
  candidates: RoutedAliasCandidate[];
  tenantAllowlist?: string[];
  tenantDenylist?: string[];
};

export type HubRoutingConfig = {
  version: 1;
  defaults?: {
    tenant?: string;
    allowPendingOauthApprovals?: boolean;
  };
  tenants?: Record<string, TenantRoutingPolicy>;
  aliases?: Record<string, RoutedAliasConfig>;
};
