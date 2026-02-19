export type StringMap = Record<string, string>;

export type HttpServerConfig = {
  transport: 'http';
  url: string;
  headers?: StringMap;
  description?: string;
  tags?: string[];
};

export type StdioServerConfig = {
  transport: 'stdio';
  command: string;
  args?: string[];
  env?: StringMap;
  cwd?: string;
  description?: string;
  tags?: string[];
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
