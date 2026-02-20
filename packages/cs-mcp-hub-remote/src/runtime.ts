import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

import {
  addAliasRoutesToCatalog,
  buildProxyToolName,
  buildToolCatalog,
  reserveProxyName,
  sortToolsByName,
  syncToolCatalogIndex
} from './catalog.js';
import type {
  ConnectedDownstream,
  DownstreamFailure,
  Env,
  HttpServerConfig,
  HubRuntime,
  McpBundleRegistry,
  ProxyCatalog,
  ProxyRoute,
  StateResolution
} from './types.js';
import { HubError } from './types.js';
import {
  isRetryableStatusCode,
  parseList,
  parsePositiveInt,
  readEnvString,
  sleep,
  uniqueSortedStrings
} from './utils.js';

const HUB_NAME = 'create-something-hub-remote';
const HUB_VERSION = '1.0.0';
const DEFAULT_REFRESH_SECONDS = 300;

const DOWNSTREAM_BEARER_ENV_FALLBACK: Record<string, string> = {
  'cs-telemetry': 'CS_TELEMETRY_OPERATOR_API_TOKEN',
  'halfdozen-telemetry': 'HALFDOZEN_TELEMETRY_OPERATOR_API_TOKEN'
};

type RuntimeCache = {
  key: string;
  runtime: HubRuntime;
  builtAt: number;
};

let runtimeCache: RuntimeCache | null = null;
let pendingRuntimeLoad: {
  key: string;
  promise: Promise<HubRuntime>;
} | null = null;

export async function getHubRuntime(
  env: Env,
  registry: McpBundleRegistry,
  options: { force?: boolean } = {}
): Promise<HubRuntime> {
  const resolution = resolveState(registry, readStateFromEnv(env, registry));
  const key = buildRuntimeCacheKey(env, resolution.state);
  const ttlMs =
    parsePositiveInt(readEnvString(env, 'HUB_REFRESH_SECONDS'), DEFAULT_REFRESH_SECONDS) * 1000;

  if (
    !options.force &&
    runtimeCache &&
    runtimeCache.key === key &&
    Date.now() - runtimeCache.builtAt <= ttlMs
  ) {
    return runtimeCache.runtime;
  }

  if (!options.force && pendingRuntimeLoad && pendingRuntimeLoad.key === key) {
    return pendingRuntimeLoad.promise;
  }

  const promise = buildHubRuntime(env, registry, resolution)
    .then((runtime) => {
      const previousRuntime = runtimeCache?.runtime;
      runtimeCache = {
        key,
        runtime,
        builtAt: runtime.builtAt
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

export async function closeHubRuntime(runtime: HubRuntime): Promise<void> {
  await Promise.all(
    runtime.connected.map(async (server) => {
      try {
        await server.client.close();
      } catch {
        // Best-effort shutdown.
      }
    })
  );
}

async function buildHubRuntime(
  env: Env,
  registry: McpBundleRegistry,
  stateResolution: StateResolution
): Promise<HubRuntime> {
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

  const { catalog, warnings: catalogWarnings } = buildToolCatalog(proxies, registry);
  proxies.warnings.push(...catalogWarnings);

  const aliasWarnings = addAliasRoutesToCatalog(proxies, catalog);
  proxies.warnings.push(...aliasWarnings);

  await syncToolCatalogIndex(env.HUB_DB, catalog, proxies.warnings);

  return {
    builtAt: Date.now(),
    stateResolution,
    connected,
    failed,
    proxies,
    catalog
  };
}

async function connectSingleDownstream(
  name: string,
  config: HttpServerConfig,
  env: Env
): Promise<ConnectedDownstream | DownstreamFailure> {
  const client = new Client({
    name: `${HUB_NAME}:${name}`,
    version: HUB_VERSION
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
      // ignore
    }
    const message = error instanceof Error ? error.message : String(error);
    return { name, error: message };
  }
}

function resolveHttpHeaders(
  serverName: string,
  config: HttpServerConfig,
  env: Env
): Record<string, string> {
  const headers: Record<string, string> = {
    ...(config.http_headers ?? {}),
    ...(config.headers ?? {})
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
      return sortToolsByName(allTools);
    }
    cursor = page.nextCursor;
  }
}

async function callDownstreamToolWithRetry(
  server: ConnectedDownstream,
  toolName: string,
  args: Record<string, unknown>,
  trace: { requestId: string; correlationId: string }
): Promise<unknown> {
  const maxAttempts = 3;
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < maxAttempts) {
    attempt += 1;

    const client = new Client({
      name: `${HUB_NAME}:${server.name}:proxy`,
      version: HUB_VERSION
    });

    const headers: Record<string, string> = {
      ...server.baseHeaders,
      'x-correlation-id': trace.correlationId,
      'x-request-id': trace.requestId,
      'x-hub-server': HUB_NAME,
      'x-hub-downstream-server': server.name,
      'x-hub-downstream-tool': toolName
    };

    const transport = new StreamableHTTPClientTransport(new URL(server.config.url), {
      requestInit: {
        headers
      }
    });

    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: toolName,
        arguments: args,
        _meta: {
          progressToken: trace.requestId,
          'io.modelcontextprotocol/related-task': {
            taskId: trace.correlationId
          }
        }
      });

      return result;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        isRetryableStatusCode(message) || /timed out|timeout|network|fetch/i.test(message);

      if (!retryable || attempt >= maxAttempts) {
        throw new HubError('HUB_DOWNSTREAM_FAILURE', message, {
          attempt,
          maxAttempts,
          server: server.name,
          downstreamTool: toolName
        });
      }

      const baseDelay = 150 * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 75);
      await sleep(Math.min(1000, baseDelay + jitter));
    } finally {
      try {
        await client.close();
      } catch {
        // ignore close errors
      }
    }
  }

  const finalMessage =
    lastError instanceof Error
      ? lastError.message
      : String(lastError ?? 'Unknown downstream failure');
  throw new HubError('HUB_DOWNSTREAM_FAILURE', finalMessage);
}

function buildProxyCatalog(connectedServers: ConnectedDownstream[]): ProxyCatalog {
  const toolDefinitions: Tool[] = [];
  const routes = new Map<string, ProxyRoute>();
  const warnings: string[] = [];

  for (const server of connectedServers) {
    for (const tool of server.tools) {
      const baseProxyName = buildProxyToolName(server.name, tool.name);
      const proxyName = reserveProxyName(
        baseProxyName,
        routes as unknown as Map<string, unknown>,
        warnings
      );

      toolDefinitions.push({
        ...tool,
        name: proxyName,
        description: `[${server.name}] ${tool.description ?? ''}`.trim(),
        inputSchema: tool.inputSchema ?? { type: 'object', properties: {} }
      });

      routes.set(proxyName, {
        proxyToolName: proxyName,
        serverName: server.name,
        downstreamToolName: tool.name,
        call: (args, trace) => callDownstreamToolWithRetry(server, tool.name, args, trace)
      });
    }
  }

  return {
    toolDefinitions: sortToolsByName(toolDefinitions),
    routes,
    warnings
  };
}

function readStateFromEnv(
  env: Env,
  currentRegistry: McpBundleRegistry
): { enabledBundles: string[]; enabledServers: string[]; disabledServers: string[] } {
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
    disabledServers
  };
}

function resolveState(
  currentRegistry: McpBundleRegistry,
  state: { enabledBundles: string[]; enabledServers: string[]; disabledServers: string[] }
): StateResolution {
  const warnings: string[] = [];

  const resolved = {
    enabledBundles: uniqueSortedStrings(state.enabledBundles),
    enabledServers: uniqueSortedStrings(state.enabledServers),
    disabledServers: uniqueSortedStrings(state.disabledServers)
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
    warnings
  };
}

function buildRuntimeCacheKey(
  env: Env,
  state: { enabledBundles: string[]; enabledServers: string[]; disabledServers: string[] }
): string {
  const cacheBust = readEnvString(env, 'HUB_CACHE_BUST') ?? '';
  return JSON.stringify({
    enabledBundles: state.enabledBundles,
    enabledServers: state.enabledServers,
    disabledServers: state.disabledServers,
    cacheBust
  });
}
