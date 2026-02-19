#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';

import {
  getEffectiveCodexPath,
  loadRegistry,
  loadState,
  resolveRegistryPaths,
  resolveState,
  saveState,
  updateState,
  writeCodexConfig,
} from './config.js';
import { closeDownstreamServers, connectDownstreamServers } from './downstream.js';
import type { McpBundleRegistry, RegistryPaths, StatePatch } from './types.js';

const HUB_NAME = 'create-something-hub';
const HUB_VERSION = '0.1.0';

const MANAGEMENT_TOOLS: Tool[] = [
  {
    name: 'hub_status',
    description: 'Show registry, state, active bundles, connected servers, and proxy tool coverage.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'hub_list_registry',
    description: 'List all known MCP servers and bundles from the hub registry.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'hub_update_state',
    description:
      'Enable/disable bundles or servers in the state database. Optionally writes .codex/config.toml immediately.',
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
    name: 'hub_write_codex_config',
    description:
      'Write current bundle/server enablement to .codex/config.toml. Existing non-registry servers are preserved.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'hub_list_proxy_tools',
    description: 'List currently proxied tools exposed by this hub instance.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

type ProxyRoute = {
  proxyToolName: string;
  serverName: string;
  downstreamToolName: string;
  call: (args: Record<string, unknown>) => Promise<any>;
};

type ProxyCatalog = {
  toolDefinitions: Tool[];
  routes: Map<string, ProxyRoute>;
  warnings: string[];
};

type AdminArgs = {
  status: boolean;
  writeCodex: boolean;
  writeCodexExplicit: boolean;
  enableBundles: string[];
  disableBundles: string[];
  enableServers: string[];
  disableServers: string[];
  help: boolean;
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${HUB_NAME}] fatal: ${message}`);
  process.exit(1);
});

async function main(): Promise<void> {
  const admin = parseAdminArgs(process.argv.slice(2));
  if (admin !== null) {
    await runAdminMode(admin);
    return;
  }

  await runServerMode();
}

async function runServerMode(): Promise<void> {
  const { paths, registry } = loadContext();
  const initialState = loadState(paths);
  const resolution = resolveState(registry, initialState);
  const downstream = await connectDownstreamServers(registry, resolution.enabledServerNames);
  const proxies = buildProxyCatalog(downstream.connected);

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
    tools: [...MANAGEMENT_TOOLS, ...proxies.toolDefinitions],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = normalizeArgs(request.params.arguments);

    try {
      if (toolName === 'hub_status') {
        return toJsonResult(buildStatusPayload(paths, registry, downstream, proxies));
      }

      if (toolName === 'hub_list_registry') {
        return toJsonResult(buildRegistryPayload(registry));
      }

      if (toolName === 'hub_list_proxy_tools') {
        return toJsonResult({
          proxyTools: proxies.toolDefinitions.map((tool) => tool.name),
          count: proxies.toolDefinitions.length,
        });
      }

      if (toolName === 'hub_update_state') {
        return toJsonResult(applyStateUpdate(args, paths, registry));
      }

      if (toolName === 'hub_write_codex_config') {
        return toJsonResult(writeCodex(paths, registry));
      }

      const route = proxies.routes.get(toolName);
      if (!route) {
        return toErrorResult(`Unknown tool "${toolName}"`);
      }

      return await route.call(args);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return toErrorResult(`Tool "${toolName}" failed: ${message}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[${HUB_NAME}] running on stdio`);
  console.error(
    `[${HUB_NAME}] enabled=${resolution.enabledServerNames.length} connected=${downstream.connected.length} failed=${downstream.failed.length} proxied_tools=${proxies.toolDefinitions.length}`,
  );
  if (downstream.failed.length > 0) {
    console.error(`[${HUB_NAME}] failed servers: ${downstream.failed.map((f) => f.name).join(', ')}`);
  }
  if (resolution.warnings.length > 0) {
    console.error(`[${HUB_NAME}] state warnings: ${resolution.warnings.join(' | ')}`);
  }
  if (proxies.warnings.length > 0) {
    console.error(`[${HUB_NAME}] proxy warnings: ${proxies.warnings.join(' | ')}`);
  }

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    await closeDownstreamServers(downstream.connected);
    try {
      await server.close();
    } catch {
      // ignore close errors during shutdown
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

function buildProxyCatalog(connectedServers: Awaited<ReturnType<typeof connectDownstreamServers>>['connected']): ProxyCatalog {
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
        call: (args) => server.client.callTool({ name: tool.name, arguments: args }),
      });
    }
  }

  return { toolDefinitions, routes, warnings };
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

function buildProxyToolName(serverName: string, downstreamToolName: string): string {
  return `${sanitizeName(serverName)}__${sanitizeName(downstreamToolName)}`;
}

function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function applyStateUpdate(
  args: Record<string, unknown>,
  paths: RegistryPaths,
  registry: McpBundleRegistry,
): Record<string, unknown> {
  const patch: StatePatch = {
    enableBundles: stringArrayArg(args.enableBundles, 'enableBundles'),
    disableBundles: stringArrayArg(args.disableBundles, 'disableBundles'),
    enableServers: stringArrayArg(args.enableServers, 'enableServers'),
    disableServers: stringArrayArg(args.disableServers, 'disableServers'),
  };

  const current = loadState(paths);
  const next = updateState(registry, current, patch);
  saveState(paths, next);

  const writeRequested = booleanArg(args.writeCodexConfig, true);
  const writeResult = writeRequested ? writeCodex(paths, registry) : null;
  const resolution = resolveState(registry, next);

  return {
    updatedState: next,
    enabledServerNames: resolution.enabledServerNames,
    warnings: resolution.warnings,
    codexWrite: writeResult,
    note: 'Restart create-something-hub to refresh proxied downstream tools after state changes.',
  };
}

function writeCodex(paths: RegistryPaths, registry: McpBundleRegistry): Record<string, unknown> {
  const state = loadState(paths);
  const result = writeCodexConfig(paths, registry, state);
  return {
    path: result.path,
    enabledServerNames: result.enabledServerNames,
    warnings: result.warnings,
  };
}

function buildStatusPayload(
  paths: RegistryPaths,
  registry: McpBundleRegistry,
  downstream: Awaited<ReturnType<typeof connectDownstreamServers>>,
  proxies: ProxyCatalog,
): Record<string, unknown> {
  const state = loadState(paths);
  const resolution = resolveState(registry, state);

  return {
    hub: {
      name: HUB_NAME,
      version: HUB_VERSION,
    },
    paths: {
      registryPath: paths.registryPath,
      statePath: paths.statePath,
      codexConfigPath: paths.codexConfigPath,
    },
    state: resolution.state,
    enabledServerNames: resolution.enabledServerNames,
    connectedServers: downstream.connected.map((server) => ({
      name: server.name,
      toolCount: server.tools.length,
    })),
    failedServers: downstream.failed,
    proxyToolCount: proxies.toolDefinitions.length,
    bundles: Object.keys(registry.bundles)
      .sort()
      .map((bundleName) => ({
        name: bundleName,
        enabled: resolution.state.enabledBundles.includes(bundleName),
        servers: registry.bundles[bundleName],
      })),
    warnings: [...resolution.warnings, ...proxies.warnings],
    note: 'State edits apply immediately to config writes, but proxy tool list updates on hub restart.',
  };
}

function buildRegistryPayload(registry: McpBundleRegistry): Record<string, unknown> {
  const servers = Object.entries(registry.servers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, config]) => ({
      name,
      transport: config.transport,
      target: config.transport === 'http' ? config.url : `${config.command} ${(config.args ?? []).join(' ')}`.trim(),
      tags: config.tags ?? [],
      description: config.description ?? '',
    }));

  const bundles = Object.entries(registry.bundles)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, bundleServers]) => ({ name, servers: bundleServers }));

  return {
    servers,
    bundles,
    defaults: registry.defaults ?? {},
  };
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

function normalizeArgs(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) {
    return {};
  }
  return raw;
}

function stringArrayArg(raw: unknown, fieldName: string): string[] {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string')) {
    throw new Error(`"${fieldName}" must be an array of strings`);
  }
  return [...new Set(raw.map((v) => v.trim()).filter(Boolean))];
}

function booleanArg(raw: unknown, defaultValue: boolean): boolean {
  if (raw === undefined) {
    return defaultValue;
  }
  if (typeof raw !== 'boolean') {
    throw new Error('Boolean argument expected');
  }
  return raw;
}

function loadContext(): { paths: RegistryPaths; registry: McpBundleRegistry } {
  const initialPaths = resolveRegistryPaths();
  const registry = loadRegistry(initialPaths);
  const codexConfigPath = getEffectiveCodexPath(initialPaths, registry);
  const paths: RegistryPaths = {
    ...initialPaths,
    codexConfigPath,
  };
  return { paths, registry };
}

function parseAdminArgs(argv: string[]): AdminArgs | null {
  const args: AdminArgs = {
    status: false,
    writeCodex: true,
    writeCodexExplicit: false,
    enableBundles: [],
    disableBundles: [],
    enableServers: [],
    disableServers: [],
    help: false,
  };

  let adminMode = false;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (token === '--help' || token === '-h') {
      args.help = true;
      adminMode = true;
      continue;
    }

    if (token === '--status') {
      args.status = true;
      adminMode = true;
      continue;
    }

    if (token === '--write-codex') {
      args.writeCodex = true;
      args.writeCodexExplicit = true;
      adminMode = true;
      continue;
    }

    if (token === '--no-write-codex') {
      args.writeCodex = false;
      args.writeCodexExplicit = true;
      adminMode = true;
      continue;
    }

    if (token === '--enable-bundle') {
      args.enableBundles.push(requireValue(argv, ++i, token));
      adminMode = true;
      continue;
    }

    if (token === '--disable-bundle') {
      args.disableBundles.push(requireValue(argv, ++i, token));
      adminMode = true;
      continue;
    }

    if (token === '--enable-server') {
      args.enableServers.push(requireValue(argv, ++i, token));
      adminMode = true;
      continue;
    }

    if (token === '--disable-server') {
      args.disableServers.push(requireValue(argv, ++i, token));
      adminMode = true;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return adminMode ? args : null;
}

async function runAdminMode(args: AdminArgs): Promise<void> {
  if (args.help) {
    printAdminUsage();
    return;
  }

  const { paths, registry } = loadContext();
  const hasPatch =
    args.enableBundles.length > 0 ||
    args.disableBundles.length > 0 ||
    args.enableServers.length > 0 ||
    args.disableServers.length > 0;

  let updatedState = loadState(paths);
  if (hasPatch) {
    updatedState = updateState(registry, updatedState, {
      enableBundles: args.enableBundles,
      disableBundles: args.disableBundles,
      enableServers: args.enableServers,
      disableServers: args.disableServers,
    });
    saveState(paths, updatedState);
  }

  const shouldWriteCodex = args.writeCodexExplicit ? args.writeCodex : hasPatch;
  const codexWrite = shouldWriteCodex ? writeCodex(paths, registry) : null;
  const status = buildStatusPayload(
    paths,
    registry,
    {
      connected: [],
      failed: [],
    },
    {
      toolDefinitions: [],
      routes: new Map(),
      warnings: [],
    },
  );

  const output = {
    mode: 'admin',
    updated: hasPatch,
    codexWrite,
    status,
  };

  if (args.status || hasPatch || shouldWriteCodex) {
    console.log(JSON.stringify(output, null, 2));
  }
}

function printAdminUsage(): void {
  console.log(`
CREATE SOMETHING MCP Hub

Run as MCP server (default):
  cs-mcp-hub

Admin mode:
  cs-mcp-hub --status
  cs-mcp-hub --enable-bundle <bundle> [--disable-bundle <bundle>] [--no-write-codex]
  cs-mcp-hub --enable-server <server> [--disable-server <server>] [--no-write-codex]
  cs-mcp-hub --write-codex

Environment overrides:
  CS_MCP_HUB_ROOT
  CS_MCP_HUB_REGISTRY
  CS_MCP_HUB_STATE
  CS_MCP_HUB_CODEX_CONFIG
`);
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
