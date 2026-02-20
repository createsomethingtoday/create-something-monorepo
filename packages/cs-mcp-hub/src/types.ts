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

export type ServerMetadata = {
  lifecycle?: ServerLifecycle;
  package_path?: string;
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
};

export type StatePatch = {
  enableBundles?: string[];
  disableBundles?: string[];
  enableServers?: string[];
  disableServers?: string[];
};
